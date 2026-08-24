import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

import {
  AZURE_SECRETS,
  OPENWA_SECRETS,
  WHATSAPP_SECRETS,
} from "./lib/secrets";
import {
  assertGarageAccess,
  assertSuperAccess,
  requirePhone,
  requireString,
} from "./lib/auth";
import {reserveQuota, releaseQuota} from "./lib/quota";
import {deliverInvoice} from "./lib/invoiceDelivery";
import {
  ensureSessionActive,
  getGarageSessionId,
  getSessionStatus,
  isSessionReady,
  openwaRequest,
  openwaTry,
  recordSessionStatus,
  sendWhatsAppText,
} from "./lib/openwa";
import {
  ensureVmReady,
  readVmState,
  stopVm,
  touchVmActivity,
} from "./lib/vm";
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * maxInstances caps spend if something goes wrong (a retry storm, a runaway
 * client). The WhatsApp path is serialised by a single VM anyway, so a
 * higher ceiling would not increase real throughput.
 */
setGlobalOptions({maxInstances: 10, region: "us-central1"});

// ---------------------------------------------------------------------------
// Invoice messaging
// ---------------------------------------------------------------------------

/**
 * Sends an invoice to the client, driven by the button on the invoice screen.
 *
 * WhatsApp is entirely operator-driven: nothing in this codebase messages a
 * customer without someone pressing a button. There are no Firestore triggers
 * and no scheduled senders, so marking an invoice paid has no side effect
 * beyond recording the payment.
 *
 * `kind` only selects the wording ("your invoice" vs "we received your
 * payment"). `force` re-sends a message that already succeeded, for example
 * after the customer changed number. Delivery is still claimed
 * transactionally, so two operators pressing Send at once send once.
 */
export const sendInvoiceWhatsApp = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 300},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);
    const invoiceId = requireString(request.data?.invoiceId, "invoiceId", 128);
    const kind = request.data?.kind === "paid" ? "paid" : "issued";
    const force = request.data?.force === true;

    const result = await deliverInvoice(garageId, invoiceId, kind, {force});
    if (!result.delivered) {
      throw new HttpsError(
        "failed-precondition",
        result.reason || "WhatsApp delivery failed"
      );
    }
    return {success: true, to: result.to};
  }
);

// ---------------------------------------------------------------------------
// Manual messaging
// ---------------------------------------------------------------------------

export const sendManualWhatsApp = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 180},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);
    const phoneNumber = requirePhone(request.data?.phoneNumber);
    const message = requireString(request.data?.message, "message", 4096);

    await ensureVmReady();

    const reservation = await reserveQuota(garageId);
    if (!reservation.granted) {
      throw new HttpsError(
        "resource-exhausted",
        `Message quota exhausted (${reservation.used}/${reservation.limit} ` +
        "used this month)."
      );
    }

    try {
      const sessionId = await getGarageSessionId(garageId);
      await ensureSessionActive(garageId, sessionId);
      await sendWhatsAppText(sessionId, phoneNumber, message);
      await touchVmActivity();
      await admin.firestore()
        .collection("garages").doc(garageId)
        .collection("whatsappLogs").add({
          kind: "manual",
          outcome: "sent",
          to: phoneNumber,
          sentBy: request.auth?.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return {success: true};
    } catch (error: any) {
      await releaseQuota(garageId, reservation.period);
      logger.error("Manual WhatsApp send failed", {
        garageId, error: error?.message,
      });
      throw new HttpsError(
        "internal",
        error?.message || "WhatsApp send failed"
      );
    }
  }
);

// ---------------------------------------------------------------------------
// WhatsApp session management
// ---------------------------------------------------------------------------

export const createWhatsAppSession = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 180},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);

    try {
      await ensureVmReady();
      const sessionName = `garage-${garageId}`.slice(0, 50);

      let session: any;
      try {
        session = await openwaRequest("/api/sessions", {
          method: "POST",
          body: {name: sessionName},
          attempts: 2,
        });
      } catch (error: any) {
        // A name collision means the session already exists — adopt it
        // rather than failing, so a retried link attempt is not a dead end.
        if (error?.status !== 409) throw error;
        const listData = await openwaRequest("/api/sessions");
        const sessions = Array.isArray(listData) ?
          listData :
          listData?.sessions || [];
        session = sessions.find((s: any) => s.name === sessionName);
        if (!session) {
          throw new Error(
            "A session with this name exists but could not be located."
          );
        }
      }

      await admin.firestore().collection("garages").doc(garageId).set({
        whatsappSessionId: session.id,
        whatsappSessionStatus: session.status || "starting",
      }, {merge: true});

      await openwaTry(`/api/sessions/${session.id}/start`, {method: "POST"});
      return {sessionId: session.id};
    } catch (error: any) {
      logger.error("createWhatsAppSession failed", {
        garageId, error: error?.message,
      });
      throw new HttpsError(
        "internal",
        error?.message || "Could not create the WhatsApp session."
      );
    }
  }
);

export const getWhatsAppSessionStatus = onCall(
  {secrets: OPENWA_SECRETS, timeoutSeconds: 20},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);

    const garageSnap = await admin.firestore()
      .collection("garages").doc(garageId).get();
    const garage = garageSnap.data();
    const sessionId = garage?.whatsappSessionId;
    if (!sessionId) return {linked: false, ready: false};

    try {
      const data = await getSessionStatus(sessionId);
      const status = String(data?.status ?? "unknown");
      await recordSessionStatus(garageId, status, data?.phone);
      return {
        linked: true,
        ready: isSessionReady(status),
        status,
        phone: data?.phone,
        sessionId,
      };
    } catch (error: any) {
      // The VM being asleep is normal, not an error worth alarming on: fall
      // back to the last status we recorded so the UI still shows something.
      logger.debug("Session status unreachable", {
        garageId, error: error?.message,
      });
      return {
        linked: true,
        ready: false,
        status: "unreachable",
        lastKnownStatus: garage?.whatsappSessionStatus ?? null,
        sessionId,
      };
    }
  }
);

export const getWhatsAppQr = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 180},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);
    try {
      await ensureVmReady();
      const sessionId = await getGarageSessionId(garageId);
      await openwaTry(`/api/sessions/${sessionId}/start`, {method: "POST"});
      const data = await openwaRequest(`/api/sessions/${sessionId}/qr`, {
        attempts: 2,
      });
      return {qrCode: data.qrCode};
    } catch (error: any) {
      logger.error("getWhatsAppQr failed", {garageId, error: error?.message});
      throw new HttpsError(
        "internal",
        error?.message || "The QR code is not ready yet — try again shortly."
      );
    }
  }
);

export const requestWhatsAppPairingCode = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 180},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);
    const phoneNumber = requirePhone(request.data?.phoneNumber);
    try {
      await ensureVmReady();
      const sessionId = await getGarageSessionId(garageId);
      await openwaTry(`/api/sessions/${sessionId}/start`, {method: "POST"});
      const data = await openwaRequest(
        `/api/sessions/${sessionId}/pairing-code`,
        {
          method: "POST",
          body: {phoneNumber: phoneNumber.replace(/[^\d]/g, "")},
          attempts: 2,
        }
      );
      return {pairingCode: data.pairingCode || data.code};
    } catch (error: any) {
      logger.error("requestWhatsAppPairingCode failed", {
        garageId, error: error?.message,
      });
      throw new HttpsError(
        "internal",
        error?.message || "Could not get a pairing code."
      );
    }
  }
);

export const restartWhatsAppSession = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 180},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId);
    await ensureVmReady();
    const sessionId = await getGarageSessionId(garageId);
    await ensureSessionActive(garageId, sessionId);
    return {success: true};
  }
);

export const disconnectWhatsAppSession = onCall(
  {secrets: OPENWA_SECRETS, timeoutSeconds: 60},
  async (request) => {
    const garageId = requireString(request.data?.garageId, "garageId", 128);
    await assertGarageAccess(request, garageId, ["owner", "manager", "BOSS"]);

    const garageRef = admin.firestore().collection("garages").doc(garageId);
    const sessionId = (await garageRef.get()).data()?.whatsappSessionId;
    if (!sessionId) return {success: true};

    await openwaTry(`/api/sessions/${sessionId}/logout`, {method: "POST"});
    await openwaTry(`/api/sessions/${sessionId}/stop`, {method: "POST"});

    await garageRef.update({
      whatsappSessionId: admin.firestore.FieldValue.delete(),
      whatsappSessionStatus: admin.firestore.FieldValue.delete(),
      whatsappSessionPhone: admin.firestore.FieldValue.delete(),
    });
    logger.info("WhatsApp session disconnected", {
      garageId, by: request.auth?.uid,
    });
    return {success: true};
  }
);

// ---------------------------------------------------------------------------
// VM lifecycle
// ---------------------------------------------------------------------------

export const wakeVm = onCall(
  {secrets: WHATSAPP_SECRETS, timeoutSeconds: 180},
  async (request) => {
    await assertSuperAccess(request);
    await ensureVmReady();
    return {success: true};
  }
);

export const getVmStatus = onCall({}, async (request) => {
  await assertSuperAccess(request);
  const state = await readVmState();
  return {
    running: state.running,
    lastActivity: state.lastActivity ?
      state.lastActivity.toISOString() :
      null,
    idleMinutes: state.idleMinutes,
  };
});

/** Hard stop after business hours — a deallocated VM is what stops billing. */
export const stopGarageVm = onSchedule(
  {
    schedule: "0 20 * * *",
    timeZone: "Africa/Kigali",
    secrets: AZURE_SECRETS,
    timeoutSeconds: 120,
  },
  async () => {
    await stopVm("after business hours");
  }
);

/** Idle reaper — the VM only needs to be up around an actual send. */
export const stopIdleVm = onSchedule(
  {
    schedule: "*/10 * * * *",
    secrets: AZURE_SECRETS,
    timeoutSeconds: 120,
  },
  async () => {
    const state = await readVmState();
    if (!state.running) return;
    if (state.idleMinutes !== null && state.idleMinutes >= 15) {
      await stopVm(`idle for ${Math.round(state.idleMinutes)} minutes`);
    }
  }
);

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

/**
 * Trims the audit trail so it cannot grow without bound. Ninety days is long
 * enough to settle a billing dispute and short enough that a busy garage's
 * log never becomes a cost of its own.
 */
export const pruneWhatsAppLogs = onSchedule(
  {schedule: "30 3 * * 0", timeZone: "Africa/Kigali", timeoutSeconds: 540},
  async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    );
    const snap = await admin.firestore()
      .collectionGroup("whatsappLogs")
      .where("createdAt", "<", cutoff)
      .limit(2000)
      .get();

    if (snap.empty) return;
    // Batches are hard-capped at 500 writes.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = admin.firestore().batch();
      snap.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    logger.info("Pruned WhatsApp logs", {deleted: snap.size});
  }
);

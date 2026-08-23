import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
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
  SESSION_READY_STATES,
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
import {sleep} from "./lib/http";

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
// Invoice automation
// ---------------------------------------------------------------------------

/**
 * Sends the invoice as soon as it is issued (i.e. the job is done).
 * Opt-in per garage via `whatsappNotifyOnIssue` so a garage that only wants
 * payment receipts is not forced into two messages per job.
 */
export const onInvoiceIssued = onDocumentCreated(
  {
    document: "garages/{garageId}/invoices/{invoiceId}",
    secrets: WHATSAPP_SECRETS,
    timeoutSeconds: 300,
    retry: false,
  },
  async (event) => {
    const invoice = event.data?.data();
    if (!invoice) return;

    const {garageId, invoiceId} = event.params;
    const garage = (await admin.firestore()
      .collection("garages").doc(garageId).get()).data();

    if (garage?.whatsappNotifyOnIssue !== true) {
      logger.debug("Issue notification disabled for garage", {garageId});
      return;
    }
    // An invoice created already marked Paid is handled as a paid receipt
    // only, so the customer does not get two messages a second apart.
    if (invoice.status === "Paid") {
      await deliverInvoice(garageId, invoiceId, "paid");
      return;
    }
    await deliverInvoice(garageId, invoiceId, "issued");
  }
);

/**
 * Sends the paid receipt when an invoice transitions to Paid.
 * The transition guard (before !== Paid, after === Paid) plus the claim in
 * deliverInvoice means edits to an already-paid invoice never re-send.
 */
export const onInvoicePaid = onDocumentUpdated(
  {
    document: "garages/{garageId}/invoices/{invoiceId}",
    secrets: WHATSAPP_SECRETS,
    timeoutSeconds: 300,
    retry: false,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === "Paid" || after.status !== "Paid") return;

    const {garageId, invoiceId} = event.params;
    await deliverInvoice(garageId, invoiceId, "paid");
  }
);

/**
 * Manual send / resend, driven by the button on the invoice screen.
 * `force` lets an operator re-send a message that already succeeded (for
 * example after the customer changed number); everything else is guarded by
 * the same claim as the automatic path.
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

/**
 * Sweeps up deliveries that failed for transient reasons (VM asleep, session
 * restarting, network blip). Runs hourly during business hours so a paid
 * invoice always reaches the customer eventually, without an operator having
 * to notice and press Resend.
 */
export const retryFailedInvoiceMessages = onSchedule(
  {
    schedule: "15 8-19 * * *",
    timeZone: "Africa/Kigali",
    secrets: WHATSAPP_SECRETS,
    timeoutSeconds: 540,
  },
  async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - 24 * 60 * 60 * 1000
    );
    const MAX_ATTEMPTS = 5;
    const MAX_PER_RUN = 25;

    for (const kind of ["paid", "issued"] as const) {
      const field = kind === "paid" ? "whatsappPaid" : "whatsappIssued";
      const snap = await db.collectionGroup("invoices")
        .where(`${field}.state`, "==", "failed")
        .where(`${field}.updatedAt`, ">=", cutoff)
        .orderBy(`${field}.updatedAt`, "asc")
        .limit(MAX_PER_RUN)
        .get();

      for (const doc of snap.docs) {
        const record = doc.data()?.[field] || {};
        // Give up after a few tries: past that the cause is structural
        // (no session linked, bad number) and retrying just burns the VM.
        if (Number(record.attempts || 0) >= MAX_ATTEMPTS) continue;

        const garageId = doc.ref.parent.parent?.id;
        if (!garageId) continue;
        await deliverInvoice(garageId, doc.id, kind);
      }
    }
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

/**
 * Daily broadcast of scheduled (holiday) messages.
 *
 * Paced deliberately: WhatsApp bans numbers that fire hundreds of messages
 * back to back, and a ban costs the garage its only channel. Progress is
 * checkpointed on the scheduled-message document so a function timeout
 * resumes where it left off instead of re-messaging everyone.
 */
export const sendScheduledMessages = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Africa/Kigali",
    secrets: WHATSAPP_SECRETS,
    timeoutSeconds: 540,
  },
  async () => {
    const PER_MESSAGE_DELAY_MS = 2500;
    const TIME_BUDGET_MS = 480000; // leave headroom before the 540s timeout
    const startedAt = Date.now();

    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Kigali",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());

    const dueSnap = await admin.firestore()
      .collectionGroup("scheduledMessages")
      .where("sendDate", "==", todayStr)
      .where("status", "in", ["pending", "in_progress"])
      .get();

    for (const doc of dueSnap.docs) {
      const data = doc.data();
      const garageId = doc.ref.parent.parent?.id;
      if (!garageId) continue;

      try {
        await doc.ref.update({status: "in_progress"});
        await ensureVmReady();
        const sessionId = await getGarageSessionId(garageId);
        await ensureSessionActive(garageId, sessionId);

        // Resume from the last client processed on a previous run.
        const cursor = data.lastClientId || null;
        let query = admin.firestore()
          .collection("garages").doc(garageId)
          .collection("clients")
          .orderBy(admin.firestore.FieldPath.documentId());
        if (cursor) query = query.startAfter(cursor);

        const clientsSnap = await query.get();
        let sentCount = Number(data.sentCount || 0);
        let failedCount = Number(data.failedCount || 0);
        let lastClientId = cursor;
        let exhaustedQuota = false;

        for (const clientDoc of clientsSnap.docs) {
          if (Date.now() - startedAt > TIME_BUDGET_MS) {
            logger.info("Broadcast paused on time budget; resumes next run", {
              garageId, scheduledId: doc.id, sentCount,
            });
            break;
          }
          lastClientId = clientDoc.id;
          const client = clientDoc.data();
          if (!client.phone) continue;

          const reservation = await reserveQuota(garageId);
          if (!reservation.granted) {
            logger.warn("Quota exhausted mid-broadcast", {
              garageId, scheduledId: doc.id,
            });
            exhaustedQuota = true;
            break;
          }
          try {
            await sendWhatsAppText(
              sessionId,
              `+${String(client.phone).replace(/[^\d]/g, "")}`,
              data.message
            );
            sentCount++;
          } catch (err: any) {
            await releaseQuota(garageId, reservation.period);
            failedCount++;
            logger.error("Scheduled message failed for client", {
              garageId, clientId: clientDoc.id, error: err?.message,
            });
          }
          await sleep(PER_MESSAGE_DELAY_MS);
        }

        const finished = exhaustedQuota ||
          lastClientId === clientsSnap.docs[clientsSnap.docs.length - 1]?.id ||
          clientsSnap.empty;

        await doc.ref.update({
          status: finished ? "sent" : "in_progress",
          lastClientId,
          sentCount,
          failedCount,
          ...(finished ?
            {sentAt: admin.firestore.FieldValue.serverTimestamp()} :
            {}),
        });
        await touchVmActivity();
        logger.info("Scheduled broadcast progress", {
          garageId, scheduledId: doc.id, sentCount, failedCount, finished,
        });
      } catch (error: any) {
        await doc.ref.update({
          status: "pending",
          lastError: error?.message || String(error),
        }).catch(() => null);
        logger.error("Scheduled message batch failed", {
          garageId, scheduledId: doc.id, error: error?.message,
        });
      }
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

/** Exposed so the dashboard can label states with the same vocabulary. */
export const getWhatsAppReadyStates = onCall({}, async (request) => {
  await assertSuperAccess(request);
  return {states: SESSION_READY_STATES};
});

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

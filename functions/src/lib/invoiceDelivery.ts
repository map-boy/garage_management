import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {releaseQuota, reserveQuota} from "./quota";
import {
  calculateTotals,
  generateInvoicePdf,
  uploadInvoicePdf,
} from "./invoicePdf";
import {
  ensureSessionActive,
  formatPhone,
  getGarageSessionId,
  sendWhatsAppDocument,
} from "./openwa";
import {ensureVmReady, touchVmActivity} from "./vm";

/** Which milestone triggered the message. */
export type DeliveryKind = "issued" | "paid";

/** Lifecycle of one WhatsApp delivery, stored on the invoice document. */
export type DeliveryState = "pending" | "sending" | "sent" | "failed" | "skipped";

export interface DeliveryRecord {
  state: DeliveryState;
  kind?: DeliveryKind;
  attempts?: number;
  lastError?: string;
  updatedAt?: admin.firestore.Timestamp;
  sentAt?: admin.firestore.Timestamp;
  claimedAt?: admin.firestore.Timestamp;
  to?: string;
  pdfUrl?: string;
}

export interface DeliveryResult {
  delivered: boolean;
  reason?: string;
  to?: string;
}

/**
 * A claim is considered abandoned after this long. A function instance can
 * be killed mid-send (Cloud Run reclaims it, the VM never wakes), which
 * would otherwise leave the invoice stuck in "sending" and block every
 * future attempt — including the operator pressing Resend.
 */
const STALE_CLAIM_MS = 10 * 60 * 1000;

function deliveryField(kind: DeliveryKind): string {
  return kind === "paid" ? "whatsappPaid" : "whatsappIssued";
}

function invoiceRef(
  garageId: string,
  invoiceId: string
): admin.firestore.DocumentReference {
  return admin.firestore()
    .collection("garages").doc(garageId)
    .collection("invoices").doc(invoiceId);
}

/**
 * Atomically claims the right to send this message.
 *
 * Firestore triggers are at-least-once: the same invoice update can invoke
 * onInvoicePaid more than once, and an operator can hit Resend while a
 * trigger is already running. Without this claim the customer receives the
 * same invoice two or three times and the garage is billed for each — the
 * single most damaging bug class in a messaging integration.
 */
async function claimDelivery(
  garageId: string,
  invoiceId: string,
  kind: DeliveryKind,
  force: boolean
): Promise<{claimed: boolean; reason?: string; attempts: number}> {
  const ref = invoiceRef(garageId, invoiceId);
  const field = deliveryField(kind);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return {claimed: false, reason: "Invoice no longer exists", attempts: 0};
    }
    const existing: DeliveryRecord = snap.data()?.[field] || {};
    const attempts = Number(existing.attempts || 0);

    if (existing.state === "sent" && !force) {
      return {claimed: false, reason: "Already sent", attempts};
    }
    if (existing.state === "sending") {
      const claimedAt = existing.claimedAt?.toDate?.();
      const fresh = claimedAt &&
        Date.now() - claimedAt.getTime() < STALE_CLAIM_MS;
      if (fresh && !force) {
        return {claimed: false, reason: "Send already in progress", attempts};
      }
    }

    tx.set(
      ref,
      {
        [field]: {
          state: "sending",
          kind,
          attempts: attempts + 1,
          claimedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        },
      },
      {merge: true}
    );
    return {claimed: true, attempts: attempts + 1};
  });
}

async function finishDelivery(
  garageId: string,
  invoiceId: string,
  kind: DeliveryKind,
  patch: Partial<DeliveryRecord>
): Promise<void> {
  await invoiceRef(garageId, invoiceId).set(
    {
      [deliveryField(kind)]: {
        ...patch,
        updatedAt: admin.firestore.Timestamp.now(),
      },
    },
    {merge: true}
  ).catch((error) => {
    logger.error("Could not record delivery outcome", {
      garageId, invoiceId, kind, error,
    });
  });
}

/**
 * Append-only audit trail. Every attempt is written here, successful or not,
 * so a disputed "we never got the invoice" can actually be answered and so
 * quota consumption can be reconciled against real sends.
 */
async function writeAuditLog(
  garageId: string,
  entry: Record<string, unknown>
): Promise<void> {
  try {
    await admin.firestore()
      .collection("garages").doc(garageId)
      .collection("whatsappLogs")
      .add({...entry, createdAt: admin.firestore.FieldValue.serverTimestamp()});
  } catch (error) {
    logger.warn("Could not write WhatsApp audit log", {garageId, error});
  }
}

function messageBody(
  kind: DeliveryKind,
  customerName: string,
  invoiceNumber: string,
  amountText: string,
  garageName: string,
  plate?: string
): string {
  const greeting = `Hi ${customerName || "there"},`;
  const vehicle = plate ? ` for vehicle ${plate}` : "";
  if (kind === "paid") {
    return `${greeting}\n\nWe have received your payment of ${amountText} ` +
      `for invoice ${invoiceNumber}${vehicle}. Your receipt is attached.\n\n` +
      `Thank you for choosing ${garageName}!`;
  }
  return `${greeting}\n\nYour service${vehicle} is complete. ` +
    `Invoice ${invoiceNumber} for ${amountText} is attached.\n\n` +
    `Thank you for choosing ${garageName}!`;
}

/**
 * Sends one invoice over WhatsApp end to end: claim, wake the VM, reserve
 * quota, render the PDF, send, and record the outcome. Safe to call
 * concurrently and safe to retry — the claim guarantees exactly one send.
 */
export async function deliverInvoice(
  garageId: string,
  invoiceId: string,
  kind: DeliveryKind,
  options: {force?: boolean} = {}
): Promise<DeliveryResult> {
  const force = options.force === true;
  const db = admin.firestore();

  const claim = await claimDelivery(garageId, invoiceId, kind, force);
  if (!claim.claimed) {
    logger.info("Invoice delivery skipped", {
      garageId, invoiceId, kind, reason: claim.reason,
    });
    return {delivered: false, reason: claim.reason};
  }

  let quotaPeriod: string | null = null;

  try {
    const invoiceSnap = await invoiceRef(garageId, invoiceId).get();
    const invoice = invoiceSnap.data();
    if (!invoice) throw new Error("Invoice not found");

    const [garageSnap, clientSnap] = await Promise.all([
      db.collection("garages").doc(garageId).get(),
      invoice.clientId ?
        db.collection("garages").doc(garageId)
          .collection("clients").doc(invoice.clientId).get() :
        Promise.resolve(null),
    ]);

    const garage = garageSnap.data() || {};
    const client = clientSnap?.data();

    if (!client?.phone) {
      const reason = "Client has no phone number on file";
      await finishDelivery(garageId, invoiceId, kind, {
        state: "skipped", kind, lastError: reason, attempts: claim.attempts,
      });
      await writeAuditLog(garageId, {
        invoiceId, kind, outcome: "skipped", reason,
      });
      return {delivered: false, reason};
    }

    // Vehicle details make the message recognisable to the customer.
    let plate = "";
    let makeModel = "";
    let year: number | undefined;
    if (invoice.jobId) {
      const jobSnap = await db.collection("garages").doc(garageId)
        .collection("jobs").doc(invoice.jobId).get();
      const vehicleId = jobSnap.data()?.vehicleId;
      if (vehicleId) {
        const vehicle = (await db.collection("garages").doc(garageId)
          .collection("vehicles").doc(vehicleId).get()).data();
        if (vehicle) {
          plate = vehicle.plate || "";
          makeModel = `${vehicle.make || ""} ${vehicle.model || ""}`.trim();
          year = vehicle.year;
        }
      }
    }

    const currency = garage.currency || "RWF";
    const garageName = garage.garageName || "Your Garage";
    const {total} = calculateTotals(
      invoice.lineItems || [],
      invoice.laborCost || 0,
      invoice.taxRate || 0
    );
    const amountText = `${Math.round(total).toLocaleString("en-US")} ${currency}`;
    const toPhone = formatPhone(client.phone);

    // Wake the VM before reserving quota: waking is the step most likely to
    // fail outright, and a reservation held across a 90s boot wait is a
    // reservation that can be lost if the instance is reclaimed.
    await ensureVmReady();

    const reservation = await reserveQuota(garageId);
    if (!reservation.granted) {
      const reason =
        `WhatsApp quota exhausted (${reservation.used}/${reservation.limit} ` +
        `for ${reservation.period})`;
      await finishDelivery(garageId, invoiceId, kind, {
        state: "failed", kind, lastError: reason, attempts: claim.attempts,
      });
      await writeAuditLog(garageId, {
        invoiceId, kind, outcome: "failed", reason,
      });
      return {delivered: false, reason};
    }
    quotaPeriod = reservation.period;

    const pdf = await generateInvoicePdf({
      garageName,
      garageAddress: garage.address,
      garagePhone: garage.phone,
      clientName: client.name || "",
      clientEmail: client.email || "",
      clientPhone: client.phone,
      invoiceNumber: invoice.id || invoiceId,
      issuedAt: invoice.issuedAt,
      status: invoice.status || "Unpaid",
      vehiclePlate: plate,
      vehicleMakeModel: makeModel,
      vehicleYear: year,
      lineItems: invoice.lineItems || [],
      laborCost: invoice.laborCost || 0,
      taxRate: invoice.taxRate || 0,
      currency,
    });
    const {url: pdfUrl} = await uploadInvoicePdf(pdf, garageId, invoiceId);

    const sessionId = await getGarageSessionId(garageId);
    await ensureSessionActive(garageId, sessionId);
    await sendWhatsAppDocument(
      sessionId,
      toPhone,
      pdfUrl,
      `invoice-${invoice.id || invoiceId}.pdf`,
      messageBody(kind, client.name, invoice.id || invoiceId, amountText,
        garageName, plate)
    );

    await touchVmActivity();
    await finishDelivery(garageId, invoiceId, kind, {
      state: "sent",
      kind,
      attempts: claim.attempts,
      sentAt: admin.firestore.Timestamp.now(),
      to: toPhone,
      pdfUrl,
      lastError: admin.firestore.FieldValue.delete() as any,
    });
    await writeAuditLog(garageId, {
      invoiceId, kind, outcome: "sent", to: toPhone, amount: total, currency,
    });

    logger.info("Invoice WhatsApp delivered", {garageId, invoiceId, kind});
    return {delivered: true, to: toPhone};
  } catch (error: any) {
    const reason = error?.message || String(error);
    // The customer got nothing, so the garage must not be charged for it.
    if (quotaPeriod) await releaseQuota(garageId, quotaPeriod);
    await finishDelivery(garageId, invoiceId, kind, {
      state: "failed", kind, lastError: reason, attempts: claim.attempts,
    });
    await writeAuditLog(garageId, {
      invoiceId, kind, outcome: "failed", reason,
    });
    logger.error("Invoice WhatsApp delivery failed", {
      garageId, invoiceId, kind, reason,
    });
    return {delivered: false, reason};
  }
}

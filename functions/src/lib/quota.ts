import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export const DEFAULT_WHATSAPP_LIMIT = 1000;

/**
 * Per-garage WhatsApp message quota.
 *
 * Two properties matter and both are enforced transactionally:
 *
 * 1. The counter resets on the first send of each calendar month. Without a
 *    reset stamped on the garage document, a garage silently stops sending
 *    forever once it reaches the limit — the failure mode looks identical to
 *    a broken WhatsApp session, which is very expensive to diagnose.
 * 2. A reservation is released if the send ultimately fails, so a garage is
 *    never billed for a message its customer never received.
 */

function currentPeriod(): string {
  // Kigali is UTC+2 with no DST, so the month boundary is unambiguous.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).slice(0, 7); // "YYYY-MM"
}

export interface QuotaReservation {
  granted: boolean;
  used: number;
  limit: number;
  period: string;
}

/**
 * Reserves one message from the garage's monthly allowance.
 * Returns granted:false when the allowance is exhausted rather than throwing,
 * so callers can report the reason to the operator.
 */
export async function reserveQuota(
  garageId: string
): Promise<QuotaReservation> {
  const garageRef = admin.firestore().collection("garages").doc(garageId);
  const period = currentPeriod();

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(garageRef);
    if (!snap.exists) {
      // The garage document is created on first sign-in; if it is missing,
      // something is wrong upstream and we must not invent one here.
      throw new Error(`Garage ${garageId} does not exist`);
    }
    const data = snap.data() || {};
    const limit = Number(data.whatsappMessagesLimit ?? DEFAULT_WHATSAPP_LIMIT);
    const storedPeriod = data.whatsappQuotaPeriod;
    const used = storedPeriod === period ?
      Number(data.whatsappMessagesUsed || 0) :
      0;

    if (used >= limit) {
      return {granted: false, used, limit, period};
    }

    tx.set(
      garageRef,
      {
        whatsappMessagesUsed: used + 1,
        whatsappQuotaPeriod: period,
        whatsappQuotaUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    return {granted: true, used: used + 1, limit, period};
  });
}

/**
 * Returns a previously reserved message to the pool after a failed send.
 * Only refunds within the same period — a reservation that straddles a month
 * boundary has already been zeroed by the reset and must not go negative.
 */
export async function releaseQuota(
  garageId: string,
  period: string
): Promise<void> {
  const garageRef = admin.firestore().collection("garages").doc(garageId);
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(garageRef);
      const data = snap.data() || {};
      if (data.whatsappQuotaPeriod !== period) return;
      const used = Number(data.whatsappMessagesUsed || 0);
      if (used <= 0) return;
      tx.set(garageRef, {whatsappMessagesUsed: used - 1}, {merge: true});
    });
  } catch (error) {
    // A failed refund must never mask the original send failure.
    logger.error("Failed to release WhatsApp quota", {garageId, period, error});
  }
}

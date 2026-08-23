import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {openwaApiKey, openwaUrl} from "./secrets";
import {
  fetchWithTimeout,
  permanent,
  readBody,
  sleep,
  withRetry,
} from "./http";

/**
 * Statuses OpenWA reports for a session that can actually send a message.
 *
 * This list is the single source of truth and is mirrored by the dashboard
 * (see garage-website `SESSION_READY_STATES`). They drifted apart once
 * before: the backend accepted "ready" while the UI only recognised
 * "connected", so a perfectly healthy session displayed as unlinked and
 * operators kept re-scanning a QR code that was never the problem.
 */
export const SESSION_READY_STATES = [
  "ready",
  "connected",
  "active",
  "authenticated",
];

export function isSessionReady(status: unknown): boolean {
  return typeof status === "string" &&
    SESSION_READY_STATES.includes(status.toLowerCase());
}

export function toChatId(phone: string): string {
  return phone.replace(/[^\d]/g, "") + "@c.us";
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `+${digits}`;
}

interface OpenWaRequest {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  attempts?: number;
  label?: string;
}

/**
 * Single entry point for the OpenWA HTTP API: always authenticated, always
 * bounded by a timeout, and retried only for failures that can plausibly
 * succeed on a second try. A 4xx is marked permanent so we do not spend the
 * function's whole budget retrying a request the server will keep rejecting.
 */
export async function openwaRequest(
  path: string,
  options: OpenWaRequest = {}
): Promise<any> {
  const {
    method = "GET",
    body,
    timeoutMs = 15000,
    attempts = 3,
    label = `OpenWA ${method} ${path}`,
  } = options;

  return withRetry(async () => {
    const res = await fetchWithTimeout(
      `${openwaUrl.value()}${path}`,
      {
        method,
        headers: {
          "X-API-Key": openwaApiKey.value(),
          ...(body ? {"Content-Type": "application/json"} : {}),
        },
        ...(body ? {body: JSON.stringify(body)} : {}),
      },
      timeoutMs
    );
    const data = await readBody(res);
    if (!res.ok) {
      const error = new Error(
        `${label} failed (${res.status}): ${data?.message || "unknown error"}`
      );
      (error as any).status = res.status;
      // 408/429 and 5xx are worth retrying; other 4xx are caller errors.
      const retryable = res.status >= 500 ||
        res.status === 408 ||
        res.status === 429;
      throw retryable ? error : permanent(error);
    }
    return data;
  }, {attempts, label});
}

/** Fire-and-forget variant for calls whose failure is not fatal. */
export async function openwaTry(
  path: string,
  options: OpenWaRequest = {}
): Promise<any | null> {
  try {
    return await openwaRequest(path, {attempts: 1, ...options});
  } catch (error: any) {
    logger.debug("Non-fatal OpenWA call failed", {
      path,
      error: error?.message,
    });
    return null;
  }
}

export async function getGarageSessionId(garageId: string): Promise<string> {
  const snap = await admin.firestore()
    .collection("garages").doc(garageId).get();
  const sessionId = snap.data()?.whatsappSessionId;
  if (!sessionId) {
    throw permanent(new Error(
      "No WhatsApp number is linked for this garage. " +
      "Link one from the admin dashboard first."
    ));
  }
  return String(sessionId);
}

export async function getSessionStatus(sessionId: string): Promise<any> {
  return openwaRequest(`/api/sessions/${sessionId}`, {
    timeoutMs: 8000,
    attempts: 1,
  });
}

/**
 * Starts the session if needed and waits until it can send.
 * Mirrors the session status onto the garage document so the dashboard can
 * render state without polling a callable.
 */
export async function ensureSessionActive(
  garageId: string,
  sessionId: string,
  maxWaitMs = 60000
): Promise<void> {
  await openwaTry(`/api/sessions/${sessionId}/start`, {method: "POST"});

  const intervalMs = 3000;
  const startTime = Date.now();
  let lastStatus = "unknown";

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const data = await getSessionStatus(sessionId);
      lastStatus = String(data?.status ?? "unknown");
      if (isSessionReady(lastStatus)) {
        await recordSessionStatus(garageId, lastStatus, data?.phone);
        return;
      }
      // A session that needs a fresh scan will never become ready on its
      // own, so fail fast instead of burning the full wait window.
      if (["unpaired", "logged_out", "require_scan"].includes(lastStatus)) {
        await recordSessionStatus(garageId, lastStatus);
        throw permanent(new Error(
          `WhatsApp session needs to be re-linked (status: ${lastStatus}).`
        ));
      }
    } catch (error: any) {
      if (error?.permanent) throw error;
    }
    await sleep(intervalMs);
  }

  await recordSessionStatus(garageId, lastStatus);
  throw new Error(
    "Timed out waiting for the WhatsApp session to become ready " +
    `(last status: ${lastStatus}).`
  );
}

export async function recordSessionStatus(
  garageId: string,
  status: string,
  phone?: string
): Promise<void> {
  try {
    await admin.firestore().collection("garages").doc(garageId).set(
      {
        whatsappSessionStatus: status,
        whatsappSessionCheckedAt:
          admin.firestore.FieldValue.serverTimestamp(),
        ...(phone ? {whatsappSessionPhone: phone} : {}),
      },
      {merge: true}
    );
  } catch (error) {
    logger.warn("Could not record session status", {garageId, status, error});
  }
}

export async function sendWhatsAppText(
  sessionId: string,
  toPhone: string,
  message: string
): Promise<void> {
  await openwaRequest(`/api/sessions/${sessionId}/messages/send-text`, {
    method: "POST",
    body: {chatId: toChatId(toPhone), text: message},
    timeoutMs: 20000,
    label: "OpenWA send-text",
  });
}

export async function sendWhatsAppDocument(
  sessionId: string,
  toPhone: string,
  documentUrl: string,
  filename: string,
  caption: string
): Promise<void> {
  await openwaRequest(`/api/sessions/${sessionId}/messages/send-document`, {
    method: "POST",
    body: {
      chatId: toChatId(toPhone),
      url: documentUrl,
      filename,
      mimetype: "application/pdf",
      caption,
    },
    timeoutMs: 30000,
    label: "OpenWA send-document",
  });
}

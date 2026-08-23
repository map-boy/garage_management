import {HttpsError, CallableRequest} from "firebase-functions/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Authorization for callable functions.
 *
 * Firebase callables are public HTTPS endpoints. The web client's Firebase
 * config ships in the JavaScript bundle, so anyone who opens the dashboard
 * can read the project id and invoke every callable directly. Without the
 * checks below, an anonymous caller could send WhatsApp messages from any
 * garage's linked number, drain its quota, or unlink it entirely — so every
 * callable must pass through assertGarageAccess before it touches OpenWA.
 */

/** Roles allowed to operate a garage's WhatsApp integration. */
export const WHATSAPP_OPERATOR_ROLES = [
  "owner",
  "manager",
  "receptionist",
  "cashier",
  "BOSS",
];

/** Roles that may act across every garage. */
export const SUPER_ROLES = ["BOSS"];

export interface Caller {
  uid: string;
  role: string;
  garageId: string;
  isSuper: boolean;
}

export function assertAuth(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to perform this action."
    );
  }
  return uid;
}

async function loadCaller(uid: string): Promise<Caller> {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const profile = snap.data();
  if (!profile) {
    throw new HttpsError(
      "permission-denied",
      "No user profile found for this account."
    );
  }
  const role = String(profile.role || "");
  return {
    uid,
    role,
    garageId: String(profile.garageId || ""),
    isSuper: SUPER_ROLES.includes(role),
  };
}

/**
 * Verifies the caller is signed in, belongs to `garageId` (or is a super
 * role), and holds a role permitted to run WhatsApp operations.
 */
export async function assertGarageAccess(
  request: CallableRequest,
  garageId: unknown,
  allowedRoles: string[] = WHATSAPP_OPERATOR_ROLES
): Promise<Caller> {
  const uid = assertAuth(request);
  if (typeof garageId !== "string" || !garageId.trim()) {
    throw new HttpsError("invalid-argument", "garageId is required.");
  }

  const caller = await loadCaller(uid);
  if (!caller.isSuper && caller.garageId !== garageId) {
    logger.warn("Cross-garage access denied", {
      uid,
      callerGarageId: caller.garageId,
      requestedGarageId: garageId,
    });
    throw new HttpsError(
      "permission-denied",
      "You do not have access to this garage."
    );
  }
  if (!allowedRoles.includes(caller.role)) {
    throw new HttpsError(
      "permission-denied",
      `Role "${caller.role}" is not allowed to perform this action.`
    );
  }
  return caller;
}

/** For callables that are not scoped to one garage (e.g. VM controls). */
export async function assertSuperAccess(
  request: CallableRequest
): Promise<Caller> {
  const uid = assertAuth(request);
  const caller = await loadCaller(uid);
  if (!caller.isSuper && caller.role !== "owner") {
    throw new HttpsError(
      "permission-denied",
      "Only an owner or BOSS may control shared infrastructure."
    );
  }
  return caller;
}

/**
 * Validates and normalises a string argument, rejecting oversized input.
 * Message bodies are echoed straight into WhatsApp and stored in Firestore,
 * so an unbounded string is both a cost and a document-size problem.
 */
export function requireString(
  value: unknown,
  field: string,
  maxLength = 4096
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${field} must be ${maxLength} characters or fewer.`
    );
  }
  return trimmed;
}

/**
 * Normalises a phone number to E.164-ish digits and rejects anything that
 * cannot be a real subscriber number, so a typo never becomes a message to
 * a stranger.
 */
export function requirePhone(value: unknown, field = "phoneNumber"): string {
  const raw = requireString(value, field, 32);
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new HttpsError(
      "invalid-argument",
      `${field} must be a valid international phone number.`
    );
  }
  return `+${digits}`;
}

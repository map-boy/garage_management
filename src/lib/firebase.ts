import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline-first: Firestore keeps a local cache so the app works fully
// offline, and automatically syncs to the cloud once connectivity returns.
// Single-tab manager is used because this is a single-window desktop app,
// and it is the persistence mode that works reliably under Electron's
// file:// origin (multi-tab coordination fails there).
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true }),
    }),
  },
  firebaseConfig.firestoreDatabaseId
);

// Region must match setGlobalOptions() in functions/src/index.ts. A mismatch
// fails at call time with an opaque CORS error rather than anything useful.
export const functions = getFunctions(app, 'us-central1');

/** Sends (or re-sends) an invoice to the client over WhatsApp. */
export const sendInvoiceWhatsAppFn = httpsCallable<
  { garageId: string; invoiceId: string; kind: 'issued' | 'paid'; force?: boolean },
  { success: boolean; to?: string }
>(functions, 'sendInvoiceWhatsApp');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
/**
 * Logs a Firestore failure with enough auth context to diagnose it.
 *
 * This deliberately does NOT throw. It is called from onSnapshot error
 * callbacks and from catch blocks; throwing there produced an unhandled
 * rejection that took down the whole app, so a single expired token or a
 * denied read on one collection blanked the screen instead of degrading that
 * one list. Callers that need to react to a failure use the returned message.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): string {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return friendlyFirestoreMessage(error);
}

/** Turns a Firestore error code into something an operator can act on. */
export function friendlyFirestoreMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'permission-denied':
      return 'You do not have permission to do that.';
    case 'unavailable':
      return 'You appear to be offline. Changes will sync when you reconnect.';
    case 'resource-exhausted':
      return 'The service is busy right now. Please try again shortly.';
    case 'not-found':
      return 'That record no longer exists.';
    default:
      return error instanceof Error ? error.message : 'Something went wrong.';
  }
}
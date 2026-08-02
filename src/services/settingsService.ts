import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { GarageSettings, DEFAULT_SETTINGS } from '../types/settings.types';

// Firestore reads are async, but many places in the app (formatCurrency,
// invoice printing, etc.) need settings synchronously. We keep a live
// in-memory cache, kept fresh by a single onSnapshot subscription started
// from AuthContext once we know which garage the user belongs to. This
// cache is also what makes Settings work offline: Firestore's local
// cache still fires onSnapshot with cached data even with no connection.
let cachedSettings: GarageSettings = DEFAULT_SETTINGS;
let currentGarageId: string | null = null;
let unsubscribe: (() => void) | null = null;

export const settingsService = {
  /** Synchronous read of the last-known settings (from cache). */
  get: (): GarageSettings => cachedSettings,

  /** Start (or restart) the live subscription for a given garage. */
  subscribe: (garageId: string) => {
    if (currentGarageId === garageId && unsubscribe) return;
    if (unsubscribe) unsubscribe();
    currentGarageId = garageId;

    unsubscribe = onSnapshot(
      doc(db, 'garages', garageId),
      (snap) => {
        if (snap.exists()) {
          cachedSettings = { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<GarageSettings>), id: garageId };
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `garages/${garageId}`);
      }
    );
  },

  /** Stop the live subscription (e.g. on logout). */
  unsubscribe: () => {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    currentGarageId = null;
    cachedSettings = DEFAULT_SETTINGS;
  },

  save: async (settings: GarageSettings) => {
    if (!currentGarageId) return;
    try {
      const updated = { ...settings, updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'garages', currentGarageId), updated, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `garages/${currentGarageId}`);
    }
  },
};

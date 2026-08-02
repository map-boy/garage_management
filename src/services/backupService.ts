import { collection, getDocs, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';

const COLLECTIONS = ['clients', 'vehicles', 'jobs', 'stock', 'invoices', 'reminders'];

export const backupService = {
  exportData: async (garageId: string): Promise<string> => {
    try {
      const data: Record<string, any[]> = {};
      for (const name of COLLECTIONS) {
        const snap = await getDocs(collection(db, 'garages', garageId, name));
        data[name] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      }
      const settingsSnap = await getDoc(doc(db, 'garages', garageId));
      data.settings = settingsSnap.exists() ? [settingsSnap.data()] : [];
      return JSON.stringify(data, null, 2);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `garages/${garageId}`);
      return '{}';
    }
  },

  importData: async (garageId: string, jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      const batch = writeBatch(db);

      for (const name of COLLECTIONS) {
        const items: any[] = data[name] || [];
        items.forEach((item) => {
          if (!item.id) return;
          batch.set(doc(db, 'garages', garageId, name, item.id), item);
        });
      }

      if (data.settings?.[0]) {
        batch.set(doc(db, 'garages', garageId), data.settings[0], { merge: true });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Import failed', error);
      return false;
    }
  },

  clearData: async (garageId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      for (const name of COLLECTIONS) {
        const snap = await getDocs(collection(db, 'garages', garageId, name));
        snap.docs.forEach((d) => batch.delete(d.ref));
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `garages/${garageId}`);
    }
  },
};

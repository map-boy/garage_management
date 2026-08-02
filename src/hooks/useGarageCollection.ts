import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Real-time, offline-first CRUD for a garage-scoped Firestore subcollection
 * at /garages/{garageId}/{collectionName}. Firestore's local cache means
 * this works fully offline; writes sync automatically once back online.
 */
export function useGarageCollection<T extends { id: string }>(collectionName: string) {
  const { profile } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.garageId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const colRef = collection(db, 'garages', profile.garageId, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        setItems(snapshot.docs.map(d => ({ ...(d.data() as T), id: d.id })));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [profile?.garageId, collectionName]);

  const save = async (item: T) => {
    if (!profile?.garageId) return;
    try {
      await setDoc(doc(db, 'garages', profile.garageId, collectionName, item.id), item);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  };

  const remove = async (id: string) => {
    if (!profile?.garageId) return;
    try {
      await deleteDoc(doc(db, 'garages', profile.garageId, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
    }
  };

  return { items, loading, save, remove };
}

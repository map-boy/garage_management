import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit as fsLimit,
  QueryConstraint,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

/**
 * How many documents a live listener will hold for a collection.
 *
 * An unbounded onSnapshot on a garage's history is the app's hardest scaling
 * limit: every open screen re-downloads the whole collection, keeps it in
 * memory, and is billed per document read. A garage doing 30 jobs a day
 * crosses 10,000 invoices in about a year, at which point start-up goes from
 * instant to tens of seconds and the read bill scales with age rather than
 * use. Capping the window keeps cost and start-up flat over time; older
 * records stay available through the archives.
 */
const DEFAULT_PAGE_SIZE = 500;

/**
 * The field each collection is naturally ordered by, so the capped window is
 * the *most recent* slice rather than an arbitrary one. Collections absent
 * here are small and bounded by nature (stock, clients, vehicles) and are
 * loaded whole.
 */
const ORDER_FIELD: Record<string, string> = {
  invoices: 'issuedAt',
  jobs: 'startedAt',
  reminders: 'dueDate',
  archives: 'archivedAt',
};

export interface UseGarageCollectionOptions {
  /** Override the number of documents held live. */
  pageSize?: number;
}

/**
 * Real-time, offline-first CRUD for a garage-scoped Firestore subcollection
 * at /garages/{garageId}/{collectionName}. Firestore's local cache means
 * this works fully offline; writes sync automatically once back online.
 */
export function useGarageCollection<T extends { id: string }>(
  collectionName: string,
  options: UseGarageCollectionOptions = {}
) {
  const { profile } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  useEffect(() => {
    if (!profile?.garageId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const colRef = collection(db, 'garages', profile.garageId, collectionName);
    const orderField = ORDER_FIELD[collectionName];
    const constraints: QueryConstraint[] = orderField
      ? [orderBy(orderField, 'desc'), fsLimit(pageSize)]
      : [fsLimit(pageSize)];

    const unsubscribe = onSnapshot(
      query(colRef, ...constraints),
      (snapshot) => {
        setItems(snapshot.docs.map(d => ({ ...(d.data() as T), id: d.id })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        // Never throws: a denied or failed listener degrades this one list
        // instead of taking down the app.
        setError(handleFirestoreError(err, OperationType.LIST, collectionName));
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [profile?.garageId, collectionName, pageSize]);

  const save = async (item: T) => {
    if (!profile?.garageId) return;
    try {
      await setDoc(doc(db, 'garages', profile.garageId, collectionName, item.id), item);
    } catch (err) {
      setError(handleFirestoreError(err, OperationType.WRITE, collectionName));
    }
  };

  const remove = async (id: string) => {
    if (!profile?.garageId) return;
    try {
      await deleteDoc(doc(db, 'garages', profile.garageId, collectionName, id));
    } catch (err) {
      setError(handleFirestoreError(err, OperationType.DELETE, collectionName));
    }
  };

  return { items, loading, error, save, remove };
}

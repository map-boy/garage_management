import { Invoice } from '../types';
import { useGarageCollection } from './useGarageCollection';

export function useInvoices(clientId?: string) {
  const { items, save, remove } = useGarageCollection<Invoice>('invoices');
  const invoices = clientId ? items.filter(i => i.clientId === clientId) : items;

  return {
    invoices,
    addInvoice: (i: Invoice) => save(i),
    updateInvoice: (i: Invoice) => save(i),
    deleteInvoice: (id: string) => remove(id),
    refresh: () => {},
  };
}

import { Invoice } from '../types';
import { STORAGE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const invoiceService = {
  getAll: (): Invoice[] => readStorage<Invoice>(STORAGE_KEYS.INVOICES),
  getById: (id: string): Invoice | undefined => invoiceService.getAll().find(i => i.id === id),
  getByClientId: (clientId: string): Invoice[] => invoiceService.getAll().filter(i => i.clientId === clientId),
  save: (item: Invoice): void => {
    const items = invoiceService.getAll();
    const index = items.findIndex(i => i.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    writeStorage(STORAGE_KEYS.INVOICES, items);
  },
  deleteById: (id: string): void => {
    const items = invoiceService.getAll().filter(i => i.id !== id);
    writeStorage(STORAGE_KEYS.INVOICES, items);
  }
};

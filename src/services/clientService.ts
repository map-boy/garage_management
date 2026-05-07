import { Client } from '../types';
import { STORAGE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const clientService = {
  getAll: (): Client[] => readStorage<Client>(STORAGE_KEYS.CLIENTS),
  getById: (id: string): Client | undefined => clientService.getAll().find(c => c.id === id),
  save: (item: Client): void => {
    const items = clientService.getAll();
    const index = items.findIndex(c => c.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    writeStorage(STORAGE_KEYS.CLIENTS, items);
  },
  deleteById: (id: string): void => {
    const items = clientService.getAll().filter(c => c.id !== id);
    writeStorage(STORAGE_KEYS.CLIENTS, items);
  }
};

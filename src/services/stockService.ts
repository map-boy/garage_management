import { Part } from '../types';
import { STORAGE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const stockService = {
  getAll: (): Part[] => readStorage<Part>(STORAGE_KEYS.STOCK),
  getById: (id: string): Part | undefined => stockService.getAll().find(p => p.id === id),
  save: (item: Part): void => {
    const items = stockService.getAll();
    const index = items.findIndex(p => p.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    writeStorage(STORAGE_KEYS.STOCK, items);
  },
  deleteById: (id: string): void => {
    const items = stockService.getAll().filter(p => p.id !== id);
    writeStorage(STORAGE_KEYS.STOCK, items);
  },
  updateQuantity: (id: string, delta: number): void => {
    const items = stockService.getAll();
    const part = items.find(p => p.id === id);
    if (part) {
      part.quantity += delta;
      writeStorage(STORAGE_KEYS.STOCK, items);
    }
  }
};

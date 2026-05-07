import { ServiceReminder } from '../types';
import { STORAGE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const reminderService = {
  getAll: (): ServiceReminder[] => readStorage<ServiceReminder>(STORAGE_KEYS.REMINDERS),
  getById: (id: string): ServiceReminder | undefined => reminderService.getAll().find(r => r.id === id),
  save: (item: ServiceReminder): void => {
    const items = reminderService.getAll();
    const index = items.findIndex(r => r.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    writeStorage(STORAGE_KEYS.REMINDERS, items);
  },
  deleteById: (id: string): void => {
    const items = reminderService.getAll().filter(r => r.id !== id);
    writeStorage(STORAGE_KEYS.REMINDERS, items);
  }
};

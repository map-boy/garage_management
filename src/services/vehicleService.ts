import { Vehicle } from '../types';
import { STORAGE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const vehicleService = {
  getAll: (): Vehicle[] => readStorage<Vehicle>(STORAGE_KEYS.VEHICLES),
  getById: (id: string): Vehicle | undefined => vehicleService.getAll().find(v => v.id === id),
  getByClientId: (clientId: string): Vehicle[] => vehicleService.getAll().filter(v => v.clientId === clientId),
  save: (item: Vehicle): void => {
    const items = vehicleService.getAll();
    const index = items.findIndex(v => v.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    writeStorage(STORAGE_KEYS.VEHICLES, items);
  },
  deleteById: (id: string): void => {
    const items = vehicleService.getAll().filter(v => v.id !== id);
    writeStorage(STORAGE_KEYS.VEHICLES, items);
  }
};

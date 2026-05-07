import { JobCard } from '../types';
import { STORAGE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const jobService = {
  getAll: (): JobCard[] => readStorage<JobCard>(STORAGE_KEYS.JOBS),
  getById: (id: string): JobCard | undefined => jobService.getAll().find(j => j.id === id),
  getByVehicleId: (vehicleId: string): JobCard[] => jobService.getAll().filter(j => j.vehicleId === vehicleId),
  save: (item: JobCard): void => {
    const items = jobService.getAll();
    const index = items.findIndex(j => j.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    writeStorage(STORAGE_KEYS.JOBS, items);
  },
  deleteById: (id: string): void => {
    const items = jobService.getAll().filter(j => j.id !== id);
    writeStorage(STORAGE_KEYS.JOBS, items);
  }
};

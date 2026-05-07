import { STORAGE_KEYS } from '../lib/storage';

export const backupService = {
  exportData: (): string => {
    const data: Record<string, any> = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      const value = localStorage.getItem(key);
      if (value) data[key] = JSON.parse(value);
    });
    return JSON.stringify(data, null, 2);
  },
  importData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      Object.keys(data).forEach(key => {
        localStorage.setItem(key, JSON.stringify(data[key]));
      });
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
};

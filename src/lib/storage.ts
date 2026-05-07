export const STORAGE_KEYS = {
  CLIENTS: 'gms_clients',
  VEHICLES: 'gms_vehicles',
  JOBS: 'gms_jobs',
  STOCK: 'gms_stock',
  INVOICES: 'gms_invoices',
  REMINDERS: 'gms_reminders',
  SETTINGS: 'gms_settings',
  TECHNICIANS: 'gms_technicians',
};

export function readStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return [];
  }
}

export function writeStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

export function getSingleStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error reading single item from localStorage key "${key}":`, error);
    return null;
  }
}

export function setSingleStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing single item to localStorage key "${key}":`, error);
  }
}

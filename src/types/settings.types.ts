export interface GarageSettings {
  id: string;
  garageName: string;
  address: string;
  phone: string;
  currency: string;
  taxRate: number;
  cameraStreamUrl: string;
  cameraLabel: string;
  logoUrl: string;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: GarageSettings = {
  id: 'default',
  garageName: 'C&V SMART GARAGE & CARWASH LTD',
  address: '',
  phone: '',
  currency: 'RWF',
  taxRate: 0.18,
  cameraStreamUrl: '',
  cameraLabel: 'Workshop Floor',
  logoUrl: '',
  updatedAt: new Date().toISOString(),
};

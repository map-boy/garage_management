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
  /**
   * Send the invoice on WhatsApp as soon as it is issued (job complete),
   * in addition to the receipt sent when it is paid. Off by default so a
   * garage opts in rather than discovering it has messaged every customer.
   */
  whatsappNotifyOnIssue: boolean;
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
  whatsappNotifyOnIssue: false,
  updatedAt: new Date().toISOString(),
};

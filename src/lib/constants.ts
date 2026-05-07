export const JOB_STATUSES = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting Parts',
  COMPLETED: 'Completed',
} as const;

export const PAYMENT_STATUSES = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
} as const;

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'] as const;

export const REMINDER_TYPES = ['Oil Change', 'Full Service', 'Tyre Rotation', 'Custom'] as const;

export const TAX_RATE = 0.15; // 15% VAT common in several African regions

export const CURRENCY = 'KES'; // Defaulting to Kenyan Shilling, but can be configured in settings

export const CAMERA_STREAM_URL = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';

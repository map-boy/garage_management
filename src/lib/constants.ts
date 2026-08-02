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

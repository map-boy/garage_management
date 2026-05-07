export type ReminderType = 'Oil Change' | 'Full Service' | 'Tyre Rotation' | 'Custom';

export interface ServiceReminder {
  id: string;
  vehicleId: string;
  type: ReminderType;
  dueDate: string;
  notes: string;
  isDone: boolean;
}

import { ServiceReminder } from '../types';
import { useGarageCollection } from './useGarageCollection';

export function useReminders() {
  const { items, save, remove } = useGarageCollection<ServiceReminder>('reminders');

  return {
    reminders: items,
    addReminder: (r: ServiceReminder) => save(r),
    updateReminder: (r: ServiceReminder) => save(r),
    deleteReminder: (id: string) => remove(id),
    refresh: () => {},
  };
}

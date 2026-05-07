import { useState, useEffect } from 'react';
import { ServiceReminder } from '../types';
import { reminderService } from '../services/reminderService';

export function useReminders() {
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);

  const refresh = () => setReminders(reminderService.getAll());

  useEffect(() => {
    refresh();
  }, []);

  const addReminder = (r: ServiceReminder) => {
    reminderService.save(r);
    refresh();
  };

  const updateReminder = (r: ServiceReminder) => {
    reminderService.save(r);
    refresh();
  };

  const deleteReminder = (id: string) => {
    reminderService.deleteById(id);
    refresh();
  };

  return { reminders, addReminder, updateReminder, deleteReminder, refresh };
}

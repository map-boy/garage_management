import React, { useState } from 'react';
import { useReminders } from '../hooks/useReminders';
import { useVehicles } from '../hooks/useVehicles';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Plus, Search, Bell, CheckCircle2, Trash2, Calendar, Car } from 'lucide-react';
import { generateId, formatDate } from '../lib/utils';
import { REMINDER_TYPES } from '../lib/constants';
import { ServiceReminder } from '../types';

export function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders();
  const { vehicles } = useVehicles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ServiceReminder | null>(null);
  const [formData, setFormData] = useState<Partial<ServiceReminder>>({
    vehicleId: '', type: 'Full Service', dueDate: '', notes: '', isDone: false
  });

  const sortedReminders = [...reminders].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ServiceReminder = {
      id: generateId(),
      vehicleId: formData.vehicleId || '',
      type: formData.type as any,
      dueDate: formData.dueDate || '',
      notes: formData.notes || '',
      isDone: false
    };
    addReminder(data);
    setIsModalOpen(false);
  };

  const handleToggleDone = (reminder: ServiceReminder) => {
    updateReminder({ ...reminder, isDone: !reminder.isDone });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Service Reminders</h1>
          <p className="text-sm text-gray-500 font-medium font-mono">Pending Alerts: {reminders.filter(r => !r.isDone).length}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> New Reminder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedReminders.map((rem) => {
          const vehicle = vehicles.find(v => v.id === rem.vehicleId);
          const isOverdue = new Date(rem.dueDate) < new Date() && !rem.isDone;

          return (
            <div 
              key={rem.id} 
              className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                rem.isDone ? 'opacity-60 bg-gray-50 border-gray-100' : 
                isOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleToggleDone(rem)}>
                    <CheckCircle2 className={`w-5 h-5 ${rem.isDone ? 'text-emerald-500' : 'text-gray-300'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedReminder(rem); setIsDeleteOpen(true); }}>
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>

              <h4 className="font-black text-gray-900 text-lg tracking-tight mb-1">{rem.type}</h4>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span className="font-bold">{vehicle?.plate}</span>
                  <span className="text-xs">{vehicle?.make} {vehicle?.model}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className={`w-4 h-4 ${isOverdue ? 'text-rose-500' : 'text-gray-400'}`} />
                  <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-gray-900'}`}>
                    {formatDate(rem.dueDate)}
                  </span>
                  {isOverdue && <Badge variant="danger" className="text-[10px] py-0">Overdue</Badge>}
                </div>
              </div>

              {rem.notes && (
                <p className="mt-4 text-xs text-gray-500 bg-white/50 p-2 rounded border border-gray-100 italic line-clamp-2">
                  {rem.notes}
                </p>
              )}
            </div>
          );
        })}
        {reminders.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
            <Bell className="w-12 h-12 mb-4 opacity-10" />
            <p className="italic font-bold">No maintenance reminders set</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Alert">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Vehicle</label>
            <select 
              required
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              value={formData.vehicleId}
              onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
            >
              <option value="">Select Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} — {v.make}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Service Type</label>
              <select 
                required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              >
                {REMINDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Due Date</label>
              <input 
                type="date" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Additional Notes</label>
            <textarea 
              rows={2}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="e.g. Needs special oil brand"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Set Reminder</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedReminder && deleteReminder(selectedReminder.id)}
        title="Remove Reminder"
        message="Are you sure you want to delete this reminder?"
      />
    </div>
  );
}

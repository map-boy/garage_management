import React, { useState } from 'react';
import { backupService } from '../services/backupService';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { GarageSettings } from '../types/settings.types';
import { Button } from '../components/ui/Button';
import { Toast, ToastType } from '../components/ui/Toast';
import { Database, Download, Upload, Trash2, ShieldCheck, Save, Camera, Image as ImageIcon } from 'lucide-react';

export function SettingsPage() {
  const { profile } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [settings, setSettings] = useState<GarageSettings>(settingsService.get());
  const [busy, setBusy] = useState(false);

  const garageId = profile?.garageId;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await settingsService.save(settings);
    setToast({ message: 'Settings saved', type: 'success' });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setSettings((prev) => ({ ...prev, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    if (!garageId) return;
    setBusy(true);
    const data = await backupService.exportData(garageId);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garageflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setBusy(false);
    setToast({ message: 'Backup file generated successfully', type: 'success' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && garageId) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setBusy(true);
          const success = await backupService.importData(garageId, result);
          setBusy(false);
          if (success) {
            setToast({ message: 'Data imported successfully', type: 'success' });
          } else {
            setToast({ message: 'Import failed. Use a valid GarageFlow backup file.', type: 'error' });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = async () => {
    if (!garageId) return;
    if (confirm('CRITICAL: This will permanently delete ALL clients, vehicles, jobs, invoices, stock and reminders for this garage. This cannot be undone. Proceed?')) {
      setBusy(true);
      await backupService.clearData(garageId);
      setBusy(false);
      setToast({ message: 'All data erased', type: 'success' });
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-gray-500 font-medium">Configure your workshop and manage cloud-synced data</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Garage Settings Section */}
        <form onSubmit={handleSaveSettings} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Workshop Settings</h3>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Garage logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Garage Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Garage Name</label>'
@
              <input
                type="text" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={settings.garageName}
                onChange={(e) => setSettings({ ...settings, garageName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
              <input
                type="tel"
                placeholder="+250 780 000 000"
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
              <input
                type="text"
                placeholder="Street, City, Country"
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Currency Code</label>
              <input
                type="text" required maxLength={3}
                placeholder="RWF"
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden uppercase"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Tax Rate (%)</label>
              <input
                type="number" required min={0} max={100} step={0.5}
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={settings.taxRate * 100}
                onChange={(e) => setSettings({ ...settings, taxRate: (parseFloat(e.target.value) || 0) / 100 })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-black uppercase tracking-wide text-gray-700">CCTV Camera</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Camera Label</label>
                <input
                  type="text"
                  className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  value={settings.cameraLabel}
                  onChange={(e) => setSettings({ ...settings, cameraLabel: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Stream URL (HLS/.m3u8 or MP4)</label>
                <input
                  type="text"
                  placeholder="https://your-nvr-or-camera/stream.m3u8"
                  className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden font-mono text-xs"
                  value={settings.cameraStreamUrl}
                  onChange={(e) => setSettings({ ...settings, cameraStreamUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" /> Save Settings
            </Button>
          </div>
        </form>

        {/* Data Management Section */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Cloud Data Storage</h3>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Your clients, vehicles, jobs, invoices and stock are synced to the cloud and cached locally so the app keeps working offline. Take periodic backups for extra safety.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleExport}
              disabled={busy}
              className="flex items-center justify-center h-24 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50 hover:bg-white hover:border-blue-200 transition-all group"
              variant="ghost"
            >
              <div className="text-center">
                <Download className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-blue-500" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-900">Export Backup</span>
              </div>
            </Button>

            <div className="relative h-24 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50 hover:bg-white hover:border-emerald-200 transition-all group cursor-pointer overflow-hidden">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={busy}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-900">Import Data</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-50 flex justify-end">
            <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50" onClick={handleReset} disabled={busy}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Erase All Data
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}


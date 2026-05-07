import React, { useState } from 'react';
import { backupService } from '../services/backupService';
import { initDemoData } from '../lib/demoData';
import { Button } from '../components/ui/Button';
import { Toast, ToastType } from '../components/ui/Toast';
import { Database, Download, Upload, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';

export function SettingsPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleExport = () => {
    const data = backupService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garageflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setToast({ message: 'Backup file generated successfully', type: 'success' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const success = backupService.importData(result);
          if (success) {
            setToast({ message: 'Data imported! Reloading...', type: 'success' });
            setTimeout(() => window.location.reload(), 1500);
          } else {
            setToast({ message: 'Import failed. Use valid GMS Backup files.', type: 'error' });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    if (confirm('CRITICAL: This will wipe ALL current data and reload defaults. Proceed?')) {
      localStorage.clear();
      initDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-gray-500 font-medium">Manage your local data and backup preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Data Management Section */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Offline Data Storage</h3>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            GarageFlow uses <span className="font-bold">LocalStorage</span>. All your clients, vehicles, and job cards are stored on this device. We recommend regular backups to prevent data loss.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={handleExport}
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

          <div className="pt-8 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-black uppercase tracking-tight text-emerald-700">Database Optimized</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Force Sync
              </Button>
              <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50" onClick={handleReset}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset System
              </Button>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-gray-900 text-white rounded-3xl p-8 overflow-hidden relative">
          <div className="relative z-10 space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Build Info</h4>
            <div className="space-y-1">
              <p className="text-2xl font-black tracking-tighter">GarageFlow v1.4.0</p>
              <p className="text-sm text-gray-500">Professional Offline Suite</p>
            </div>
            <div className="pt-4 text-[10px] font-mono text-gray-500 uppercase flex gap-4">
              <span>Node: v22.x</span>
              <span>Env: SPA-LOCAL</span>
              <span>Region: Africa/Sub-Saharan</span>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 opacity-10 rotate-12">
            <RefreshCw className="w-48 h-48" />
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

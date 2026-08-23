import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import Shell from './components/layout/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { JobCardsPage } from './pages/JobCardsPage';
import { JobCardDetailPage } from './pages/JobCardDetailPage';
import { StockPage } from './pages/StockPage';
import { ClientsPage } from './pages/ClientsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { RemindersPage } from './pages/RemindersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CameraPage } from './pages/CameraPage';

function AppRoutes() {
  const { loading, error, retry } = useAuth();
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-white/40 font-mono tracking-widest animate-pulse">INITIALIZING_CORE_SYSTEM...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 space-y-4 text-center">
          <h1 className="text-lg font-black text-gray-900">Could not start</h1>
          <p className="text-sm text-gray-500">
            The app could not open a session. This usually means there is no
            internet connection on this machine.
          </p>
          <pre className="text-[10px] text-left text-gray-400 bg-gray-50 rounded-lg p-3 overflow-auto max-h-24 whitespace-pre-wrap">
            {error}
          </pre>
          <button
            onClick={retry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-xl transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/jobs" element={<JobCardsPage />} />
        <Route path="/jobs/:id" element={<JobCardDetailPage />} />
        <Route path="/inventory" element={<StockPage />} />
        <Route path="/customers" element={<ClientsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/monitoring" element={<CameraPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Shell>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
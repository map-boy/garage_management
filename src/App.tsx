import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { JobCardsPage } from './pages/JobCardsPage';
import { JobCardDetailPage } from './pages/JobCardDetailPage';
import { StockPage } from './pages/StockPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { RemindersPage } from './pages/RemindersPage';
import { ReportsPage } from './pages/ReportsPage';
import { CameraPage } from './pages/CameraPage';
import { SettingsPage } from './pages/SettingsPage';
import { initDemoData } from './lib/demoData';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    initDemoData();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/jobs" element={<JobCardsPage />} />
          <Route path="/jobs/:id" element={<JobCardDetailPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

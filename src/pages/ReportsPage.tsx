import { useReports } from '../hooks/useReports';
import { RevenueBarChart } from '../components/charts/RevenueBarChart';
import { TechnicianChart } from '../components/charts/TechnicianChart';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, Users, Package, Wrench, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function ReportsPage() {
  const { getMonthlyRevenue, getTechnicianWorkload, getInventoryStatus, getJobStats } = useReports();

  const inventory = getInventoryStatus();
  const jobStats = getJobStats();
  const revenueData = getMonthlyRevenue();
  const totalRevenue = revenueData.reduce((acc, d) => acc + d.value, 0);

  const handleExport = () => {
    // Simple console log for demo
    console.log('Exporting report data...');
    window.print();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Intelligence</h1>
          <p className="text-sm text-gray-500 font-medium">Garage performance and operations audit</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="print:hidden">
          <Download className="w-4 h-4 mr-2" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <TrendingUp className="w-8 h-8 text-blue-600 mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
          <h3 className="text-2xl font-black text-gray-900">{formatCurrency(totalRevenue)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <Users className="w-8 h-8 text-emerald-600 mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Staff Efficiency</p>
          <h3 className="text-2xl font-black text-gray-900">{revenueData.length > 0 ? (totalRevenue / revenueData.length).toFixed(0) : 0} <span className="text-sm text-gray-400">/mo average</span></h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <Package className="w-8 h-8 text-rose-600 mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventory Health</p>
          <h3 className="text-2xl font-black text-gray-900">{((inventory.totalItems - inventory.lowStock) / inventory.totalItems * 100).toFixed(0)}% <span className="text-sm text-gray-400">Stoked</span></h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <Wrench className="w-8 h-8 text-amber-600 mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Job Success Rate</p>
          <h3 className="text-2xl font-black text-gray-900">
            {(jobStats.Completed / (Object.values(jobStats).reduce((a, b) => a + b, 0) || 1) * 100).toFixed(0)}%
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">Revenue Growth Pathway</h3>
          <RevenueBarChart data={revenueData} />
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">Technician Performance Metrics</h3>
          <TechnicianChart data={getTechnicianWorkload()} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-black text-gray-900 mb-6">Operations Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
            <p className="text-xs font-black text-rose-600 uppercase tracking-widest">Pending</p>
            <p className="text-4xl font-black text-rose-900 leading-none mt-2">{jobStats.Pending}</p>
          </div>
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
            <p className="text-xs font-black text-amber-600 uppercase tracking-widest">In Progress</p>
            <p className="text-4xl font-black text-amber-900 leading-none mt-2">{jobStats['In Progress']}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Waiting Parts</p>
            <p className="text-4xl font-black text-blue-900 leading-none mt-2">{jobStats['Waiting Parts']}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Completed</p>
            <p className="text-4xl font-black text-emerald-900 leading-none mt-2">{jobStats.Completed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

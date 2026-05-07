import { useClients } from '../hooks/useClients';
import { useVehicles } from '../hooks/useVehicles';
import { useJobs } from '../hooks/useJobs';
import { useInvoices } from '../hooks/useInvoices';
import { useReports } from '../hooks/useReports';
import { RevenueBarChart } from '../components/charts/RevenueBarChart';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, cn } from '../lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { vehicles } = useVehicles();
  const { jobs } = useJobs();
  const { invoices } = useInvoices();
  const { getMonthlyRevenue, getInventoryStatus } = useReports();

  const inventoryStatus = getInventoryStatus();
  const activeJobsCount = jobs.filter(j => j.status !== 'Completed').length;
  const unpaidInvoicesCount = invoices.filter(i => i.status === 'Unpaid').length;
  
  const revenueData = getMonthlyRevenue();
  const currentMonthRevenue = revenueData[revenueData.length - 1]?.value || 0;

  const summaryStats = [
    { label: 'Revenue (MTD)', value: formatCurrency(currentMonthRevenue), change: '+14.2% from last month', color: 'text-gray-900', status: 'success' },
    { label: 'Active Jobs', value: activeJobsCount, change: '6 technicians on site', color: 'text-amber-600', status: 'warning' },
    { label: 'Stock Alerts', value: inventoryStatus.lowStock, change: 'Items below reorder point', color: 'text-red-500', status: 'danger' },
    { label: 'Pending Invoices', value: invoices.filter(i => i.status === 'Unpaid').length, change: `Review ${unpaidInvoicesCount} unpaid bills`, color: 'text-gray-900', isLink: true, path: '/invoices' },
  ];

  const recentJobs = jobs.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* TOP STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[110px]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] mb-1">{stat.label}</div>
            <div className={cn("text-2xl font-black tracking-tighter shrink-0", stat.color)}>{stat.value}</div>
            {stat.isLink ? (
              <Link to={stat.path || '/'} className="text-amber-500 text-[10px] font-bold underline uppercase tracking-tight hover:text-amber-600 transition-colors shrink-0">{stat.change}</Link>
            ) : (
              <div className={cn("text-[10px] font-bold tracking-tight shrink-0", stat.status === 'success' ? 'text-emerald-500' : 'text-gray-400')}>{stat.change}</div>
            )}
          </div>
        ))}
      </div>

      {/* CENTER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTIVE JOBS LIST */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-[420px]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-700 tracking-tight">Active Repair Pipeline</h2>
            <button 
              onClick={() => navigate('/jobs')}
              className="text-[10px] bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all outline-none"
            >
              + New Job
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold border-b border-gray-100 tracking-widest">
                <tr>
                  <th className="px-5 py-3">Job ID</th>
                  <th className="px-5 py-3">Vehicle / Owner</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Estimate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentJobs.map((job) => {
                  const vehicle = vehicles.find(v => v.id === job.vehicleId);
                  const client = clients.find(c => c.id === vehicle?.clientId);
                  const estimate = job.laborCost + (job.partsUsed.length * 800); // Rough estimate

                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <td className="px-5 py-4 font-mono text-[10px] text-blue-600 font-bold">{job.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 text-xs tracking-tight">{vehicle?.plate || '---'}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{vehicle?.make} {vehicle?.model} ({client?.name || 'Walk-in'})</div>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-semibold text-gray-600 uppercase tracking-tighter">{job.technicianName}</td>
                      <td className="px-5 py-4 text-center">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-4 text-right font-black text-gray-900 tabular-nums">
                        {formatCurrency(estimate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CHARTS / ACTIVITY */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[300px]">
            <h2 className="font-bold text-gray-700 mb-6 tracking-tight flex justify-between items-center">
              Weekly Performance
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </h2>
            <div className="flex-1 flex flex-col overflow-hidden">
               <RevenueBarChart data={revenueData.slice(-6)} />
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between shrink-0">
                <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency</div>
                    <div className="text-xl font-black text-gray-900 tracking-tighter">92.4%</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg TAT</div>
                    <div className="text-xl font-black text-gray-900 tracking-tighter">4.2h</div>
                </div>
            </div>
          </div>

          {/* SERVICE REMINDERS LIST (COMPACT) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[180px] shrink-0">
            <h2 className="font-bold text-gray-700 mb-4 tracking-tight flex items-center justify-between shrink-0 font-sans">
              Service Reminders
              <span className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/reminders')}>VIEW ALL</span>
            </h2>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="flex items-start space-x-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-50"></div>
                <div>
                  <div className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">Oil Change Due</div>
                  <div className="text-[10px] text-gray-400 font-medium">GHA-4412 | Mercy A.</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-50"></div>
                <div>
                  <div className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">Suspension Wear</div>
                  <div className="text-[10px] text-gray-400 font-medium">NRB-112-L | John B.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

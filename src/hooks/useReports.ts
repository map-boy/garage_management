import { useJobs } from './useJobs';
import { useInvoices } from './useInvoices';
import { useStock } from './useStock';

export function useReports() {
  const { jobs } = useJobs();
  const { invoices } = useInvoices();
  const { stock } = useStock();

  const getMonthlyRevenue = () => {
    const revenueByMonth: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.status === 'Paid') {
        const month = new Date(inv.issuedAt).toLocaleString('default', { month: 'short' });
        const total = inv.lineItems.reduce((acc, item) => acc + (item.qty * item.unitCost), 0) + inv.laborCost;
        revenueByMonth[month] = (revenueByMonth[month] || 0) + total;
      }
    });
    return Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));
  };

  const getTechnicianWorkload = () => {
    const workload: Record<string, number> = {};
    jobs.forEach(job => {
      workload[job.technicianName] = (workload[job.technicianName] || 0) + 1;
    });
    return Object.entries(workload).map(([name, value]) => ({ name, value }));
  };

  const getInventoryStatus = () => {
    const lowStock = stock.filter(p => p.quantity <= p.reorderLevel).length;
    const totalItems = stock.length;
    return { lowStock, totalItems };
  };

  const getJobStats = () => {
    const stats = {
      Pending: 0,
      'In Progress': 0,
      'Waiting Parts': 0,
      Completed: 0
    };
    jobs.forEach(job => {
      stats[job.status] = (stats[job.status] || 0) + 1;
    });
    return stats;
  };

  return {
    getMonthlyRevenue,
    getTechnicianWorkload,
    getInventoryStatus,
    getJobStats
  };
}

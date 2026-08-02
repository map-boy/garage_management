import { useJobs } from './useJobs';
import { useInvoices } from './useInvoices';
import { useStock } from './useStock';

export function useReports() {
  const { jobs } = useJobs();
  const { invoices } = useInvoices();
  const { stock } = useStock();

  const getMonthlyRevenue = () => {
    const revenueByMonth: Record<string, { value: number; sortKey: number }> = {};
    invoices.forEach(inv => {
      if (inv.status === 'Paid') {
        const date = new Date(inv.issuedAt);
        const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        const sortKey = date.getFullYear() * 12 + date.getMonth();
        const total = inv.lineItems.reduce((acc, item) => acc + (item.qty * item.unitCost), 0) + inv.laborCost;
        if (!revenueByMonth[label]) revenueByMonth[label] = { value: 0, sortKey };
        revenueByMonth[label].value += total;
      }
    });
    return Object.entries(revenueByMonth)
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([name, data]) => ({ name, value: data.value }));
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

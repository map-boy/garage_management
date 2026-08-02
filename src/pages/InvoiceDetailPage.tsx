import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/useInvoices';
import { useClients } from '../hooks/useClients';
import { useVehicles } from '../hooks/useVehicles';
import { useJobs } from '../hooks/useJobs';
import { InvoiceTemplate } from '../components/invoices/InvoiceTemplate';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice } = useInvoices();
  const { clients } = useClients();
  const { vehicles } = useVehicles();
  const { jobs } = useJobs();

  const invoice = useMemo(() => invoices.find(inv => inv.id === id), [invoices, id]);
  const client = useMemo(() => clients.find(c => c.id === invoice?.clientId), [clients, invoice]);
  const job = useMemo(() => jobs.find(j => j.id === invoice?.jobId), [jobs, invoice]);
  const vehicle = useMemo(() => vehicles.find(v => v.id === job?.vehicleId), [vehicles, job]);

  if (!invoice) return <div className="p-8 text-center text-gray-500 font-bold">Invoice Not Found</div>;

  const handleMarkAsPaid = () => {
    updateInvoice({ ...invoice, status: 'Paid' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" className="-ml-4" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
        </Button>
        <div className="flex gap-3">
          {invoice.status === 'Unpaid' && (
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkAsPaid}>
              <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <div className="print-area print:shadow-none print:m-0">
        <InvoiceTemplate 
          invoice={invoice} 
          client={client} 
          vehicle={vehicle} 
        />
      </div>
    </div>
  );
}

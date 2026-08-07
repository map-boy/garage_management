import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/useInvoices';
import { useClients } from '../hooks/useClients';
import { useVehicles } from '../hooks/useVehicles';
import { useJobs } from '../hooks/useJobs';
import { useStock } from '../hooks/useStock';
import { InvoiceTemplate } from '../components/invoices/InvoiceTemplate';
import { InvoiceLineItems } from '../components/invoices/InvoiceLineItems';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Printer, CheckCircle, Save, Pencil } from 'lucide-react';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice } = useInvoices();
  const { clients } = useClients();
  const { vehicles } = useVehicles();
  const { jobs } = useJobs();
  const { stock } = useStock();

  const invoice = invoices.find(inv => inv.id === id);
  const client = clients.find(c => c.id === invoice?.clientId);
  const job = jobs.find(j => j.id === invoice?.jobId);
  const vehicle = vehicles.find(v => v.id === job?.vehicleId);

  const [isEditing, setIsEditing] = useState(false);
  const [draftItems, setDraftItems] = useState(invoice?.lineItems || []);
  const [draftLabor, setDraftLabor] = useState(invoice?.laborCost || 0);

  useEffect(() => {
    if (invoice) {
      setDraftItems(invoice.lineItems);
      setDraftLabor(invoice.laborCost);
    }
  }, [invoice?.id]);

  if (!invoice) return <div className="p-8 text-center text-gray-500 font-bold">Invoice Not Found</div>;

  const handleMarkAsPaid = () => {
    updateInvoice({ ...invoice, status: 'Paid' });
  };

  const handleSaveEdits = () => {
    updateInvoice({ ...invoice, lineItems: draftItems, laborCost: draftLabor });
    setIsEditing(false);
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
          {invoice.status === 'Unpaid' && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit Items
            </Button>
          )}
          {isEditing && (
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveEdits}>
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          )}
          {invoice.status === 'Unpaid' && !isEditing && (
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkAsPaid}>
              <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
          <InvoiceLineItems
            items={draftItems}
            onChange={setDraftItems}
            laborCost={draftLabor}
            onLaborChange={setDraftLabor}
            stock={stock}
          />
        </div>
      ) : (
        <div className="print-area print:shadow-none print:m-0">
          <InvoiceTemplate
            invoice={invoice}
            client={client}
            vehicle={vehicle}
          />
        </div>
      )}
    </div>
  );
}

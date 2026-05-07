import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { useVehicles } from '../hooks/useVehicles';
import { useClients } from '../hooks/useClients';
import { useStock } from '../hooks/useStock';
import { useInvoices } from '../hooks/useInvoices';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { PartsUsedTable } from '../components/jobs/PartsUsedTable';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { 
  ArrowLeft, 
  User, 
  Car, 
  Calendar, 
  Settings, 
  Plus, 
  FileCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { JOB_STATUSES, TAX_RATE } from '../lib/constants';
import { JobStatus, Invoice } from '../types';

export function JobCardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob } = useJobs();
  const { vehicles } = useVehicles();
  const { clients } = useClients();
  const { stock, updateQuantity } = useStock();
  const { addInvoice, invoices } = useInvoices();

  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);

  const job = useMemo(() => jobs.find(j => j.id === id), [jobs, id]);
  const vehicle = useMemo(() => vehicles.find(v => v.id === job?.vehicleId), [vehicles, job]);
  const client = useMemo(() => clients.find(c => c.id === vehicle?.clientId), [clients, vehicle]);
  const jobInvoice = useMemo(() => invoices.find(inv => inv.jobId === id), [invoices, id]);

  if (!job) return <div>Job Not Found</div>;

  const handleStatusChange = (newStatus: JobStatus) => {
    updateJob({
      ...job,
      status: newStatus,
      completedAt: newStatus === 'Completed' ? new Date().toISOString() : job.completedAt
    });
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    const existingIndex = job.partsUsed.findIndex(p => p.partId === selectedPartId);
    let newParts;

    if (existingIndex > -1) {
      newParts = [...job.partsUsed];
      newParts[existingIndex].quantity += partQty;
    } else {
      newParts = [...job.partsUsed, { partId: selectedPartId, quantity: partQty }];
    }

    updateJob({ ...job, partsUsed: newParts });
    updateQuantity(selectedPartId, -partQty);
    setIsAddPartOpen(false);
    setSelectedPartId('');
    setPartQty(1);
  };

  const handleGenerateInvoice = () => {
    if (jobInvoice) {
      navigate(`/invoices/${jobInvoice.id}`);
      return;
    }

    const lineItems = job.partsUsed.map(item => {
      const p = stock.find(part => part.id === item.partId);
      return {
        description: p?.name || 'Part',
        qty: item.quantity,
        unitCost: p?.unitCost || 0
      };
    });

    const newInvoice: Invoice = {
      id: `INV-${generateId()}`,
      jobId: job.id,
      clientId: client?.id || '',
      lineItems,
      laborCost: job.laborCost,
      taxRate: TAX_RATE,
      status: 'Unpaid',
      issuedAt: new Date().toISOString()
    };

    addInvoice(newInvoice);
    navigate(`/invoices/${newInvoice.id}`);
  };

  const totalPartsCost = job.partsUsed.reduce((acc, item) => {
    const p = stock.find(part => part.id === item.partId);
    return acc + (item.quantity * (p?.unitCost || 0));
  }, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="-ml-4" onClick={() => navigate('/jobs')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="text-rose-600 hover:bg-rose-50 border-rose-100" onClick={() => { deleteJob(job.id); navigate('/jobs'); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Job Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Job Card #{job.id}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <JobStatusBadge status={job.status} />
                  <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">
                    Started {formatDate(job.startedAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.values(JOB_STATUSES).map(s => (
                  <Button 
                    key={s} 
                    size="sm" 
                    variant={job.status === s ? 'primary' : 'outline'}
                    onClick={() => handleStatusChange(s)}
                    disabled={job.status === 'Completed' && s !== 'Completed'}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Job Description</h3>
                <p className="text-gray-800 font-medium">{job.description}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Parts Inventory Applied</h3>
                  {job.status !== 'Completed' && (
                    <Button variant="outline" size="sm" onClick={() => setIsAddPartOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Part
                    </Button>
                  )}
                </div>
                <PartsUsedTable parts={job.partsUsed} allParts={stock} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Context */}
        <div className="space-y-6">
          {/* Customer & Vehicle Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                  {client?.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{client?.name || 'Walk-in'}</p>
                  <p className="text-xs text-gray-500">{client?.phone}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1 border-t border-gray-50 pt-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vehicle</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-gray-900 tracking-tighter">{vehicle?.plate}</p>
                  <p className="text-xs text-gray-500">{vehicle?.make} {vehicle?.model}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1 border-t border-gray-50 pt-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Technician</h3>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <p className="font-bold text-gray-900">{job.technicianName}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
            <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4">Cost Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-100">Parts Total</span>
                <span className="font-bold">{formatCurrency(totalPartsCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-100">Labor Charge</span>
                <span className="font-bold">{formatCurrency(job.laborCost)}</span>
              </div>
              <div className="pt-4 border-t border-blue-500 flex justify-between items-baseline">
                <span className="text-sm font-bold">Estimated Total</span>
                <span className="text-2xl font-black">{formatCurrency(totalPartsCost + job.laborCost)}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-6 bg-white text-blue-600 hover:bg-blue-50"
              onClick={handleGenerateInvoice}
              disabled={job.status !== 'Completed' && !jobInvoice}
            >
              {jobInvoice ? <FileCheck className="w-4 h-4 mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              {jobInvoice ? 'View Invoice' : 'Generate Invoice'}
            </Button>
            {job.status !== 'Completed' && !jobInvoice && (
              <p className="text-[10px] text-blue-200 mt-2 text-center italic">Job must be marked "Completed" to invoice</p>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isAddPartOpen} onClose={() => setIsAddPartOpen(false)} title="Apply Spare Part">
        <form onSubmit={handleAddPart} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Select Part from Stock</label>
            <select 
              required
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
            >
              <option value="">Select a part</option>
              {stock.map(p => (
                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                  {p.name} — ({p.quantity} available) — {formatCurrency(p.unitCost)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Quantity To Use</label>
            <input 
              type="number" required min="1"
              max={stock.find(p => p.id === selectedPartId)?.quantity || 1}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={partQty}
              onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddPartOpen(false)}>Cancel</Button>
            <Button type="submit">Apply to Job</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

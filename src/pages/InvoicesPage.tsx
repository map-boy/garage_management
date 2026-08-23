import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/useInvoices';
import { useClients } from '../hooks/useClients';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Search, FileText, Eye, Printer, Filter, CheckCircle2, AlertTriangle, Clock, Minus } from 'lucide-react';
import { formatCurrency, formatDate, calculateInvoiceTotals } from '../lib/utils';
import type { Invoice } from '../types';

/**
 * Compact delivery indicator for the list view. An operator scanning the day's
 * invoices needs to spot the ones that never reached the customer without
 * opening each record.
 */
function WhatsAppStatusCell({ invoice }: { invoice: Invoice }) {
  const delivery = invoice.status === 'Paid'
    ? invoice.whatsappPaid
    : invoice.whatsappIssued;

  switch (delivery?.state) {
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600" title="Delivered on WhatsApp">
          <CheckCircle2 className="w-3.5 h-3.5" /> Sent
        </span>
      );
    case 'sending':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600" title="Delivery in progress">
          <Clock className="w-3.5 h-3.5" /> Sending
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600" title={delivery.lastError || 'Delivery failed'}>
          <AlertTriangle className="w-3.5 h-3.5" /> Failed
        </span>
      );
    case 'skipped':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600" title={delivery.lastError || 'Skipped'}>
          <AlertTriangle className="w-3.5 h-3.5" /> Skipped
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-300" title="Not sent yet">
          <Minus className="w-3.5 h-3.5" />
        </span>
      );
  }
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const { invoices } = useInvoices();
  const { clients } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const clientNameById = new Map(clients.map(c => [c.id, c.name?.toLowerCase() ?? '']));

    return invoices
      .filter(inv => {
        // `client?.name.toLowerCase().includes(...)` used to yield undefined
        // for an invoice whose client had been deleted, which is falsy — so
        // those invoices vanished from the list entirely, even with an empty
        // search box. Coercing to a boolean keeps orphaned invoices findable.
        const matchesSearch =
          !term ||
          inv.id.toLowerCase().includes(term) ||
          (clientNameById.get(inv.clientId) ?? '').includes(term);

        return matchesSearch && (statusFilter === 'All' || inv.status === statusFilter);
      })
      // Newest first. Sorting by issue date rather than reversing insertion
      // order keeps the list stable as Firestore streams updates in.
      .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? ''));
  }, [invoices, clients, searchTerm, statusFilter]);

  const handlePrint = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/invoices/${id}`);
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Invoicing</h1>
          <p className="text-sm text-gray-500 font-medium font-mono">Total Sales: {invoices.length} Records</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 flex-1 w-full sm:w-auto shadow-xs">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by invoice # or client name..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full ml-3 outline-hidden"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table headers={['Invoice #', 'Client', 'Date', 'Total Amount', 'Status', 'WhatsApp', 'Actions']}>
          {filtered.map((inv) => {
            const client = clients.find(c => c.id === inv.clientId);
            const { total } = calculateInvoiceTotals(inv.lineItems, inv.laborCost, inv.taxRate);

            return (
              <TableRow key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                <TableCell className="font-black text-gray-900 uppercase tracking-tighter">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    {inv.id}
                  </div>
                </TableCell>
                <TableCell className="font-bold text-gray-700">{client?.name || 'Unknown'}</TableCell>
                <TableCell className="text-xs font-mono">{formatDate(inv.issuedAt)}</TableCell>
                <TableCell className="font-black text-gray-900">{formatCurrency(total)}</TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'Paid' ? 'success' : 'danger'}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <WhatsAppStatusCell invoice={inv} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}`); }}>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handlePrint(e, inv.id)}>
                      <Printer className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">No invoices found.</td>
            </tr>
          )}
        </Table>
      </div>
    </div>
  );
}

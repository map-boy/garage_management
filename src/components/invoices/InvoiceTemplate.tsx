import { Invoice, Client, Vehicle } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { TAX_RATE } from '../../lib/constants';

interface InvoiceTemplateProps {
  invoice: Invoice;
  client?: Client;
  vehicle?: Vehicle;
}

export function InvoiceTemplate({ invoice, client, vehicle }: InvoiceTemplateProps) {
  const subtotal = invoice.lineItems.reduce((acc, item) => acc + (item.qty * item.unitCost), 0) + invoice.laborCost;
  const tax = subtotal * invoice.taxRate;
  const total = subtotal + tax;

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto border border-gray-200 print:border-none print:shadow-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-black text-blue-600 mb-2">GarageFlow</h1>
          <p className="text-sm text-gray-500">123 Industrial Area</p>
          <p className="text-sm text-gray-500">Nairobi, Kenya</p>
          <p className="text-sm text-gray-500">+254 700 000 000</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 uppercase">Invoice</h2>
          <p className="text-sm font-bold">#{invoice.id}</p>
          <p className="text-sm text-gray-500 mt-1">Issued: {formatDate(invoice.issuedAt)}</p>
          <div className={`mt-4 inline-block px-3 py-1 rounded-sm text-xs font-bold uppercase ${
            invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {invoice.status}
          </div>
        </div>
      </div>

      {/* Bill To / Vehicle Info */}
      <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-gray-100 py-8">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Bill To</h3>
          <p className="font-bold text-gray-900">{client?.name || 'Walk-in Client'}</p>
          <p className="text-sm text-gray-600">{client?.email}</p>
          <p className="text-sm text-gray-600">{client?.phone}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Vehicle Details</h3>
          <p className="text-sm text-gray-900">
            <span className="font-bold">Registration:</span> {vehicle?.plate || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-bold">Make/Model:</span> {vehicle?.make} {vehicle?.model}
          </p>
          {vehicle?.year && (
            <p className="text-sm text-gray-600">
              <span className="font-bold">Year:</span> {vehicle.year}
            </p>
          )}
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full mb-12">
        <thead className="border-b-2 border-gray-900">
          <tr>
            <th className="text-left py-3 text-sm font-bold uppercase">Description</th>
            <th className="text-center py-3 text-sm font-bold uppercase w-20">Qty</th>
            <th className="text-right py-3 text-sm font-bold uppercase w-32">Unit Cost</th>
            <th className="text-right py-3 text-sm font-bold uppercase w-32">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.lineItems.map((item, i) => (
            <tr key={i}>
              <td className="py-4 text-sm text-gray-700">{item.description}</td>
              <td className="py-4 text-center text-sm text-gray-700">{item.qty}</td>
              <td className="py-4 text-right text-sm text-gray-700">{formatCurrency(item.unitCost)}</td>
              <td className="py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(item.qty * item.unitCost)}</td>
            </tr>
          ))}
          {invoice.laborCost > 0 && (
            <tr>
              <td className="py-4 text-sm text-gray-700">Labor Charges</td>
              <td className="py-4 text-center text-sm text-gray-700">1</td>
              <td className="py-4 text-right text-sm text-gray-700">{formatCurrency(invoice.laborCost)}</td>
              <td className="py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(invoice.laborCost)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>VAT ({TAX_RATE * 100}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-black text-gray-900 pt-3 border-t border-gray-900">
            <span>Grand Total</span>
            <span className="text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-24 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>Thank you for choosing GarageFlow for your vehicle maintenance.</p>
        <p className="mt-1">Generated by GarageFlow GMS - Offline African Garage Solution</p>
      </div>
    </div>
  );
}

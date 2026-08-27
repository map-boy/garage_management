import { Invoice, Client, Vehicle } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { settingsService } from '../../services/settingsService';
import defaultLogo from '../../assets/logo.png';

interface InvoiceTemplateProps {
  invoice: Invoice;
  client?: Client;
  vehicle?: Vehicle;
}

export function InvoiceTemplate({ invoice, client, vehicle }: InvoiceTemplateProps) {
  const settings = settingsService.get();
  // A free service is a line item priced at zero: work the garage absorbed
  // (a wash after a paint job, cleaning parts it dirtied). It is shown to the
  // owner so the real cost of the vehicle is visible, but charged at nothing.
  const chargeable = invoice.lineItems.filter(i => !i.isFree);
  const freeServices = invoice.lineItems.filter(i => i.isFree);
  const partsTotal = chargeable.reduce((acc, item) => acc + (item.qty * item.unitCost), 0);
  // Free to the client, still paid for by the garage - so it counts as spend.
  const freeCost = freeServices.reduce((acc, item) => acc + (item.qty * item.unitCost), 0);
  const total = partsTotal + invoice.laborCost + freeCost;

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto border border-gray-200 print:border-none print:shadow-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
<img src={settings.logoUrl || defaultLogo} alt={settings.garageName} className="h-16 mb-2 object-contain" />
          <h1 className="text-2xl font-black text-blue-600 mb-2">{settings.garageName}</h1>
          {settings.address && <p className="text-sm text-gray-500">{settings.address}</p>}
          {settings.phone && <p className="text-sm text-gray-500">{settings.phone}</p>}
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
          {chargeable.map((item, i) => (
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

      {freeServices.length > 0 && (


        <div className="mb-8 border border-amber-100 bg-amber-50/40 rounded-lg p-4">


          <h3 className="text-xs font-bold text-amber-700 uppercase mb-2">Free Services &mdash; not charged, but paid for by the garage</h3>


          <ul className="space-y-1">


            {freeServices.map((item, i) => (


              <li key={i} className="flex justify-between text-sm text-gray-700">


                <span>{item.description}{item.qty > 1 ? ` x${item.qty}` : ''}</span>


                <span className="font-bold text-amber-700">{formatCurrency(item.qty * item.unitCost)} <span className="text-[10px] text-gray-400 uppercase">absorbed</span></span>


              </li>


            ))}


          </ul>


        </div>


      )}



      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Parts &amp; Materials</span>
            <span>{formatCurrency(partsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Labour</span>
            <span>{formatCurrency(invoice.laborCost)}</span>
          </div>
          {freeCost > 0 && (
            <div className="flex justify-between text-sm text-amber-700">
              <span>Free services absorbed</span>
              <span>{formatCurrency(freeCost)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-lg font-black text-gray-900 pt-3 border-t border-gray-900">
            <span>Total Spent</span>
            <span className="text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-24 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>Thank you for choosing {settings.garageName} for your vehicle maintenance.</p>
      </div>
    </div>
  );
}



import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { Invoice } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useInvoices } from '../../hooks/useInvoices';

/**
 * What the garage actually made on this vehicle.
 *
 * The client's real invoice comes from EBM, not from this system. What the
 * system knows is what the job COST: parts, materials and paid labour. The
 * owner types in what EBM billed, and this shows the difference — which is
 * the number that tells them whether the job was worth doing.
 *
 * Free services and salaried technicians are already excluded from the cost
 * side, so they correctly show as zero-cost rather than inflating expenses.
 */
export function InvoiceProfitCalculator({ invoice }: { invoice: Invoice }) {
  const { updateInvoice } = useInvoices();
  const [charged, setCharged] = useState<number | ''>(invoice.amountCharged ?? '');

  useEffect(() => { setCharged(invoice.amountCharged ?? ''); }, [invoice.id]);

  const partsCost = invoice.lineItems.filter(i => !i.isFree).reduce((a, i) => a + i.qty * i.unitCost, 0);
  const freeCost = invoice.lineItems.filter(i => i.isFree).reduce((a, i) => a + i.qty * i.unitCost, 0);
  const expenses = partsCost + invoice.laborCost + freeCost;
  const chargedNum = typeof charged === 'number' ? charged : 0;
  const profit = chargedNum - expenses;
  const margin = chargedNum > 0 ? (profit / chargedNum) * 100 : 0;
  const entered = charged !== '';

  const persist = () => {
    const value = typeof charged === 'number' ? charged : 0;
    if (value !== (invoice.amountCharged ?? 0)) {
      updateInvoice({ ...invoice, amountCharged: value });
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-blue-600" />
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Profit on this vehicle</h3>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        This system records what the job <strong>cost</strong>. Enter what you actually
        billed the client on the EBM invoice to see what you made.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">Amount charged to client</label>
          <input
            type="number" min={0} step={100} placeholder="0"
            className="w-full p-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-0 outline-none text-lg font-bold"
            value={charged}
            onChange={(e) => setCharged(e.target.value === '' ? '' : parseFloat(e.target.value))}
            onBlur={persist}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">Total spent (expenses)</label>
          <div className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-lg font-bold text-gray-700">
            {formatCurrency(expenses)}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
        <div className="flex justify-between text-gray-500">
          <span>Parts &amp; materials</span><span>{formatCurrency(partsCost)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Labour paid</span><span>{formatCurrency(invoice.laborCost)}</span>
        </div>
        {freeCost > 0 && (
          <div className="flex justify-between text-amber-700 font-medium">
            <span>Free services absorbed</span><span>{formatCurrency(freeCost)}</span>
          </div>
        )}
      </div>

      <div className={`rounded-xl p-5 border-2 ${
        !entered ? 'bg-gray-50 border-gray-200'
        : profit > 0 ? 'bg-emerald-50 border-emerald-200'
        : profit < 0 ? 'bg-rose-50 border-rose-200'
        : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profit >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                         : <TrendingDown className="w-5 h-5 text-rose-600" />}
            <span className="text-xs font-black uppercase tracking-wide text-gray-700">
              {!entered ? 'Enter the amount charged' : profit >= 0 ? 'Income' : 'Loss'}
            </span>
          </div>
          <span className={`text-3xl font-black ${
            !entered ? 'text-gray-300'
            : profit > 0 ? 'text-emerald-700'
            : profit < 0 ? 'text-rose-700' : 'text-amber-700'}`}>
            {entered ? formatCurrency(profit) : '—'}
          </span>
        </div>
        {entered && chargedNum > 0 && (
          <p className="text-xs font-bold mt-2 text-gray-500">
            Margin: {margin.toFixed(1)}% of what you charged
          </p>
        )}
        {entered && profit < 0 && (
          <p className="text-xs font-bold mt-2 text-rose-600">
            This job cost more than it brought in.
          </p>
        )}
      </div>
    </div>
  );
}

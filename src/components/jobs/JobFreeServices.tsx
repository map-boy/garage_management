import { useState } from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { JobCard } from '../../types';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

interface JobFreeServicesProps {
  job: JobCard;
  onChange: (job: JobCard) => void;
  editable?: boolean;
}

const SUGGESTIONS = ['Car wash', 'Interior cleaning', 'Re-clean panel', 'Polish', 'Tyre pressure check', 'Top-up fluids'];

/**
 * Work given to the client at no charge - and what it cost the garage to give.
 *
 * "Free" is only free to the client. A car wash is bought from someone, or
 * costs a worker's hour; re-cleaning a panel the garage dirtied consumes real
 * materials. So the cost is recorded and counted in the vehicle's expenses,
 * while the client is charged nothing. That difference is exactly what the
 * owner needs to see: money spent that never came back.
 */
export function JobFreeServices({ job, onChange, editable = true }: JobFreeServicesProps) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const services = job.freeServices ?? [];
  const totalCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);

  const add = (description: string) => {
    const value = description.trim();
    if (!value) return;
    onChange({ ...job, freeServices: [...services, { description: value, cost: typeof cost === 'number' ? cost : 0 }] });
    setText(''); setCost(''); setAdding(false);
  };

  const remove = (index: number) =>
    onChange({ ...job, freeServices: services.filter((_, i) => i !== index) });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Free Services</h3>
          {services.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {services.length} &middot; {formatCurrency(totalCost)} absorbed
            </span>
          )}
        </div>
        {editable && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Free Service
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Given free to the client, but it still costs you. Enter what it cost the garage &mdash;
        it counts in expenses, and the client is charged nothing.
      </p>

      {adding && (
        <div className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Service</label>
              <input
                autoFocus type="text" placeholder="e.g. Car wash after paint job"
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') add(text); if (e.key === 'Escape') { setAdding(false); setText(''); setCost(''); } }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Cost to garage</label>
              <input
                type="number" min={0} step={100} placeholder="0"
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold"
                value={cost}
                onChange={(e) => setCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} type="button" onClick={() => setText(s)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-700">
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => add(text)}>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setText(''); setCost(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No free services recorded.</p>
      ) : (
        <div className="space-y-2">
          {services.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/40">
              <span className="text-sm font-medium text-gray-800">{s.description}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-amber-700">{formatCurrency(s.cost || 0)}</span>
                <span className="text-[10px] font-black uppercase text-gray-400">absorbed</span>
                {editable && (
                  <button onClick={() => remove(i)} className="text-rose-400 hover:text-rose-600" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import { Part } from '../../types';

interface LineItem {
  description: string;
  qty: number;
  unitCost: number;
  partId?: string;
}

interface InvoiceLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  laborCost: number;
  onLaborChange: (cost: number) => void;
  stock: Part[];
}

export function InvoiceLineItems({ items, onChange, laborCost, onLaborChange, stock }: InvoiceLineItemsProps) {
  const addItem = () => {
    onChange([...items, { description: '', qty: 1, unitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const selectPart = (index: number, partId: string) => {
    const newItems = [...items];
    if (!partId) {
      newItems[index] = { ...newItems[index], partId: undefined };
    } else {
      const part = stock.find(p => p.id === partId);
      if (part) {
        newItems[index] = {
          ...newItems[index],
          partId: part.id,
          description: part.name,
          unitCost: part.unitCost,
        };
      }
    }
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700">Billable Items</h4>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
            <div className="flex gap-2 items-start">
              <div className="w-48">
                <select
                  className="w-full text-sm p-2 rounded border border-gray-200 bg-white"
                  value={item.partId || ''}
                  onChange={(e) => selectPart(i, e.target.value)}
                >
                  <option value="">Custom item...</option>
                  {stock.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} ({p.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Description"
                  className="w-full text-sm p-2 rounded border border-gray-200"
                  value={item.description}
                  disabled={!!item.partId}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  placeholder="Qty"
                  className="w-full text-sm p-2 rounded border border-gray-200 text-center"
                  value={item.qty}
                  onChange={(e) => updateItem(i, 'qty', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  placeholder="Unit Cost"
                  className="w-full text-sm p-2 rounded border border-gray-200 text-right"
                  value={item.unitCost}
                  onChange={(e) => updateItem(i, 'unitCost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="w-32 py-2 text-right text-sm font-medium">
                {formatCurrency(item.qty * item.unitCost)}
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" onClick={() => removeItem(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-gray-100 flex justify-between items-center px-3">
        <div className="text-sm font-bold text-gray-700">Labor Charges</div>
        <div className="w-32">
          <input
            type="number"
            placeholder="Labor Cost"
            className="w-full text-sm p-2 rounded border border-gray-200 text-right font-medium"
            value={laborCost}
            onChange={(e) => onLaborChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
}

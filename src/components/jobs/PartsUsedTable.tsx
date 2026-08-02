import { Part } from '../../types';
import { Table, TableRow, TableCell } from '../ui/Table';
import { formatCurrency } from '../../lib/utils';
import { Trash2 } from 'lucide-react';

interface PartsUsedTableProps {
  parts: { partId: string; quantity: number }[];
  allParts: Part[];
  editable?: boolean;
  onUpdateQty?: (partId: string, newQty: number) => void;
  onRemove?: (partId: string) => void;
}

export function PartsUsedTable({ parts, allParts, editable = false, onUpdateQty, onRemove }: PartsUsedTableProps) {
  if (parts.length === 0) {
    return <p className="text-sm text-gray-500 italic py-4">No parts recorded for this job.</p>;
  }
  const headers = editable
    ? ['Part ID', 'Name', 'Qty', 'Unit Cost', 'Total', 'Actions']
    : ['Part ID', 'Name', 'Qty', 'Unit Cost', 'Total'];
  return (
    <Table headers={headers}>
      {parts.map((item, i) => {
        const partInfo = allParts.find(p => p.id === item.partId);
        return (
          <TableRow key={i}>
            <TableCell>{item.partId}</TableCell>
            <TableCell>{partInfo?.name || 'Unknown Part'}</TableCell>
            <TableCell>
              {editable ? (
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => onUpdateQty?.(item.partId, Math.max(1, Number(e.target.value)))}
                  className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
                />
              ) : (
                item.quantity
              )}
            </TableCell>
            <TableCell>{formatCurrency(partInfo?.unitCost || 0)}</TableCell>
            <TableCell className="font-medium">
              {formatCurrency((partInfo?.unitCost || 0) * item.quantity)}
            </TableCell>
            {editable && (
              <TableCell>
                <button
                  onClick={() => onRemove?.(item.partId)}
                  className="text-rose-600 hover:text-rose-800"
                  title="Remove part"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </TableCell>
            )}
          </TableRow>
        );
      })}
    </Table>
  );
}

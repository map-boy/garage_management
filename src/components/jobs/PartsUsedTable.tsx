import { Part } from '../../types';
import { Table, TableRow, TableCell } from '../ui/Table';
import { formatCurrency } from '../../lib/utils';

interface PartsUsedTableProps {
  parts: { partId: string; quantity: number }[];
  allParts: Part[];
}

export function PartsUsedTable({ parts, allParts }: PartsUsedTableProps) {
  if (parts.length === 0) {
    return <p className="text-sm text-gray-500 italic py-4">No parts recorded for this job.</p>;
  }

  return (
    <Table headers={['Part ID', 'Name', 'Qty', 'Unit Cost', 'Total']}>
      {parts.map((item, i) => {
        const partInfo = allParts.find(p => p.id === item.partId);
        return (
          <TableRow key={i}>
            <TableCell>{item.partId}</TableCell>
            <TableCell>{partInfo?.name || 'Unknown Part'}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{formatCurrency(partInfo?.unitCost || 0)}</TableCell>
            <TableCell className="font-medium">
              {formatCurrency((partInfo?.unitCost || 0) * item.quantity)}
            </TableCell>
          </TableRow>
        );
      })}
    </Table>
  );
}

import React, { useState } from 'react';
import { useStock } from '../hooks/useStock';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Plus, Search, Package, Trash2, Edit, AlertCircle } from 'lucide-react';
import { generateId, formatCurrency } from '../lib/utils';
import { settingsService } from '../services/settingsService';
import { Part } from '../types';

export function StockPage() {
  const currency = settingsService.get().currency;
  const { stock, addPart, updatePart, deletePart } = useStock();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState<Partial<Part>>({
    name: '', partNumber: '', quantity: 0, reorderLevel: 5, unitCost: 0, supplier: ''
  });

  const filtered = stock.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setSelectedPart(null);
    setFormData({ name: '', partNumber: '', quantity: 0, reorderLevel: 5, unitCost: 0, supplier: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Part) => {
    setSelectedPart(p);
    setFormData(p);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Part = {
      id: selectedPart?.id || generateId(),
      name: formData.name || '',
      partNumber: formData.partNumber || '',
      quantity: Number(formData.quantity) || 0,
      reorderLevel: Number(formData.reorderLevel) || 5,
      unitCost: Number(formData.unitCost) || 0,
      supplier: formData.supplier || ''
    };
    
    if (selectedPart) {
      updatePart(data);
    } else {
      addPart(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Spare Parts Inventory</h1>
          <p className="text-sm text-gray-500 font-medium font-mono">Stock Items: {stock.length}</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> New Part
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Items</p>
            <p className="text-lg font-black text-gray-900">{stock.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Low Stock</p>
            <p className="text-lg font-black text-gray-900">
              {stock.filter(p => p.quantity <= p.reorderLevel).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2 max-w-sm">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search parts, numbers or suppliers..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full ml-3 outline-hidden"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table headers={['Part Details', 'Quantity', 'Unit Cost', 'Supplier', 'Status', 'Actions']}>
          {filtered.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div>
                  <p className="font-bold text-gray-900 leading-tight">{p.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{p.partNumber}</p>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{p.quantity}</TableCell>
              <TableCell className="font-bold">{formatCurrency(p.unitCost)}</TableCell>
              <TableCell className="text-sm text-gray-600">{p.supplier}</TableCell>
              <TableCell>
                {p.quantity <= p.reorderLevel ? (
                  <Badge variant="warning">Order Soon</Badge>
                ) : (
                  <Badge variant="success">In Stock</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)}>
                    <Edit className="w-4 h-4 text-gray-400" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedPart(p); setIsDeleteOpen(true); }}>
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">No inventory items found.</td>
            </tr>
          )}
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Stock Item Details">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Part Name</label>
              <input 
                type="text" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Part Number/SKU</label>
              <input 
                type="text" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                value={formData.partNumber}
                onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Current Qty</label>
              <input 
                type="number" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={formData.quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({...formData, quantity: e.target.value === "" ? 0 : parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Reorder Level</label>
              <input 
                type="number" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={formData.reorderLevel}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({...formData, reorderLevel: e.target.value === "" ? 0 : parseInt(e.target.value) || 5})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Unit Cost ({currency})</label>
              <input 
                type="number" required
                className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                value={formData.unitCost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({...formData, unitCost: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Supplier Name</label>
            <input 
              type="text" required
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Update Stock</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedPart && deletePart(selectedPart.id)}
        title="Delete Part"
        message={`Delete ${selectedPart?.name} from inventory? Current records show ${selectedPart?.quantity} units left.`}
      />
    </div>
  );
}



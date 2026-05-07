import { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { invoiceService } from '../services/invoiceService';

export function useInvoices(clientId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const refresh = () => {
    if (clientId) {
      setInvoices(invoiceService.getByClientId(clientId));
    } else {
      setInvoices(invoiceService.getAll());
    }
  };

  useEffect(() => {
    refresh();
  }, [clientId]);

  const addInvoice = (i: Invoice) => {
    invoiceService.save(i);
    refresh();
  };

  const updateInvoice = (i: Invoice) => {
    invoiceService.save(i);
    refresh();
  };

  const deleteInvoice = (id: string) => {
    invoiceService.deleteById(id);
    refresh();
  };

  return { invoices, addInvoice, updateInvoice, deleteInvoice, refresh };
}

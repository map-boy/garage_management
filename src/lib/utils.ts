import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { settingsService } from '../services/settingsService';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * The single money formula for the app.
 *
 * The invoice list, the printed template and the PDF the customer receives
 * over WhatsApp must show the same grand total — a customer comparing the
 * screen against the PDF and seeing different numbers destroys trust in the
 * whole system. Mirrors calculateTotals() in functions/src/lib/invoicePdf.ts.
 * Tax applies to parts plus labour.
 */
export function calculateInvoiceTotals(
  lineItems: { qty: number; unitCost: number }[] | undefined,
  laborCost: number | undefined,
  taxRate: number | undefined
): InvoiceTotals {
  const subtotal = (lineItems ?? []).reduce(
    (acc, item) => acc + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
    0
  ) + (Number(laborCost) || 0);
  const tax = subtotal * (Number(taxRate) || 0);
  return { subtotal, tax, total: subtotal + tax };
}

export function formatCurrency(amount: number): string {
  const currency = settingsService.get().currency || 'RWF';
  try {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatDate(dateString: string | number | Date | undefined | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

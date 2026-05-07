export type PaymentStatus = 'Paid' | 'Unpaid';

export interface Invoice {
  id: string;
  jobId: string;
  clientId: string;
  lineItems: { description: string; qty: number; unitCost: number }[];
  laborCost: number;
  taxRate: number;
  status: PaymentStatus;
  issuedAt: string;
}

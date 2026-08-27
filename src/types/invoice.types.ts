export type PaymentStatus = 'Paid' | 'Unpaid';

export interface Invoice {
  id: string;
  jobId: string;
  clientId: string;
  lineItems: { description: string; qty: number; unitCost: number; isFree?: boolean }[];
  laborCost: number;
  /** Legacy. Kept so old records load; never used in any total. */
  taxRate?: number;
  status: PaymentStatus;
  issuedAt: string;
  /** What the client was actually billed on the EBM invoice. */
  amountCharged?: number;
}

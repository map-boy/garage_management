export type PaymentStatus = 'Paid' | 'Unpaid';

/** Lifecycle of one WhatsApp delivery. Written only by Cloud Functions. */
export type WhatsAppDeliveryState =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped';

export interface WhatsAppDelivery {
  state: WhatsAppDeliveryState;
  kind?: 'issued' | 'paid';
  attempts?: number;
  lastError?: string;
  /** Firestore Timestamps; converted at the edge where they are displayed. */
  updatedAt?: { toDate?: () => Date } | null;
  sentAt?: { toDate?: () => Date } | null;
  to?: string;
  pdfUrl?: string;
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitCost: number;
}

export interface Invoice {
  id: string;
  jobId: string;
  clientId: string;
  lineItems: InvoiceLineItem[];
  laborCost: number;
  taxRate: number;
  status: PaymentStatus;
  issuedAt: string;
  /** Set by the backend when the invoice is first issued (job complete). */
  whatsappIssued?: WhatsAppDelivery;
  /** Set by the backend when the invoice is marked paid. */
  whatsappPaid?: WhatsAppDelivery;
}

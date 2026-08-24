import { useState } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { sendInvoiceWhatsAppFn } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Invoice, WhatsAppDelivery } from '../../types';

interface WhatsAppDeliveryButtonProps {
  invoice: Invoice;
  /** Whether the client this invoice belongs to has a phone number. */
  clientPhone?: string;
}

function toDate(value: WhatsAppDelivery['sentAt']): Date | null {
  const d = value?.toDate?.();
  return d instanceof Date && !isNaN(d.getTime()) ? d : null;
}

function formatWhen(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Shows whether the client actually received this invoice on WhatsApp, and
 * lets an operator send or retry it.
 *
 * This is the only path by which a client is messaged — there are no
 * triggers or scheduled senders behind it, so an invoice reaches the customer
 * exactly when someone here decides it should.
 *
 * The delivery record is written by Cloud Functions and streams back through
 * the same Firestore listener that feeds the rest of the page, so pressing
 * Send updates this in place without a refresh. The backend enforces
 * single-delivery, so a double click cannot double-send — but the button is
 * still disabled while in flight to keep the state legible.
 */
export function WhatsAppDeliveryButton({
  invoice,
  clientPhone,
}: WhatsAppDeliveryButtonProps) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The paid receipt supersedes the issued notice: once an invoice is paid,
  // that is the message the operator cares about having landed.
  const kind: 'issued' | 'paid' = invoice.status === 'Paid' ? 'paid' : 'issued';
  const delivery: WhatsAppDelivery | undefined =
    kind === 'paid' ? invoice.whatsappPaid : invoice.whatsappIssued;

  const state = delivery?.state;
  const sentAt = toDate(delivery?.sentAt);
  const inFlight = busy || state === 'sending';

  const handleSend = async (force: boolean) => {
    if (!profile?.garageId) return;
    setBusy(true);
    setError(null);
    try {
      await sendInvoiceWhatsAppFn({
        garageId: profile.garageId,
        invoiceId: invoice.id,
        kind,
        force,
      });
    } catch (err: unknown) {
      // Callable errors carry the backend's reason in `message` — surface it
      // verbatim, because "quota exhausted" and "no number linked" need very
      // different actions from the operator.
      setError(
        err instanceof Error ? err.message : 'Could not send the message.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!clientPhone) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        No phone number on file for this client
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {state === 'sent' ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {kind === 'paid' ? 'Receipt sent' : 'Invoice sent'}
              {sentAt ? ` · ${formatWhen(sentAt)}` : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSend(true)}
              disabled={inFlight}
            >
              {inFlight ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Send again
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
            onClick={() => handleSend(false)}
            disabled={inFlight}
          >
            {inFlight ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            )}
            {inFlight
              ? 'Sending…'
              : state === 'failed'
                ? 'Retry WhatsApp'
                : `Send ${kind === 'paid' ? 'receipt' : 'invoice'} on WhatsApp`}
          </Button>
        )}

        {state === 'sending' && !busy && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
            <Clock className="w-3.5 h-3.5" />
            Delivery in progress — the phone service may be waking up
          </span>
        )}
      </div>

      {state === 'failed' && delivery?.lastError && !error && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Last attempt failed: {delivery.lastError}
            {delivery.attempts ? ` (attempt ${delivery.attempts})` : ''}
            . Press Retry to try again.
          </span>
        </p>
      )}

      {state === 'skipped' && delivery?.lastError && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {delivery.lastError}
        </p>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}

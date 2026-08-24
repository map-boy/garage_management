# SmartGarage Pro

Garage management for workshops: clients, vehicles, job cards, stock,
invoicing, and operator-driven WhatsApp delivery of invoices and receipts.

Two apps share one Firebase project:

| App | Repo | Who uses it |
| --- | --- | --- |
| Workshop app (this repo) | `garage_management` | Garage staff, on the shop floor and as a desktop build |
| Owner dashboard | `garage-website` | The owner/BOSS, overseeing one or more garages |

---

## Architecture

```
React app (Vite)  ──┐
                    ├── Firebase Auth ── Firestore ── Cloud Functions ──► OpenWA ──► WhatsApp
Owner dashboard  ───┘                                        │
                                                             └──► Azure VM (start/stop)
```

- **Firestore** is the source of truth, scoped per garage under
  `garages/{garageId}/…`. The workshop app is offline-first: Firestore's local
  cache means the shop floor keeps working without a connection, and writes
  sync when it returns.
- **Cloud Functions** own everything the client must not be trusted with:
  sending WhatsApp messages, the message quota, session management, and the
  Azure VM lifecycle.
- **OpenWA** runs on a single Azure VM that is started on demand and
  deallocated when idle, so compute is only paid for around an actual send.

### Data layout

```
users/{uid}                                  role + garageId (identity)
garages/{garageId}                           settings, quota, WhatsApp session
  ├── clients/{id}          vehicles/{id}    jobs/{id}       stock/{id}
  ├── reminders/{id}
  ├── invoices/{id}                          + whatsappIssued / whatsappPaid
  ├── whatsappLogs/{id}                      append-only audit trail
  └── archives/{id}                          month-close manifest
        └── records/{chunk}                  archived jobs + invoices
system/vmState                               Azure VM run state
```

---

## WhatsApp invoice delivery

**Nothing is ever sent automatically.** There are no Firestore triggers and no
scheduled senders: a client is messaged only when a person opens the invoice
and presses *Send on WhatsApp*, which calls `sendInvoiceWhatsApp`. Issuing an
invoice or marking it paid has no outward effect on its own.

The message wording follows the invoice's state — "your invoice" when unpaid,
"we received your payment" when paid — and carries a generated PDF either way.

### How a delivery runs

1. **Claim.** A Firestore transaction moves the invoice's delivery record to
   `sending`. This is what guarantees a customer is never messaged twice and
   the garage never billed twice — a double click, or two staff on two
   machines pressing Send at the same moment, still sends once. A claim older
   than 10 minutes is treated as abandoned and can be retaken, so an
   interrupted send never leaves the invoice permanently stuck.
2. **Wake the VM**, before reserving quota — waking is the step most likely to
   fail, and a reservation held across a 90-second boot can be lost.
3. **Reserve quota** (transactional, resets monthly).
4. **Render and upload the PDF**, then send it through OpenWA.
5. **Record the outcome** on the invoice and in `whatsappLogs`. On failure the
   quota reservation is released — a garage is never billed for a message its
   customer never received.

A failed send stays visible on the invoice with its reason, and is retried
only when someone presses Retry. Nothing retries in the background.

### Delivery states

`pending` → `sending` → `sent` | `failed` | `skipped`

`skipped` means the send was not attempted for a permanent reason, such as the
client having no phone number. These are written only by Cloud Functions;
Firestore rules block clients from touching them, because clearing one would
allow unlimited re-sends against the garage's quota.

---

## Setup

```bash
npm install                 # workshop app
npm --prefix functions ci   # Cloud Functions
npm run dev                 # http://localhost:3000
```

### Secrets

Cloud Functions secrets are stored in Secret Manager, never in the repo:

```bash
firebase functions:secrets:set OPENWA_API_KEY
firebase functions:secrets:set OPENWA_URL
firebase functions:secrets:set AZURE_APP_ID
firebase functions:secrets:set AZURE_PASSWORD
firebase functions:secrets:set AZURE_TENANT
firebase functions:secrets:set AZURE_SUBSCRIPTION_ID
```

`firebase-applet-config.json` holds the Firebase web config. Those values are
public client identifiers, not secrets — access is controlled by Firestore
rules and the auth checks in the callables, not by hiding them.

### Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

Deploy `firestore:indexes` whenever a query changes; a query without its
composite index fails at runtime, not at deploy time.

---

## Testing

```bash
npm run lint         # typecheck the app
npm run test:rules   # 26 Firestore authorization cases (needs Java)
npm test             # both
npm --prefix functions run lint && npm --prefix functions run build
```

`tests/firestore-rules.test.mjs` is worth running before any rules change.
Firestore combines rules with OR, so a broad wildcard can silently re-grant
what a specific rule withholds — that is invisible when reading the file and
only shows up when executed. It has already caught one such leak.

---

## Operations

**A customer did not get their invoice.** Open the invoice: the WhatsApp panel
shows the delivery state and the last error. Press Retry once the cause is
addressed — `skipped` usually means a missing phone number on the client. The
full history is in `garages/{garageId}/whatsappLogs`.

**Messages stopped for everyone.** Check the quota on the owner dashboard. The
counter resets on the first send of each calendar month. If the allowance is
genuinely exhausted, raise `whatsappMessagesLimit` on the garage document —
this is deliberately not editable from the app, since a garage that could
raise its own limit has no limit.

**The number shows as unlinked.** Check the session status on the dashboard. A
status of `unpaired` or `logged_out` means WhatsApp dropped the link and it
must be re-scanned. `unreachable` usually just means the VM is asleep; press
*Wake VM Now*.

**The VM.** It is deallocated at 20:00 Kigali time and after 15 minutes idle,
and started on demand by any send. A first send after a long idle period takes
up to 90 seconds while the VM boots — this is expected, not a failure.

---

## Scaling notes

Decisions here that exist specifically to keep the system healthy over years,
not weeks:

- **Live listeners hold a capped window** of the most recent records. An
  unbounded listener on a collection that grows for the life of the business
  means every page load re-downloads and is billed for all history; start-up
  time then scales with the garage's age rather than its activity. Older
  records stay available through Archives.
- **Month-close archives are chunked.** Firestore caps a document at 1 MiB;
  packing a month of records into one document fails, and fails at the worst
  moment — when closing the month.
- **Sending is operator-driven only.** Beyond being the behaviour the garage
  asked for, this is also what keeps the WhatsApp number safe: bulk and
  automated sending is what gets numbers banned, and a ban costs the garage
  its only channel.
- **The audit log is pruned** after 90 days: long enough to settle a billing
  dispute, short enough that it never becomes a cost of its own.

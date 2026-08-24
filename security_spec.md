# Security Spec: SmartGarage Pro

This describes what is **actually enforced**, and where. Every "must be
denied" case below has an executable test in `tests/firestore-rules.test.mjs`
(`npm run test:rules`). A claim in this document without a passing test is a
claim, not a control.

## Trust model

- **Firestore rules** are the boundary for anything a client touches directly.
- **Cloud Functions** are the boundary for anything a client must not do at
  all: sending WhatsApp messages, moving the quota, managing the WhatsApp
  session, controlling the Azure VM. They use the Admin SDK, which bypasses
  rules — so their own auth checks are the only thing standing there.
- **Callables are public HTTPS endpoints.** The web client's Firebase config
  ships in the JavaScript bundle, so anyone can read the project id and invoke
  every callable directly. An unauthenticated callable is an open door, not an
  internal API.

## Roles

| Role | Scope |
| --- | --- |
| `BOSS` | Every garage; the owner dashboard |
| `owner`, `manager` | Their garage, including destructive and billing actions |
| `receptionist`, `cashier` | Their garage, including sending messages |
| `technician`, `store_keeper` | Their garage, operational records only |

`role` and `garageId` live on `users/{uid}` and are **immutable from the
client** — they are identity, not preferences. A self-created profile may not
declare itself `BOSS`.

## Invariants

1. A user reads and writes only within their own `garageId`. Only `BOSS`
   crosses garages.
2. **Quota fields are server-owned.** `whatsappMessagesUsed`,
   `whatsappMessagesLimit` and `whatsappQuotaPeriod` are client
   write-blocked. A staff member who could raise their own limit has no limit.
3. **WhatsApp session fields are server-owned.** `whatsappSessionId` and its
   status are client write-blocked; pointing a garage at another garage's
   session would let it send as that number.
4. **Invoice delivery records are server-owned.** `whatsappIssued` and
   `whatsappPaid` are client write-blocked, and cannot be present on create.
   Clearing one would allow unlimited re-sends of the same receipt, each
   billed to the garage.
5. **The audit log is append-only and server-written.** `whatsappLogs` is
   readable by managers and owners only, and not writable by any client.
6. `system/vmState` is not client-accessible in either direction.
7. Every message body and phone number crossing a callable is length-capped
   and normalised before use.
8. **No code path messages a customer without a signed-in operator.** There
   are no Firestore triggers and no scheduled senders; every send originates
   from an authenticated callable. This bounds both spend and reputational
   risk: the garage's WhatsApp number cannot be made to send in bulk.

## Denial cases (all tested)

1. Anonymous read of any garage.
2. Staff raising `whatsappMessagesLimit`, or resetting `whatsappMessagesUsed`.
3. Staff overwriting `whatsappSessionId`.
4. Staff clearing an invoice's delivery record (receipt replay).
5. Creating an invoice pre-seeded with a delivery record.
6. Reading another garage's documents, including its invoices and archives.
7. Writing the audit log from a client; reading it as a technician.
8. Escalating one's own `role`, or moving oneself to another `garageId`.
9. A technician deleting an invoice.
10. Reading `system/vmState`.

## Known limitations

- **Anonymous auth.** The workshop app signs in anonymously and provisions a
  garage per device. Anyone who can run the app gets a garage of their own —
  fine for single-tenant use, but it is not user authentication, and a lost
  device is a lost garage. Real accounts are the prerequisite for multi-staff
  deployments.
- **Rules read `users/{uid}` on most checks**, costing a document read per
  evaluation. Moving `role` and `garageId` into custom claims would remove
  that cost and make the checks tamper-proof at the token level.
- **Storage rules are not covered here.** Invoice PDFs are served by
  time-limited signed URLs rather than by rule, so anyone holding a URL can
  read that invoice until it expires (90 days).

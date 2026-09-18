import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED } from './clients.js'

// Demo email-conversation threads, keyed by client id (same ids as
// clients.js). Not every client has a thread — matches how a real inbox
// integration would look (only clients someone has actually emailed show
// up here). `direction` drives which side of the conversation a message
// renders on: 'inbound' = the client wrote to us, 'outbound' = LT wrote to
// the client.
export const EMAIL_LOGS_BY_CLIENT = {
  nykaa: [
    {
      id: 'nykaa-1',
      direction: 'inbound',
      from: 'priyanka.shah@nykaa.com',
      to: 'ops@letstransport.team',
      subject: 'Delay on AWB NYK-000487 — Mumbai to Bengaluru',
      sentAt: '2026-08-12T09:14:00',
      body: "Hi team,\n\nWe have a shipment (AWB NYK-000487) that was supposed to reach Bengaluru yesterday but tracking still shows it at the Mumbai hub. Can you check and confirm the revised ETA?\n\nThanks,\nPriyanka",
    },
    {
      id: 'nykaa-2',
      direction: 'outbound',
      from: 'ops@letstransport.team',
      to: 'priyanka.shah@nykaa.com',
      subject: 'Re: Delay on AWB NYK-000487 — Mumbai to Bengaluru',
      sentAt: '2026-08-12T11:02:00',
      body: "Hi Priyanka,\n\nApologies for the delay — the trip got held up at Mumbai due to a vehicle breakdown. A replacement vehicle has been dispatched and the shipment should reach Bengaluru by tomorrow (13 Aug) morning.\n\nWill keep you posted once it's out for delivery.\n\nRegards,\nOps Team",
    },
    {
      id: 'nykaa-3',
      direction: 'inbound',
      from: 'priyanka.shah@nykaa.com',
      to: 'ops@letstransport.team',
      subject: 'Re: Delay on AWB NYK-000487 — Mumbai to Bengaluru',
      sentAt: '2026-08-13T10:40:00',
      body: 'Thanks for the update, confirmed delivered this morning. Appreciate the quick turnaround.',
    },
    {
      id: 'nykaa-4',
      direction: 'inbound',
      from: 'finance@nykaa.com',
      to: 'billing@letstransport.team',
      subject: 'Query on August invoice — freight vs FOV charge',
      sentAt: '2026-08-19T15:22:00',
      body: "Hi,\n\nOn invoice INV-2026-0819, we're seeing an FOV charge on a shipment that we didn't request FOV for. Could you share the AWB-level breakup so we can reconcile on our end?\n\nRegards,\nNykaa Finance",
    },
    {
      id: 'nykaa-5',
      direction: 'outbound',
      from: 'billing@letstransport.team',
      to: 'finance@nykaa.com',
      subject: 'Re: Query on August invoice — freight vs FOV charge',
      sentAt: '2026-08-20T09:05:00',
      body: 'Hi, sharing the AWB-level breakup as a separate attachment. Will follow up by EOD once Ops confirms whether FOV was auto-applied for that lane.',
      attachments: ['INV-2026-0819-breakup.xlsx'],
    },
  ],
  zepto: [
    {
      id: 'zepto-1',
      direction: 'inbound',
      from: 'logistics@zeptonow.com',
      to: 'onboarding@letstransport.team',
      subject: 'Onboarding — pending KYC documents',
      sentAt: '2026-07-22T12:00:00',
      body: 'Hi team, sharing the pending KYC documents (GST certificate + signed contract) for our onboarding. Let us know if anything else is needed.',
      attachments: ['GST-Certificate.pdf', 'Signed-Contract.pdf'],
    },
    {
      id: 'zepto-2',
      direction: 'outbound',
      from: 'onboarding@letstransport.team',
      to: 'logistics@zeptonow.com',
      subject: 'Re: Onboarding — pending KYC documents',
      sentAt: '2026-07-22T16:45:00',
      body: 'Received, thank you. Your account has now cleared KYC and is with Finance for final pricing approval — should be active within 1-2 business days.',
    },
    {
      id: 'zepto-3',
      direction: 'inbound',
      from: 'logistics@zeptonow.com',
      to: 'ops@letstransport.team',
      subject: 'COD reconciliation for last week',
      sentAt: '2026-08-05T08:30:00',
      body: "Could you share last week's COD collection reconciliation? We're seeing a mismatch of about ₹18,000 against our own records.",
    },
  ],
  boat: [
    {
      id: 'boat-1',
      direction: 'inbound',
      from: 'scm@imaginemarketing.in',
      to: 'ops@letstransport.team',
      subject: 'Bulk pickup request — Bhiwandi hub, 14 Aug',
      sentAt: '2026-08-10T18:12:00',
      body: 'We have a bulk pickup of ~40 AWBs planned from the Bhiwandi hub on 14 Aug. Please confirm vehicle availability in advance.',
    },
    {
      id: 'boat-2',
      direction: 'outbound',
      from: 'ops@letstransport.team',
      to: 'scm@imaginemarketing.in',
      subject: 'Re: Bulk pickup request — Bhiwandi hub, 14 Aug',
      sentAt: '2026-08-11T09:00:00',
      body: 'Confirmed — a 32ft vehicle has been blocked for the 14 Aug pickup slot at Bhiwandi. Please have the AWBs ready by 10am.',
    },
  ],
}

// A client shows up in the search roster the moment it exists (active or
// pending) — email conversations can start during onboarding, not just once
// a client is fully active — same lifecycle stance as Client Configuration.
// Not every client has a submitted contact snapshot (`details.contact`) —
// legacy/active rows fall back to no emails rather than erroring.
function rosterRow(c, status) {
  const contact = c.details?.contact ?? {}
  return {
    id: c.id,
    name: c.name,
    city: c.city,
    status,
    emails: [contact.pocEmail, contact.opsEmail, contact.financeEmail].filter(Boolean),
  }
}

export function searchClientsForEmailLogs(query) {
  const roster = [
    ...ACTIVE_CLIENTS_SEED.map((c) => rosterRow(c, 'active')),
    ...PENDING_CLIENTS_SEED.map((c) => rosterRow(c, 'pending')),
  ]
  const q = query.trim().toLowerCase()
  if (!q) return roster
  return roster.filter(
    (c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.emails.some((email) => email.toLowerCase().includes(q)),
  )
}

export function getEmailThread(clientId) {
  const messages = EMAIL_LOGS_BY_CLIENT[clientId] ?? []
  return [...messages].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
}

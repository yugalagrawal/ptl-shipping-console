import { PARTNERS, PENDING_PARTNERS_SEED } from './partners.js'

// Demo email-conversation threads, keyed by partner id (same ids as
// partners.js). Mirrors data/emailLogs.js (Client Email Logs) — not every
// partner has a thread, matching how a real inbox integration would look
// (only partners someone has actually emailed show up here). `direction`
// drives which side of the conversation a message renders on: 'inbound' =
// the partner wrote to us, 'outbound' = LT wrote to the partner.
export const EMAIL_LOGS_BY_PARTNER = {
  'PTR-001': [
    {
      id: 'speedex-1',
      direction: 'inbound',
      from: 'ops@speedex.com',
      to: 'supply@letstransport.team',
      subject: 'Payout query — August settlement',
      sentAt: '2026-08-18T10:05:00',
      body: "Hi team,\n\nWe're seeing a shortfall of about ₹22,000 against our own tally for the August settlement cycle. Could you share the AWB-level payout breakup for Chennai hub so we can reconcile?\n\nThanks,\nRakesh",
    },
    {
      id: 'speedex-2',
      direction: 'outbound',
      from: 'supply@letstransport.team',
      to: 'ops@speedex.com',
      subject: 'Re: Payout query — August settlement',
      sentAt: '2026-08-18T15:30:00',
      body: 'Hi Rakesh, sharing the AWB-level payout breakup as an attachment. The difference looks like 6 AWBs still pending POD confirmation — those will settle in the next cycle once POD is scanned in.',
      attachments: ['SPX-Aug-payout-breakup.xlsx'],
    },
    {
      id: 'speedex-3',
      direction: 'inbound',
      from: 'ops@speedex.com',
      to: 'supply@letstransport.team',
      subject: 'Re: Payout query — August settlement',
      sentAt: '2026-08-19T09:12:00',
      body: 'Got it, that matches on our end now. Thanks for the quick turnaround.',
    },
  ],
  'PTR-002': [
    {
      id: 'bhiwandi-1',
      direction: 'inbound',
      from: 'contact@bhiwandicargo.in',
      to: 'supply@letstransport.team',
      subject: 'Vehicle capacity confirmation — Bhiwandi hub',
      sentAt: '2026-08-25T11:40:00',
      body: "We can commit 3 additional 14ft vehicles for the Bhiwandi–Nagpur lane starting next week. Let us know if the mid-mile team wants to lock this in.",
    },
    {
      id: 'bhiwandi-2',
      direction: 'outbound',
      from: 'supply@letstransport.team',
      to: 'contact@bhiwandicargo.in',
      subject: 'Re: Vehicle capacity confirmation — Bhiwandi hub',
      sentAt: '2026-08-25T14:15:00',
      body: 'Confirmed — we\'ll route the additional Nagpur-bound load through these 3 vehicles from Monday. Sending the updated agreed rate for this lane separately.',
    },
  ],
  'pp-vardhman-carriers': [
    {
      id: 'vardhman-1',
      direction: 'inbound',
      from: 'ops@vardhmancarriers.in',
      to: 'onboarding@letstransport.team',
      subject: 'Onboarding — GSTIN and bank documents shared',
      sentAt: '2026-09-09T08:20:00',
      body: 'Hi team, sharing our GSTIN certificate and cancelled cheque for bank verification as requested. Let us know if anything else is needed to move this forward.',
      attachments: ['GSTIN-Ludhiana.pdf', 'Cancelled-Cheque.pdf'],
    },
    {
      id: 'vardhman-2',
      direction: 'outbound',
      from: 'onboarding@letstransport.team',
      to: 'ops@vardhmancarriers.in',
      subject: 'Re: Onboarding — GSTIN and bank documents shared',
      sentAt: '2026-09-09T12:05:00',
      body: 'Received, thank you. Your application has been submitted to Supply Admin for review — you should hear back within 1-2 business days.',
    },
  ],
}

// A partner shows up in the search roster the moment it exists (active or
// pending) — same lifecycle stance as Client Email Logs' own rosterRow.
// Active partners (PARTNERS) carry a single `orgEmail`; pending ones
// (PENDING_PARTNERS_SEED) carry a full wizard snapshot with `details.contact`
// when they were submitted through the wizard — legacy/seed rows without
// either fall back to no emails rather than erroring.
function rosterRow(p, status) {
  const emails = status === 'active' ? [p.orgEmail] : [p.details?.contact?.pocEmail]
  return {
    id: p.id,
    name: p.organisationName,
    city: p.city,
    status,
    emails: emails.filter(Boolean),
  }
}

export function searchPartnersForEmailLogs(query) {
  const roster = [
    ...PARTNERS.map((p) => rosterRow(p, 'active')),
    ...PENDING_PARTNERS_SEED.map((p) => rosterRow(p, 'pending')),
  ]
  const q = query.trim().toLowerCase()
  if (!q) return roster
  return roster.filter(
    (p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.emails.some((email) => email.toLowerCase().includes(q)),
  )
}

export function getPartnerEmailThread(partnerId) {
  const messages = EMAIL_LOGS_BY_PARTNER[partnerId] ?? []
  return [...messages].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
}

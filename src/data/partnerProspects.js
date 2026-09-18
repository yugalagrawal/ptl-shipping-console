// Sample data only — Partner Prospects is a concept UI, not wired to any
// real lead-capture flow yet. Mirrors data/prospects.js (Client Prospects),
// just "Supply Exec" instead of "Sales Exec" and a partner-shaped org
// (Agent/Co-loader/Franchise/3rd Party) instead of a client. See
// PartnerProspects.jsx.

export const PARTNER_PROSPECT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Converted', 'Lost']

export const PARTNER_PROSPECT_STAGE_BADGE = {
  New: 'bg-slate-100 text-slate-600',
  Contacted: 'bg-sky-50 text-sky-700',
  Qualified: 'bg-violet-50 text-violet-700',
  'Proposal Sent': 'bg-amber-50 text-amber-700',
  Converted: 'bg-emerald-50 text-emerald-700',
  Lost: 'bg-rose-50 text-rose-600',
}

export const PARTNER_PROSPECTS_SEED = [
  { id: 'PLEAD-2001', organisationName: 'Konkan Coastal Carriers', contact: 'Vinayak Kamath', city: 'Panaji', type: 'Agent', source: 'Referral', stage: 'Qualified', supplyExec: 'Meera Krishnan', estMonthlyVolume: 5200, createdAt: '2026-08-10', lastActivityAt: '2026-09-01' },
  { id: 'PLEAD-2002', organisationName: 'Malabar Freight Solutions', contact: 'Reshma Nair', city: 'Kozhikode', type: 'Co-loader', source: 'Trade Show', stage: 'Contacted', supplyExec: 'Meera Krishnan', estMonthlyVolume: 3100, createdAt: '2026-08-18', lastActivityAt: '2026-08-29' },
  { id: 'PLEAD-2003', organisationName: 'Deccan Roadways', contact: 'Suhas Kulkarni', city: 'Nagpur', type: '3rd Party', source: 'Website', stage: 'New', supplyExec: 'Meera Krishnan', estMonthlyVolume: 8700, createdAt: '2026-09-02', lastActivityAt: '2026-09-02' },
  { id: 'PLEAD-2004', organisationName: 'Northgate Franchise Movers', contact: 'Deepak Chauhan', city: 'Kanpur', type: 'Franchise', source: 'Cold Call', stage: 'Proposal Sent', supplyExec: 'Arjun Nair', estMonthlyVolume: 4600, createdAt: '2026-07-25', lastActivityAt: '2026-08-27' },
  { id: 'PLEAD-2005', organisationName: 'Saptagiri Logistics', contact: 'Lakshmi Rao', city: 'Visakhapatnam', type: 'Agent', source: 'Referral', stage: 'Converted', supplyExec: 'Arjun Nair', estMonthlyVolume: 6300, createdAt: '2026-07-10', lastActivityAt: '2026-08-12' },
  { id: 'PLEAD-2006', organisationName: 'Silverline Transport Co.', contact: 'Naveen George', city: 'Coimbatore', type: 'Co-loader', source: 'Website', stage: 'Lost', supplyExec: 'Meera Krishnan', estMonthlyVolume: 2200, createdAt: '2026-07-15', lastActivityAt: '2026-08-04' },
  { id: 'PLEAD-2007', organisationName: 'Bhagirathi Cargo Movers', contact: 'Sandeep Pandey', city: 'Varanasi', type: '3rd Party', source: 'Referral', stage: 'Qualified', supplyExec: 'Arjun Nair', estMonthlyVolume: 5800, createdAt: '2026-08-22', lastActivityAt: '2026-09-03' },
  { id: 'PLEAD-2008', organisationName: 'Yamuna Express Franchise', contact: 'Preeti Saxena', city: 'Agra', type: 'Franchise', source: 'Cold Call', stage: 'Contacted', supplyExec: 'Meera Krishnan', estMonthlyVolume: 3900, createdAt: '2026-08-20', lastActivityAt: '2026-08-30' },
  { id: 'PLEAD-2009', organisationName: 'Aravalli Fleet Partners', contact: 'Manish Bishnoi', city: 'Udaipur', type: 'Agent', source: 'Trade Show', stage: 'New', supplyExec: 'Arjun Nair', estMonthlyVolume: 1800, createdAt: '2026-09-03', lastActivityAt: '2026-09-03' },
  { id: 'PLEAD-2010', organisationName: 'Sundarbans Freight Network', contact: 'Ritwik Sarkar', city: 'Kolkata', type: 'Co-loader', source: 'Website', stage: 'Converted', supplyExec: 'Meera Krishnan', estMonthlyVolume: 7100, createdAt: '2026-06-28', lastActivityAt: '2026-07-30' },
]

// Sample data only — Client Prospects is a concept UI, not wired to any
// real lead-capture flow yet. See ClientProspects.jsx.

export const PROSPECT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Converted', 'Lost']

export const PROSPECT_STAGE_BADGE = {
  New: 'bg-slate-100 text-slate-600',
  Contacted: 'bg-sky-50 text-sky-700',
  Qualified: 'bg-violet-50 text-violet-700',
  'Proposal Sent': 'bg-amber-50 text-amber-700',
  Converted: 'bg-emerald-50 text-emerald-700',
  Lost: 'bg-rose-50 text-rose-600',
}

export const PROSPECTS_SEED = [
  { id: 'LEAD-1001', company: 'Urban Threads Apparel', contact: 'Rhea Kapoor', city: 'Mumbai', source: 'Referral', stage: 'Qualified', salesExec: 'Amit Verma', estMonthlyShipments: 420, createdAt: '2026-08-12', lastActivityAt: '2026-09-02' },
  { id: 'LEAD-1002', company: 'GreenLeaf Organics', contact: 'Karan Mehta', city: 'Pune', source: 'Website', stage: 'Contacted', salesExec: 'Amit Verma', estMonthlyShipments: 180, createdAt: '2026-08-20', lastActivityAt: '2026-08-30' },
  { id: 'LEAD-1003', company: 'Zenith Electronics', contact: 'Sana Iyer', city: 'Bengaluru', source: 'Cold Call', stage: 'New', salesExec: 'Priya Sharma', estMonthlyShipments: 950, createdAt: '2026-09-01', lastActivityAt: '2026-09-01' },
  { id: 'LEAD-1004', company: 'Coastal Spices Co.', contact: 'Vivek Nair', city: 'Kochi', source: 'Trade Show', stage: 'Proposal Sent', salesExec: 'Neha Joshi', estMonthlyShipments: 260, createdAt: '2026-07-28', lastActivityAt: '2026-08-29' },
  { id: 'LEAD-1005', company: 'Bright Toys India', contact: 'Ananya Das', city: 'Delhi', source: 'Referral', stage: 'Converted', salesExec: 'Neha Joshi', estMonthlyShipments: 610, createdAt: '2026-07-05', lastActivityAt: '2026-08-15' },
  { id: 'LEAD-1006', company: 'Metro Furnishings', contact: 'Rohit Malhotra', city: 'Chennai', source: 'Website', stage: 'Lost', salesExec: 'Amit Verma', estMonthlyShipments: 140, createdAt: '2026-07-18', lastActivityAt: '2026-08-05' },
  { id: 'LEAD-1007', company: 'Sunrise Pharma Distributors', contact: 'Fatima Sheikh', city: 'Hyderabad', source: 'Referral', stage: 'Qualified', salesExec: 'Priya Sharma', estMonthlyShipments: 780, createdAt: '2026-08-25', lastActivityAt: '2026-09-03' },
  { id: 'LEAD-1008', company: 'Northline Auto Parts', contact: 'Gagan Singh', city: 'Ludhiana', source: 'Cold Call', stage: 'Contacted', salesExec: 'Neha Joshi', estMonthlyShipments: 310, createdAt: '2026-08-22', lastActivityAt: '2026-08-31' },
  { id: 'LEAD-1009', company: 'Pinnacle Sports Gear', contact: 'Ira Bhatt', city: 'Jaipur', source: 'Trade Show', stage: 'New', salesExec: 'Amit Verma', estMonthlyShipments: 90, createdAt: '2026-09-03', lastActivityAt: '2026-09-03' },
  { id: 'LEAD-1010', company: 'Everfresh Dairy', contact: 'Manoj Pillai', city: 'Ahmedabad', source: 'Website', stage: 'Converted', salesExec: 'Priya Sharma', estMonthlyShipments: 540, createdAt: '2026-06-30', lastActivityAt: '2026-08-01' },
]

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Per-metric notes for the Costing Module: where the number would come from,
// whether today's system can supply it, and what has to be built or captured.
// status: ready = data already exists · partial = some inputs exist · build = nothing captured today.
// Written against the actual codebase (trips.js, fleet.js, docketPricing.js, invoices.js,
// warehouse.js, pricing.js, Finance MIS) — update when those change.
export const STATUS = {
  ready: { label: 'Possible today', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Partly possible', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  build: { label: 'Needs new data capture', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700' },
}

const LEDGER = 'A cost ledger — nothing in the system records what we pay. Trips store a vendor name but no payout; fleet has no rates; Finance MIS only assumes cost = 55% of freight.'

export const INFO = {
  totalCost: {
    status: 'build', title: 'Total cost',
    how: 'Sum of every cost-ledger entry dated in the month: trip payouts (line haul), pickup / delivery partner payouts (first & last mile), hub labour, claims, plus monthly fixed costs (rent, payroll, tech).',
    today: LEDGER + ' Dockets, trips and partners exist, so entries can be tied to them — but the ₹ amounts are not captured anywhere.',
    needs: ['Cost Entries store: date, head, amount, linked trip / docket / hub / partner.', 'Auto-create entries when a trip is closed (vendor payout) and when a PRS / delivery is completed (partner payout).', 'Finance upload / form for monthly fixed costs.', 'Real timestamps on dockets and trips (orders use "3 days ago" strings today).'],
  },
  perDocket: {
    status: 'partial', title: 'Cost per docket / per kg',
    how: 'Total cost ÷ dockets created in the month; per kg uses chargeable weight (max of actual and volumetric).',
    today: 'The denominator exists: dockets carry package count, actual weight and volumetric weight (Create Docket). The numerator is the missing cost ledger.',
    needs: ['Cost ledger (see Total cost).', 'Dockets need a stored created-date instead of display text.'],
  },
  vsBudget: {
    status: 'build', title: 'Variance vs budget',
    how: 'Actual cost for the month minus the budget set for the same month and cost head.',
    today: 'There is no budget concept anywhere in the system.',
    needs: ['Budget table: month × cost head (optionally × hub / lane), entered by Finance or imported from the annual plan.', 'Once a ledger has a year of history, a budget can be pre-filled from last year × growth.'],
  },
  margin: {
    status: 'partial', title: 'Gross margin',
    how: '(Revenue − cost) ÷ revenue. Revenue = freight billed on dockets / invoices in the month.',
    today: 'Revenue is available today: docketPricing.js prices every docket and invoices.js bills them. The cost half is missing, which is why Finance MIS fakes it at 55% of freight.',
    needs: ['Cost ledger.', 'Link ledger entries to dockets so margin can be shown per docket, lane and client — not just overall.'],
  },
  forecast: {
    status: 'partial', title: 'Forecast (next month / 6 months)',
    how: 'Per cost head: linear trend + seasonal ratio fitted on the last 12 months, with an 80% band from past error. The engine is built and runs on whatever history it is given.',
    today: 'The maths is ready. It needs a year of monthly cost history — which does not exist yet. Until then it can only run on sample data (as now), or on a docket-volume forecast × an assumed cost per docket.',
    needs: ['12+ months of ledger history (or an imported back-fill from Finance / Tally).', 'Volume history from dockets with real dates, to forecast variable heads from volume.', 'Re-fit monthly; flag if forecast error exceeds ~10%.'],
  },
  trend: {
    status: 'build', title: 'Cost trend vs budget vs forecast',
    how: 'Actual = ledger totals by month. Budget = budget table. Forecast = see Forecast.',
    today: 'No monthly cost totals, budget or history exist yet.',
    needs: ['Cost ledger with real dates.', 'Budget table.', 'Then this chart needs no further work — it reads the same series the KPIs use.'],
  },
  insights: {
    status: 'build', title: 'What needs attention',
    how: 'Rule-based alerts computed from the ledger: head > 4% over budget, hub / lane cost-per-kg > 8–15% above network, highest client cost-to-serve, forecast month > 8% over plan.',
    today: 'The rules are coded. They have nothing real to evaluate until ledger + budget data exist.',
    needs: ['Ledger and budget (as above).', 'Thresholds should become editable settings, owned by Finance / the CEO office.', 'Optional: push alerts to the Birdview or email when a rule trips.'],
  },
  heads: {
    status: 'build', title: 'Cost by head',
    how: 'Ledger entries grouped by head. Sources per head: First mile = pickup partner payouts · Line haul = vendor trip charges + owned-fleet fuel, tolls, driver, maintenance · Handling = hub / Mini Hub labour · Last mile = delivery partner payouts · Claims = settled claim amounts · Facilities, Manpower, Tech = monthly Finance entry.',
    today: 'Structure exists to attach them (Partners, Fleet with Owned / Vendor flag, Trips, Warehouse scan events, trip exceptions) but none store money. Exceptions are free-text notes with no claim value.',
    needs: ['Payout amounts on Partner Module (rate per pickup / delivery) and on trip close for vendors.', 'Owned-fleet running cost per trip (fuel, toll, driver) — manual entry or fuel-card / FASTag feed.', 'Hub labour: either payroll upload or headcount × rate by hub.', 'Claim value on trip exceptions.'],
  },
  headBudget: {
    status: 'build', title: 'Head vs budget',
    how: 'Head actual ÷ head budget − 1.',
    today: 'No budget exists.',
    needs: ['Budget table by head.'],
  },
  explorer: {
    status: 'partial', title: 'Cost explorer (region → hub → lane / client)',
    how: 'Trip cost is direct to its lane and origin hub. Hub handling is allocated by scan volume. Fixed costs go to the hub that incurs them. Client cost = each trip\'s cost split across its dockets by chargeable weight.',
    today: 'The allocation keys exist: trips carry lane, hubs and orderIds; Warehouse stores scan events per hub; dockets carry client and weight; Logistics Master defines the real Region → Zone → Hub → Mini Hub tree. Note: this prototype uses simplified North/West/South/East regions — the real build should follow Logistics Master. Cost amounts to allocate are missing.',
    needs: ['Cost ledger entries carrying trip / hub IDs.', 'Switch the hierarchy to Logistics Master (Region → Zone → Hub → Mini Hub).', 'Agree allocation rules with Finance (weight vs volume vs docket count) — they change the answer.'],
  },
  share: {
    status: 'build', title: 'Share of network',
    how: 'Node cost ÷ network cost for the month.',
    today: 'Pure calculation once costs are allocated to nodes.',
    needs: ['Allocated cost per node (see Cost explorer).'],
  },
  perKg: {
    status: 'partial', title: '₹ / kg',
    how: 'Node cost ÷ chargeable kg moved through that node.',
    today: 'Kg is available per docket today. Cost is not.',
    needs: ['Allocated cost per node.', 'Decide whether kg means chargeable or actual weight (we use chargeable, as billing does).'],
  },
  vsNetwork: {
    status: 'build', title: 'vs network average',
    how: 'Node ₹/kg ÷ network ₹/kg − 1. Over +12% is tagged "High".',
    today: 'Calculation only.',
    needs: ['Allocated cost per node.'],
  },
  mom: {
    status: 'build', title: 'MoM change',
    how: 'This month\'s node cost ÷ last month\'s − 1.',
    today: 'Needs at least two months of dated costs per node.',
    needs: ['Ledger with real dates.'],
  },
  spark: {
    status: 'build', title: '12-month trend',
    how: 'The node\'s monthly cost for the last 12 months.',
    today: 'No history exists.',
    needs: ['12 months of ledger history, or a one-time back-fill import.'],
  },
  composition: {
    status: 'build', title: 'Where the money goes',
    how: 'Each head\'s share of total cost for the selected month.',
    today: 'See Cost by head.',
    needs: ['Cost ledger tagged by head.'],
  },
  // Forecast & What-if
  leverVolume: {
    status: 'partial', title: 'Lever: shipment volume',
    how: 'Scales variable heads (first / line haul / handling / last mile / claims) by the % change; fixed heads stay flat.',
    today: 'Volume can come from dockets today. The fixed vs variable split per head is an assumption that Finance would need to confirm.',
    needs: ['Docket history with real dates.', 'Finance sign-off on which costs are truly fixed vs step-fixed.'],
  },
  leverDiesel: {
    status: 'build', title: 'Lever: diesel price',
    how: 'Moves line haul by 0.38× and first / last mile by 0.30× the % change — the assumed fuel share of those heads.',
    today: 'The fuel shares are guesses. There is no diesel price feed and no fuel cost on trips. (Clients are already billed a fuel surcharge — 10–15% in docketPricing — so the revenue side partly protects margin; that is not modelled yet.)',
    needs: ['Fuel cost per owned-fleet trip (fuel card / manual).', 'A diesel price source (weekly manual entry is enough).', 'Fit the real fuel share from ledger history; model the FSC pass-through on revenue.'],
  },
  leverVendor: {
    status: 'build', title: 'Lever: vendor / rider rate card',
    how: 'Moves line haul and first / last mile by 0.6× the % change — the assumed outsourced share.',
    today: 'Fleet knows which vehicles are Vendor vs Owned and which vendor. No vendor rate card or payout is stored.',
    needs: ['Vendor rate cards (per lane / vehicle type) in Supply & Fleet.', 'Payout recorded at trip close.', 'Then the outsourced share is computed, not assumed.'],
  },
  leverProductivity: {
    status: 'build', title: 'Lever: hub productivity',
    how: 'Reduces Hub & Mini Hub handling cost by the % gain.',
    today: 'Warehouse scan events show throughput per hub, but labour hours / headcount per hub are not captured.',
    needs: ['Headcount or labour hours per hub (payroll / attendance feed).', 'Then productivity = dockets scanned ÷ labour hours, and the lever can be anchored to a real baseline.'],
  },
  leverOda: {
    status: 'ready', title: 'Lever: ODA share of last mile',
    how: 'Each +1 pt of out-of-delivery-area shipments raises last mile cost by ~1.1%.',
    today: 'ODA status is available today: Create Docket has an ODA flag and the ODA pincode list is maintained (odaPincodes.js). Only the 1.1% sensitivity is assumed.',
    needs: ['Fit the sensitivity from real last-mile cost of ODA vs non-ODA deliveries once the ledger exists.'],
  },
  leverRent: {
    status: 'build', title: 'Lever: facility cost',
    how: 'Scales Facility rent & utilities by the % change.',
    today: 'No rent or lease data exists in the system.',
    needs: ['Monthly facility cost per hub (Finance entry), ideally with lease end dates so renewals can be modelled.'],
  },
  scenarioStat: {
    status: 'partial', title: 'Scenario results',
    how: 'The baseline forecast re-computed with your lever settings: 6-month cost, cost per docket, margin (revenue scaled with volume), and gap to budget.',
    today: 'Calculation is built. Revenue per docket can come from docketPricing / invoices today; baseline cost and budget need the ledger.',
    needs: ['Cost ledger and budget.', 'Revenue forecast from invoice history instead of the simple trend used here.'],
  },
  outlook: {
    status: 'build', title: 'Monthly cost outlook',
    how: 'Last 6 months of actuals, the baseline forecast with its 80% band, budget, and your scenario line.',
    today: 'Needs actuals, budget and forecast history (see those entries).',
    needs: ['Cost ledger, budget.'],
  },
  impact: {
    status: 'build', title: 'Impact by cost head',
    how: 'Scenario minus baseline, per head, summed over the 6 forecast months.',
    today: 'Calculation built; accuracy depends on the lever sensitivities being replaced with measured ones.',
    needs: ['Cost ledger to measure real elasticities (regress head cost on volume, fuel price, rate changes).'],
  },
}

export function InfoTip({ id, className = '' }) {
  const info = INFO[id]
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return
    const r = btn.current.getBoundingClientRect()
    const width = Math.min(340, window.innerWidth - 24)
    const left = Math.max(12, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 12))
    const below = r.bottom + 8
    setPos({ left, width, top: below, bottom: null, flip: below > window.innerHeight * 0.55, anchorTop: r.top })
    const close = (e) => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    const scroll = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', scroll, true)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', scroll, true) }
  }, [open])

  if (!info) return null
  const st = STATUS[info.status]
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`How is “${info.title}” calculated?`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold italic leading-none text-slate-400 transition-colors hover:border-brand-orange hover:text-brand-orange-dark ${open ? 'border-brand-orange text-brand-orange-dark' : ''} ${className}`}
      >
        i
        <span className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-white ${st.dot}`} />
      </button>
      {open && pos && createPortal(
        <div
          ref={panel}
          onClick={(e) => e.stopPropagation()}
          style={{ left: pos.left, width: pos.width, ...(pos.flip ? { bottom: window.innerHeight - pos.anchorTop + 8 } : { top: pos.top }), maxHeight: '70vh' }}
          className="fixed z-[60] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-left text-xs font-normal normal-case not-italic tracking-normal shadow-xl"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{info.title}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.badge}`}>{st.label}</span>
          </div>
          <Section label="How we get it">{info.how}</Section>
          <Section label="In today's system">{info.today}</Section>
          <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">What needs to be done</p>
          <ul className="space-y-1 text-slate-600">
            {info.needs.map((n) => <li key={n} className="flex gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />{n}</li>)}
          </ul>
        </div>,
        document.body,
      )}
    </>
  )
}

function Section({ label, children }) {
  return (
    <>
      <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="leading-relaxed text-slate-600">{children}</p>
    </>
  )
}

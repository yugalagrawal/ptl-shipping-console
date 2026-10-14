import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import DocketSheet from '../../components/DocketSheet.jsx'
import { card, btnPrimary, btnSecondary } from '../../components/ui.js'
import { PICKUPS_SEED, PICKUP_STATUS, MINI_HUBS, updatePickupFieldDetails, scanPackage } from '../../data/pickups.js'
import {
  MODE, MODE_LABEL,
  PAYMENT_TERM, PAYMENT_TERM_LABEL, RISK_COVER, RISK_COVER_LABEL, POD_TYPE, POD_TYPE_LABEL,
  peekNextDocketNumber, enrichDocketDetails, createDocketFromPickup, DOCKETS_SEED,
} from '../../data/dockets.js'
import { INDIAN_STATES } from '../../data/geo.js'
import { EWAY_EXEMPT_GOODS } from '../../data/ewayExemptGoods.js'
import { goodsByHsn, searchGoods } from '../../data/goodsCatalog.js'
import { seriesState, peekSeriesNumber } from '../../data/docketSeries.js'
import { BOX_MASTER, addBoxToMaster } from '../../data/boxMaster.js'
import { CONTENT_TYPES, HAZARD_CLASSES } from '../../data/goodsOptions.js'
import { PRS_SEED } from '../../data/prs.js'
import PartyModal from '../../components/PartyModal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { getAllConsignees, addConsigneeForClient } from '../../data/consignees.js'
import { FLEET_SEED } from '../../data/fleet.js'
import { fetchEwayBill, generateEwayBill, isPlausibleEwayBillNumber, OUR_GSTIN } from '../../data/ewayBill.js'
import { priceDocket, volumetricWeightKg } from '../../data/docketPricing.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { odaEntryForPincode, getDefaultOdaRate } from '../../data/odaPincodes.js'
import { printDocketSheet } from './docketPrintSheet.js'
import { shareDocket } from '../../utils/docketShare.js'
import { fmtDocket } from '../../data/docketNumber.js'

function Field({ label, hint, className = '', dense, ...props }) {
  return (
    <label className={`block ${className}`}>
      {(label || hint) && (
        <span className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">{label}</span>
          {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
        </span>
      )}
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40 ${dense ? 'py-1.5' : 'py-2.5'}`}
      />
    </label>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div className={`space-y-3 p-4 ${card}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="whitespace-nowrap text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function SegmentedControl({ options, value, onChange, compact }) {
  return (
    <div className={`flex gap-1 rounded-xl bg-slate-100 p-1 text-sm ${compact ? 'w-fit' : 'flex-wrap'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-lg ${compact ? 'px-2.5' : 'px-3'} py-1.5 font-medium transition-colors ${value === o.value ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Create Docket is an EXCEPTION queue, not a general-purpose form over every
// pickup in the network (which could be thousands of rows). A docket is
// normally raised the instant a pickup's packages finish scanning (Pickup
// Dashboard, or the Partner App, which already has the field-collected
// weight/packages/consignee) — this screen only needs to surface the
// pickups not yet picked up (vehicle assigned or on-site) that have no
// docket yet — a docket has to exist before pickup can start.
function vehicleFor(pickup) {
  const prs = PRS_SEED.find((r) => r.id === pickup.prsId)
  if (!prs) return null
  const veh = FLEET_SEED.find((v) => v.id === prs.vehicleId)
  const partner = veh ? (veh.ownership === 'Vendor' ? veh.vendorName : 'LetsTransport (Owned)') : ''
  return { label: prs.vehicleLabel, regNo: veh?.regNo ?? '', driver: prs.driverName, prsId: prs.id, partner }
}

// Dockets this pickup needs when ops sets the count by hand (pickup id → n).
const DOCKET_COUNTS = new Map()

function candidatePickups() {
  return PICKUPS_SEED.filter((p) => {
    if (p.status !== PICKUP_STATUS.GROUPED && p.status !== PICKUP_STATUS.ARRIVED) return false
    // A multi-consignee pickup stays listed until every consignee has its docket.
    const dests = p.details?.destinations?.filter((d) => d.consignee?.name) ?? []
    // An ops-set docket count (consignee info missing) overrides the consignee list.
    if (DOCKET_COUNTS.has(p.id)) return DOCKETS_SEED.filter((d) => d.pickupId === p.id).length < DOCKET_COUNTS.get(p.id)
    return dests.length > 1 ? dests.some((d) => !docketForDestination(p.id, d)) : !p.docketNumber
  })
}

// Single search-by-Pickup-ID box — replaces a browsable list entirely. A
// dropdown of matches (Pickup ID, client, or drop Mini Hub) only appears
// while typing; picking one hands the pickup to the caller and the box
// itself gets out of the way (see the "Change pickup" chip in the parent),
// same pattern Logistics Ladder's own NodeSearch uses for the same reason:
// a portaled, `fixed`-positioned dropdown doesn't get clipped by any
// scrolling ancestor.
function PickupSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState('')
  const [partner, setPartner] = useState('')
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const q = query.trim().toLowerCase()
  const clients = useMemo(() => {
    const seen = new Map()
    candidatePickups().forEach((p) => seen.set(p.clientId, p.clientName))
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [])
  const partners = useMemo(
    () => [...new Set(candidatePickups().map((p) => vehicleFor(p)?.partner).filter(Boolean))].sort(),
    []
  )
  const matches = useMemo(() => {
    const all = candidatePickups().filter((p) => (!clientId || p.clientId === clientId) && (!partner || vehicleFor(p)?.partner === partner))
    if (!q) return all
    const compact = q.replace(/\s+/g, '')
    return all.filter((p) => p.id.toLowerCase().includes(q) || (vehicleFor(p)?.regNo ?? '').toLowerCase().replace(/\s+/g, '').includes(compact))
  }, [q, clientId, partner])

  useEffect(() => {
    if (!open) return
    function place() {
      const r = inputRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 6, left: r.left, width: r.width })
    }
    place()
    function onDocPointerDown(e) {
      if (panelRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  return (
    <div className="flex items-stretch gap-3">
    <div className="relative min-w-0 flex-1">
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search by Pickup ID or Vehicle No.…"
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left, width: Math.max(coords.width, 420) }}
          className="fixed z-50 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {matches.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-400">
              {q ? 'No matches.' : "No pending pickups without a docket."}
            </div>
          )}
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(p); setQuery(''); setOpen(false) }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-800">{p.id} · {p.clientName}</span>
                <span className="block truncate text-xs text-slate-500">{p.dropMiniHubName}</span>
                <span className="block truncate text-xs text-slate-500">
                  {(() => { const v = vehicleFor(p); return v ? `${v.label} · ${v.driver}` : 'No vehicle assigned' })()}
                </span>
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
    <select
      value={clientId}
      onChange={(e) => { setClientId(e.target.value); setOpen(true); inputRef.current?.focus() }}
      className="w-48 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
    >
      <option value="">All clients</option>
      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    <select
      value={partner}
      onChange={(e) => { setPartner(e.target.value); setOpen(true); inputRef.current?.focus() }}
      className="w-48 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
    >
      <option value="">All partners</option>
      {partners.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
    </div>
  )
}

const emptyPackageRow = () => ({ id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, boxId: '', label: '', l: '', b: '', h: '', qty: 1 })

// Goods details beyond what the invoice / e-Way Bill already carries.
// Same two flags Create Pickup captures, so the docket starts from what the booking said.
const HANDLING_FLAGS = ['Fragile', 'Hazardous']

function packageVolumeCft(row) {
  const l = Number(row.l) || 0, b = Number(row.b) || 0, h = Number(row.h) || 0, qty = Number(row.qty) || 0
  return (l * b * h * qty) / 28317 // cm³ per cubic foot
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

// The full detailed form — every field the printed docket sheet needs,
// organized the same order the sheet reads top to bottom: booking/mode →
// consignor/consignee (auto from the pickup) → e-way bill/vehicle →
// invoice/goods → packages → pricing → payment/risk → POD/documents —
// alongside a live preview of the docket sheet itself (right column),
// which re-renders on every keystroke/auto-fill so there's never a
// surprise between "what I typed" and "what prints". Numbers in comments
// below (①②…) trace back to the Docket Module planning whiteboard's own
// numbered field list.
// ⓘ beside "Others" — click or hover to see which client-pricing charges make up the total.
function BreakupTip({ items }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative ml-1.5 inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="Others breakup" onClick={() => setOpen((v) => !v)} className="text-slate-400 hover:text-slate-600">
        <Icon name="info" className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span role="tooltip" className="absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 space-y-1 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-300">From client pricing</span>
          {items.map((x) => (
            <span key={x.label} className="flex justify-between gap-3">
              <span>{x.label}</span>
              <span className="tabular-nums">{x.amount == null ? 'at actuals' : `₹${x.amount.toLocaleString('en-IN')}`}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

// Goods description with a pick-list from the goods catalog: choosing an entry
// fills the description and its HSN together (onPick), while free text is
// still allowed — "Said to contain" is often more specific than the catalog.
function GoodsPicker({ value, onChange, onPick, inputRef }) {
  const [open, setOpen] = useState(false)
  const results = searchGoods(value)
  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Search goods or type — e.g. Cosmetics"
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        aria-label="Goods description"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {results.map((g) => (
            <li key={g.hsn + g.name}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); onPick(g); setOpen(false) }} className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-slate-50">
                <span className="truncate text-slate-800">{g.name}</span>
                <span className="shrink-0 font-mono text-xs text-slate-400">{g.hsn}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Inline "Generate e-Way Bill" panel — for moves where the consignor hasn't
// raised one. Collects the Part-A details off the consignor's invoice
// (pre-filled from whatever the docket form already has) and generates the
// bill under our own GSTIN. Part B (vehicle) is deliberately not asked here.
function EwayGenerateForm({ initial, onGenerated, onCancel }) {
  const [v, setV] = useState({
    invoiceNo: initial.invoiceNo, invoiceDate: initial.invoiceDate || new Date().toISOString().slice(0, 10), invoiceValue: initial.invoiceValue,
    consigneeName: initial.consigneeName, consigneeGstin: initial.consigneeGstin,
    consigneeCity: initial.consigneeCity, consigneeState: '', consigneePincode: initial.consigneePincode,
    goodsDescription: initial.goodsDescription, hsn: initial.hsn || '', quantity: initial.quantity, unit: 'BOX', distanceKm: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }))
  const valid = v.invoiceNo.trim() && v.invoiceValue && v.consigneeName.trim() && /^\d{6}$/.test(v.consigneePincode) &&
    v.consigneeCity.trim() && v.consigneeState && v.goodsDescription.trim() && /^\d{4,8}$/.test(v.hsn) && v.quantity && Number(v.distanceKm) > 0

  async function submit() {
    setBusy(true)
    onGenerated(await generateEwayBill(v))
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <p className="text-xs font-semibold text-slate-700">Generate e-Way Bill on behalf of the consignor <span className="font-normal text-slate-400">— Part A from their invoice</span></p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Field label="Invoice no. *" value={v.invoiceNo} onChange={set('invoiceNo')} />
        <Field label="Invoice date *" type="date" value={v.invoiceDate} onChange={set('invoiceDate')} />
        <Field label="Invoice value (₹) *" type="number" value={v.invoiceValue} onChange={set('invoiceValue')} />
        <Field label="Distance (km) *" type="number" value={v.distanceKm} onChange={set('distanceKm')} />
        <Field label="Consignee name *" className="col-span-2" value={v.consigneeName} onChange={set('consigneeName')} />
        <Field label="Consignee GSTIN" value={v.consigneeGstin} onChange={set('consigneeGstin')} placeholder="Blank = URP" />
        <Field label="Pincode *" value={v.consigneePincode} onChange={set('consigneePincode')} maxLength={6} />
        <Field label="City / place *" value={v.consigneeCity} onChange={set('consigneeCity')} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">State *</span>
          <select value={v.consigneeState} onChange={set('consigneeState')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40">
            <option value="">Select</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <Field label="Goods description *" className="col-span-2" value={v.goodsDescription} onChange={set('goodsDescription')} />
        <Field label="HSN code *" value={v.hsn} onChange={set('hsn')} placeholder="4–8 digits" />
        <Field label="Quantity *" type="number" value={v.quantity} onChange={set('quantity')} />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={!valid || busy} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
          {busy ? 'Generating…' : 'Generate e-Way Bill'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
      </div>
    </div>
  )
}

// Is an e-Way Bill legally needed? Follows CGST Rule 138 as I understand it —
// compliance must confirm before the real build:
//  • Required when the consignment value (invoice value incl. GST) is above
//    ₹50,000 — however short the distance. Distance only sets the bill's
//    validity (1 day per 200 km) and whether Part B can wait (within a state,
//    consignor → transporter, up to 50 km); it never makes a small
//    consignment need one.
//  • Required whatever the value for inter-state job-work movement and
//    inter-state handicraft goods from unregistered dealers.
//  • Not required for goods on the exempt list (data/ewayExemptGoods.js) —
//    matched by HSN code, never by a tick box.
// A state may set a higher intra-state limit (up to ₹1 lakh); ₹50,000 is used
// here as the safe national default. Several invoices to one consignee in one
// vehicle can add up past the limit, so ops should enter the combined value.
const EWAY_VALUE_LIMIT = 50000
function ewayNeedCheck({ value, exempt, special }) {
  if (exempt) return { state: 'ok', reason: `Exempt goods — ${exempt.label}`, note: exempt.note }
  if (special === 'jobwork') return { state: 'required', msg: 'Inter-state job-work — needed at any value' }
  if (special === 'handicraft') return { state: 'required', msg: 'Inter-state handicraft — needed at any value' }
  if (!(value > 0)) return { state: 'pending', msg: 'Enter the invoice value to check' }
  const rs = (n) => `₹${n.toLocaleString('en-IN')}`
  if (value > EWAY_VALUE_LIMIT) return { state: 'required', msg: `${rs(value)} is above ${rs(EWAY_VALUE_LIMIT)} — needed at any distance` }
  return { state: 'ok', reason: `Value ${rs(value)} is within ${rs(EWAY_VALUE_LIMIT)}` }
}

// "What can happen with the e-Way Bill?" — plain-language rundown of every
// case this section handles, opened from the (i) next to the E-Way Bill number.
const EWAY_CASES = [
  ['Bill is assigned to LetsTransport', 'Enter the number and Fetch & validate. Invoice, consignee, goods and validity fill in automatically.'],
  ['Bill exists but is not assigned to us', 'Ask the consignor to add our GSTIN as transporter (Copy message), then Fetch again. Or Continue unverified — enter invoice, consignee and goods by hand; the docket is marked "not verified".'],
  ['No bill yet, but one is needed', 'Use Generate e-Way Bill — LetsTransport raises it from the invoice details, and the bill number fills in.'],
  ['Not needed — value up to ₹50,000', 'Switch E-Way Bill required to No and enter the invoice value. Distance never makes a small consignment need one.'],
  ['Not needed — exempt goods', 'Pick the goods (by HSN) on the No tab, e.g. jewellery, currency, fresh milk. Exemption is decided by the goods, not by a tick.'],
  ['Needed at any value', 'Inter-state job-work and inter-state handicraft goods always need a bill — No is blocked for these.'],
  ['Value above ₹50,000', 'A bill is required whatever the distance. Several invoices to one consignee in one vehicle add up — enter the combined value.'],
]
function EwayInfoModal({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">E-Way Bill — possible cases</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        <ol className="mt-3 space-y-3">
          {EWAY_CASES.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-[11px] font-semibold text-brand-orange-dark">{i + 1}</span>
              <div><p className="text-sm font-medium text-slate-800">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex justify-end"><button type="button" onClick={onClose} className={btnSecondary}>Got it</button></div>
      </div>
    </div>,
    document.body
  )
}

const normText = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const sameText = (a, b) => !!normText(a) && !!normText(b) && (normText(a) === normText(b) || normText(a).includes(normText(b)) || normText(b).includes(normText(a)))

// Consignee name field with a typeahead over the Consignee master (the same
// store behind Master Module and Client Configuration). Picking a row fills the
// whole card; "+ Add new consignee" opens the shared party modal, which saves
// back to that master. Typing a free name still works — nothing is forced.
function ConsigneeNameInput({ value, clientId, clientName, onChange, onPick, className }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [typed, setTyped] = useState(false) // only filter once the user actually types
  const [coords, setCoords] = useState(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const all = getAllConsignees()
  const mine = all.filter((c) => c.clientIds.includes(clientId))
  const q = typed ? value.trim().toLowerCase() : ''
  const options = (mine.length ? mine : all)
    .flatMap((party) => party.sites.map((site) => ({ key: `${party.id}|${site.id}`, party, site })))
    .filter((o) => !q || `${o.party.partyName} ${o.site.label} ${o.site.city}`.toLowerCase().includes(q))

  useEffect(() => {
    if (!open) return
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
    }
    place()
    const onDown = (e) => { if (!panelRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])

  const fill = (party, site) => onPick({
    name: party.sites.length > 1 && site.label && site.label !== 'Main' ? `${party.partyName} — ${site.label}` : party.partyName,
    address: site.address, city: site.city, pincode: site.pincode,
  })

  return (
    <>
      <input ref={inputRef} className={className} value={value} onChange={(e) => { onChange(e.target.value); setTyped(true); setOpen(true) }} onFocus={() => { setTyped(false); setOpen(true) }} placeholder="Search or type consignee name" aria-label="consignee name" autoComplete="off" />
      {open && coords && createPortal(
        <div ref={panelRef} style={{ top: coords.top, left: coords.left, width: coords.width }} className="fixed z-[60] rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {options.map((o) => (
              <button key={o.key} type="button" onClick={() => { fill(o.party, o.site); setOpen(false) }} className="block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50">
                <span className="block truncate text-sm text-slate-800">{o.party.partyName}{o.party.sites.length > 1 ? ` · ${o.site.label}` : ''}</span>
                <span className="block truncate text-[11px] text-slate-400">{o.site.address}, {o.site.city} {o.site.pincode}</span>
              </button>
            ))}
            {options.length === 0 && <p className="px-2.5 py-2 text-xs text-slate-400">No match in the consignee master</p>}
          </div>
          <button type="button" onClick={() => { setOpen(false); setAdding(true) }} className="mt-1 block w-full rounded-lg border-t border-slate-100 px-2.5 py-1.5 text-left text-xs font-semibold text-brand-orange-dark hover:bg-slate-50">+ Add new consignee</button>
        </div>,
        document.body
      )}
      {adding && (
        <PartyModal
          kind="consignee"
          companyDefault={clientName}
          onClose={() => setAdding(false)}
          onSave={(form) => {
            const { clientIds: _ignored, ...data } = form
            const row = addConsigneeForClient(clientId, data)
            fill(row, row.sites[0])
            setAdding(false)
          }}
        />
      )}
    </>
  )
}

function DocketForm({ pickup, onGenerated }) {
  const navigate = useNavigate()
  // Assigned docket series (Client Configuration): once a client's numbers run
  // out, ops chooses — auto-generate this docket's number, or assign a new series.
  const [seriesAuto, setSeriesAuto] = useState(false)
  const series = seriesState(pickup.clientId)
  const hasDetails = pickup.packagesCount != null

  // ① / ② Consignor is read straight off the pickup (it's who booked it);
  // Consignee only exists yet if this pickup's on-site details were already
  // captured elsewhere — otherwise it's collected here, same as before.
  const [consigneeName, setConsigneeName] = useState(pickup.consignee?.name ?? '')
  const [consigneeCity, setConsigneeCity] = useState(pickup.consignee?.city ?? '')
  const [consigneePincode, setConsigneePincode] = useState(pickup.consignee?.pincode ?? '')
  const [consigneeAddress, setConsigneeAddress] = useState(pickup.consignee?.address ?? '')
  // Consignor starts as the pickup's own details; every field stays editable.
  const [consignorName, setConsignorName] = useState(pickup.consignor?.name ?? '')
  const [consignorAddress, setConsignorAddress] = useState(pickup.consignor?.address ?? '')
  const [consignorCity, setConsignorCity] = useState(pickup.consignor?.city ?? '')
  const [consignorPincode, setConsignorPincode] = useState(pickup.consignor?.pincode ?? '')
  const [consigneeGstin, setConsigneeGstin] = useState('')
  // Consignor is the pickup's own party — locked unless ops confirms the override.
  const [consignorEditable, setConsignorEditable] = useState(false)
  const [confirmConsignorEdit, setConfirmConsignorEdit] = useState(false)

  // Actual weight and package count are always typed fresh — the pickup's
  // figures are only an estimate, shown as a watermark, so the entry is a real
  // check against it rather than a copy.
  const [actualWeightKg, setActualWeightKg] = useState('')
  const [packagesCount, setPackagesCount] = useState('')
  const estWeight = pickup.actualWeightKg ?? pickup.estWeightKg ?? null
  const estCount = pickup.packagesCount ?? pickup.packagesEstimate ?? null

  // ⑥⑦ Mode + delivery type (the B/L/V shorthand — Solo MH / Direct Hub /
  // Direct MH) — manual, since routing hasn't run yet at docket time.
  const [mode, setMode] = useState(MODE.SURFACE)

  // Part B / e-Way Bill — ⑫ "Part B auto-fill & mapped to e-way bill
  // [vehicle/packer/invoice]". Fetch resolves Vehicle No + Transporter
  // GSTIN from the (simulated) e-Way Bill API; "not required" unlocks
  // manual entry for moves that genuinely have none (e.g. intra-city).
  const [ewayBillNo, setEwayBillNo] = useState('')
  const [ewayStatus, setEwayStatus] = useState('idle') // idle | loading | done | error | notAssigned | unverified | generate | manual
  const [ewayError, setEwayError] = useState('')
  const [ewayInfoOpen, setEwayInfoOpen] = useState(false)
  const [ewayData, setEwayData] = useState(null)
  const [hsnCode, setHsnCode] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  // The "not required" check runs only on what's entered in its own panel —
  // nothing is pulled in from the rest of the form or the pickup.
  const [checkValue, setCheckValue] = useState('')
  const [checkCategory, setCheckCategory] = useState('') // '' = none of the exempt categories
  const [ewayMandatorySpecial, setEwayMandatorySpecial] = useState('none') // none | jobwork | handicraft
  const [vehicleNo, setVehicleNo] = useState(vehicleFor(pickup)?.regNo ?? '') // auto from the pickup's assigned vehicle
  const transporterGstin = OUR_GSTIN // fixed — we are always the transporter; only the vehicle changes

  // Invoice & goods
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceValue, setInvoiceValue] = useState('')
  const [insuredValue, setInsuredValue] = useState('')
  const [goodsDescription, setGoodsDescription] = useState('')

  // ⑨⑩ Packages — dimensions per SKU row, actual weight above, volumetric
  // computed here (auto), chargeable weight = MAX(actual, volumetric).
  const [packageRows, setPackageRows] = useState([emptyPackageRow()])
  const [boxes, setBoxes] = useState(() => [...BOX_MASTER])
  // Shipment details from Create Pickup — start as booked, editable.
  const [contentType, setContentType] = useState(pickup.details?.contentType ?? '')
  const [contentDescription, setContentDescription] = useState(pickup.details?.contentDescription ?? '')
  const [hazardClass, setHazardClass] = useState(pickup.details?.hazardClass ?? '')
  const [unNumber, setUnNumber] = useState(pickup.details?.unNumber ?? '')
  const [handling, setHandling] = useState(() => [
    ...(pickup.details?.fragile ? ['Fragile'] : []),
    ...(pickup.details?.hazardous ? ['Hazardous'] : []),
  ])
  // Box dimensions are stored in cm; this only switches how they're shown and
  // typed (inches convert automatically both ways).
  const [dimUnit, setDimUnit] = useState('cm')
  const toUnit = (cm) => (dimUnit === 'in' ? Math.round((Number(cm) / 2.54) * 10) / 10 : cm)
  const toCm = (v) => (dimUnit === 'in' ? Math.round(Number(v) * 2.54 * 10) / 10 : Number(v))
  const dims3 = (x) => `${toUnit(x.l)} × ${toUnit(x.b)} × ${toUnit(x.h)}`
  const [creatingBoxFor, setCreatingBoxFor] = useState(null) // row id
  const [newBox, setNewBox] = useState({ l: '', b: '', h: '' })
  const totalVolumeCft = useMemo(() => packageRows.reduce((s, r) => s + packageVolumeCft(r), 0), [packageRows])
  const volKg = useMemo(() => volumetricWeightKg(totalVolumeCft), [totalVolumeCft])
  const enteredActualWeight = Number(actualWeightKg) || 0
  const chargeableWeight = Math.max(enteredActualWeight, volKg)
  // Boxes this docket must account for; the size rows' quantities should add up to it.
  const totalBoxes = Number(packagesCount) || 0
  // With a single size, its quantity just follows the package count.
  useEffect(() => {
    if (totalBoxes > 0) setPackageRows((rows) => (rows.length === 1 && Number(rows[0].qty) !== totalBoxes ? [{ ...rows[0], qty: totalBoxes }] : rows))
  }, [totalBoxes])
  const boxesCovered = packageRows.reduce((n, r) => n + (Number(r.qty) || 0), 0)

  // ⑧ ODA — real build resolves this from Location Master's Serviceability
  // (is the consignee's pincode inside a mapped Hub/Mini Hub's coverage?);
  // manual toggle here since that wiring doesn't reach this screen yet.
  // Both are locked, not typed: ODA follows the consignee's pincode against the ODA
  // list (so it moves if an e-Way Bill changes the consignee), Appointment is what
  // the pickup was booked with.
  const odaEntry = useMemo(() => odaEntryForPincode(consigneePincode), [consigneePincode])
  const isOda = !!odaEntry
  const odaRate = odaEntry ? getDefaultOdaRate()[odaEntry.oda] ?? null : null
  const appointment = !!pickup.details?.appointment

  // ⑪ Other fields — payment term (TBB/Paid/To Pay FOD/COD) and risk cover.
  const [paymentTerm, setPaymentTerm] = useState(PAYMENT_TERM.TO_PAY)
  const [gstPayableBy, setGstPayableBy] = useState('') // consignor | consignee | lt
  const [riskCover, setRiskCover] = useState(RISK_COVER.CARRIERS_RISK)
  const [policyNo, setPolicyNo] = useState('')

  // ⑬ POD Type
  const [podType, setPodType] = useState(POD_TYPE.EPOD)

  const [generatedDocket, setGeneratedDocket] = useState(null)
  const [view, setView] = useState('details')
  const [shareStatus, setShareStatus] = useState('idle') // idle | shared | copied

  // Source rules: with an e-Way Bill, its Part A fills the consignee, invoice
  // and goods (it's the legal document, so it wins) and is cross-checked
  // against the pickup in the panel below; without one, everything already
  // comes from the pickup (state is seeded from it) and the rest is typed.
  // All stay editable.
  function applyEwayResult(result) {
    setEwayData(result)
    setConsigneeGstin(result.consignee.gstin)
    setConsigneeName(result.consignee.name)
    setConsigneeCity(result.consignee.city)
    setConsigneePincode(result.consignee.pincode)
    setInvoiceNo(result.invoiceNo)
    if (result.invoiceDate) setInvoiceDate(result.invoiceDate)
    setInvoiceValue(String(result.invoiceValue))
    setGoodsDescription(result.goods.description)
    setHsnCode(result.goods.hsn ?? '')
    setEwayStatus('done')
  }

  // Back to the pickup's own values when the e-Way Bill goes away (number
  // edited, or "generate a new one instead") — only the fields the bill filled.
  function restoreFromPickup() {
    if (!ewayData) return
    setConsigneeName(pickup.consignee?.name ?? '')
    setConsigneeCity(pickup.consignee?.city ?? '')
    setConsigneePincode(pickup.consignee?.pincode ?? '')
    setConsigneeAddress(pickup.consignee?.address ?? '')
    setConsigneeGstin('')
    setInvoiceNo((v) => (v === ewayData.invoiceNo ? '' : v))
    setInvoiceValue((v) => (v === String(ewayData.invoiceValue) ? '' : v))
    setGoodsDescription((v) => (v === ewayData.goods.description ? '' : v))
    setHsnCode((v) => (v === ewayData.goods.hsn ? '' : v))
    setEwayData(null)
  }

  function handleEwayGenerated(result) {
    setEwayBillNo(result.ewayBillNo)
    applyEwayResult(result)
  }

  async function handleFetchEwayBill() {
    setEwayStatus('loading')
    setEwayError('')
    try {
      applyEwayResult(await fetchEwayBill(ewayBillNo))
    } catch (err) {
      if (err.code === 'NOT_ASSIGNED') { setEwayStatus('notAssigned'); setEwayError(err.message); return }
      setEwayStatus('error')
      setEwayError(err.message)
    }
  }

  // Pricing — Pri Rule = Max(Min Price, chargeable-weight × client rate),
  // auto-recomputed on every keystroke that could move it (weight, packages,
  // insured value, ODA). Not editable here — Client Pricing Configuration
  // owns the rate card this reads from.
  const pricing = useMemo(
    () => priceDocket({
      clientId: pickup.clientId, actualWeightKg: enteredActualWeight, volumetricWeightKg: volKg,
      ownersRisk: riskCover === RISK_COVER.OWNERS_RISK, appointment, isOda, odaRate,
      clientCharges: ACTIVE_CLIENTS_SEED.find((c) => c.id === pickup.clientId)?.charges,
      paymentTerm, codAmount: Number(invoiceValue) || 0,
    }),
    [pickup.clientId, enteredActualWeight, volKg, riskCover, appointment, isOda, odaRate, paymentTerm, invoiceValue]
  )

  const ewayRequired = ewayStatus !== 'manual'
  const ewayNeed = ewayNeedCheck({ value: Number(checkValue) || 0, exempt: EWAY_EXEMPT_GOODS.find((g) => g.hsn === checkCategory) ?? null, special: ewayMandatorySpecial })
  const ewayReady = ewayRequired ? ewayStatus === 'done' || ewayStatus === 'unverified' : ewayNeed.state === 'ok'
  const canSubmit = !generatedDocket &&
    actualWeightKg && packagesCount && packageRows.every((r) => r.boxId) && consigneeName.trim() && !(!pickup.docketNumber && series.exhausted && !seriesAuto) &&
    ewayReady

  // Draft preview — the same shape a real docket has, built live from
  // whatever's filled in / auto-fetched so far. Package IDs before
  // Generate are a preview only (real AWBs get minted at the actual scan);
  // everything else here is exactly what Generate would write down.
  const previewAwbNumbers = hasDetails
    ? pickup.awbNumbers
    : Array.from({ length: Number(packagesCount) || 0 }, (_, i) => `${pickup.id}-AWB-${pad2(i + 1)}`)
  // Destination Mini Hub follows the consignee — so it updates when an
  // e-Way Bill swaps the consignee. Prototype stand-in: first Mini Hub in the
  // consignee's city, else a proxy "<City> Depot"; the real build resolves it
  // from Location Master's Serviceability by pincode.
  // Where the consignee came from: the pickup, a matching e-Way Bill, an
  // e-Way Bill that disagrees with the pickup (its values are the ones used),
  // or typed by hand when neither has it.
  const pickupConsignee = pickup.consignee
  const ewayDiffersFromPickup = ewayStatus === 'done' && ewayData && !!pickupConsignee?.name &&
    !(sameText(ewayData.consignee.name, pickupConsignee.name) && sameText(ewayData.consignee.city, pickupConsignee.city) && String(ewayData.consignee.pincode) === String(pickupConsignee.pincode ?? ''))
  const consigneeSource = ewayStatus === 'done'
    ? (ewayDiffersFromPickup ? 'mismatch · e-way bill' : 'e-way bill')
    : pickupConsignee?.name ? 'pickup' : 'manual'
  const destCity = consigneeCity.trim()
  const destinationMiniHubName = MINI_HUBS.find((h) => h.city.toLowerCase() === destCity.toLowerCase())?.name ?? (destCity ? `${destCity} Depot` : '')
  const draftDocket = {
    docketNumber: generatedDocket?.docketNumber ?? pickup.docketNumber ?? (series.assigned && !series.exhausted ? peekSeriesNumber(pickup.clientId) : peekNextDocketNumber()),
    status: 'pending',
    clientId: pickup.clientId,
    clientName: pickup.clientName,
    pickupId: pickup.id,
    dropMiniHubName: pickup.dropMiniHubName,
    consignee: { name: consigneeName, address: consigneeAddress, city: consigneeCity, pincode: consigneePincode },
    awbCount: totalBoxes,
    awbNumbers: previewAwbNumbers,
    totalWeightKg: enteredActualWeight,
    createdAt: generatedDocket ? 'Just now' : 'Draft — not yet generated',
    mode,
    ewayBillNo: ewayStatus === 'manual' ? '' : ewayBillNo,
    ewayExemptReason: ewayStatus === 'manual' ? ewayNeed.reason ?? '' : '',
    ewayUnverified: ewayStatus === 'unverified',
    vehicleNo, transporterGstin,
    paymentTerm, gstPayableBy, podType,
    pricing,
    // Fuller field set the physical docket sheet prints (DocketSheet) —
    // same names enrichDocketDetails stores on a generated docket.
    consignor: { ...pickup.consignor, name: consignorName, address: consignorAddress, city: consignorCity, pincode: consignorPincode },
    consigneeGstin,
    invoiceNo, invoiceValue: Number(invoiceValue) || 0, insuredValue: Number(insuredValue) || 0,
    goodsDescription, hsnCode, handling, contentType, contentDescription, hazardClass, unNumber, isOda, appointment,
    riskCover, policyNo,
    packageRows, volumetricWeightKg: volKg,
    documents: { declaration: true },
  }

  function addPackageRow() {
    // The new size takes the boxes still unassigned; if every box is already
    // sized, it takes one from the last row that has more than one.
    setPackageRows((prev) => {
      const left = totalBoxes - prev.reduce((n, r) => n + (Number(r.qty) || 0), 0)
      if (left > 0) return [...prev, { ...emptyPackageRow(), qty: left }]
      const donor = [...prev].reverse().find((r) => Number(r.qty) > 1)
      const next = donor ? prev.map((r) => (r.id === donor.id ? { ...r, qty: Number(r.qty) - 1 } : r)) : prev
      return [...next, { ...emptyPackageRow(), qty: 1 }]
    })
  }
  function updatePackageRow(id, patch) {
    setPackageRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  function removePackageRow(id) {
    setPackageRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  function handleSubmit() {
    if (!hasDetails) {
      updatePickupFieldDetails(pickup.id, {
        actualWeightKg,
        volumetricWeightKg: volKg,
        packagesCount,
        consignee: { name: consigneeName.trim(), address: consigneeAddress.trim(), city: consigneeCity.trim(), pincode: consigneePincode.trim() },
      })
    }
    const target = pickup.packagesCount ?? Number(packagesCount)
    while (pickup.scannedCount < target) scanPackage(pickup.id)

    // A consignee picked from a multi-consignee pickup may not have its docket
    // yet — raise it first, then fill in the details below.
    const docketNumber = pickup.docketNumber ?? createDocketFromPickup(pickup).docketNumber
    const docket = enrichDocketDetails(docketNumber, {
      mode,
      ewayBillNo: ewayStatus === 'manual' ? '' : ewayBillNo,
      ewayExemptReason: ewayStatus === 'manual' ? ewayNeed.reason ?? '' : '',
      ewayUnverified: ewayStatus === 'unverified',
      vehicleNo, transporterGstin,
      invoiceNo, invoiceValue: Number(invoiceValue) || 0, declaredValue: Number(invoiceValue) || 0, insuredValue: Number(insuredValue) || 0,
      goodsDescription, hsnCode, invoiceDate, handling, contentType, contentDescription, hazardClass, unNumber, isOda, appointment,
      awbCount: totalBoxes, totalWeightKg: enteredActualWeight,
      consignee: { name: consigneeName.trim(), address: consigneeAddress.trim(), city: consigneeCity.trim(), pincode: consigneePincode.trim() },
      consignor: { ...pickup.consignor, name: consignorName.trim(), address: consignorAddress.trim(), city: consignorCity.trim(), pincode: consignorPincode.trim() }, consigneeGstin, packageRows, volumetricWeightKg: volKg,
      paymentTerm, gstPayableBy, riskCover, policyNo,
      podType,
      documents: {
        invoice: !!invoiceNo, gst: !!consigneeGstin, ewayBill: ewayStatus === 'done', declaration: true,
      },
      pricing,
    })
    setGeneratedDocket(docket)
    onGenerated?.()
  }

  async function handleShare() {
    const { status } = await shareDocket(draftDocket)
    if (status === 'cancelled') return
    setShareStatus(status)
    setTimeout(() => setShareStatus('idle'), status === 'failed' ? 4000 : 2500)
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5 shadow-soft">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
          {[['details', 'Fill details'], ['preview', 'Docket preview']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-lg px-4 py-1.5 transition ${view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => printDocketSheet(draftDocket)} className={btnSecondary}>
            <Icon name="invoice" className="h-4 w-4" /> Print
          </button>
          <button type="button" onClick={() => printDocketSheet(draftDocket)} className={btnSecondary}>
            <Icon name="download" className="h-4 w-4" /> Save as PDF
          </button>
          <button type="button" onClick={handleShare} className={btnSecondary}>
            <Icon name="upload" className="h-4 w-4" />
            {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : shareStatus === 'failed' ? "Couldn't share" : 'Share'}
          </button>
        </div>
        {shareStatus === 'failed' && (
          <p className="basis-full text-xs text-red-600">Sharing and clipboard access were both blocked by the browser — copy the docket number and details manually.</p>
        )}
      </div>

      <div className={`min-w-0 space-y-4 ${view === 'details' ? '' : 'hidden'}`}>
        {!pickup.docketNumber && !generatedDocket && series.exhausted && (
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${seriesAuto ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {seriesAuto ? (
              <span>Series exhausted — this docket gets a system-generated number.</span>
            ) : (
              <>
                <span><span className="font-semibold">Docket series exhausted</span> — {series.ranges.length ? 'every number in this client\'s assigned series is used.' : 'this client has no series assigned.'}</span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => setSeriesAuto(true)} className={btnSecondary}>Auto-generate</button>
                  <button type="button" onClick={() => navigate('/client-module/client-configuration')} className={btnPrimary}>Assign new series</button>
                </span>
              </>
            )}
          </div>
        )}
        {!pickup.docketNumber && !generatedDocket && series.low && (
          <p className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">Only {series.remaining} number{series.remaining === 1 ? '' : 's'} left in this client's docket series — assign a new one soon.</p>
        )}
        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-slate-500 text-base">Docket No.: <span className="text-lg font-bold text-slate-900">{fmtDocket(draftDocket.docketNumber)}</span>{series.assigned && !series.exhausted && !pickup.docketNumber && <span className="ml-2 text-[11px] font-medium text-slate-400">assigned series · {series.remaining.toLocaleString('en-IN')} left</span>}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>Pickup <span className="font-medium text-slate-700">{pickup.id}</span></span>
              <span>Booked <span className="font-medium text-slate-700">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
              <span>
                <span className="font-medium text-slate-700">{pickup.dropMiniHubName || 'Source Mini Hub'}</span>
                <span className="mx-1 text-slate-300">→</span>
                <span className="font-medium text-slate-700">{destinationMiniHubName || 'Destination Mini Hub'}</span>
              </span>
              <label className="flex items-center gap-1.5">
                Mode
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40">
                  {Object.values(MODE).map((v) => <option key={v} value={v}>{MODE_LABEL[v]}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">E-Way Bill required</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {[['has', 'Yes'], ['none', 'No']].map(([k, label]) => {
              const active = (k === 'none') === (ewayStatus === 'manual')
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (active) return
                    if (k === 'none') { restoreFromPickup(); setEwayStatus('manual'); setEwayError('') }
                    else { setEwayStatus('idle'); setVehicleNo(''); setCheckValue(''); setCheckCategory(''); setEwayMandatorySpecial('none') }
                  }}
                  className={`rounded-lg px-5 py-1.5 transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          </div>
          {ewayInfoOpen && <EwayInfoModal onClose={() => setEwayInfoOpen(false)} />}
          {ewayStatus !== 'manual' ? (
            <>
              <div className="flex flex-wrap items-end gap-2.5">
                <Field
                  label={<span className="inline-flex items-center gap-1">E-Way Bill number<button type="button" onClick={(e) => { e.preventDefault(); setEwayInfoOpen(true) }} className="text-slate-400 hover:text-brand-orange-dark" aria-label="E-Way Bill cases"><Icon name="info" className="h-3.5 w-3.5" /></button></span>}
                  className="min-w-[220px] flex-1"
                  value={ewayBillNo}
                  onChange={(e) => { setEwayBillNo(e.target.value); setEwayStatus('idle'); setEwayError(''); restoreFromPickup() }}
                  placeholder="12-digit EWB number"
                />
                <button
                  type="button"
                  onClick={handleFetchEwayBill}
                  disabled={!isPlausibleEwayBillNumber(ewayBillNo) || ewayStatus === 'loading'}
                  className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <Icon name={ewayStatus === 'loading' ? 'history' : 'search'} className="h-4 w-4" />
                  {ewayStatus === 'loading' ? 'Fetching…' : 'Fetch & validate'}
                </button>
              </div>
              {ewayStatus !== 'generate' && (
                <button type="button" onClick={() => { setEwayStatus('generate'); setEwayError('') }} className="text-xs font-medium text-brand-orange-dark hover:underline">
                  No e-Way Bill yet? Generate one for the consignor
                </button>
              )}
              {ewayStatus === 'generate' && (
                <EwayGenerateForm
                  initial={{ invoiceNo, invoiceDate, hsn: hsnCode, invoiceValue, consigneeName, consigneeGstin, consigneeCity, consigneePincode, goodsDescription, quantity: packagesCount || pickup.packagesCount || '' }}
                  onGenerated={handleEwayGenerated}
                  onCancel={() => setEwayStatus('idle')}
                />
              )}
              {ewayStatus === 'notAssigned' && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <p className="text-xs font-medium text-amber-900">{ewayError}</p>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-lg border border-amber-200 bg-white p-3 text-xs text-slate-600">
                      <p className="mb-1 font-semibold text-slate-800">1. Ask the consignor to assign us</p>
                      <p>Transporter GSTIN to add on the bill: <span className="font-semibold text-slate-800">{OUR_GSTIN}</span></p>
                      <button type="button" onClick={() => navigator.clipboard?.writeText(`Please add ${OUR_GSTIN} (LetsTransport) as transporter on e-Way Bill ${ewayBillNo}.`).catch(() => {})} className="mt-1.5 font-medium text-brand-orange-dark hover:underline">Copy message</button>
                      <button type="button" onClick={handleFetchEwayBill} className="ml-3 mt-1.5 font-medium text-brand-orange-dark hover:underline">Fetch again</button>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white p-3 text-xs text-slate-600">
                      <p className="mb-1 font-semibold text-slate-800">2. Enter details manually</p>
                      <p>Keep the number and type the invoice, consignee and goods below. The docket is tagged "e-Way Bill not verified".</p>
                      <button type="button" onClick={() => setEwayStatus('unverified')} className="mt-1.5 font-medium text-brand-orange-dark hover:underline">Continue unverified</button>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white p-3 text-xs text-slate-600">
                      <p className="mb-1 font-semibold text-slate-800">3. Generate a new bill</p>
                      <p>Raise a fresh e-Way Bill under our GSTIN from the consignor's invoice.</p>
                      <button type="button" onClick={() => { setEwayStatus('generate'); setEwayBillNo(''); restoreFromPickup() }} className="mt-1.5 font-medium text-brand-orange-dark hover:underline">Generate</button>
                    </div>
                  </div>
                </div>
              )}
              {ewayStatus === 'unverified' && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                  <span><span className="font-semibold">E-Way Bill {ewayBillNo} — not verified.</span> Bill isn't assigned to LetsTransport; enter invoice, consignee and goods details below.</span>
                  <button type="button" onClick={() => setEwayStatus('notAssigned')} className="font-medium text-brand-orange-dark hover:underline">Back to options</button>
                </div>
              )}
              {ewayStatus === 'error' && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{ewayError}</p>
              )}
              {ewayStatus === 'done' && ewayData && (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Icon name="approve" className="h-4 w-4" /> E-Way Bill {ewayBillNo} {ewayData.generatedBy ? 'generated by LetsTransport' : 'fetched'} — valid until {ewayData.validUntil}
                  </p>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Part A <span className="font-normal normal-case text-emerald-600">— auto-filled from e-Way Bill</span></p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                      {[
                        ['Generated on', ewayData.generatedOn],
                        ['Valid until', ewayData.validUntil],
                        ['Distance', `${ewayData.distanceKm} km`],
                        ['Invoice no.', ewayData.invoiceNo],
                        ['Invoice date', ewayData.invoiceDate],
                        ['Invoice value', `₹${ewayData.invoiceValue.toLocaleString('en-IN')}`],
                        ['Consignee', ewayData.consignee.name],
                        ['Consignee GSTIN', ewayData.consignee.gstin],
                        ['Deliver to', `${ewayData.consignee.city}, ${ewayData.consignee.state} ${ewayData.consignee.pincode}`],
                        ['Goods', ewayData.goods.description],
                        ['HSN code', ewayData.goods.hsn],
                        ['Quantity', `${ewayData.goods.quantity} ${ewayData.goods.unit}`],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">{label}</dt>
                          <dd className="truncate text-sm font-semibold text-emerald-900" title={String(value)}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  {(() => {
                    const same = sameText
                    const pickupPackages = pickup.packagesCount ?? (packagesCount === '' ? null : Number(packagesCount))
                    const checks = [
                      ['Consignee', ewayData.consignee.name, pickup.consignee?.name, same(ewayData.consignee.name, pickup.consignee?.name)],
                      ['City', ewayData.consignee.city, pickup.consignee?.city, same(ewayData.consignee.city, pickup.consignee?.city)],
                      ['Pincode', ewayData.consignee.pincode, pickup.consignee?.pincode, String(ewayData.consignee.pincode) === String(pickup.consignee?.pincode ?? '')],
                      ['Packages', ewayData.goods.quantity, pickupPackages, pickupPackages != null && Number(ewayData.goods.quantity) === Number(pickupPackages)],
                    ]
                    const diffs = checks.filter((c) => !c[3]).length
                    return (
                      <div className="border-t border-emerald-200 pt-3">
                        <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          Cross-check with pickup {pickup.id}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] normal-case ${diffs ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {diffs ? `${diffs} difference${diffs > 1 ? 's' : ''} — e-Way Bill values used` : 'All match'}
                          </span>
                        </p>
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-[10px] uppercase text-emerald-600"><th className="py-1 font-medium">Field</th><th className="font-medium">e-Way Bill</th><th className="font-medium">Pickup</th><th /></tr></thead>
                          <tbody>
                            {checks.map(([label, ewb, pu, ok]) => (
                              <tr key={label} className="border-t border-emerald-100 text-emerald-900">
                                <td className="py-1 pr-2 text-emerald-700">{label}</td>
                                <td className="pr-2 font-medium">{ewb}</td>
                                <td className="pr-2">{pu ?? <span className="text-emerald-500">Not on pickup</span>}</td>
                                <td className={`text-right font-semibold ${ok ? 'text-emerald-600' : 'text-amber-700'}`}>{ok ? '✓ Match' : '⚠ Differs'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                  <div className="border-t border-emerald-200 pt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Part B <span className="font-normal normal-case text-emerald-600">— vehicle details, filled when goods are loaded</span></p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <Field label="Vehicle No." value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. DL-01-CZ-5567" />
                      <Field label="Transporter GSTIN" value={transporterGstin} readOnly hint="LetsTransport" />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className={`rounded-lg px-3 py-2 text-sm font-medium ${ewayNeed.state === 'ok' ? 'bg-emerald-100 text-emerald-800' : ewayNeed.state === 'required' ? 'bg-red-100 text-red-700' : 'bg-white text-slate-500'}`}>
                    {ewayNeed.state === 'ok' ? `✓ Not required · ${ewayNeed.reason}` : ewayNeed.state === 'required' ? `Required · ${ewayNeed.msg}` : ewayNeed.msg}
                  </p>
                {ewayNeed.note && <p className="text-xs text-amber-700">{ewayNeed.note}</p>}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <Field label="Invoice value incl. GST (₹)" type="number" min="0" value={checkValue} onChange={(e) => setCheckValue(e.target.value)} placeholder="0" />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">Exempt category</span>
                    <select value={checkCategory} onChange={(e) => setCheckCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40">
                      <option value="">None</option>
                      {EWAY_EXEMPT_GOODS.map((g) => <option key={g.hsn} value={g.hsn}>{g.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">Special movement</span>
                    <select value={ewayMandatorySpecial} onChange={(e) => setEwayMandatorySpecial(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40">
                      <option value="none">None</option>
                      <option value="jobwork">Inter-state job-work</option>
                      <option value="handicraft">Inter-state handicraft</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Vehicle No." value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. DL-01-CZ-5567" />
                <Field label="Transporter GSTIN" value={transporterGstin} readOnly hint="LetsTransport" />
              </div>
            </>
          )}
            </div>
          </div>
        </div>

        {generatedDocket && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">
              <Icon name="approve" className="mr-1.5 inline h-4 w-4" />
              Docket <span className="font-semibold">{fmtDocket(generatedDocket.docketNumber)}</span> generated — see Docket Dashboard, or open the Docket preview tab.
            </p>
          </div>
        )}

        <SectionCard title="Consignor & consignee">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                key: 'consignor', label: 'Consignor', source: 'pickup',
                name: consignorName, setName: setConsignorName, address: consignorAddress, setAddress: setConsignorAddress,
                city: consignorCity, setCity: setConsignorCity, pincode: consignorPincode, setPincode: setConsignorPincode,
              },
              {
                key: 'consignee', label: 'Consignee',
                source: consigneeSource, warn: consigneeSource === 'mismatch · e-way bill',
                name: consigneeName, setName: setConsigneeName, address: consigneeAddress, setAddress: setConsigneeAddress,
                city: consigneeCity, setCity: setConsigneeCity, pincode: consigneePincode, setPincode: setConsigneePincode,
              },
            ].map((p) => {
              // Same compact card as before (label + name + address lines) —
              // each line is just an inline-editable field, underlined so it
              // reads as editable without turning the card into a form.
              const line = 'min-w-0 border-0 border-b border-dotted border-slate-300 bg-transparent px-0 py-0.5 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-orange focus:outline-none'
              return (
                <div key={p.key} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                  <p className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>{p.label} <span className={p.warn ? 'text-amber-600' : 'text-brand-orange-dark'}>({p.source})</span></span>
                    {p.key === 'consignor' && (consignorEditable
                      ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold normal-case text-amber-700">Editing — not recommended</span>
                      : <button type="button" onClick={() => setConfirmConsignorEdit(true)} className="inline-flex items-center gap-1 text-[11px] font-medium normal-case text-slate-400 hover:text-brand-orange-dark"><Icon name="edit" className="h-3 w-3" />Edit</button>)}
                  </p>
                  {(() => {
                    const ro = p.key === 'consignor' && !consignorEditable
                    const ln = ro ? 'min-w-0 border-0 bg-transparent px-0 py-0.5 focus:outline-none cursor-default' : line
                    return (
                      <>
                        {p.key === 'consignee' ? (
                          <ConsigneeNameInput
                            className={`${line} w-full text-sm font-medium text-slate-800`}
                            value={p.name}
                            onChange={p.setName}
                            clientId={pickup.clientId}
                            clientName={pickup.clientName}
                            onPick={(c) => { setConsigneeName(c.name); setConsigneeAddress(c.address ?? ''); setConsigneeCity(c.city ?? ''); setConsigneePincode(c.pincode ?? '') }}
                          />
                        ) : (
                          <input className={`${ln} w-full text-sm font-medium text-slate-800`} value={p.name} onChange={(e) => p.setName(e.target.value)} readOnly={ro} placeholder="Name" aria-label={`${p.key} name`} />
                        )}
                        <input className={`${ln} mt-1 w-full text-xs text-slate-500`} value={p.address} onChange={(e) => p.setAddress(e.target.value)} readOnly={ro} placeholder="Address" aria-label={`${p.key} address`} />
                        <div className="mt-1 flex items-center gap-2">
                          <input className={`${ln} flex-1 text-xs text-slate-500`} value={p.city} onChange={(e) => p.setCity(e.target.value)} readOnly={ro} placeholder="City" aria-label={`${p.key} city`} />
                          <span className="text-slate-300">·</span>
                          <input className={`${ln} w-20 shrink-0 text-xs text-slate-500`} value={p.pincode} onChange={(e) => p.setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} readOnly={ro} placeholder="Pincode" inputMode="numeric" aria-label={`${p.key} pincode`} />
                        </div>
                      </>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </SectionCard>
        <ConfirmDialog
          open={confirmConsignorEdit}
          title="Edit consignor?"
          message="The consignor comes from the pickup, so editing it here is not recommended. Continue only if the pickup details are wrong."
          confirmLabel="Edit anyway"
          cancelLabel="Keep locked"
          onConfirm={() => { setConsignorEditable(true); setConfirmConsignorEdit(false) }}
          onCancel={() => setConfirmConsignorEdit(false)}
        />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <SectionCard
          title="Goods details"
          action={<span className="text-xs font-medium text-slate-500">{totalBoxes} box{totalBoxes === 1 ? '' : 'es'} · {enteredActualWeight} kg</span>}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Field dense label="1 · Actual weight (kg) *" type="number" min="0" value={actualWeightKg} onChange={(e) => setActualWeightKg(e.target.value)} placeholder={estWeight != null ? String(estWeight) : '0.0'} />
              {estWeight != null && Number(actualWeightKg) > 0 && Math.abs(Number(actualWeightKg) - estWeight) / estWeight > 0.1 && (
                <p className="mt-1 text-[11px] text-amber-600">Estimate was {estWeight} kg</p>
              )}
            </div>
            <div>
              <Field dense label="2 · Actual package count *" type="number" min="1" value={packagesCount} onChange={(e) => setPackagesCount(e.target.value)} placeholder={estCount != null ? String(estCount) : '0'} />
              {estCount != null && Number(packagesCount) > 0 && Number(packagesCount) !== estCount && (
                <p className="mt-1 text-[11px] text-amber-600">Estimate was {estCount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">3 · Content type</span>
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} aria-label="Content type" className={`w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-1.5 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40 ${contentType ? 'text-slate-800' : 'text-slate-400'}`}>
                <option value="">Select the nature of goods</option>
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <Field dense label="4 · Content description" aria-label="Content description" value={contentDescription} onChange={(e) => setContentDescription(e.target.value)} placeholder="e.g. Cosmetics" />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_3.5rem_1.5rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <span className="flex items-center gap-2 normal-case">
                <span className="text-xs font-medium text-slate-500">5 · Box size <span className="font-normal text-slate-400">(L × B × H)</span></span>
                <span className="inline-flex rounded-md bg-slate-100 p-0.5 text-[10px] font-semibold">
                  {['cm', 'in'].map((u) => (
                    <button key={u} type="button" onClick={() => setDimUnit(u)} className={`rounded px-1.5 py-0.5 ${dimUnit === u ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{u}</button>
                  ))}
                </span>
              </span>
              <span>Qty</span><span className="text-right">CFT</span><span />
            </div>
            {packageRows.map((row) => {
              const cell = 'w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-sm tabular-nums text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40'
              return (
                <div key={row.id} className="space-y-1.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_4rem_3.5rem_1.5rem] items-center gap-2">
                    <select
                      value={row.boxId}
                      onChange={(e) => {
                        if (e.target.value === '__create') { setCreatingBoxFor(row.id); setNewBox({ l: '', b: '', h: '' }); return }
                        const x = boxes.find((bx) => bx.id === e.target.value)
                        updatePackageRow(row.id, x ? { boxId: x.id, label: x.name, l: x.l, b: x.b, h: x.h } : { boxId: '', label: '', l: '', b: '', h: '' })
                      }}
                      className={`${cell} ${row.boxId ? '' : 'text-slate-400'}`}
                      aria-label="Box size"
                    >
                      <option value="">{`Select box (${dimUnit})`}</option>
                      {boxes.map((x) => <option key={x.id} value={x.id}>{x.name} — {dims3(x).replaceAll(' ', '')} {dimUnit}</option>)}
                      <option value="__create">+ Create new box…</option>
                    </select>
                    <input type="number" min="1" value={row.qty} onChange={(e) => updatePackageRow(row.id, { qty: e.target.value })} className={cell} aria-label="Quantity" />
                    <span className="text-right text-sm tabular-nums text-slate-500">{packageVolumeCft(row).toFixed(1)}</span>
                    <button type="button" onClick={() => removePackageRow(row.id)} disabled={packageRows.length === 1} className="text-slate-400 hover:text-red-500 disabled:opacity-30" aria-label="Remove size"><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                  {creatingBoxFor === row.id && (
                    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      {[['l', 'L'], ['b', 'B'], ['h', 'H']].map(([k, label]) => (
                        <label key={k} className="block"><span className="mb-1 block text-[11px] text-slate-500">{label} ({dimUnit})</span><input type="number" min="1" value={newBox[k]} onChange={(e) => setNewBox({ ...newBox, [k]: e.target.value })} className={`${cell} w-20`} aria-label={`New box ${label}`} /></label>
                      ))}
                      <button
                        type="button"
                        disabled={!(Number(newBox.l) > 0 && Number(newBox.b) > 0 && Number(newBox.h) > 0)}
                        onClick={() => {
                          const x = addBoxToMaster({ l: toCm(newBox.l), b: toCm(newBox.b), h: toCm(newBox.h) })
                          setBoxes([...BOX_MASTER])
                          updatePackageRow(row.id, { boxId: x.id, label: x.name, l: x.l, b: x.b, h: x.h })
                          setCreatingBoxFor(null)
                        }}
                        className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        Add box
                      </button>
                      <button type="button" onClick={() => setCreatingBoxFor(null)} className="pb-2 text-xs font-medium text-slate-400 hover:text-slate-600">Cancel</button>
                      {dimUnit === 'in' && Number(newBox.l) > 0 && Number(newBox.b) > 0 && Number(newBox.h) > 0 && (
                        <span className="basis-full text-[11px] text-slate-400">= {toCm(newBox.l)} × {toCm(newBox.b)} × {toCm(newBox.h)} cm (stored in cm)</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-0.5">
              <button type="button" onClick={addPackageRow} className="inline-flex items-center gap-1 text-xs font-medium text-brand-orange-dark hover:underline">
                <Icon name="plus" className="h-3.5 w-3.5" /> Another size
              </button>
              {totalBoxes > 0 && (
                <span className={`text-xs font-medium ${boxesCovered === totalBoxes ? 'text-emerald-600' : boxesCovered > totalBoxes ? 'text-red-600' : 'text-amber-600'}`}>
                  {boxesCovered === totalBoxes ? `✓ All ${totalBoxes} boxes sized` : boxesCovered > totalBoxes ? `${boxesCovered - totalBoxes} too many — ${totalBoxes} boxes` : `${boxesCovered} of ${totalBoxes} sized — ${totalBoxes - boxesCovered} left`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="flex shrink-0 flex-col gap-1.5">
              {HANDLING_FLAGS.map((f) => {
                const on = handling.includes(f)
                return (
                  <label key={f} className={`flex cursor-pointer items-center gap-2 text-sm font-medium ${on ? (f === 'Hazardous' ? 'text-rose-700' : 'text-amber-700') : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => setHandling((h) => (e.target.checked ? [...h, f] : h.filter((x) => x !== f)))}
                      className={`h-4 w-4 rounded border-slate-300 ${f === 'Hazardous' ? 'accent-rose-500' : 'accent-amber-500'}`}
                    />
                    {f}
                  </label>
                )
              })}
            </div>
            <div className="flex gap-6 text-xs text-slate-500">
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Volumetric</p><p className="tabular-nums text-slate-700">{volKg.toFixed(1)} kg</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Actual</p><p className="tabular-nums text-slate-700">{enteredActualWeight} kg</p></div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Chargeable weight</p>
              <p className="text-2xl font-semibold tabular-nums leading-tight text-brand-orange-dark">{chargeableWeight.toFixed(1)} <span className="text-sm font-medium">kg</span></p>
              {chargeableWeight > 0 && <p className="text-[10px] text-slate-400">by {volKg > enteredActualWeight ? 'volumetric' : 'actual'} weight</p>}
            </div>
          </div>
          {handling.includes('Hazardous') && (
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500">Hazard class</span>
                <select value={hazardClass} onChange={(e) => setHazardClass(e.target.value)} aria-label="Hazard class" className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40 ${hazardClass ? 'text-slate-800' : 'text-slate-400'}`}>
                  <option value="">Select class</option>
                  {HAZARD_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <Field dense label="UN number" aria-label="UN number" value={unNumber} onChange={(e) => setUnNumber(e.target.value)} placeholder="e.g. UN3481" />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Pricing (auto)"
          action={(
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <label className="flex items-center gap-1.5" title={isOda ? `Consignee pincode ${consigneePincode} is on the ODA list (ODA ${odaEntry.oda})` : 'Consignee pincode is not on the ODA list'}>
                <input type="checkbox" checked={isOda} disabled readOnly className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange" />
                ODA delivery
              </label>
              <label className="flex items-center gap-1.5" title="From the pickup booking">
                <input type="checkbox" checked={appointment} disabled readOnly className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange" />
                Appointment delivery
              </label>
            </div>
          )}
        >
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {/* The charge list is fixed — a charge that doesn't apply shows ₹0 (muted) instead of disappearing. */}
            {pricing.lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="text-slate-500">{l.label}{l.breakup?.length > 0 && <BreakupTip items={l.breakup} />}</span>
                <span className={`font-medium tabular-nums ${l.value > 0 ? 'text-slate-800' : 'text-slate-300'}`}>₹{l.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-slate-50/60 px-3 py-1.5 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium tabular-nums text-slate-800">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span className="text-slate-500">GST @18%</span>
              <span className="font-medium tabular-nums text-slate-800">₹{pricing.gst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
              <span className="text-slate-800">Total charges</span>
              <span className="tabular-nums text-brand-orange-dark">₹{pricing.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </SectionCard>
        </div>

        <SectionCard
          title="Document"
        >
          {ewayStatus === 'done' && <p className="-mt-1 text-[11px] font-medium text-brand-orange-dark">Filled from the e-Way Bill — edit if needed.</p>}
          <div className="grid grid-cols-12 gap-2.5">
            <Field label="1 · Invoice no." className="col-span-12 sm:col-span-5" dense value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="e.g. BW/OKH/26-27/01177" />
            <Field label="2 · Invoice date" type="date" className="col-span-6 sm:col-span-3" dense value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            <Field label="3 · Value incl. GST (₹)" type="number" min="0" className="col-span-6 sm:col-span-4" dense value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} placeholder="0" />

            <label className="col-span-12 block sm:col-span-9">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">4 · Goods description <span className="font-normal text-slate-400">— pick to fill HSN</span></span>
              <GoodsPicker
                value={goodsDescription}
                onChange={setGoodsDescription}
                onPick={(g) => { setGoodsDescription(g.name); setHsnCode(g.hsn) }}
              />
            </label>
            <Field
              label="HSN" className="col-span-12 sm:col-span-3" dense value={hsnCode} inputMode="numeric" placeholder="3304"
              onChange={(e) => {
                const code = e.target.value.replace(/[^\d]/g, '').slice(0, 8)
                setHsnCode(code)
                const hit = goodsByHsn(code)
                if (hit && (!goodsDescription.trim() || goodsByHsn(hsnCode)?.name === goodsDescription)) setGoodsDescription(hit.name)
              }}
            />
          </div>

        </SectionCard>

        <SectionCard title="Docket Terms">
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Payment term</span>
              <SegmentedControl options={Object.values(PAYMENT_TERM).map((v) => ({ value: v, label: PAYMENT_TERM_LABEL[v] }))} value={paymentTerm} onChange={setPaymentTerm} compact />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Risk cover</span>
              <SegmentedControl options={Object.values(RISK_COVER).map((v) => ({ value: v, label: RISK_COVER_LABEL[v] }))} value={riskCover} onChange={setRiskCover} compact />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">GST payable by</span>
              <SegmentedControl options={[{ value: 'consignor', label: 'Consignor' }, { value: 'consignee', label: 'Consignee' }, { value: 'lt', label: 'LT' }]} value={gstPayableBy} onChange={setGstPayableBy} compact />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Proof of Delivery</span>
              <SegmentedControl options={Object.values(POD_TYPE).map((v) => ({ value: v, label: POD_TYPE_LABEL[v] }))} value={podType} onChange={setPodType} compact />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field dense label="Insurance · policy name / no." value={policyNo} onChange={(e) => setPolicyNo(e.target.value)} placeholder="e.g. HDFC ERGO / P/123456" />
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
                Amount covered (₹)
                <button type="button" onClick={() => setInsuredValue(invoiceValue)} disabled={!invoiceValue} className="font-normal text-brand-orange-dark hover:underline disabled:opacity-40">= invoice</button>
              </span>
              <input
                type="number" min="0" value={insuredValue} onChange={(e) => setInsuredValue(e.target.value)} placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </label>
          </div>
        </SectionCard>

        {!generatedDocket && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft">
            {!ewayReady && <p className="text-xs text-amber-700">Fetch &amp; validate the e-Way Bill, or mark it not required with a reason, before generating.</p>}
            <button type="button" onClick={handleSubmit} disabled={!canSubmit} className={`ml-auto ${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
              <Icon name="invoice" className="h-4 w-4" />
              Generate Docket
            </button>
          </div>
        )}
      </div>

      {view === 'preview' && (
        <div className="rounded-2xl border border-slate-200/70 bg-slate-100 p-6 shadow-soft">
          <DocketSheet docket={draftDocket} />
        </div>
      )}
    </div>
  )
}

// A pickup can carry several consignees (Create Pickup's consignee list) and a
// docket is raised for exactly one of them — so with more than one, nothing
// else is shown until the user picks who this docket is for. The form then
// works off a copy of the pickup narrowed to that destination (its consignee,
// boxes, weight and share of the package IDs).
const docketForDestination = (pickupId, dest) =>
  DOCKETS_SEED.find((d) => d.pickupId === pickupId && sameText(d.consignee?.name, dest.consignee.name)) ?? null

const sumOf = (list, k) => list.reduce((n, d) => n + (Number(d[k]) || 0), 0)

// Slots = one per docket this pickup needs. Named consignees come first; the
// rest are "pending" — consignee unknown (or only partly known) until typed in
// the form. A pending slot's raised docket is found by elimination: dockets of
// this pickup that match none of the named consignees, oldest first.
function buildSlots(pickup, named, partial, count) {
  const extras = DOCKETS_SEED.filter((d) => d.pickupId === pickup.id && !named.some((n) => sameText(n.consignee.name, d.consignee?.name))).reverse()
  const slots = named.map((dest) => ({ kind: 'known', dest, docket: docketForDestination(pickup.id, dest) }))
  for (let i = 0; i < count - named.length; i++) {
    slots.push({ kind: 'pending', n: named.length + i + 1, i, prefill: partial[i] ?? null, docket: extras[i] ?? null })
  }
  return slots
}

function slotView(pickup, slots, idx) {
  const slot = slots[idx]
  const known = slots.filter((s) => s.kind === 'known').map((s) => s.dest)
  if (slot.kind === 'known') {
    const dest = slot.dest
    const offset = known.slice(0, known.indexOf(dest)).reduce((n, d) => n + (d.boxes || 0), 0)
    return {
      ...pickup,
      consignee: dest.consignee,
      packagesCount: dest.boxes,
      scannedCount: dest.boxes,
      actualWeightKg: dest.kg,
      awbNumbers: (pickup.awbNumbers ?? []).slice(offset, offset + dest.boxes),
      docketNumber: slot.docket?.docketNumber,
    }
  }
  // Pending: split whatever the known consignees leave over, evenly, as an estimate.
  const pending = slots.filter((s) => s.kind === 'pending').length
  const knownBoxes = sumOf(known, 'boxes')
  const boxes = slot.prefill?.boxes ?? (pickup.packagesCount != null ? Math.max(1, Math.floor(Math.max(0, pickup.packagesCount - knownBoxes) / pending)) : null)
  const kgLeft = (pickup.actualWeightKg ?? pickup.estWeightKg) != null ? Math.max(0, (pickup.actualWeightKg ?? pickup.estWeightKg) - sumOf(known, 'kg')) : null
  const kg = slot.prefill?.kg ?? (kgLeft != null ? Math.round(kgLeft / pending) : null)
  const offset = knownBoxes + slot.i * (boxes ?? 0)
  return {
    ...pickup,
    consignee: slot.prefill?.consignee ?? null,
    packagesCount: boxes,
    scannedCount: boxes ?? pickup.scannedCount,
    actualWeightKg: kg,
    estWeightKg: kg,
    awbNumbers: boxes != null ? (pickup.awbNumbers ?? []).slice(offset, offset + boxes) : pickup.awbNumbers,
    docketNumber: slot.docket?.docketNumber,
  }
}

function DocketForChooser({ slots, count, minCount, onCount, value, onChange }) {
  const raised = slots.filter((s) => s.docket).length
  const stepBtn = 'flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-base leading-none text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className={`space-y-2 p-3 ${card}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Docket for</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">{raised} of {count} dockets raised</span>
          <span className="flex items-center gap-1.5" title="How many dockets (consignees) this pickup needs. Raise it if the consignee list is missing or incomplete.">
            <span className="font-medium text-slate-600">No. of dockets</span>
            <button type="button" className={stepBtn} disabled={count <= minCount} onClick={() => onCount(count - 1)} aria-label="Fewer dockets">−</button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums text-slate-800">{count}</span>
            <button type="button" className={stepBtn} onClick={() => onCount(count + 1)} aria-label="More dockets">+</button>
          </span>
        </div>
      </div>
      {count > 1 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot, i) => {
            const active = value === i
            const c = slot.kind === 'known' ? slot.dest.consignee : slot.prefill?.consignee
            const boxes = slot.kind === 'known' ? slot.dest.boxes : slot.prefill?.boxes
            const kg = slot.kind === 'known' ? slot.dest.kg : slot.prefill?.kg
            const meta = [c?.city, boxes != null ? `${boxes} box${boxes === 1 ? '' : 'es'}` : null, kg != null ? `${kg} kg` : null].filter(Boolean).join(' · ')
            return (
              <button
                key={slot.kind === 'known' ? slot.dest.consignee.name : `pending-${slot.i}`}
                type="button"
                onClick={() => onChange(i)}
                className={`rounded-xl border px-3 py-2 text-left transition ${active ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <p className={`truncate text-sm font-medium ${c?.name ? 'text-slate-800' : 'text-slate-500'}`}>{c?.name || `Consignee ${slot.n}`}</p>
                <p className="text-xs text-slate-500">{meta || 'Details to be filled'}</p>
                <p className={`mt-1 text-[11px] font-medium ${slot.docket ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {slot.docket ? `Docket ${fmtDocket(slot.docket.docketNumber)}` : 'Docket not raised'}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CreateDocket() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const [selectedId, setSelectedId] = useState(null)
  const [destIdx, setDestIdx] = useState(null)

  const selected = selectedId ? PICKUPS_SEED.find((p) => p.id === selectedId) ?? null : null
  const allDests = selected?.details?.destinations ?? []
  const named = allDests.filter((d) => d.consignee?.name)
  const partial = allDests.filter((d) => !d.consignee?.name && (d.consignee?.city || d.consignee?.pincode))
  const knownCount = named.length + partial.length
  const raisedTotal = selected ? DOCKETS_SEED.filter((d) => d.pickupId === selected.id).length : 0
  const minCount = Math.max(1, knownCount, raisedTotal)
  const count = selected ? Math.max(minCount, DOCKET_COUNTS.get(selected.id) ?? knownCount) : 1
  const slots = selected ? buildSlots(selected, named, partial, count) : []
  const multi = count > 1
  const slotIdx = destIdx != null && destIdx < slots.length ? destIdx : null
  const formPickup = !selected ? null : multi ? (slotIdx != null ? slotView(selected, slots, slotIdx) : null) : selected

  function setCount(n) {
    DOCKET_COUNTS.set(selected.id, Math.max(minCount, n))
    if (destIdx != null && destIdx >= n) setDestIdx(null)
    refresh()
  }

  function handleSelect(pickup) {
    setSelectedId(pickup.id)
    setDestIdx(null)
    refresh()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Create Docket</h1>
      </div>

      <PickupSearch onSelect={handleSelect} />

      {selected && <DocketForChooser slots={slots} count={count} minCount={minCount} onCount={setCount} value={slotIdx} onChange={(i) => { setDestIdx(i); refresh() }} />}

      {formPickup ? (
        <DocketForm key={`${selected.id}:${slotIdx ?? 'x'}`} pickup={formPickup} onGenerated={refresh} />
      ) : multi ? (
        <div className={`p-8 text-center text-sm text-slate-500 ${card}`}>Pick the docket to fill.</div>
      ) : (
        <div className={`flex flex-col items-center justify-center gap-2 p-14 text-center ${card}`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange-dark">
            <Icon name="invoice" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-600">Search a Pickup ID above to raise its docket.</p>
        </div>
      )}
    </div>
  )
}

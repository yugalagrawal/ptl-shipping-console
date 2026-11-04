import BackButton from '../../components/BackButton.jsx'
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
import { exemptGoodsFor } from '../../data/ewayExemptGoods.js'
import { goodsByHsn, searchGoods } from '../../data/goodsCatalog.js'
import { seriesState, peekSeriesNumber, modeOfNumber } from '../../data/docketSeries.js'
import { BOX_MASTER, addBoxToMaster } from '../../data/boxMaster.js'
import { CONTENT_TYPES, HAZARD_CLASSES } from '../../data/goodsOptions.js'
import { PRS_SEED } from '../../data/prs.js'
import PartyModal from '../../components/PartyModal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { getAllConsignees, addConsigneeForClient } from '../../data/consignees.js'
import { getAllConsignors, addConsignorForClient } from '../../data/consignors.js'
import { getClientConfigValues, PRICING_CONDITION_OTHERS } from '../../data/clientConfigFields.js'
import { FLEET_SEED } from '../../data/fleet.js'
import { fetchEwayBill, generateEwayBill, isPlausibleEwayBillNumber, OUR_GSTIN } from '../../data/ewayBill.js'
import { priceDocket, volumetricWeightKg, cftToKgFor, EMERGENCY_SURCHARGE_ON } from '../../data/docketPricing.js'
import { ACTIVE_CLIENTS_SEED, clientCodeFor } from '../../data/clients.js'
import { groupById } from '../../data/groups.js'
import { odaEntryForPincode, getDefaultOdaRate } from '../../data/odaPincodes.js'
import { printDocketSheet } from './docketPrintSheet.js'
import { CopyPicker } from '../../components/DocketSheet.jsx'
import { COPY_OPTIONS } from '../../components/docketSheetHtml.js'
import DocketLabelsPanel from '../../components/DocketLabelsPanel.jsx'
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

export function SegmentedControl({ options, value, onChange, compact, small }) {
  return (
    <div className={`flex rounded-xl bg-slate-100 ${small ? 'gap-0.5 rounded-lg p-0.5 text-[11px]' : 'gap-1 p-1 text-sm'} ${compact ? 'w-fit' : 'flex-wrap'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-md ${small ? 'px-1.5 py-1' : `${compact ? 'px-2.5' : 'px-3'} py-1.5`} font-medium transition-colors ${value === o.value ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
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
  return { label: prs.vehicleLabel, regNo: veh?.regNo ?? '', driver: prs.driverName, prsId: prs.id, partner, vehicleId: veh?.id ?? null }
}

// Dockets this pickup needs when ops sets the count by hand (pickup id → n).
const DOCKET_COUNTS = new Map()

function candidatePickups() {
  return PICKUPS_SEED.filter((p) => {
    // A docket belongs to the pickup, not the run — so it can be raised before any PRS / vehicle exists.
    if (p.status !== PICKUP_STATUS.CREATED && p.status !== PICKUP_STATUS.ASSIGNED && p.status !== PICKUP_STATUS.ARRIVED) return false
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

export const emptyPackageRow = () => ({ id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, boxId: '', label: '', l: '', b: '', h: '', qty: 1 })

// Goods details beyond what the invoice / e-Way Bill already carries.
// Same two flags Create Pickup captures, so the docket starts from what the booking said.
const HANDLING_FLAGS = ['Fragile', 'Hazardous']

export function packageVolumeCft(row) {
  const l = Number(row.l) || 0, b = Number(row.b) || 0, h = Number(row.h) || 0, qty = Number(row.qty) || 0
  return (l * b * h * qty) / 28317 // cm³ per cubic foot
}

// Box-size rows (box master pick, qty, CFT) — shared by Create Docket and
// Create Pickup. `rows` live in the parent; the box master and the cm/in
// switch are local.
export function BoxSizeRows({ rows: packageRows, setRows: setPackageRows, totalBoxes, label = '5 · Box size', cftToKg = 6 }) {
  const [boxes, setBoxes] = useState(() => [...BOX_MASTER])
  // Box dimensions are stored in cm; this only switches how they're shown and
  // typed (inches convert automatically both ways).
  const [dimUnit, setDimUnit] = useState('cm')
  const toUnit = (cm) => (dimUnit === 'in' ? Math.round((Number(cm) / 2.54) * 10) / 10 : cm)
  const toCm = (v) => (dimUnit === 'in' ? Math.round(Number(v) * 2.54 * 10) / 10 : Number(v))
  const dims3 = (x) => `${toUnit(x.l)} × ${toUnit(x.b)} × ${toUnit(x.h)}`
  const [creatingBoxFor, setCreatingBoxFor] = useState(null) // row id
  const [newBox, setNewBox] = useState({ l: '', b: '', h: '' })
  const boxesCovered = packageRows.reduce((n, r) => n + (Number(r.qty) || 0), 0)

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

  return (
  <div className="space-y-2">
    <div className="grid grid-cols-[minmax(0,1fr)_4rem_1.5rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
      <span className="flex items-center gap-2 normal-case">
        <span className="text-xs font-medium text-slate-500">{label} <span className="font-normal text-slate-400">(L × B × H)</span></span>
        <span className="inline-flex rounded-md bg-slate-100 p-0.5 text-[10px] font-semibold">
          {['cm', 'in'].map((u) => (
            <button key={u} type="button" onClick={() => setDimUnit(u)} className={`rounded px-1.5 py-0.5 ${dimUnit === u ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{u}</button>
          ))}
        </span>
      </span>
      <span>Qty</span><span />
    </div>
    {packageRows.map((row) => {
      const cell = 'w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-sm tabular-nums text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40'
      return (
        <div key={row.id} className="space-y-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_4rem_1.5rem] items-center gap-2">
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
      {(() => { const v = volumetricWeightKg(packageRows.reduce((n, r) => n + packageVolumeCft(r), 0), cftToKg); return v > 0 ? <span className="text-[11px] text-slate-400">Vol. weight = {v.toFixed(1)} kg</span> : <span /> })()}
      {totalBoxes > 0 && (
        <span className={`text-xs font-medium ${boxesCovered === totalBoxes ? 'text-emerald-600' : boxesCovered > totalBoxes ? 'text-red-600' : 'text-amber-600'}`}>
          {boxesCovered === totalBoxes ? `✓ All ${totalBoxes} boxes sized` : boxesCovered > totalBoxes ? `${boxesCovered - totalBoxes} too many — ${totalBoxes} boxes` : `${boxesCovered} of ${totalBoxes} sized — ${totalBoxes - boxesCovered} left`}
        </span>
      )}
    </div>
  </div>
  )
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
export function GoodsPicker({ value, onChange, onPick, inputRef, placeholder = 'Search goods or type — e.g. Cosmetics' }) {
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
        placeholder={placeholder}
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
    invoiceNo: initial.invoiceNo, invoiceDate: initial.invoiceDate || '', invoiceValue: initial.invoiceValue,
    consigneeName: initial.consigneeName, consigneeGstin: initial.consigneeGstin,
    consigneeCity: initial.consigneeCity, consigneeState: '', consigneePincode: initial.consigneePincode,
    goodsDescription: initial.goodsDescription, hsn: initial.hsn || '', quantity: initial.quantity, unit: 'BOX', distanceKm: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }))
  const valid = v.invoiceNo.trim() && v.invoiceDate && v.invoiceValue && v.consigneeName.trim() && /^\d{6}$/.test(v.consigneePincode) &&
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
function ewayNeedCheck({ value, hsn, exempt, special }) {
  if (!hsn) return { state: 'pending', msg: 'Enter the goods HSN in Document to check' }
  if (exempt) return { state: 'ok', reason: `Exempt goods — ${exempt.label}`, note: exempt.note }
  if (!special) return { state: 'pending', msg: 'Answer the movement question to check' }
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
  ['Bill exists but is not assigned to us', 'Ask the consignor to add our GSTIN as transporter, then Fetch again. Or Continue unverified — enter invoice, consignee and goods by hand; the docket is marked "not verified".'],
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

// Pick a consignee / consignor (and which of its sites) from the master — nothing here is typed,
// so the address, city and pincode always come from a real saved site. Type to search the list;
// "Create" adds a new party to the master (and this client) and uses it.
function PartyPicker({ kind, value, clientId, clientName, onPick, disabled, className }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [coords, setCoords] = useState(null)
  const [q, setQ] = useState('')
  const [typing, setTyping] = useState(false) // typed text only filters — it is never saved as the party
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const isConsignee = kind === 'consignee'

  const all = isConsignee ? getAllConsignees() : getAllConsignors()
  const mine = all.filter((c) => c.clientIds.includes(clientId))
  const needle = typing ? q.trim().toLowerCase() : ''
  const options = (mine.length ? mine : all)
    .flatMap((party) => party.sites.map((site) => ({ key: `${party.id}|${site.id}`, party, site })))
    .filter((o) => !needle || `${o.party.partyName} ${o.site.label} ${o.site.address} ${o.site.city} ${o.site.pincode}`.toLowerCase().includes(needle))

  useEffect(() => {
    if (!open) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) })
    }
    place()
    const onDown = (e) => { if (!panelRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) { setOpen(false); setTyping(false) } }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])

  const fill = (party, site) => onPick({
    name: party.sites.length > 1 && site.label && site.label !== 'Main' ? `${party.partyName} — ${site.label}` : party.partyName,
    address: site.address, city: site.city, pincode: site.pincode,
  })

  if (disabled) return <p className={className}>{value || <span className="text-slate-400">—</span>}</p>
  return (
    <>
      <input
        ref={btnRef}
        role="combobox"
        aria-expanded={open}
        aria-label={`Choose ${kind}`}
        autoComplete="off"
        className={className}
        value={typing ? q : value}
        placeholder={`Search ${kind}…`}
        onFocus={() => { setQ(''); setTyping(false); setOpen(true) }}
        onChange={(e) => { setQ(e.target.value); setTyping(true); setOpen(true) }}
      />
      {open && coords && createPortal(
        <div ref={panelRef} style={{ top: coords.top, left: coords.left, width: coords.width }} className="fixed z-[60] rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {options.map((o) => (
              <button key={o.key} type="button" onClick={() => { fill(o.party, o.site); setOpen(false); setTyping(false) }} className="block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50">
                <span className="block truncate text-sm text-slate-800">{o.party.partyName}{o.party.sites.length > 1 ? ` · ${o.site.label}` : ''}</span>
                <span className="block truncate text-[11px] text-slate-400">{o.site.address}, {o.site.city} {o.site.pincode}</span>
              </button>
            ))}
            {options.length === 0 && <p className="px-2.5 py-2 text-xs text-slate-400">{needle ? `No ${kind} matches “${q}”` : `No ${kind} in the master yet`}</p>}
          </div>
          <button type="button" onClick={() => { setOpen(false); setTyping(false); setAdding(true) }} className="mt-1 block w-full rounded-lg border-t border-slate-100 px-2.5 py-1.5 text-left text-xs font-semibold text-brand-orange-dark hover:bg-slate-50">+ Create {kind}</button>
        </div>,
        document.body
      )}
      {adding && (
        <PartyModal
          kind={kind}
          companyDefault={clientName}
          onClose={() => setAdding(false)}
          onSave={(form) => {
            const { clientIds: _ignored, ...data } = form
            const row = (isConsignee ? addConsigneeForClient : addConsignorForClient)(clientId, data)
            fill(row, row.sites[0])
            setAdding(false)
          }}
        />
      )}
    </>
  )
}

const NO_SERIES = { assigned: false, ranges: [], active: null, next: null, remaining: 0, exhausted: false, low: false }

// What happens right after a docket is created: jump to it on the Docket Dashboard, and put package
// labels on it — either print system-generated ones, or link pre-printed stock labels (same two
// routes the PTL APP offers at pickup).
function DocketCreatedPanel({ docket, dockets = [docket], packages, onViewDashboard, onOpenDocket, footer }) {
  return (
    <div className="space-y-4">
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-emerald-800">
          <Icon name="approve" className="mr-1.5 inline h-4 w-4" />
          {dockets.length > 1 ? 'Dockets' : 'Docket'}{' '}
          {dockets.map((d, i) => (
            <span key={d.docketNumber}>{i > 0 && ' · '}
              <button type="button" onClick={() => onOpenDocket?.(d.docketNumber)} title="Open in Docket Dashboard" className="font-semibold underline decoration-emerald-400 decoration-dotted underline-offset-2 hover:decoration-solid">{fmtDocket(d.docketNumber)}</button>
            </span>
          ))}{' '}created
        </p>
        <button type="button" onClick={onViewDashboard} className={btnPrimary}>
          <Icon name="search" className="h-4 w-4" />
          View on Docket Dashboard
        </button>
      </div>
      {footer}
    </div>
    {/* Labelling is its own step — a separate box, for the docket just raised. */}
    <DocketLabelsPanel docket={docket} packages={packages} title="Start Labelling" titleNote={dockets.length > 1 ? `docket ${fmtDocket(docket.docketNumber)}` : undefined} />
    </div>
  )
}

function DocketForm({ pickup, onGenerated, initialEway, noBill, intakeOpen, onContinue, createdFooter }) {
  const navigate = useNavigate()
  // Assigned docket series (Client Configuration): once a client's numbers run
  // out, ops chooses — auto-generate this docket's number, or assign a new series.
  const [seriesAuto, setSeriesAuto] = useState(false)
  // Mode comes first — series are assigned by service, so the docket number follows it.
  // No default: nothing is numbered until a mode is chosen (a docket that already exists keeps its own).
  const [mode, setMode] = useState(() => (pickup.docketNumber && modeOfNumber(pickup.docketNumber)) || '')
  const series = mode ? seriesState(pickup.clientId, mode) : NO_SERIES
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

  // ⑥⑦ Mode + delivery type (the B/L/V shorthand — Solo MH / Direct Hub /
  // Direct MH) — manual, since routing hasn't run yet at docket time.

  // Part B / e-Way Bill — ⑫ "Part B auto-fill & mapped to e-way bill
  // [vehicle/packer/invoice]". Fetch resolves Vehicle No + Transporter
  // GSTIN from the (simulated) e-Way Bill API; "not required" unlocks
  // manual entry for moves that genuinely have none (e.g. intra-city).
  const [ewayBillNo, setEwayBillNo] = useState('')
  // Print pricing on the docket: starts from the client's configuration, but can be flipped for this docket.
  const printPricingDefault = !pickup.clientId || getClientConfigValues(pickup.clientId)['pricing-on-docket'] !== 'No'
  const [printPricing, setPrintPricing] = useState(printPricingDefault)
  const [confirmPrintChange, setConfirmPrintChange] = useState(false) // moving "Print on docket" away from the client's configured default asks first
  const [clientCode, setClientCode] = useState(() => clientCodeFor(pickup.clientId, (id) => groupById(id)?.name ?? ''))
  // Optional charges are ticked by hand for now (a settings screen for when each applies comes later);
  // a ticked charge is evaluated from the client's own rates.
  const [chargeOverride, setChargeOverride] = useState({}) // key → true/false once ops ticks/unticks by hand
  // Part B of the e-Way Bill (vehicle). If the bill arrives without one, the vehicle picked above goes on it.
  const [ewayDeclared, setEwayDeclared] = useState(false) // "No e-way bill required" declaration, only offered once every check passes
  const [ewayStatus, setEwayStatus] = useState(noBill ? 'manual' : 'idle') // idle | loading | done | error | notAssigned | unverified | generate | manual
  const [ewayError, setEwayError] = useState('')
  const [ewayInfoOpen, setEwayInfoOpen] = useState(false)
  const [ewayDecided, setEwayDecided] = useState({ consignee: 'ewb', consignor: 'pu' }) // which side each consignor / consignee mismatch was settled on: ewb | pu | self
  const [slot, setSlot] = useState(null) // the "no e-way bill" checks live in the intake card at the top, not in this form
  useEffect(() => { setSlot(document.getElementById('eway-manual-slot')) }, [])
  const [ewayData, setEwayData] = useState(null)
  const [hsnCode, setHsnCode] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('') // entered (or read off the e-way bill) — never defaulted to today
  // The "not required" check runs only on what's entered in its own panel —
  // nothing is pulled in from the rest of the form or the pickup.
  // Value and exemption are read from the Document section (invoice value, goods HSN)
  // so the check can't be answered differently from what the docket says.
  // The movement question must be answered explicitly: '' (not answered) | none | jobwork | handicraft
  const [ewayMandatorySpecial, setEwayMandatorySpecial] = useState('')

  // Invoice & goods
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceValue, setInvoiceValue] = useState('')
  const [insuredValue, setInsuredValue] = useState('')
  const [goodsDescription, setGoodsDescription] = useState('')

  // ⑨⑩ Packages — dimensions per SKU row, actual weight above, volumetric
  // computed here (auto), chargeable weight = MAX(actual, volumetric).
  const [packageRows, setPackageRows] = useState([emptyPackageRow()])
  // Shipment details from Create Pickup — start as booked, editable.
  const [contentType, setContentType] = useState(pickup.details?.contentType ?? '')
  const [contentDescription, setContentDescription] = useState(pickup.details?.contentDescription ?? '')
  const [hazardClass, setHazardClass] = useState(pickup.details?.hazardClass ?? '')
  const [unNumber, setUnNumber] = useState(pickup.details?.unNumber ?? '')
  const [handling, setHandling] = useState(() => [
    ...(pickup.details?.fragile ? ['Fragile'] : []),
    ...(pickup.details?.hazardous ? ['Hazardous'] : []),
  ])
  const cftToKg = cftToKgFor(pickup.clientId, mode)
  const totalVolumeCft = useMemo(() => packageRows.reduce((s, r) => s + packageVolumeCft(r), 0), [packageRows])
  const volKg = useMemo(() => volumetricWeightKg(totalVolumeCft, cftToKg), [totalVolumeCft, cftToKg])
  const enteredActualWeight = Number(actualWeightKg) || 0
  const chargeableWeight = Math.max(enteredActualWeight, volKg)
  // Boxes this docket must account for; the size rows' quantities should add up to it.
  const totalBoxes = Number(packagesCount) || 0
  // With a single size, its quantity just follows the package count.
  useEffect(() => {
    if (totalBoxes > 0) setPackageRows((rows) => (rows.length === 1 && Number(rows[0].qty) !== totalBoxes ? [{ ...rows[0], qty: totalBoxes }] : rows))
  }, [totalBoxes])

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
  // The four terms start from the client's configuration (Docket Settings); changing one asks first.
  const termDefaults = useMemo(() => {
    const cfg = getClientConfigValues(pickup.clientId)
    const key = (map, label) => Object.keys(map).find((k) => map[k] === label)
    return {
      paymentTerm: key(PAYMENT_TERM_LABEL, cfg['docket-payment-term']) ?? PAYMENT_TERM.TO_PAY,
      riskCover: cfg['docket-risk-cover'] === "Owner's Risk" ? RISK_COVER.OWNERS_RISK : RISK_COVER.CARRIERS_RISK,
      gstPayableBy: String(cfg['docket-gst-payable-by'] ?? 'Consignor').toLowerCase(),
      podType: key(POD_TYPE_LABEL, cfg['docket-pod-type']) ?? POD_TYPE.EPOD,
    }
  }, [pickup.clientId])
  const [paymentTerm, setPaymentTerm] = useState(termDefaults.paymentTerm)
  const [gstPayableBy, setGstPayableBy] = useState(termDefaults.gstPayableBy) // consignor | consignee | lt
  const [riskCover, setRiskCover] = useState(termDefaults.riskCover)
  const [pendingTerm, setPendingTerm] = useState(null) // { field, value } waiting on "client configuration says … are you sure?"
  const GST_LABEL = { consignor: 'Consignor', consignee: 'Consignee', lt: 'LT' }
  const TERM_FIELDS = {
    paymentTerm: { name: 'Payment term', labels: PAYMENT_TERM_LABEL, set: setPaymentTerm },
    riskCover: { name: 'Risk cover', labels: RISK_COVER_LABEL, set: setRiskCover },
    gstPayableBy: { name: 'GST payable by', labels: GST_LABEL, set: setGstPayableBy },
    podType: { name: 'POD', labels: POD_TYPE_LABEL, set: (v) => setPodType(v) },
  }
  const changeTerm = (field, value) => (value === termDefaults[field] ? TERM_FIELDS[field].set(value) : setPendingTerm({ field, value }))
  const [policyNo, setPolicyNo] = useState('')

  // ⑬ POD Type
  const [podType, setPodType] = useState(termDefaults.podType)

  const [generatedDocket, setGeneratedDocket] = useState(null)
  const existingGenerated = !!pickup.docketNumber && !!DOCKETS_SEED.find((d) => d.docketNumber === pickup.docketNumber)?.generated
  const locked = !!generatedDocket || existingGenerated // a created docket can't be edited any more
  const [copies, setCopies] = useState(COPY_OPTIONS.slice(0, 2)) // copies to print — two per A4 sheet
  const [previewingCreate, setPreviewingCreate] = useState(false) // "Generate Docket" opens a preview first; Create docket there makes it
  const [view, setView] = useState('details')
  const [shareStatus, setShareStatus] = useState('idle') // idle | shared | copied

  // Source rules: with an e-Way Bill, its Part A fills the consignee, invoice
  // and goods (it's the legal document, so it wins) and is cross-checked
  // against the pickup in the panel below; without one, everything already
  // comes from the pickup (state is seeded from it) and the rest is typed.
  // All stay editable.
  function applyEwayResult(result) {
    setEwayData(result)
    // The e-Way Bill is the legal document, so its values are used by default; each difference can be switched.
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

  // Opened from the e-way-bill-first step: the bill is already fetched, so apply it straight away.
  useEffect(() => {
    if (!initialEway) return
    setEwayBillNo(initialEway.ewayBillNo)
    if (initialEway.blocked) { setEwayStatus('notAssigned'); setEwayError(initialEway.blocked); return } // bill exists but isn't assigned to us — the options panel takes over
    applyEwayResult(initialEway)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  // Which optional charges apply comes from the client's Pricing Conditions (Client Configuration →
  // Pickup & Docket); ticking or unticking one here overrides it for this docket only.
  const pc = getClientConfigValues(pickup.clientId)
  const othersApply = PRICING_CONDITION_OTHERS.filter((id) => pc[id] === 'Always').map((id) => id.replace('pc-others-', ''))
  const chargesOn = {
    exception: pc['pc-exception'] === 'Always',
    fov: pc['pc-fov'] === 'Always' || (pc['pc-fov'] === "When Owner's Risk is selected" && riskCover === RISK_COVER.OWNERS_RISK),
    fsc: pc['pc-fsc'] === 'Always',
    ess: pc['pc-ess'] === 'Always' || (pc['pc-ess'] === 'While an emergency is declared' && EMERGENCY_SURCHARGE_ON),
    handling: pc['pc-handling'] === 'Always' || (pc['pc-handling'] === 'Above 200 kg chargeable weight' && chargeableWeight > 200),
    others: othersApply.length > 0,
    ...chargeOverride,
  }
  const pricing = useMemo(
    () => priceDocket({
      clientId: pickup.clientId, actualWeightKg: enteredActualWeight, volumetricWeightKg: volKg,
      ownersRisk: riskCover === RISK_COVER.OWNERS_RISK, appointment, isOda, odaRate,
      clientCharges: ACTIVE_CLIENTS_SEED.find((c) => c.id === pickup.clientId)?.charges,
      paymentTerm, codAmount: Number(invoiceValue) || 0, apply: chargesOn, othersApply,
    }),
    [JSON.stringify(chargesOn), othersApply.join(), pickup.clientId, enteredActualWeight, volKg, riskCover, appointment, isOda, odaRate, paymentTerm, invoiceValue]
  )

  const ewayRequired = ewayStatus !== 'manual'
  const ewayNeed = ewayNeedCheck({ value: Number(invoiceValue) || 0, hsn: hsnCode, exempt: exemptGoodsFor(hsnCode), special: ewayMandatorySpecial })
  // The declaration only stands while every check passes — change a value and it has to be given again.
  useEffect(() => { if (ewayDeclared && ewayNeed.state === 'required') setEwayDeclared(false) }, [ewayDeclared, ewayNeed.state])
  // No e-way bill: the three checks are optional, the declaration is not — and a filled-in check that says a bill is required still blocks it.
  // (Continue in the intake card is only reachable with the declaration ticked, so once it's pressed the declaration stands.)
  const ewayReady = ewayRequired ? ewayStatus === 'done' || ewayStatus === 'unverified' : ewayNeed.state !== 'required' && (ewayDeclared || (noBill && !intakeOpen))
  // What's still blocking Generate Docket, in the order it appears on the form.
  const missing = [
    !mode && 'Mode',
    !actualWeightKg && 'Actual weight',
    !packagesCount && 'Package count',
    !packageRows.every((r) => r.boxId) && 'Box size',
    !consigneeName.trim() && 'Consignee',
    !pickup.docketNumber && series.exhausted && !seriesAuto && 'Docket series (exhausted)',
    !ewayReady && (ewayRequired ? 'E-way bill' : 'No-e-way-bill declaration'),
  ].filter(Boolean)
  const canSubmit = !generatedDocket && !!mode &&
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
    docketNumber: generatedDocket?.docketNumber ?? pickup.docketNumber ?? (!mode ? null : series.assigned && !series.exhausted ? peekSeriesNumber(pickup.clientId, mode) : series.exhausted && !seriesAuto ? null : peekNextDocketNumber(mode)),
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
    printPricing, chargesApplied: chargesOn, clientCode: clientCode.trim() || undefined,
    ewayExemptReason: ewayStatus === 'manual' ? ewayNeed.reason ?? '' : '',
    ewayUnverified: ewayStatus === 'unverified',
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
    const docketNumber = pickup.docketNumber ?? createDocketFromPickup(pickup, mode).docketNumber
    const docket = enrichDocketDetails(docketNumber, {
      mode,
      ewayBillNo: ewayStatus === 'manual' ? '' : ewayBillNo,
      printPricing, chargesApplied: chargesOn, clientCode: clientCode.trim() || undefined,
      ewayExemptReason: ewayStatus === 'manual' ? ewayNeed.reason ?? '' : '',
      ewayUnverified: ewayStatus === 'unverified',
      invoiceNo, invoiceValue: Number(invoiceValue) || 0, declaredValue: Number(invoiceValue) || 0, insuredValue: Number(insuredValue) || 0,
      goodsDescription, hsnCode, invoiceDate, handling, contentType, contentDescription, hazardClass, unNumber, isOda, appointment,
      generated: true, awbCount: totalBoxes, totalWeightKg: enteredActualWeight,
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

  // Filling opens only once a mode is chosen and the docket number exists (already-raised dockets are open).
  const started = !!pickup.docketNumber || !!generatedDocket || (!!mode && !!draftDocket.docketNumber)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)

  async function handleShare() {
    const { status } = await shareDocket(draftDocket)
    if (status === 'cancelled') return
    setShareStatus(status)
    setTimeout(() => setShareStatus('idle'), status === 'failed' ? 4000 : 2500)
  }

  // Just raised: nothing but the confirmation, the package labels and what to do next.
  if (generatedDocket && createdFooter) {
    return (
      <DocketCreatedPanel docket={generatedDocket} dockets={[...DOCKETS_SEED.filter((d) => d.pickupId === pickup.id)].reverse().length ? [...DOCKETS_SEED.filter((d) => d.pickupId === pickup.id)].reverse() : [generatedDocket]} packages={Number(generatedDocket.awbCount) || totalBoxes || 1} onViewDashboard={() => navigate(`/docket-module/dashboard?docket=${generatedDocket.docketNumber}`)} onOpenDocket={(n) => navigate(`/docket-module/dashboard?docket=${n}`)} footer={createdFooter} />
    )
  }

  return (
    <div className="space-y-4">
      <div className={`sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5 shadow-soft ${started ? '' : 'hidden'}`}>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
          {[['details', 'Docket details'], ['preview', 'Docket preview']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-lg px-4 py-1.5 transition ${view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-baseline gap-1.5 text-sm text-slate-500" aria-label="Docket number">
          Docket No.
          <span className="text-base font-bold tabular-nums text-slate-900">{draftDocket.docketNumber ? fmtDocket(draftDocket.docketNumber) : '—'}</span>
          {mode && <span className="text-xs font-medium text-slate-400">{MODE_LABEL[mode]}</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => printDocketSheet(draftDocket, copies)} disabled={!draftDocket.docketNumber || !copies.length} className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}>
            <Icon name="invoice" className="h-4 w-4" /> Print
          </button>
          <div className="relative">
            <button type="button" onClick={() => setShareMenuOpen((o) => !o)} disabled={!draftDocket.docketNumber} aria-expanded={shareMenuOpen} className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}>
              <Icon name="upload" className="h-4 w-4" />
              {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : shareStatus === 'failed' ? "Couldn't share" : 'Share'}
              <Icon name="chevron" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${shareMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {shareMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShareMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                  <button type="button" onClick={() => { setShareMenuOpen(false); printDocketSheet(draftDocket, copies) }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50">
                    <Icon name="download" className="h-4 w-4 text-slate-400" /> Save as PDF
                  </button>
                  <button type="button" onClick={() => { setShareMenuOpen(false); handleShare() }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50">
                    <Icon name="upload" className="h-4 w-4 text-slate-400" /> Share / copy details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {shareStatus === 'failed' && (
          <p className="basis-full text-xs text-red-600">Sharing and clipboard access were both blocked by the browser — copy the docket number and details manually.</p>
        )}
      </div>

      {generatedDocket && (
        <DocketCreatedPanel docket={generatedDocket} packages={Number(generatedDocket.awbCount) || totalBoxes || 1} onViewDashboard={() => navigate(`/docket-module/dashboard?docket=${generatedDocket.docketNumber}`)} />
      )}

      <fieldset disabled={locked || !started} className={`m-0 min-w-0 space-y-4 border-0 p-0 ${view === 'details' ? '' : 'hidden'} ${started ? '' : '[&>*:not(legend)]:hidden'}`}>
        <legend className="mb-4 block w-full space-y-4 p-0">
        {!pickup.docketNumber && !generatedDocket && series.exhausted && (
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${seriesAuto ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {seriesAuto ? (
              <span>Series exhausted — this docket gets a system-generated number.</span>
            ) : (
              <>
                <span><span className="font-semibold">Docket series exhausted</span> — {series.ranges.length ? `every number in this client's ${MODE_LABEL[mode]} series is used.` : `this client has no ${MODE_LABEL[mode]} series assigned.`}</span>
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
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <label className="flex items-center gap-1.5 text-base text-slate-500">
                Mode
                <select value={mode} aria-label="Mode" disabled={!!pickup.docketNumber || !!generatedDocket} onChange={(e) => { setMode(e.target.value); setSeriesAuto(false) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-800 disabled:opacity-60 focus:outline focus:outline-2 focus:outline-brand-orange/40">
                  <option value="" disabled>Select mode</option>
                  {Object.values(MODE).map((v) => <option key={v} value={v}>{MODE_LABEL[v]}</option>)}
                </select>
              </label>
            <p className="text-slate-500 text-base">Docket No.: <span className="text-lg font-bold text-slate-900">{draftDocket.docketNumber ? fmtDocket(draftDocket.docketNumber) : <span className="text-sm font-medium text-slate-400">{mode ? 'Assigned after series is resolved' : 'Select a mode to get the docket number'}</span>}</span>{series.assigned && !series.exhausted && !pickup.docketNumber && <span className="ml-2 text-[11px] font-medium text-slate-400">assigned series · {series.remaining.toLocaleString('en-IN')} left</span>}</p>
            </div>
          </div>
          {!started && <p className="mt-2 text-xs text-slate-500">Select a mode to start — the docket number is generated first, then the rest of the form opens.</p>}
        </div>
        </legend>
        {ewayStatus !== 'manual' && (
        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-soft">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 flex-1 space-y-3">
          {ewayInfoOpen && <EwayInfoModal onClose={() => setEwayInfoOpen(false)} />}
          {ewayStatus !== 'manual' ? (
            <>
              {ewayStatus === 'generate' && (
                <EwayGenerateForm
                  initial={{ invoiceNo, invoiceDate, hsn: hsnCode, invoiceValue, consigneeName, consigneeGstin, consigneeCity, consigneePincode, goodsDescription, quantity: packagesCount || pickup.packagesCount || '' }}
                  onGenerated={handleEwayGenerated}
                  onCancel={() => setEwayStatus('idle')}
                />
              )}
              {ewayStatus === 'notAssigned' && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="flex items-start gap-2 text-sm font-medium text-amber-900">
                    <Icon name="flag" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{ewayError}</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        n: 1, title: 'Ask the consignor to assign us',
                        body: <>Ask them to add LetsTransport as transporter: <span className="mt-1.5 block w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-800">{OUR_GSTIN}</span></>,
                        action: 'Fetch again', onClick: handleFetchEwayBill,
                      },
                      {
                        n: 2, title: 'Enter details manually',
                        body: 'Keep the number and type the invoice, consignee and goods below. The docket is tagged “e-Way Bill not verified”.',
                        action: 'Continue unverified', onClick: () => setEwayStatus('unverified'),
                      },
                      {
                        n: 3, title: 'Generate a new bill',
                        body: 'Raise a fresh e-Way Bill under our GSTIN from the consignor’s invoice.',
                        action: 'Generate new bill', onClick: () => { setEwayStatus('generate'); setEwayBillNo(''); restoreFromPickup() },
                      },
                    ].map((o) => (
                      <div key={o.n} className="flex flex-col rounded-xl border border-amber-200/80 bg-white p-4 shadow-soft">
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">{o.n}</span>
                          <p className="text-sm font-semibold leading-tight text-slate-900">{o.title}</p>
                        </div>
                        <p className="flex-1 text-xs leading-relaxed text-slate-500">{o.body}</p>
                        <button type="button" onClick={o.onClick} className="mt-3.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange/50 hover:bg-brand-orange/5 hover:text-brand-orange-dark">
                          {o.action}
                        </button>
                      </div>
                    ))}
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
              {ewayStatus === 'done' && ewayData && (() => {
                const bill = ewayData.consignee
                const pc = pickup.consignee
                const pr = pickup.consignor
                const br = ewayData.consignor
                const place = (c) => [c?.city, c?.pincode].filter(Boolean).join(' ')
                const join = (c) => [c?.name, place(c)].filter(Boolean).join(', ')
                // Only the two parties are checked. Invoice, goods and the rest are simply filled from the bill.
                const rows = []
                if (pr?.name && br?.name && !(sameText(br.name, pr.name) && (!pr.pincode || !br.pincode || String(br.pincode) === String(pr.pincode)))) {
                  rows.push({
                    key: 'consignor', label: 'Consignor', ewb: join(br), pu: join(pr),
                    useEwb: () => { setConsignorName(br.name); setConsignorAddress(''); setConsignorCity(br.city ?? ''); setConsignorPincode(String(br.pincode ?? '')) },
                    usePu: () => { setConsignorName(pr.name ?? ''); setConsignorAddress(pr.address ?? ''); setConsignorCity(pr.city ?? ''); setConsignorPincode(String(pr.pincode ?? '')) },
                    edit: () => setConfirmConsignorEdit(true), // the consignor comes from the pickup — editing it asks first
                  })
                }
                if (pc?.name && !(sameText(bill.name, pc.name) && sameText(bill.city, pc.city) && (!pc.pincode || String(bill.pincode) === String(pc.pincode)))) {
                  rows.push({
                    key: 'consignee', label: 'Consignee', ewb: join(bill), pu: join(pc),
                    useEwb: () => { setConsigneeName(bill.name); setConsigneeCity(bill.city); setConsigneePincode(String(bill.pincode)) },
                    usePu: () => { setConsigneeName(pc.name ?? ''); setConsigneeCity(pc.city ?? ''); setConsigneePincode(String(pc.pincode ?? '')) },
                    edit: () => document.querySelector('input[aria-label="Choose consignee"]')?.focus(),
                  })
                }
                const pick = (r, how) => { (how === 'ewb' ? r.useEwb : how === 'pu' ? r.usePu : r.edit)(); setEwayDecided((d) => ({ ...d, [r.key]: how })) }
                const btn = (r, how, text) => (
                  <button key={how} type="button" onClick={() => pick(r, how)} className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${ewayDecided[r.key] === how ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{text}</button>
                )
                return (
                  <div className="space-y-3">
                    <p className="flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800">
                      <Icon name="approve" className="h-4 w-4" />
                      Filled from e-way bill {ewayBillNo}
                      <span className="ml-auto text-xs font-normal text-emerald-600">valid until {ewayData.validUntil}</span>
                    </p>
                    {rows.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5">
                        <p className="text-xs font-semibold text-amber-900">Differs from pickup {pickup.id}</p>
                        <div className="divide-y divide-amber-100">
                          {rows.map((r) => (
                            <div key={r.key} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2">
                              <div className="min-w-0 flex-1 basis-56">
                                <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                  {r.label}
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-px text-[10px] font-semibold text-amber-800"><Icon name="flag" className="h-3 w-3" />Mismatch</span>
                                </p>
                                <p className="truncate text-xs text-slate-500">E-way bill: <span className="font-medium text-slate-700">{r.ewb}</span> · Pickup: <span className="font-medium text-slate-700">{r.pu}</span></p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {btn(r, 'ewb', 'E-way bill')}
                                {btn(r, 'pu', 'Pickup')}
                                {btn(r, 'self', 'Edit yourself')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          ) : null}
            </div>
          </div>
        </div>
        )}

        {ewayStatus === 'manual' && intakeOpen && slot && createPortal(
              <div className="space-y-2.5">
                {ewayNeed.state === 'required' && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700">Required · {ewayNeed.msg}</p>}
                {ewayNeed.note && <p className="text-xs text-amber-700">{ewayNeed.note}</p>}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <Field label="Invoice value incl. GST (₹)" type="number" min="0" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} />
                  <Field
                    label="Goods HSN" value={hsnCode} inputMode="numeric" placeholder="3304"
                    hint={hsnCode ? (exemptGoodsFor(hsnCode) ? 'Exempt category' : 'Not exempt') : undefined}
                    onChange={(e) => {
                      const code = e.target.value.replace(/[^\d]/g, '').slice(0, 8)
                      setHsnCode(code)
                      const hit = goodsByHsn(code)
                      if (hit && (!goodsDescription.trim() || goodsByHsn(hsnCode)?.name === goodsDescription)) setGoodsDescription(hit.name)
                    }}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">Inter-state job-work or handicraft?</span>
                    <select value={ewayMandatorySpecial} onChange={(e) => setEwayMandatorySpecial(e.target.value)} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40 ${ewayMandatorySpecial ? 'text-slate-800' : 'text-slate-400'}`}>
                      <option value="">Select</option>
                      <option value="none">No — neither</option>
                      <option value="jobwork">Inter-state job-work</option>
                      <option value="handicraft">Inter-state handicraft</option>
                    </select>
                  </label>
                </div>
                <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium ${ewayDeclared ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-slate-800'} ${ewayNeed.state === 'required' ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <input type="checkbox" checked={ewayDeclared} disabled={ewayNeed.state === 'required'} onChange={(e) => setEwayDeclared(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
                  <span>Consignor declares that an e-way bill is not required for this docket. <span className="text-brand-orange-dark">*</span></span>
                </label>
                <div className="flex justify-end">
                  <button type="button" onClick={onContinue} disabled={!ewayReady} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>Continue</button>
                </div>
              </div>,
          slot,
        )}

        <SectionCard
          title="Consignor & consignee"
          action={(
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500" title="Printed on the docket next to the consignor">
              Client code
              <input value={clientCode} onChange={(e) => setClientCode(e.target.value.toUpperCase())} aria-label="Client code" placeholder="—" className="w-36 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40" />
            </label>
          )}
        >
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
                    return (
                      <>
                        <PartyPicker
                          kind={p.key}
                          className={`${line} w-full text-sm font-medium text-slate-800`}
                          value={p.name}
                          clientId={pickup.clientId}
                          clientName={pickup.clientName}
                          disabled={ro}
                          onPick={(c) => { p.setName(c.name); p.setAddress(c.address ?? ''); p.setCity(c.city ?? ''); p.setPincode(c.pincode ?? '') }}
                        />
                        <p className="mt-1 min-h-[1.25rem] text-xs text-slate-500" aria-label={`${p.key} address`}>{p.address || <span className="text-slate-300">Address</span>}</p>
                        <p className="mt-1 text-xs text-slate-500" aria-label={`${p.key} city and pincode`}>
                          {p.city || <span className="text-slate-300">City</span>} <span className="text-slate-300">·</span> {p.pincode || <span className="text-slate-300">Pincode</span>}
                        </p>
                      </>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </SectionCard>
        <ConfirmDialog
          open={!!pendingTerm}
          title="Change from client configuration?"
          message={pendingTerm ? `Client configuration says ${TERM_FIELDS[pendingTerm.field].name}: ${TERM_FIELDS[pendingTerm.field].labels[termDefaults[pendingTerm.field]]}. Are you sure you want to change it to ${TERM_FIELDS[pendingTerm.field].labels[pendingTerm.value]}?` : ''}
          confirmLabel="Yes, change"
          cancelLabel="Keep default"
          onConfirm={() => { TERM_FIELDS[pendingTerm.field].set(pendingTerm.value); setPendingTerm(null) }}
          onCancel={() => setPendingTerm(null)}
        />
        <ConfirmDialog
          open={confirmPrintChange}
          title="Change from client configuration?"
          message={`Client configuration says ${printPricingDefault ? 'Yes, print pricing on the docket' : 'No, do not print pricing on the docket'}. Are you sure you want to change it for this docket?`}
          confirmLabel="Yes, change"
          cancelLabel="Keep default"
          onConfirm={() => { setPrintPricing(!printPricingDefault); setConfirmPrintChange(false) }}
          onCancel={() => setConfirmPrintChange(false)}
        />
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
          action={(totalBoxes > 0 || enteredActualWeight > 0) ? <span className="text-xs font-medium text-slate-500">{totalBoxes} box{totalBoxes === 1 ? '' : 'es'} · {enteredActualWeight} kg</span> : null}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Field dense label="1 · Actual weight (kg) *" type="number" min="0" value={actualWeightKg} onChange={(e) => setActualWeightKg(e.target.value)} />
            </div>
            <div>
              <Field dense id="docket-package-count" label="2 · Actual package count *" type="number" min="1" value={packagesCount} onChange={(e) => setPackagesCount(e.target.value)} />
              {ewayStatus === 'done' && ewayData?.goods?.quantity != null && <p className="mt-1 text-[11px] text-slate-400">E-way bill: {ewayData.goods.quantity} {String(ewayData.goods.unit ?? 'pkgs').toLowerCase()}</p>}
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

          <BoxSizeRows rows={packageRows} setRows={setPackageRows} totalBoxes={totalBoxes} cftToKg={cftToKg} />

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
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Volumetric</p><p className="tabular-nums text-slate-700">{volKg > 0 ? `${volKg.toFixed(1)} kg` : '—'}</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Actual</p><p className="tabular-nums text-slate-700">{enteredActualWeight > 0 ? `${enteredActualWeight} kg` : '—'}</p></div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Chargeable weight</p>
              <p className="text-2xl font-semibold tabular-nums leading-tight text-brand-orange-dark">{chargeableWeight > 0 ? <>{chargeableWeight.toFixed(1)} <span className="text-sm font-medium">kg</span></> : '—'}</p>
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

        <SectionCard title="Pricing">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50/70 px-3 py-2" title="Starts from the client's configuration — untick to leave charges off this docket's print">
            <input type="checkbox" checked={printPricing} onChange={(e) => (e.target.checked === printPricingDefault ? setPrintPricing(e.target.checked) : setConfirmPrintChange(true))} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-orange" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-700">Print on docket</span>
              <span className="block text-[11px] text-slate-400">Default: {printPricingDefault ? 'Yes' : 'No'} · from client configuration</span>
            </span>
          </label>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {/* The charge list is fixed — a charge that doesn't apply shows ₹0 (muted) instead of disappearing. Basic freight, docket, appointment and ODA are automatic; the rest apply once ticked, at the client's rates. */}
            {pricing.lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  {(() => {
                    // Automatic charges are locked and simply show whether they apply to this docket.
                    const auto = { 'Basic freight': true, 'Docket charges': true, Appointment: appointment, ODA: isOda }
                    return l.key ? (
                      <input type="checkbox" aria-label={`Apply ${l.label}`} checked={chargesOn[l.key]} onChange={(e) => setChargeOverride((c) => ({ ...c, [l.key]: e.target.checked }))} className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange" />
                    ) : (
                      <input type="checkbox" aria-label={`${l.label} (automatic)`} checked={!!auto[l.label]} disabled readOnly title={l.label === 'ODA' ? (isOda ? `Consignee pincode ${consigneePincode} is on the ODA list` : 'Consignee pincode is not on the ODA list') : l.label === 'Appointment' ? 'From the pickup booking' : 'Always applied'} className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange" />
                    )
                  })()}
                  <span>{l.label}{l.breakup?.length > 0 && <BreakupTip items={l.breakup} />}</span>
                </span>
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
            <Field label="3 · Value incl. GST (₹)" type="number" min="0" className="col-span-6 sm:col-span-4" dense value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} />

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
          <div className="flex flex-nowrap items-start justify-between gap-x-2 overflow-x-auto">
            <div>
              <span className="mb-1 block whitespace-nowrap text-[11px] font-medium text-slate-500">Payment term</span>
              <SegmentedControl options={Object.values(PAYMENT_TERM).map((v) => ({ value: v, label: PAYMENT_TERM_LABEL[v] }))} value={paymentTerm} onChange={(v) => changeTerm('paymentTerm', v)} compact small />
            </div>
            <div>
              <span className="mb-1 block whitespace-nowrap text-[11px] font-medium text-slate-500">Risk cover</span>
              <SegmentedControl options={Object.values(RISK_COVER).map((v) => ({ value: v, label: RISK_COVER_LABEL[v] }))} value={riskCover} onChange={(v) => changeTerm('riskCover', v)} compact small />
            </div>
            <div>
              <span className="mb-1 block whitespace-nowrap text-[11px] font-medium text-slate-500">GST payable by</span>
              <SegmentedControl options={[{ value: 'consignor', label: 'Consignor' }, { value: 'consignee', label: 'Consignee' }, { value: 'lt', label: 'LT' }]} value={gstPayableBy} onChange={(v) => changeTerm('gstPayableBy', v)} compact small />
            </div>
            <div>
              <span className="mb-1 block whitespace-nowrap text-[11px] font-medium text-slate-500">POD</span>
              <SegmentedControl options={Object.values(POD_TYPE).map((v) => ({ value: v, label: POD_TYPE_LABEL[v] }))} value={podType} onChange={(v) => changeTerm('podType', v)} compact small />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field dense label="Insurance · policy name / no." value={policyNo} onChange={(e) => setPolicyNo(e.target.value)} placeholder="e.g. HDFC ERGO / P/123456" />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Amount covered (₹)</span>
              <input
                type="number" min="0" value={insuredValue} onChange={(e) => setInsuredValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </label>
          </div>
        </SectionCard>

        {!generatedDocket && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft">
            {missing.length > 0 && <p className="text-xs text-amber-700">Still needed to generate: {missing.join(' · ')}</p>}
            <button type="button" onClick={() => setPreviewingCreate(true)} disabled={!canSubmit} className={`ml-auto ${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
              <Icon name="invoice" className="h-4 w-4" />
              Generate Docket
            </button>
          </div>
        )}
      </fieldset>

      {previewingCreate && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 p-4" onClick={() => setPreviewingCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Preview docket</h3>
                <p className="text-xs text-slate-500">Check everything — once the docket is created it can't be edited.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPreviewingCreate(false)} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Back to edit</button>
                <button type="button" onClick={() => { setPreviewingCreate(false); handleSubmit() }} className={btnPrimary}>
                  <Icon name="invoice" className="h-4 w-4" />
                  Create docket
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-5">
              <DocketSheet docket={draftDocket} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {view === 'preview' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-soft">
            <CopyPicker value={copies} onChange={setCopies} />
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-100 p-6 shadow-soft">
            <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">A4 half · 210 × 148.5 mm — showing {copies[0] ?? 'Shipper Copy'}</p>
            <DocketSheet docket={draftDocket} copy={copies[0]} />
          </div>
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

// Intake for a pickup — the e-way bill is the unit of work: every bill handed over becomes one docket.
// The pickup's consignee list / docket count is only what we *expect*; bills are checked against it.
function DocketIntake({ pickup, slots, count, expected, ewb, noBill, onFetched, onResetBill, onNoBill, onBackToBill }) {
  const [no, setNo] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')
  const hints = slots.filter((s) => s.kind === 'known').map((s) => s.dest.consignee)
  const raised = slots.filter((s) => s.docket).length
  const remaining = slots.map((s, i) => ({ s, i })).filter(({ s }) => !s.docket)
  const stillToRaise = remaining.map(({ s }) => (s.kind === 'known' ? s.dest.consignee.name : s.prefill?.consignee?.name)).filter(Boolean)

  async function fetchBill() {
    setStatus('loading'); setError('')
    try {
      const bill = await fetchEwayBill(no, { consignees: hints, consignor: pickup.consignor })
      const msg = onFetched(bill)
      if (msg) { setStatus('error'); setError(msg); return }
      setNo(''); setStatus('idle')
    } catch (err) {
      if (err.code === 'NOT_ASSIGNED') { onFetched({ ewayBillNo: no, blocked: err.message }); setNo(''); setStatus('idle'); return }
      setStatus('error'); setError(err.message)
    }
  }

  return (
    <div className={`space-y-2.5 p-3 ${card}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-slate-500">{pickup.consignor?.name ? <>Consignor <span className="font-medium text-slate-700">{pickup.consignor.name}</span></> : ''}</p>
        <p className="text-xs text-slate-500" title="Expected = the pickup's consignee list, else 1">
          Expected dockets: <span className="font-medium text-slate-700 tabular-nums">{count}</span>
          <span className="mx-2 text-slate-300">·</span>
          Raised yet: <span className="font-medium text-slate-700 tabular-nums">{raised}</span>
        </p>
      </div>
      {expected && stillToRaise.length > 0 && <p className="text-[11px] text-slate-400">Still to raise: {stillToRaise.join(' · ')}</p>}

      {noBill ? (
        <>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
          <span>No e-way bill</span>
          <button type="button" onClick={onBackToBill} className="text-xs font-medium text-brand-orange-dark hover:underline">← Back to e-way bill</button>
        </div>
        <div id="eway-manual-slot" />
        </>
      ) : ewb ? (
        <div className="grid items-start gap-x-8 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">E-way bill</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{ewb.bill.ewayBillNo}</p>
          </div>
          {ewb.bill.blocked ? (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-0.5 text-sm font-medium text-amber-700">Not assigned to LetsTransport</p>
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Consignee
                  {ewb.matched && <span className="rounded-full bg-emerald-50 px-2 py-px text-[10px] normal-case tracking-normal text-emerald-700">On the pickup's list</span>}
                  {!ewb.matched && hints.length > 0 && <span className="rounded-full bg-amber-50 px-2 py-px text-[10px] normal-case tracking-normal text-amber-700">Extra — not on the pickup's list</span>}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{ewb.bill.consignee.name}</p>
                <p className="text-xs text-slate-500">{ewb.bill.consignee.city} · {ewb.bill.consignee.pincode}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Invoice</p>
                <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">₹{ewb.bill.invoiceValue.toLocaleString('en-IN')}</p>
                <p className="truncate text-xs text-slate-500">{ewb.bill.invoiceNo}</p>
              </div>
            </>
          )}
          <button type="button" onClick={onResetBill} className="justify-self-end text-xs font-medium text-brand-orange-dark hover:underline">Enter a different e-way bill</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2.5">
            <Field
              label="E-Way Bill number"
              className="min-w-[220px] flex-1"
              value={no}
              onChange={(e) => { setNo(e.target.value.replace(/\D/g, '').slice(0, 12)); setStatus('idle'); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter' && isPlausibleEwayBillNumber(no)) fetchBill() }}
              placeholder="12-digit EWB number"
              inputMode="numeric"
              autoFocus
            />
            <button type="button" onClick={fetchBill} disabled={!isPlausibleEwayBillNumber(no) || status === 'loading'} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
              {status === 'loading' ? 'Fetching…' : 'Fetch & continue'}
            </button>
          </div>
          {status === 'error' && <p className="text-xs text-rose-600">{error}</p>}
          <p className="text-xs font-medium text-rose-600"><button type="button" onClick={onNoBill} className="underline decoration-dotted hover:text-rose-700">No e-way bill?</button></p>
        </>
      )}
    </div>
  )
}

// Shown once the docket on screen is raised: carry on with the next e-way bill, or mark the pickup done.
// `bare` = rendered inside the green "docket created" box instead of as its own card.
function NextDocket({ pickupId, clientName, raised, count, expected, remainingNames, onNext, onMore, onDone, bare }) {
  const [confirming, setConfirming] = useState(false)
  const all = expected && raised >= count
  return (
    <div className={bare ? 'space-y-2 border-y border-emerald-200/70 py-3' : `space-y-2 p-3 ${card} ${all ? 'border-emerald-200 bg-emerald-50/50' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">All dockets done for {pickupId} · {clientName}?</p>
          <p className="text-xs text-slate-500">{expected ? `${raised} of ${count} dockets raised` : `${raised} docket${raised === 1 ? '' : 's'} raised`}{all ? '' : ' — add the next e-way bill, or mark all done.'}</p>
        </div>
        <button type="button" onClick={all ? onMore : onNext} className={btnSecondary}>Add more e-way bill</button>
        <button type="button" onClick={() => (remainingNames.length ? setConfirming(true) : onDone())} className={btnPrimary}>Mark all done</button>
      </div>
      {confirming && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>{remainingNames.join(', ')} {remainingNames.length === 1 ? 'has' : 'have'} no docket yet. Mark all done anyway?</span>
          <button type="button" onClick={onDone} className="font-semibold underline">Yes, mark done</button>
          <button type="button" onClick={() => setConfirming(false)} className="font-medium text-slate-500 hover:underline">Cancel</button>
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
  const [ewb, setEwb] = useState(null) // { bill, idx, matched } — the fetched e-way bill and the docket slot it landed on
  const [fresh, setFresh] = useState(false) // a docket was just raised on this screen → only the green confirmation shows
  const [manualDone, setManualDone] = useState(false) // no-bill declaration confirmed in the intake card — the docket form opens
  const [noBill, setNoBill] = useState(false) // "No e-way bill" — the form is filled by hand for a consignee picked from what's left

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

  // Expected dockets = the pickup's consignee list / set count, else 1.
  const expected = !!selected // nothing known up front → 1 expected docket; extra bills grow it
  const raisedCount = slots.filter((x) => x.docket).length
  const remainingNames = slots.filter((x) => !x.docket).map((x) => (x.kind === 'known' ? x.dest.consignee.name : x.prefill?.consignee?.name)).filter(Boolean)
  const slotConsignee = (x) => (x.kind === 'known' ? x.dest.consignee : x.prefill?.consignee)

  function resetIntake() { setEwb(null); setNoBill(false); setManualDone(false); setFresh(false); setDestIdx(null) }

  // A slot to put one more docket on: the first not yet raised, else a new one (count grows).
  function freeSlot(prefer) {
    let idx = prefer ?? slots.findIndex((x) => x.kind === 'pending' && !x.docket)
    if (idx < 0) idx = slots.findIndex((x) => !x.docket)
    if (idx < 0) {
      idx = slots.length
      setCount(count + 1)
    }
    return idx
  }

  // Returns a message when the bill can't be used.
  function handleEwayFetched(bill) {
    if (DOCKETS_SEED.some((d) => d.ewayBillNo === bill.ewayBillNo) || (ewb && ewb.bill.ewayBillNo === bill.ewayBillNo && slots[ewb.idx]?.docket)) {
      return `E-Way Bill ${bill.ewayBillNo} already has a docket.`
    }
    const c = bill.consignee ?? {}
    // Match the bill's consignee to what the pickup expected — by name, then by pincode.
    let idx = c.name ? slots.findIndex((x) => !x.docket && slotConsignee(x)?.name && sameText(slotConsignee(x).name, c.name)) : -1
    if (idx < 0 && c.pincode) idx = slots.findIndex((x) => !x.docket && slotConsignee(x)?.pincode && String(slotConsignee(x).pincode) === String(c.pincode))
    const matched = idx >= 0
    if (!matched) idx = bill.blocked ? freeSlot(slots.findIndex((x) => !x.docket)) : freeSlot()
    setNoBill(false)
    setEwb({ bill, idx, matched })
    setDestIdx(idx)
    return undefined
  }

  // No e-way bill: the form opens straight away on the next docket still to raise (consignee typed / picked in the form).
  function handleNoBill() {
    setManualDone(false)
    setNoBill(true)
    setEwb(null)
    setDestIdx(freeSlot(slots.findIndex((x) => !x.docket)))
  }

  function handleSelect(pickup) {
    setSelectedId(pickup.id)
    resetIntake()
    refresh()
  }

  const ready = slotIdx != null && (noBill || !!ewb)
  const created = slotIdx != null && !!slots[slotIdx]?.docket

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {selected ? (
        // Inside a pickup — it becomes the title, with a Back link; the pickup search and filters only show when no pickup is open.
        <div>
          <button type="button" onClick={() => { setSelectedId(null); resetIntake(); refresh() }} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <Icon name="arrow-left" className="h-3.5 w-3.5" /> Back to Create Docket
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{selected.id} · {selected.clientName}</h1>
          {created && fresh && <p className="mt-0.5 text-xs text-slate-500">Add another e-way bill, or mark all dockets done for this pickup.</p>}
        </div>
      ) : (
        <>
          <div>
            <BackButton />
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Create Docket</h1>
          </div>

          <PickupSearch onSelect={handleSelect} />
        </>
      )}

      {selected && !created && (
        <DocketIntake
          pickup={selected} slots={slots} count={count} expected={expected} ewb={ewb} noBill={noBill}
          onFetched={handleEwayFetched} onResetBill={resetIntake}
          onNoBill={handleNoBill} onBackToBill={resetIntake}
        />
      )}

      {selected && created && !fresh && (
        <NextDocket
          pickupId={selected.id} clientName={selected.clientName} raised={raisedCount} count={count} expected={expected} remainingNames={remainingNames}
          onNext={resetIntake}
          onMore={() => { setCount(count + 1); resetIntake() }}
          onDone={() => { setSelectedId(null); resetIntake(); refresh() }}
        />
      )}

      {selected && !ready ? null : formPickup ? (
        <div className={noBill && !manualDone && !created ? 'hidden' : ''}>
        <DocketForm key={`${selected.id}:${slotIdx ?? 'x'}:${noBill ? 'nobill' : ewb?.bill.ewayBillNo ?? ''}`} pickup={formPickup} onGenerated={() => { setFresh(true); refresh() }} initialEway={noBill ? undefined : ewb?.bill} noBill={noBill} intakeOpen={!manualDone} onContinue={() => setManualDone(true)}
          createdFooter={fresh ? (
            <NextDocket
              bare pickupId={selected.id} clientName={selected.clientName} raised={raisedCount} count={count} expected={expected} remainingNames={remainingNames}
              onNext={resetIntake}
              onMore={() => { setCount(count + 1); resetIntake() }}
              onDone={() => { setSelectedId(null); resetIntake(); refresh() }}
            />
          ) : undefined} />
        </div>
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

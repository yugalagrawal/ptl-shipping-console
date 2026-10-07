import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import DocketSheet from '../../components/DocketSheet.jsx'
import { card, btnPrimary, btnSecondary } from '../../components/ui.js'
import { PICKUPS_SEED, PICKUP_STATUS, updatePickupFieldDetails, scanPackage } from '../../data/pickups.js'
import {
  MODE, MODE_LABEL,
  PAYMENT_TERM, PAYMENT_TERM_LABEL, RISK_COVER, RISK_COVER_LABEL, POD_TYPE, POD_TYPE_LABEL,
  peekNextDocketNumber, enrichDocketDetails,
} from '../../data/dockets.js'
import { INDIAN_STATES } from '../../data/geo.js'
import { PRS_SEED } from '../../data/prs.js'
import { FLEET_SEED } from '../../data/fleet.js'
import { fetchEwayBill, generateEwayBill, isPlausibleEwayBillNumber, OUR_GSTIN } from '../../data/ewayBill.js'
import { priceDocket, volumetricWeightKg } from '../../data/docketPricing.js'
import { printDocketSheet } from './docketPrintSheet.js'
import { shareDocket } from '../../utils/docketShare.js'

function Field({ label, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
    </label>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className={`space-y-3 p-4 ${card}`}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${value === o.value ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AutoChip({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3.5 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label} <span className="text-brand-orange-dark">(auto)</span></p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function CheckRow({ checked, label }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <input type="checkbox" checked={checked} readOnly className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40" />
      {label}
    </label>
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

function candidatePickups() {
  return PICKUPS_SEED.filter((p) => (p.status === PICKUP_STATUS.GROUPED || p.status === PICKUP_STATUS.ARRIVED) && !p.docketNumber)
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

const emptyPackageRow = () => ({ id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: 'STD', l: '', b: '', h: '', qty: 1 })

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
// Inline "Generate e-Way Bill" panel — for moves where the consignor hasn't
// raised one. Collects the Part-A details off the consignor's invoice
// (pre-filled from whatever the docket form already has) and generates the
// bill under our own GSTIN. Part B (vehicle) is deliberately not asked here.
function EwayGenerateForm({ initial, onGenerated, onCancel }) {
  const [v, setV] = useState({
    invoiceNo: initial.invoiceNo, invoiceDate: new Date().toISOString().slice(0, 10), invoiceValue: initial.invoiceValue,
    consigneeName: initial.consigneeName, consigneeGstin: initial.consigneeGstin,
    consigneeCity: initial.consigneeCity, consigneeState: '', consigneePincode: initial.consigneePincode,
    goodsDescription: initial.goodsDescription, hsn: '', quantity: initial.quantity, unit: 'BOX', distanceKm: '',
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

function DocketForm({ pickup }) {
  const hasDetails = pickup.packagesCount != null

  // ① / ② Consignor is read straight off the pickup (it's who booked it);
  // Consignee only exists yet if this pickup's on-site details were already
  // captured elsewhere — otherwise it's collected here, same as before.
  const [consigneeName, setConsigneeName] = useState(pickup.consignee?.name ?? '')
  const [consigneeCity, setConsigneeCity] = useState(pickup.consignee?.city ?? '')
  const [consigneePincode, setConsigneePincode] = useState(pickup.consignee?.pincode ?? '')
  const [consigneeGstin, setConsigneeGstin] = useState('')

  const [actualWeightKg, setActualWeightKg] = useState(pickup.actualWeightKg ?? '')
  const [packagesCount, setPackagesCount] = useState(pickup.packagesCount ?? '')

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
  const [ewayData, setEwayData] = useState(null)
  const [vehicleNo, setVehicleNo] = useState(vehicleFor(pickup)?.regNo ?? '') // auto from the pickup's assigned vehicle
  const transporterGstin = OUR_GSTIN // fixed — we are always the transporter; only the vehicle changes

  // Invoice & goods
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceValue, setInvoiceValue] = useState('')
  const [declaredValue, setDeclaredValue] = useState('')
  const [insuredValue, setInsuredValue] = useState('')
  const [goodsDescription, setGoodsDescription] = useState('')

  // ⑨⑩ Packages — dimensions per SKU row, actual weight above, volumetric
  // computed here (auto), chargeable weight = MAX(actual, volumetric).
  const [packageRows, setPackageRows] = useState([{ ...emptyPackageRow(), qty: pickup.packagesCount ?? 1 }])
  const totalVolumeCft = useMemo(() => packageRows.reduce((s, r) => s + packageVolumeCft(r), 0), [packageRows])
  const volKg = useMemo(() => volumetricWeightKg(totalVolumeCft), [totalVolumeCft])
  const enteredActualWeight = hasDetails ? pickup.actualWeightKg : Number(actualWeightKg) || 0
  const chargeableWeight = Math.max(enteredActualWeight, volKg)

  // ⑧ ODA — real build resolves this from Location Master's Serviceability
  // (is the consignee's pincode inside a mapped Hub/Mini Hub's coverage?);
  // manual toggle here since that wiring doesn't reach this screen yet.
  const [isOda, setIsOda] = useState(false)

  // ⑪ Other fields — payment term (TBB/Paid/To Pay FOD/COD) and risk cover.
  const [paymentTerm, setPaymentTerm] = useState(PAYMENT_TERM.TO_PAY_FOD)
  const [riskCover, setRiskCover] = useState(RISK_COVER.CARRIERS_RISK)
  const [insuranceCompany, setInsuranceCompany] = useState('')
  const [policyNo, setPolicyNo] = useState('')

  // ⑬ POD Type
  const [podType, setPodType] = useState(POD_TYPE.EPOD)

  const [generatedDocket, setGeneratedDocket] = useState(null)
  const [view, setView] = useState('details')
  const [shareStatus, setShareStatus] = useState('idle') // idle | shared | copied

  function applyEwayResult(result) {
    setEwayData(result)
    // Fill only what ops haven't typed themselves; all stay editable below.
    setConsigneeGstin((v) => v || result.consignee.gstin)
    if (!hasDetails) {
      setConsigneeName((v) => v || result.consignee.name)
      setConsigneeCity((v) => v || result.consignee.city)
      setConsigneePincode((v) => v || result.consignee.pincode)
    }
    setInvoiceNo((v) => v || result.invoiceNo)
    setInvoiceValue((v) => v || String(result.invoiceValue))
    setGoodsDescription((v) => v || result.goods.description)
    setEwayStatus('done')
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
    () => priceDocket({ clientId: pickup.clientId, actualWeightKg: enteredActualWeight, volumetricWeightKg: volKg, insuredValue, isOda }),
    [pickup.clientId, enteredActualWeight, volKg, insuredValue, isOda]
  )

  const ewayRequired = ewayStatus !== 'manual'
  const ewayReady = !ewayRequired || ewayStatus === 'done' || ewayStatus === 'unverified'
  const canSubmit = !generatedDocket &&
    (hasDetails || (actualWeightKg && packagesCount && consigneeName.trim())) &&
    ewayReady

  // Draft preview — the same shape a real docket has, built live from
  // whatever's filled in / auto-fetched so far. Package IDs before
  // Generate are a preview only (real AWBs get minted at the actual scan);
  // everything else here is exactly what Generate would write down.
  const previewAwbNumbers = hasDetails
    ? pickup.awbNumbers
    : Array.from({ length: Number(packagesCount) || 0 }, (_, i) => `${pickup.id}-AWB-${pad2(i + 1)}`)
  const draftDocket = {
    docketNumber: generatedDocket?.docketNumber ?? pickup.docketNumber ?? peekNextDocketNumber(),
    status: 'pending',
    clientName: pickup.clientName,
    pickupId: pickup.id,
    dropMiniHubName: pickup.dropMiniHubName,
    consignee: hasDetails ? pickup.consignee : { name: consigneeName, city: consigneeCity, pincode: consigneePincode },
    awbCount: hasDetails ? pickup.awbCount ?? pickup.packagesCount : Number(packagesCount) || 0,
    awbNumbers: previewAwbNumbers,
    totalWeightKg: enteredActualWeight,
    createdAt: generatedDocket ? 'Just now' : 'Draft — not yet generated',
    mode,
    ewayBillNo: ewayStatus === 'manual' ? '' : ewayBillNo,
    ewayUnverified: ewayStatus === 'unverified',
    vehicleNo, transporterGstin,
    paymentTerm, podType,
    pricing,
  }

  function addPackageRow() {
    setPackageRows((prev) => [...prev, emptyPackageRow()])
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
        consignee: { name: consigneeName.trim(), city: consigneeCity.trim(), pincode: consigneePincode.trim() },
      })
    }
    const target = pickup.packagesCount ?? Number(packagesCount)
    while (pickup.scannedCount < target) scanPackage(pickup.id)

    const docket = enrichDocketDetails(pickup.docketNumber, {
      mode,
      ewayBillNo: ewayStatus === 'manual' ? '' : ewayBillNo,
      ewayUnverified: ewayStatus === 'unverified',
      vehicleNo, transporterGstin,
      invoiceNo, invoiceValue: Number(invoiceValue) || 0, declaredValue: Number(declaredValue) || Number(invoiceValue) || 0, insuredValue: Number(insuredValue) || 0,
      goodsDescription, isOda,
      paymentTerm, riskCover, insuranceCompany, policyNo,
      podType,
      documents: {
        invoice: !!invoiceNo, gst: !!consigneeGstin, ewayBill: ewayStatus === 'done', declaration: true,
      },
      pricing,
    })
    setGeneratedDocket(docket)
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
        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-slate-500 text-base">Docket No.: <span className="text-lg font-bold text-slate-900">{draftDocket.docketNumber}</span></p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>Pickup <span className="font-medium text-slate-700">{pickup.id}</span></span>
              <span>Booked <span className="font-medium text-slate-700">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
              <span>{pickup.consignor.city} <span className="text-slate-300">→</span> <span className="font-medium text-slate-700">{pickup.dropMiniHubName}</span></span>
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
          {ewayStatus !== 'manual' ? (
            <>
              <div className="flex flex-wrap items-end gap-2.5">
                <Field
                  label="E-Way Bill number"
                  className="min-w-[220px] flex-1"
                  value={ewayBillNo}
                  onChange={(e) => { setEwayBillNo(e.target.value); setEwayStatus('idle'); setEwayError(''); setEwayData(null) }}
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
                <button type="button" onClick={() => { setEwayStatus('manual'); setEwayError('') }} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                  Not required for this move
                </button>
              </div>
              {ewayStatus !== 'generate' && (
                <button type="button" onClick={() => { setEwayStatus('generate'); setEwayError('') }} className="text-xs font-medium text-brand-orange-dark hover:underline">
                  No e-Way Bill yet? Generate one for the consignor
                </button>
              )}
              {ewayStatus === 'generate' && (
                <EwayGenerateForm
                  initial={{ invoiceNo, invoiceValue, consigneeName, consigneeGstin, consigneeCity, consigneePincode, goodsDescription, quantity: packagesCount || pickup.packagesCount || '' }}
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
                      <button type="button" onClick={() => { setEwayStatus('generate'); setEwayBillNo('') }} className="mt-1.5 font-medium text-brand-orange-dark hover:underline">Generate</button>
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
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No e-Way Bill for this move — enter Vehicle No. manually.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Vehicle No." value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. DL-01-CZ-5567" />
                <Field label="Transporter GSTIN" value={transporterGstin} readOnly hint="LetsTransport" />
              </div>
              <button type="button" onClick={() => { setEwayStatus('idle'); setVehicleNo('') }} className="text-xs font-medium text-brand-orange-dark hover:underline">
                Actually, this move has an e-Way Bill
              </button>
            </>
          )}
            </div>
          </div>
        </div>

        {generatedDocket && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">
              <Icon name="approve" className="mr-1.5 inline h-4 w-4" />
              Docket <span className="font-semibold">{generatedDocket.docketNumber}</span> generated — see Docket Dashboard, or open the Docket preview tab.
            </p>
          </div>
        )}

        <SectionCard title="Consignor & consignee">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consignor <span className="text-brand-orange-dark">(auto from pickup)</span></p>
              <p className="text-sm font-medium text-slate-800">{pickup.consignor.name}</p>
              <p className="text-xs text-slate-500">{pickup.consignor.address}, {pickup.consignor.city}, {pickup.consignor.state} · {pickup.consignor.pincode}</p>
              <p className="text-xs text-slate-500">{pickup.consignor.phone} · {pickup.consignor.email}</p>
            </div>
            <div className="grid grid-cols-6 gap-2.5">
              {hasDetails ? (
                <div className="col-span-6 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 sm:col-span-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consignee <span className="text-brand-orange-dark">(auto)</span></p>
                  <p className="text-sm font-medium text-slate-800">{pickup.consignee?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{pickup.consignee?.city} · {pickup.consignee?.pincode}</p>
                </div>
              ) : (
                <>
                  <Field label="Consignee name *" className="col-span-6 sm:col-span-3" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} placeholder="Business or store name" />
                  <Field label="City" className="col-span-3 sm:col-span-2" value={consigneeCity} onChange={(e) => setConsigneeCity(e.target.value)} placeholder="City" />
                  <Field label="Pincode" className="col-span-3 sm:col-span-1" value={consigneePincode} onChange={(e) => setConsigneePincode(e.target.value)} placeholder="Pincode" />
                </>
              )}
              <Field label="Consignee GSTIN" className={hasDetails ? 'col-span-6 sm:col-span-2' : 'col-span-6'} value={consigneeGstin} onChange={(e) => setConsigneeGstin(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Invoice & goods">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Field label="Invoice no." value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="e.g. BW/OKH/26-27/01177" />
            <Field label="Invoice value (₹)" type="number" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} placeholder="0" />
            <Field label="Declared value (₹)" hint="= invoice" type="number" value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} placeholder={invoiceValue || '0'} />
            <Field label="Insured value (₹)" type="number" value={insuredValue} onChange={(e) => setInsuredValue(e.target.value)} placeholder="0" />
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2.5">
            <Field label="Goods description" className="min-w-[260px] flex-1" value={goodsDescription} onChange={(e) => setGoodsDescription(e.target.value)} placeholder="Said to contain — e.g. Crate · Fragile" />
            <label className="mb-2.5 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isOda} onChange={(e) => setIsOda(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40" />
              ODA delivery
            </label>
          </div>
        </SectionCard>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <SectionCard title="Packages">
          {!hasDetails && (
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Actual weight (kg) *" type="number" value={actualWeightKg} onChange={(e) => setActualWeightKg(e.target.value)} placeholder="0.0" />
              <Field label="Package count *" type="number" value={packagesCount} onChange={(e) => setPackagesCount(e.target.value)} placeholder="0" />
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-2.5 py-1.5">Size</th>
                  <th className="px-2.5 py-1.5">L</th>
                  <th className="px-2.5 py-1.5">B</th>
                  <th className="px-2.5 py-1.5">H <span className="normal-case">(cm)</span></th>
                  <th className="px-2.5 py-1.5">Qty</th>
                  <th className="px-2.5 py-1.5">CFT</th>
                  <th className="px-2.5 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {packageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-2.5 py-1"><input value={row.label} onChange={(e) => updatePackageRow(row.id, { label: e.target.value })} className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
                    <td className="px-2.5 py-1"><input type="number" value={row.l} onChange={(e) => updatePackageRow(row.id, { l: e.target.value })} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
                    <td className="px-2.5 py-1"><input type="number" value={row.b} onChange={(e) => updatePackageRow(row.id, { b: e.target.value })} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
                    <td className="px-2.5 py-1"><input type="number" value={row.h} onChange={(e) => updatePackageRow(row.id, { h: e.target.value })} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
                    <td className="px-2.5 py-1"><input type="number" value={row.qty} onChange={(e) => updatePackageRow(row.id, { qty: e.target.value })} className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
                    <td className="px-2.5 py-1 tabular-nums text-slate-500">{packageVolumeCft(row).toFixed(1)}</td>
                    <td className="px-2.5 py-1">
                      <button type="button" onClick={() => removePackageRow(row.id)} className="text-slate-400 hover:text-red-500"><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addPackageRow} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Icon name="plus" className="h-3.5 w-3.5" /> Add row
          </button>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
            <AutoChip label="Volume (CFT)" value={totalVolumeCft.toFixed(1)} />
            <AutoChip label="Volumetric" value={`${volKg.toFixed(1)} kg`} />
            <AutoChip label="Actual" value={`${enteredActualWeight} kg`} />
            <AutoChip label="Chargeable" value={`${chargeableWeight.toFixed(1)} kg`} />
          </div>
        </SectionCard>

        <SectionCard title="Pricing (auto)">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {pricing.lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="text-slate-500">{l.label}</span>
                <span className="font-medium tabular-nums text-slate-800">₹{l.value.toLocaleString('en-IN')}</span>
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

        <SectionCard title="Payment, risk & POD">
          <div className="grid gap-3.5 lg:grid-cols-3">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Payment term</span>
              <SegmentedControl options={Object.values(PAYMENT_TERM).map((v) => ({ value: v, label: PAYMENT_TERM_LABEL[v] }))} value={paymentTerm} onChange={setPaymentTerm} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Risk cover</span>
              <SegmentedControl options={Object.values(RISK_COVER).map((v) => ({ value: v, label: RISK_COVER_LABEL[v] }))} value={riskCover} onChange={setRiskCover} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Proof of Delivery</span>
              <SegmentedControl options={Object.values(POD_TYPE).map((v) => ({ value: v, label: POD_TYPE_LABEL[v] }))} value={podType} onChange={setPodType} />
            </div>
          </div>
          {riskCover === RISK_COVER.OWNERS_RISK && (
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Insurance company" value={insuranceCompany} onChange={(e) => setInsuranceCompany(e.target.value)} placeholder="Optional" />
              <Field label="Policy no." value={policyNo} onChange={(e) => setPolicyNo(e.target.value)} placeholder="Optional" />
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-400">Documents</span>
            <CheckRow checked={!!invoiceNo} label="Invoice #" />
            <CheckRow checked={!!consigneeGstin} label="GST no." />
            <CheckRow checked={ewayStatus === 'done'} label="e-Way bill" />
            <CheckRow checked={true} label="Declaration" />
          </div>
        </SectionCard>

        {!generatedDocket && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft">
            {!ewayReady && <p className="text-xs text-amber-700">Fetch &amp; validate the e-Way Bill, or mark it not required, before generating.</p>}
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

export default function CreateDocket() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const [selectedId, setSelectedId] = useState(null)

  const selected = selectedId ? PICKUPS_SEED.find((p) => p.id === selectedId) ?? null : null

  function handleSelect(pickup) {
    setSelectedId(pickup.id)
    refresh()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Create Docket</h1>
      </div>

      <PickupSearch onSelect={handleSelect} />

      {selected ? (
        <DocketForm key={selected.id} pickup={selected} />
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

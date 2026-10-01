import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { card, thCls, tdCls, rowCls, btnPrimary, btnSecondary } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { getConsignorsForClient } from '../../data/consignors.js'
import { PICKUPS_SEED } from '../../data/pickups.js'
import { INDIAN_STATES, lookupPincode } from '../../data/geo.js'
import { OUR_GSTIN } from '../../data/ewayBill.js'
import {
  EWB_STATUS, EWB_STATUS_LABEL, EWB_STATUS_BADGE, PART_B_REASONS, EXTEND_REASONS, CANCEL_REASONS, SUPPLY_TYPES, GOODS_UNITS, GST_RATES,
  statusOf, actionRules, validityDays, isValidVehicleNo, totalInvoiceValue,
  listEwayBills, getEwayBill, createEwayBill, lookupEwayBill, updatePartB, extendValidity, cancelEwayBill, linkPickup,
} from '../../data/ewayBills.js'

const th = thCls.replace('px-6', 'px-3')
const td = tdCls.replace('px-6', 'px-3')
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:bg-slate-50 disabled:text-slate-400'

function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatusBadge({ bill }) {
  const s = statusOf(bill)
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${EWB_STATUS_BADGE[s]}`}>{EWB_STATUS_LABEL[s]}</span>
}

function printBill(bill) {
  const w = window.open('', '_blank', 'width=820,height=900')
  if (!w) return
  const row = (k, v) => `<tr><td style="padding:6px 10px;color:#64748b;width:34%">${k}</td><td style="padding:6px 10px;font-weight:500">${v || '—'}</td></tr>`
  w.document.write(`<html><head><title>E-Way Bill ${bill.ewayBillNo}</title></head><body style="font-family:Inter,Arial,sans-serif;padding:32px;color:#0f172a">
    <h2 style="margin:0">e-Way Bill</h2><p style="margin:4px 0 18px;color:#64748b">${bill.ewayBillNo} · ${EWB_STATUS_LABEL[statusOf(bill)]}</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;border:1px solid #e2e8f0">
      ${row('Generated', `${when(bill.generatedOn)} by ${bill.generatedBy}`)}${row('Valid until', when(bill.validUntil))}
      ${row('Supply type', bill.supplyType)}${row('Pickup ID', bill.pickupId)}${row('Docket', bill.docketNumber)}
      ${row('From (consignor)', `${bill.consignor.name} · ${bill.consignor.gstin} · ${[bill.consignor.city, bill.consignor.state].filter(Boolean).join(', ')}`)}
      ${row('To (consignee)', `${bill.consignee.name} · ${bill.consignee.gstin} · ${[bill.consignee.city, bill.consignee.state, bill.consignee.pincode].filter(Boolean).join(', ')}`)}
      ${row('Invoice', `${bill.invoiceNo} · ${bill.invoiceDate} · ${inr(bill.invoiceValue)}`)}
      ${row('Goods', `${bill.goods.description} · HSN ${bill.goods.hsn} · ${bill.goods.quantity} ${bill.goods.unit}`)}
      ${row('Distance', `${bill.distanceKm} km`)}${row('Transporter', `LetsTransport · ${OUR_GSTIN}`)}${row('Vehicle (Part B)', bill.vehicleNo)}
    </table><script>window.print()</script></body></html>`)
  w.document.close()
}

// ───────────────────────────── Dashboard ─────────────────────────────
function Dashboard({ onOpen }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const bills = listEwayBills()
  const counts = bills.reduce((c, b) => ({ ...c, [statusOf(b)]: (c[statusOf(b)] ?? 0) + 1 }), {})
  const q = query.trim().toLowerCase()
  const rows = bills.filter(
    (b) =>
      (filter === 'all' || statusOf(b) === filter) &&
      (!q || [b.ewayBillNo, b.pickupId, b.docketNumber, b.clientName, b.invoiceNo, b.vehicleNo, b.consignee.name, b.consignee.city].some((v) => String(v ?? '').toLowerCase().includes(q))),
  )
  const tiles = [
    ['all', 'All bills', bills.length],
    [EWB_STATUS.ACTIVE, 'Active', counts[EWB_STATUS.ACTIVE] ?? 0],
    [EWB_STATUS.EXPIRING, 'Expiring < 24h', counts[EWB_STATUS.EXPIRING] ?? 0],
    [EWB_STATUS.PART_B_PENDING, 'Part B pending', counts[EWB_STATUS.PART_B_PENDING] ?? 0],
    [EWB_STATUS.EXPIRED, 'Expired', counts[EWB_STATUS.EXPIRED] ?? 0],
    [EWB_STATUS.CANCELLED, 'Cancelled', counts[EWB_STATUS.CANCELLED] ?? 0],
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${filter === key ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <p className="text-xl font-semibold tabular-nums text-slate-900">{n}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search e-way bill no., pickup ID, client, invoice, vehicle or consignee…" className={`${inputCls} pl-9`} />
      </div>

      <div className={`overflow-x-auto ${card}`}>
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">No e-way bills match.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['E-way bill no.', 'Pickup ID', 'Client', 'Consignee', 'Value', 'Vehicle', 'Valid until', 'Status'].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.ewayBillNo} onClick={() => onOpen(b.ewayBillNo)} className={`${rowCls} cursor-pointer`}>
                  <td className={`${td} font-medium tabular-nums text-slate-900`}>{b.ewayBillNo}</td>
                  <td className={`${td} tabular-nums`}>{b.pickupId || <span className="text-slate-300">—</span>}</td>
                  <td className={td}>{b.clientName}</td>
                  <td className={td}>
                    {b.consignee.name}
                    <span className="text-slate-400"> · {b.consignee.city}</span>
                  </td>
                  <td className={`${td} tabular-nums`}>{inr(b.invoiceValue)}</td>
                  <td className={`${td} tabular-nums`}>{b.vehicleNo || <span className="text-sky-600">Add Part B</span>}</td>
                  <td className={td}>{when(b.validUntil)}</td>
                  <td className={td}><StatusBadge bill={b} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────── Create ─────────────────────────────
const emptyParty = { name: '', gstin: '', pincode: '', city: '', state: '' }
const emptyForm = {
  clientId: '', consignorKey: '', pickupId: '', consigneeIdx: '', consignor: { ...emptyParty }, consignee: { ...emptyParty },
  supplyType: SUPPLY_TYPES[0], invoiceNo: '', invoiceDate: new Date().toISOString().slice(0, 10),
  description: '', hsn: '', quantity: '', unit: GOODS_UNITS[0], taxableValue: '', gstRate: 18, distanceKm: '', vehicleNo: '',
}

function PartyFields({ title, value, onChange, locked }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  async function onPincode(e) {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6)
    onChange({ ...value, pincode: pin })
    if (pin.length === 6) {
      const r = await lookupPincode(pin)
      if (r) onChange({ ...value, pincode: pin, city: r.city, state: r.state })
    }
  }
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-800">{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Name *" className="col-span-2"><input className={inputCls} value={value.name} onChange={set('name')} disabled={locked} /></Field>
        <Field label="GSTIN" hint="Leave blank for unregistered (URP)" className="col-span-2"><input className={inputCls} value={value.gstin} onChange={(e) => onChange({ ...value, gstin: e.target.value.toUpperCase() })} maxLength={15} /></Field>
        <Field label="Pincode *"><input className={inputCls} inputMode="numeric" value={value.pincode} onChange={onPincode} /></Field>
        <Field label="City *"><input className={inputCls} value={value.city} onChange={set('city')} /></Field>
        <Field label="State *" className="col-span-2">
          <select className={inputCls} value={value.state} onChange={set('state')}>
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </div>
  )
}

function CreateTab({ onOpen, canManage }) {
  const [f, setF] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const client = ACTIVE_CLIENTS_SEED.find((c) => c.id === f.clientId)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const consignorOptions = useMemo(() => {
    if (!client) return []
    return [
      { key: 'self', label: `${client.name} (client's registered address)`, party: { name: client.name, gstin: client.gstin, pincode: '', city: client.city, state: client.state } },
      ...getConsignorsForClient(client.id).map((c) => ({ key: c.id, label: `${c.partyName} — ${c.city}`, party: { name: c.partyName, gstin: client.gstin, pincode: c.pincode, city: c.city, state: c.state } })),
    ]
  }, [client])
  const pickups = client ? PICKUPS_SEED.filter((p) => p.clientId === client.id) : []
  const pickup = pickups.find((p) => p.id === f.pickupId)
  // A pickup can carry several consignees (Create Pickup's Consignee List); older ones have just one.
  const pickupConsignees = pickup
    ? (pickup.details?.destinations?.filter((d) => d.consignee?.name).map((d) => ({ ...d.consignee, boxes: d.boxes })) ?? (pickup.consignee ? [pickup.consignee] : []))
    : []

  function pickClient(e) {
    setF({ ...emptyForm, clientId: e.target.value, invoiceDate: f.invoiceDate })
  }
  function pickConsignor(e) {
    if (e.target.value === 'pickup') return
    const opt = consignorOptions.find((o) => o.key === e.target.value)
    setF((p) => ({ ...p, consignorKey: e.target.value, consignor: opt ? { ...opt.party } : { ...emptyParty } }))
  }
  function applyConsignee(c) {
    setF((p) => ({
      ...p,
      consignee: { ...emptyParty, name: c.name ?? '', pincode: c.pincode ?? '', city: c.city ?? '', state: c.state ?? '' },
      quantity: c.boxes ? String(c.boxes) : p.quantity,
    }))
    if (c.pincode && !c.state) lookupPincode(c.pincode).then((r) => r && setF((p) => ({ ...p, consignee: { ...p.consignee, state: r.state } })))
  }
  function pickPickup(e) {
    const id = e.target.value
    const pu = pickups.find((x) => x.id === id)
    const cs = pu ? (pu.details?.destinations?.filter((d) => d.consignee?.name).map((d) => ({ ...d.consignee, boxes: d.boxes })) ?? (pu.consignee ? [pu.consignee] : [])) : []
    setF((p) => ({
      ...p, pickupId: id, consigneeIdx: cs.length === 1 ? '0' : '',
      consignorKey: pu ? 'pickup' : p.consignorKey,
      consignor: pu ? { name: pu.consignor.name, gstin: client.gstin, pincode: pu.consignor.pincode ?? '', city: pu.consignor.city ?? '', state: pu.consignor.state ?? '' } : p.consignor,
      consignee: pu && cs.length !== 1 ? { ...emptyParty } : p.consignee,
    }))
    if (cs.length === 1) applyConsignee(cs[0])
  }
  function pickConsignee(e) {
    const i = e.target.value
    setF((p) => ({ ...p, consigneeIdx: i }))
    if (i !== '') applyConsignee(pickupConsignees[Number(i)])
  }

  const total = totalInvoiceValue(f.taxableValue, f.gstRate)
  const days = validityDays(f.distanceKm)
  const partyOk = (p) => p.name.trim() && /^\d{6}$/.test(p.pincode) && p.city.trim() && p.state
  const valid =
    client && (pickupConsignees.length < 2 || f.consigneeIdx !== '') && partyOk(f.consignor) && partyOk(f.consignee) && f.invoiceNo.trim() && f.description.trim() && /^\d{4,8}$/.test(f.hsn) &&
    Number(f.quantity) > 0 && Number(f.taxableValue) > 0 && Number(f.distanceKm) > 0 && (!f.vehicleNo || isValidVehicleNo(f.vehicleNo))

  async function submit() {
    setBusy(true)
    const party = (p) => ({ ...p, gstin: p.gstin.trim() || 'URP' })
    const bill = await createEwayBill({
      clientId: client.id, clientName: client.name, pickupId: f.pickupId, docketNumber: pickup?.docketNumber ?? '', supplyType: f.supplyType,
      consignor: party(f.consignor), consignee: party(f.consignee),
      invoiceNo: f.invoiceNo.trim(), invoiceDate: f.invoiceDate,
      goods: { description: f.description.trim(), hsn: f.hsn, quantity: Number(f.quantity), unit: f.unit },
      taxableValue: f.taxableValue, gstRate: f.gstRate, distanceKm: f.distanceKm, vehicleNo: f.vehicleNo,
    })
    setBusy(false)
    setDone(bill)
  }

  if (done) {
    return (
      <div className={`${card} mx-auto max-w-lg p-8 text-center`}>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="approve" className="h-5 w-5" /></span>
        <p className="mt-3 text-sm text-slate-500">E-way bill generated for {done.clientName}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{done.ewayBillNo}</p>
        <p className="mt-1 text-xs text-slate-500">Valid until {when(done.validUntil)}{done.vehicleNo ? '' : ' · Part B (vehicle) still to be added'}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => onOpen(done.ewayBillNo)} className={btnPrimary}>View / manage</button>
          <button type="button" onClick={() => printBill(done)} className={btnSecondary}>Print</button>
          <button type="button" onClick={() => { setDone(null); setF(emptyForm) }} className={btnSecondary}>Create another</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${card} space-y-6 p-6`}>
      {!canManage && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">You have view-only access — ask an admin for “Create e-way bills”.</p>}

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">For</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Client *">
            <select className={inputCls} value={f.clientId} onChange={pickClient}>
              <option value="">Select client…</option>
              {ACTIVE_CLIENTS_SEED.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Consignor (pickup party) *">
            <select className={inputCls} value={f.consignorKey} onChange={pickConsignor} disabled={!client}>
              <option value="">{client ? 'Select consignor…' : 'Pick a client first'}</option>
              {consignorOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              {pickup && <option value="pickup">{pickup.consignor.name} (from pickup {pickup.id})</option>}
            </select>
          </Field>
          <Field label="Pickup ID" hint="Optional — pre-fills consignor and consignee from the pickup">
            <select className={inputCls} value={f.pickupId} onChange={pickPickup} disabled={!client}>
              <option value="">{pickups.length || !client ? 'Not linked' : 'No pickups for this client'}</option>
              {pickups.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.consignor.name}</option>)}
            </select>
          </Field>
          {pickupConsignees.length > 1 && (
            <Field label="Consignee *" hint={`${pickupConsignees.length} consignees on this pickup — pick the one this bill is for`} className="sm:col-span-3">
              <select className={inputCls} value={f.consigneeIdx} onChange={pickConsignee}>
                <option value="">Select consignee…</option>
                {pickupConsignees.map((c, i) => <option key={i} value={i}>{c.name} · {c.city}{c.boxes ? ` · ${c.boxes} boxes` : ''}</option>)}
              </select>
            </Field>
          )}
        </div>
      </div>

      {client && (
        <>
          <PartyFields title="Consignor (bill from)" value={f.consignor} onChange={(consignor) => setF((p) => ({ ...p, consignor }))} />
          <PartyFields title="Consignee (bill to)" value={f.consignee} onChange={(consignee) => setF((p) => ({ ...p, consignee }))} />

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Invoice & goods</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Supply type" className="col-span-2">
                <select className={inputCls} value={f.supplyType} onChange={set('supplyType')}>{SUPPLY_TYPES.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Invoice no. *"><input className={inputCls} value={f.invoiceNo} onChange={set('invoiceNo')} /></Field>
              <Field label="Invoice date *"><input type="date" className={inputCls} value={f.invoiceDate} onChange={set('invoiceDate')} /></Field>
              <Field label="Goods description *" className="col-span-2"><input className={inputCls} value={f.description} onChange={set('description')} /></Field>
              <Field label="HSN code *" hint="4–8 digits"><input className={inputCls} inputMode="numeric" value={f.hsn} onChange={(e) => setF((p) => ({ ...p, hsn: e.target.value.replace(/\D/g, '').slice(0, 8) }))} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Qty *"><input className={inputCls} inputMode="decimal" value={f.quantity} onChange={set('quantity')} /></Field>
                <Field label="Unit"><select className={inputCls} value={f.unit} onChange={set('unit')}>{GOODS_UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
              </div>
              <Field label="Taxable value (₹) *"><input className={inputCls} inputMode="decimal" value={f.taxableValue} onChange={set('taxableValue')} /></Field>
              <Field label="GST rate">
                <select className={inputCls} value={f.gstRate} onChange={set('gstRate')}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select>
              </Field>
              <div className="col-span-2 flex items-end">
                <p className="text-sm text-slate-500">
                  Invoice value <span className="font-semibold tabular-nums text-slate-900">{inr(total)}</span>
                  {total > 0 && total <= 50000 && <span className="ml-2 text-[11px] text-amber-600">E-way bill is mandatory only above ₹50,000</span>}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Transport</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Distance (km) *" hint={Number(f.distanceKm) > 0 ? `Valid for ${days} day${days > 1 ? 's' : ''}` : '1 day of validity per 200 km'}>
                <input className={inputCls} inputMode="numeric" value={f.distanceKm} onChange={set('distanceKm')} />
              </Field>
              <Field label="Transporter"><input className={inputCls} value={`LetsTransport · ${OUR_GSTIN}`} disabled /></Field>
              <Field label="Vehicle no. (Part B)" hint={f.vehicleNo && !isValidVehicleNo(f.vehicleNo) ? 'Format like KA01AB1234' : 'Optional — can be added later'} className="col-span-2">
                <input className={inputCls} value={f.vehicleNo} onChange={(e) => setF((p) => ({ ...p, vehicleNo: e.target.value.toUpperCase() }))} placeholder="e.g. MH04KP4521" />
              </Field>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button type="button" disabled={!valid || busy || !canManage} onClick={submit} className={`${btnPrimary} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none`}>
              {busy ? 'Generating…' : 'Generate e-way bill'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ───────────────────────────── Fetch & update ─────────────────────────────
function ActionModal({ kind, bill, onClose, onDone }) {
  const [reason, setReason] = useState(kind === 'partB' ? (bill.vehicleNo ? PART_B_REASONS[3] : PART_B_REASONS[0]) : kind === 'extend' ? EXTEND_REASONS[0] : CANCEL_REASONS[0])
  const [remark, setRemark] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [remainingKm, setRemainingKm] = useState('')
  const [fromPlace, setFromPlace] = useState('')
  const reasons = kind === 'partB' ? PART_B_REASONS : kind === 'extend' ? EXTEND_REASONS : CANCEL_REASONS
  const valid =
    kind === 'partB' ? isValidVehicleNo(vehicle) : kind === 'extend' ? Number(remainingKm) > 0 && fromPlace.trim() : true
  function save() {
    if (kind === 'partB') updatePartB(bill.ewayBillNo, { vehicleNo: vehicle, reason, remark })
    if (kind === 'extend') extendValidity(bill.ewayBillNo, { reason, remainingKm: Number(remainingKm), fromPlace: fromPlace.trim(), remark })
    if (kind === 'cancel') cancelEwayBill(bill.ewayBillNo, { reason, remark })
    onDone()
  }
  const title = kind === 'partB' ? 'Update Part B (vehicle)' : kind === 'extend' ? 'Extend validity' : 'Cancel e-way bill'
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        {kind === 'partB' && (
          <Field label="New vehicle no. *" hint={vehicle && !isValidVehicleNo(vehicle) ? 'Format like KA01AB1234' : bill.vehicleNo ? `Currently ${bill.vehicleNo}` : undefined}>
            <input autoFocus className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} placeholder="e.g. MH04KP4521" />
          </Field>
        )}
        {kind === 'extend' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Remaining distance (km) *" hint={Number(remainingKm) > 0 ? `Adds ${validityDays(remainingKm)} day(s)` : undefined}>
              <input autoFocus className={inputCls} inputMode="numeric" value={remainingKm} onChange={(e) => setRemainingKm(e.target.value)} />
            </Field>
            <Field label="Currently at *"><input className={inputCls} value={fromPlace} onChange={(e) => setFromPlace(e.target.value)} placeholder="City / place" /></Field>
          </div>
        )}
        {kind === 'cancel' && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">Cancelling can't be undone. The bill {bill.ewayBillNo} will stop being valid for movement.</p>}
        <Field label="Reason *"><select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Remarks"><input className={inputCls} value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>Back</button>
        <button
          type="button"
          disabled={!valid}
          onClick={save}
          className={`${kind === 'cancel' ? 'inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700' : btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {kind === 'cancel' ? 'Cancel e-way bill' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}

function BillDetail({ bill, canManage, onChange }) {
  const [modal, setModal] = useState(null)
  const rules = actionRules(bill)
  const info = [
    ['Client', bill.clientName],
    ['Pickup ID', bill.pickupId],
    ['Docket', bill.docketNumber],
    ['Consignor', `${bill.consignor.name}${bill.consignor.city ? ` · ${bill.consignor.city}` : ''}`],
    ['Consignee', `${bill.consignee.name} · ${bill.consignee.city}`],
    ['Invoice', `${bill.invoiceNo} · ${inr(bill.invoiceValue)}`],
    ['Goods', `${bill.goods.description} · HSN ${bill.goods.hsn} · ${bill.goods.quantity} ${bill.goods.unit}`],
    ['Distance', `${bill.distanceKm} km`],
    ['Vehicle (Part B)', bill.vehicleNo],
    ['Generated', `${when(bill.generatedOn)} · by ${bill.generatedBy}`],
    ['Valid until', when(bill.validUntil)],
  ]
  const actions = [
    ['partB', bill.vehicleNo ? 'Update Part B' : 'Add Part B', rules.partB, 'truck'],
    ['extend', 'Extend validity', rules.extend, 'history'],
    ['cancel', 'Cancel bill', rules.cancel, 'trash'],
  ]
  const pickups = PICKUPS_SEED.filter((p) => !bill.clientId || p.clientId === bill.clientId)
  return (
    <div className={`${card} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">E-way bill</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{bill.ewayBillNo}</p>
        </div>
        <StatusBadge bill={bill} />
      </div>

      <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {info.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-sm">
            <dt className="w-32 shrink-0 text-slate-400">{k}</dt>
            <dd className="min-w-0 text-slate-800">
              {k === 'Pickup ID' && !v && canManage && !bill.cancelled ? (
                <select className="rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600" value="" onChange={(e) => { const pu = pickups.find((x) => x.id === e.target.value); if (pu) { linkPickup(bill.ewayBillNo, pu.id, pu.docketNumber ?? ''); onChange() } }}>
                  <option value="">Link a pickup…</option>
                  {pickups.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.clientName}</option>)}
                </select>
              ) : (
                v || <span className="text-slate-300">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
        {actions.map(([kind, label, blocked, icon]) => (
          <div key={kind} className="group relative">
            <button
              type="button"
              disabled={!!blocked || !canManage}
              onClick={() => setModal(kind)}
              className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40 ${kind === 'cancel' ? 'hover:!text-rose-600' : ''}`}
            >
              <Icon name={icon} className="h-4 w-4" />
              {label}
            </button>
            {blocked && canManage && <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-60 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-white group-hover:block">{blocked}</span>}
          </div>
        ))}
        <button type="button" onClick={() => printBill(bill)} className={btnSecondary}>
          <Icon name="download" className="h-4 w-4" />
          Print / PDF
        </button>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">History</p>
        <ol className="space-y-2">
          {[...bill.history].reverse().map((h) => (
            <li key={h.id} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 text-xs text-slate-400">{when(h.at)}</span>
              <span className="font-medium text-slate-700">{h.type}</span>
              <span className="min-w-0 text-slate-500">{h.note}</span>
            </li>
          ))}
        </ol>
      </div>

      {modal && <ActionModal kind={modal} bill={bill} onClose={() => setModal(null)} onDone={() => { setModal(null); onChange() }} />}
    </div>
  )
}

function FetchTab({ activeNo, setActiveNo, canManage }) {
  const [, bump] = useState(0)
  const [input, setInput] = useState(activeNo ?? '')
  const [state, setState] = useState({ status: 'idle' })
  const [copied, setCopied] = useState(false)
  const bill = activeNo ? getEwayBill(activeNo) : null

  async function fetchIt(no = input) {
    setState({ status: 'loading' })
    try {
      const { bill: b, imported } = await lookupEwayBill(no)
      setActiveNo(b.ewayBillNo)
      setInput(b.ewayBillNo)
      setState({ status: 'ok', imported })
    } catch (err) {
      setActiveNo(null)
      setState({ status: 'error', code: err.code, message: err.message })
    }
  }
  const message = `Hi, please assign e-way bill ${input} to LetsTransport (GSTIN ${OUR_GSTIN}) as the transporter so we can update Part B and move the consignment.`

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <p className="mb-2 text-sm font-semibold text-slate-800">Fetch an e-way bill</p>
        <div className="flex gap-2">
          <input
            className={`${inputCls} max-w-xs tabular-nums`}
            inputMode="numeric"
            placeholder="12-digit e-way bill number"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
            onKeyDown={(e) => e.key === 'Enter' && input.length === 12 && fetchIt()}
          />
          <button type="button" onClick={() => fetchIt()} disabled={input.length !== 12 || state.status === 'loading'} className={`${btnPrimary} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none`}>
            {state.status === 'loading' ? 'Fetching…' : 'Fetch'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Bills generated here are found instantly; others are fetched from NIC — only bills assigned to LetsTransport can be read or updated.</p>
      </div>

      {state.status === 'error' && state.code === 'NOT_ASSIGNED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">{state.message}</p>
          <p className="mt-1 text-xs">Ask the consignor to assign it to our GSTIN, then fetch again.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => { navigator.clipboard?.writeText(message).then(() => setCopied(true), () => setCopied(false)) }} className={btnSecondary}>{copied ? 'Copied' : 'Copy message to consignor'}</button>
            <button type="button" onClick={() => fetchIt()} className={btnSecondary}>Fetch again</button>
          </div>
        </div>
      )}
      {state.status === 'error' && state.code !== 'NOT_ASSIGNED' && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.message}</p>}
      {state.status === 'ok' && state.imported && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">Fetched from NIC and added to the register.</p>}

      {bill && <BillDetail key={bill.ewayBillNo} bill={bill} canManage={canManage} onChange={() => bump((n) => n + 1)} />}
    </div>
  )
}

// ───────────────────────────── Page ─────────────────────────────
export default function EwayBill() {
  const { hasFunction } = useAuth()
  const canManage = hasFunction('eway-bill.manage')
  const [tab, setTab] = useState('create')
  const [activeNo, setActiveNo] = useState(null)
  const tabs = [
    ['create', 'Create'],
    ['fetch', 'Fetch & update'],
    ['dashboard', 'Dashboard'],
  ]
  function open(no) {
    setActiveNo(no)
    setTab('fetch')
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">E-way Bill Console</h1>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard onOpen={open} />}
      {tab === 'create' && <CreateTab onOpen={open} canManage={canManage} />}
      {tab === 'fetch' && <FetchTab activeNo={activeNo} setActiveNo={setActiveNo} canManage={canManage} />}
    </div>
  )
}

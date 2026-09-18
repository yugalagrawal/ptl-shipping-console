import { Fragment, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { card, thCls, tdCls, rowCls, pill, pillActive, pillInactive, btnPrimary } from '../../components/ui.js'
import {
  PICKUPS_SEED, PICKUP_STATUS, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE,
  markPickupArrived, updatePickupFieldDetails, scanPackage, dropScanPickup,
} from '../../data/pickups.js'
import { PRS_SEED } from '../../data/prs.js'

const STATUS_ORDER = [PICKUP_STATUS.CREATED, PICKUP_STATUS.GROUPED, PICKUP_STATUS.ARRIVED, PICKUP_STATUS.SCANNED, PICKUP_STATUS.DROPPED]

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40'

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input {...props} className={inputCls} />
    </label>
  )
}

// The stage-dependent action panel — this is the field-staff workflow: mark
// arrived → fill actual/volumetric weight + consignee + package count → tap
// through the package scan (each tap = one AWB, the last one also raises a
// docket, see scanPackage in data/pickups.js) → drop-scan at the hub.
function PickupDetail({ pickup, onChanged }) {
  const prs = pickup.prsId ? PRS_SEED.find((r) => r.id === pickup.prsId) : null
  const [form, setForm] = useState({
    actualWeightKg: pickup.actualWeightKg ?? '',
    volumetricWeightKg: pickup.volumetricWeightKg ?? '',
    packagesCount: pickup.packagesCount ?? '',
    consigneeName: pickup.consignee?.name ?? '',
    consigneePhone: pickup.consignee?.phone ?? '',
    consigneeCity: pickup.consignee?.city ?? '',
    consigneePincode: pickup.consignee?.pincode ?? '',
  })
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }
  const canSaveDetails = form.actualWeightKg && form.volumetricWeightKg && form.packagesCount && form.consigneeName

  function saveDetails() {
    if (!canSaveDetails) return
    updatePickupFieldDetails(pickup.id, {
      actualWeightKg: form.actualWeightKg,
      volumetricWeightKg: form.volumetricWeightKg,
      packagesCount: form.packagesCount,
      consignee: { name: form.consigneeName, phone: form.consigneePhone, city: form.consigneeCity, pincode: form.consigneePincode },
    })
    onChanged()
  }

  return (
    <tr className="border-t border-slate-100 bg-slate-50/60">
      <td colSpan={7} className="space-y-4 px-6 py-5">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Consignor (pickup)</div>
            <div className="mt-1 text-sm text-slate-700">{pickup.consignor.name}</div>
            <div className="text-xs text-slate-500">{pickup.consignor.address}, {pickup.consignor.city}</div>
            <div className="text-xs text-slate-400">{pickup.consignor.phone} · {pickup.consignor.email}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Drop Mini Hub</div>
            <div className="mt-1 text-sm text-slate-700">{pickup.dropMiniHubName}</div>
            {prs && <div className="text-xs text-slate-500">{prs.id} · {prs.vehicleLabel} · {prs.driverName}</div>}
          </div>
        </div>

        {pickup.status === PICKUP_STATUS.CREATED && (
          <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">Not yet grouped — batch this into a run sheet in PRS.</p>
        )}

        {pickup.status === PICKUP_STATUS.GROUPED && (
          <button type="button" onClick={() => { markPickupArrived(pickup.id); onChanged() }} className={btnPrimary}>
            <Icon name="approve" className="h-4 w-4" />
            Mark arrived at pickup
          </button>
        )}

        {pickup.status === PICKUP_STATUS.ARRIVED && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            {!pickup.packagesCount ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">On-site details</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Actual weight (kg)" type="number" value={form.actualWeightKg} onChange={(e) => set('actualWeightKg', e.target.value)} />
                  <Field label="Volumetric weight (kg)" type="number" value={form.volumetricWeightKg} onChange={(e) => set('volumetricWeightKg', e.target.value)} />
                  <Field label="# Packages" type="number" value={form.packagesCount} onChange={(e) => set('packagesCount', e.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Consignee name" value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} />
                  <Field label="Consignee phone" value={form.consigneePhone} onChange={(e) => set('consigneePhone', e.target.value)} />
                  <Field label="Consignee city" value={form.consigneeCity} onChange={(e) => set('consigneeCity', e.target.value)} />
                  <Field label="Consignee pincode" value={form.consigneePincode} onChange={(e) => set('consigneePincode', e.target.value)} />
                </div>
                <button type="button" onClick={saveDetails} disabled={!canSaveDetails} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
                  Save details
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Package scan</div>
                  <span className="text-sm font-medium text-slate-700 tabular-nums">{pickup.scannedCount}/{pickup.packagesCount} scanned</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-brand-orange transition-all" style={{ width: `${(pickup.scannedCount / pickup.packagesCount) * 100}%` }} />
                </div>
                <button type="button" onClick={() => { scanPackage(pickup.id); onChanged() }} className={btnPrimary}>
                  <Icon name="plus" className="h-4 w-4" />
                  Scan package {pickup.scannedCount + 1} of {pickup.packagesCount}
                </button>
              </>
            )}
          </div>
        )}

        {(pickup.status === PICKUP_STATUS.SCANNED || pickup.status === PICKUP_STATUS.DROPPED) && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Docket {pickup.docketNumber}</span>
              <span className="text-slate-400">· {pickup.awbNumbers.length} AWBs raised · {pickup.actualWeightKg} kg actual</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pickup.awbNumbers.map((awb) => (
                <span key={awb} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{awb}</span>
              ))}
            </div>
            {pickup.status === PICKUP_STATUS.SCANNED ? (
              <button type="button" onClick={() => { dropScanPickup(pickup.id); onChanged() }} className={btnPrimary}>
                <Icon name="warehouse" className="h-4 w-4" />
                Drop scan — mark inward at hub
              </button>
            ) : (
              <p className="text-xs font-medium text-emerald-600">Dropped at {pickup.dropMiniHubName} — docket is in Docket Module &gt; Create Docket &gt; Pending Dockets.</p>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

const selectCls = 'w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40'

export default function MyOrders() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [hubFilter, setHubFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const hubOptions = [...new Set(PICKUPS_SEED.map((p) => p.dropMiniHubName))].sort()
  const clientOptions = [...new Set(PICKUPS_SEED.map((p) => p.clientName))].sort()

  const q = query.trim().toLowerCase()
  const preStatusFiltered = PICKUPS_SEED.filter((p) => {
    if (hubFilter && p.dropMiniHubName !== hubFilter) return false
    if (clientFilter && p.clientName !== clientFilter) return false
    if (!q) return true
    return p.id.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.consignor.city.toLowerCase().includes(q) || p.dropMiniHubName.toLowerCase().includes(q)
  })
  const filtered = preStatusFiltered.filter((p) => !statusFilter || p.status === statusFilter)

  const statusCounts = {}
  preStatusFiltered.forEach((p) => { statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1 })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Pickup Dashboard</h1>
        <p className="mt-1 text-slate-500">Every pickup request — filter by status, destination or client. Click a row for its tracking timeline.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Mini Hub</span>
          <select value={hubFilter} onChange={(e) => setHubFilter(e.target.value)} className={selectCls}>
            <option value="">All</option>
            {hubOptions.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Client</span>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={selectCls}>
            <option value="">All</option>
            {clientOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requests</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setStatusFilter(null)} className={statusFilter === null ? pillActive : pillInactive}>
              All <span className={statusFilter === null ? 'text-slate-300' : 'text-slate-400'}>({preStatusFiltered.length})</span>
            </button>
            {STATUS_ORDER.map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)} className={statusFilter === s ? pillActive : pillInactive}>
                {PICKUP_STATUS_LABEL[s]} <span className={statusFilter === s ? 'text-slate-300' : 'text-slate-400'}>({statusCounts[s] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="relative max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pickup ID, client, city or Mini Hub…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Pickup ID</th>
              <th className={thCls}>Client</th>
              <th className={thCls}>Consignor city</th>
              <th className={thCls}>Drop Mini Hub</th>
              <th className={thCls}>Est. weight</th>
              <th className={thCls}>Status</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <Fragment key={p.id}>
                <tr className={`${rowCls} cursor-pointer`} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                  <td className={`${tdCls} font-medium text-slate-800`}>{p.id}</td>
                  <td className={tdCls}>{p.clientName}</td>
                  <td className={tdCls}>{p.consignor.city}</td>
                  <td className={tdCls}>{p.dropMiniHubName}</td>
                  <td className={tdCls}>{p.estWeightKg} kg</td>
                  <td className={tdCls}>
                    <span className={`${pill} ${PICKUP_STATUS_BADGE[p.status]}`}>{PICKUP_STATUS_LABEL[p.status]}</span>
                    {p.status === PICKUP_STATUS.ARRIVED && p.packagesCount > 0 && (
                      <span className="ml-1.5 text-xs text-slate-400 tabular-nums">{p.scannedCount}/{p.packagesCount}</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <Icon name="chevron" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expandedId === p.id ? 'rotate-180' : ''}`} />
                  </td>
                </tr>
                {expandedId === p.id && <PickupDetail pickup={p} onChanged={refresh} />}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No pickups match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

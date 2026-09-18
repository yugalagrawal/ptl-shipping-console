import { useMemo, useState } from 'react'
import { card, thCls, tdCls, rowCls, pill } from '../../components/ui.js'
import {
  FLEET_SEED, COMPLIANCE_LABEL, COMPLIANCE_BADGE, VEHICLE_STATUS_LABEL, VEHICLE_STATUS_BADGE, OWNERSHIP_TYPES,
} from '../../data/fleet.js'

export default function FleetRoster() {
  const [search, setSearch] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return FLEET_SEED.filter((v) => {
      if (ownershipFilter && v.ownership !== ownershipFilter) return false
      if (!q) return true
      return (
        v.regNo.toLowerCase().includes(q) ||
        v.driverName.toLowerCase().includes(q) ||
        v.vendorName.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
      )
    })
  }, [search, ownershipFilter])

  const summary = useMemo(() => {
    const owned = FLEET_SEED.filter((v) => v.ownership === 'Owned').length
    const vendor = FLEET_SEED.filter((v) => v.ownership === 'Vendor').length
    const expiringOrExpired = FLEET_SEED.filter((v) => v.compliance !== 'valid').length
    return { total: FLEET_SEED.length, owned, vendor, expiringOrExpired }
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Fleet & Vendor Roster</h1>
        <p className="mt-1 text-slate-500">Owned assets, vendor-supplied vehicles, drivers and compliance — in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Total Vehicles</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{summary.total}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Owned</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{summary.owned}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Vendor</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{summary.vendor}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Compliance Due</div>
          <div className="mt-1.5 text-xl font-semibold text-rose-600">{summary.expiringOrExpired}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reg. no, driver, vendor or city…"
          className="w-72 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
        />
        <select
          value={ownershipFilter}
          onChange={(e) => setOwnershipFilter(e.target.value)}
          className="appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          <option value="">All ownership</option>
          {OWNERSHIP_TYPES.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className={`overflow-x-auto ${card}`}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Vehicle</th>
              <th className={thCls}>Ownership</th>
              <th className={thCls}>Driver</th>
              <th className={thCls}>City / Branch</th>
              <th className={thCls}>Capacity</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Compliance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className={rowCls}>
                <td className={`${tdCls} font-medium text-slate-800`}>
                  {v.regNo}
                  <div className="text-xs font-normal text-slate-400">{v.type}</div>
                </td>
                <td className={tdCls}>
                  {v.ownership}
                  {v.vendorName && <div className="text-xs text-slate-400">{v.vendorName}</div>}
                </td>
                <td className={tdCls}>
                  {v.driverName}
                  <div className="text-xs text-slate-400">{v.driverPhone}</div>
                </td>
                <td className={tdCls}>
                  {v.city}
                  <div className="text-xs text-slate-400">{v.branch}</div>
                </td>
                <td className={tdCls}>{v.capacityKg.toLocaleString('en-IN')} kg · {v.capacityCft.toLocaleString('en-IN')} cft</td>
                <td className={tdCls}>
                  <span className={`${pill} ${VEHICLE_STATUS_BADGE[v.status]}`}>{VEHICLE_STATUS_LABEL[v.status]}</span>
                </td>
                <td className={tdCls}>
                  <span className={`${pill} ${COMPLIANCE_BADGE[v.compliance]}`}>{COMPLIANCE_LABEL[v.compliance]}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No vehicles match this search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { card, thCls, tdCls, rowCls, pill } from '../../components/ui.js'
import { TRIP_STATUS, initTripsSeed } from '../../data/trips.js'

export default function PastTrips() {
  const [tripsSeed] = useState(() => initTripsSeed())
  const [search, setSearch] = useState('')

  const delivered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tripsSeed
      .filter((t) => t.status === TRIP_STATUS.DELIVERED)
      .filter((t) => !q || t.id.toLowerCase().includes(q) || t.lane.toLowerCase().includes(q) || t.vehicle.regNo.toLowerCase().includes(q))
  }, [tripsSeed, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Past Trips</h1>
        <p className="mt-1 text-slate-500">Completed manifests — the source of truth for freight settlement.</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search trip ID, lane or vehicle…"
        className="w-72 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />

      <div className={`overflow-x-auto ${card}`}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Trip</th>
              <th className={thCls}>Lane</th>
              <th className={thCls}>Vehicle</th>
              <th className={thCls}>AWBs / Weight</th>
              <th className={thCls}>Delivered</th>
              <th className={thCls}>POD</th>
            </tr>
          </thead>
          <tbody>
            {delivered.map((t) => (
              <tr key={t.id} className={rowCls}>
                <td className={`${tdCls} font-medium text-slate-800`}>{t.id}</td>
                <td className={tdCls}>{t.lane}</td>
                <td className={tdCls}>{t.vehicle.regNo} <span className="text-xs text-slate-400">· {t.vehicle.driverName}</span></td>
                <td className={tdCls}>{t.awbCount} AWBs · {t.weightKg.toLocaleString('en-IN')} kg</td>
                <td className={tdCls}>{t.deliveredAt}</td>
                <td className={tdCls}>
                  <span className={`${pill} ${t.podReceived ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {t.podReceived ? 'Received' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
            {delivered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">No completed trips match this search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

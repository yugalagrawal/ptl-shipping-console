import { useMemo, useState } from 'react'
import { card } from '../../components/ui.js'
import { TRIP_STATUS, initTripsSeed } from '../../data/trips.js'

const BAR_COLORS = ['bg-brand-orange', 'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500']

export default function TripAnalytics() {
  const [tripsSeed] = useState(() => initTripsSeed())

  const stats = useMemo(() => {
    const delivered = tripsSeed.filter((t) => t.status === TRIP_STATUS.DELIVERED)
    const active = tripsSeed.filter((t) => t.status !== TRIP_STATUS.DELIVERED)
    const onTimeCount = delivered.filter((t) => t.onTime).length
    const onTimePct = delivered.length ? Math.round((onTimeCount / delivered.length) * 100) : 0
    const avgUtilization = tripsSeed.length ? Math.round(tripsSeed.reduce((sum, t) => sum + t.utilization, 0) / tripsSeed.length) : 0
    const exceptionCount = active.reduce((sum, t) => sum + t.exceptions.length, 0)

    const byVendor = new Map()
    tripsSeed.forEach((t) => {
      const key = t.vehicle.ownership === 'Owned' ? 'Owned Fleet' : t.vehicle.vendorName
      if (!byVendor.has(key)) byVendor.set(key, { trips: 0, utilizationSum: 0 })
      const entry = byVendor.get(key)
      entry.trips += 1
      entry.utilizationSum += t.utilization
    })
    const vendorRows = [...byVendor.entries()]
      .map(([name, v]) => ({ name, trips: v.trips, avgUtilization: Math.round(v.utilizationSum / v.trips) }))
      .sort((a, b) => b.avgUtilization - a.avgUtilization)

    const byLane = new Map()
    tripsSeed.forEach((t) => {
      if (!byLane.has(t.lane)) byLane.set(t.lane, 0)
      byLane.set(t.lane, byLane.get(t.lane) + t.weightKg)
    })
    const laneRows = [...byLane.entries()].map(([lane, weightKg]) => ({ lane, weightKg })).sort((a, b) => b.weightKg - a.weightKg)
    const maxLaneWeight = Math.max(...laneRows.map((l) => l.weightKg), 1)

    return { delivered, active, onTimePct, avgUtilization, exceptionCount, vendorRows, laneRows, maxLaneWeight }
  }, [tripsSeed])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Trip Analytics</h1>
        <p className="mt-1 text-slate-500">On-time %, utilization and turnaround, computed from every trip in Trip Tracking / Past Trips.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">On-time Delivery</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{stats.onTimePct}%</div>
          <div className="text-xs text-slate-400">of {stats.delivered.length} delivered</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Avg. Utilization</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{stats.avgUtilization}%</div>
          <div className="text-xs text-slate-400">across {tripsSeed.length} trips</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Active Trips</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{stats.active.length}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-rose-500">Open Exceptions</div>
          <div className="mt-1.5 text-xl font-semibold text-rose-600">{stats.exceptionCount}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`space-y-4 p-6 ${card}`}>
          <h2 className="text-sm font-semibold text-slate-900">Weight by lane</h2>
          <div className="space-y-3">
            {stats.laneRows.map((l, i) => (
              <div key={l.lane}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{l.lane}</span>
                  <span className="font-medium text-slate-700">{l.weightKg.toLocaleString('en-IN')} kg</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${(l.weightKg / stats.maxLaneWeight) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`space-y-4 p-6 ${card}`}>
          <h2 className="text-sm font-semibold text-slate-900">Utilization by vendor / owned fleet</h2>
          <div className="space-y-3">
            {stats.vendorRows.map((v) => (
              <div key={v.name} className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-slate-700">{v.name}</div>
                  <div className="text-xs text-slate-400">{v.trips} trip{v.trips > 1 ? 's' : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-orange" style={{ width: `${v.avgUtilization}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-slate-700">{v.avgUtilization}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

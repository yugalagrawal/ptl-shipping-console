import { useState } from 'react'
import { Link } from 'react-router-dom'
import { card, thCls, tdCls, rowCls, pill, btnPrimary, btnSecondary } from '../../components/ui.js'
import { ASSIGNMENT_QUEUE_SEED, bestFleetMatch, assignVehicle, FLEET_SEED } from '../../data/fleet.js'
import { createTripFromAssignment } from '../../data/trips.js'

const PRIORITY_BADGE = {
  Priority: 'bg-brand-orange/10 text-brand-orange-dark',
  Standard: 'bg-slate-100 text-slate-600',
}

export default function TruckAssignment() {
  // Mirrors ORDERS_SEED's mutable-shared-array convention (data/orders.js) —
  // ASSIGNMENT_QUEUE_SEED/FLEET_SEED are the source of truth, this tick just
  // forces a re-render after assignVehicle() mutates them in place.
  const [, setTick] = useState(0)
  const [suggested, setSuggested] = useState({})
  const [lastTrip, setLastTrip] = useState(null)

  function suggest(manifestId) {
    const manifest = ASSIGNMENT_QUEUE_SEED.find((m) => m.id === manifestId)
    const match = bestFleetMatch(manifest, FLEET_SEED)
    setSuggested((s) => ({ ...s, [manifestId]: match }))
  }

  function confirm(manifestId) {
    const match = suggested[manifestId]
    if (!match) return
    const { vehicle, manifest } = assignVehicle(manifestId, match.vehicle.id)
    const trip = manifest ? createTripFromAssignment(manifest, vehicle, match.utilization) : null
    setLastTrip(trip)
    setSuggested((s) => {
      const next = { ...s }
      delete next[manifestId]
      return next
    })
    setTick((t) => t + 1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Truck Assignment</h1>
        <p className="mt-1 text-slate-500">Auto-match available trucks to pending manifests by volumetric utilization and route.</p>
      </div>

      {lastTrip && (
        <div className={`flex items-center justify-between gap-4 p-4 ${card} border-emerald-200 bg-emerald-50/60`}>
          <div className="text-sm">
            <span className="font-medium text-slate-900">{lastTrip.id}</span> created — {lastTrip.vehicle.regNo} assigned to {lastTrip.lane}.
          </div>
          <Link to="/trip-management/tracking" className={btnPrimary}>Go to Trip Tracking</Link>
        </div>
      )}

      <div className="space-y-4">
        {ASSIGNMENT_QUEUE_SEED.map((m) => {
          const match = suggested[m.id]
          return (
            <div key={m.id} className={`p-5 ${card}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{m.id}</span>
                    <span className={`${pill} ${PRIORITY_BADGE[m.priority]}`}>{m.priority}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">{m.lane}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {m.awbCount} AWBs · {m.totalWeightKg.toLocaleString('en-IN')} kg · {m.totalVolumeCft.toLocaleString('en-IN')} cft · cutoff {m.cutoff}
                  </div>
                </div>
                {!match && (
                  <button type="button" onClick={() => suggest(m.id)} className={btnSecondary}>
                    Suggest truck
                  </button>
                )}
              </div>

              {match && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-slate-800">{match.vehicle.regNo}</span>
                    <span className="text-slate-400"> · {match.vehicle.type} · {match.vehicle.ownership}{match.vehicle.vendorName ? ` (${match.vehicle.vendorName})` : ''} · {match.vehicle.driverName}</span>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Utilization <span className="font-medium text-slate-700">{match.utilization}%</span>
                      {match.overflow && <span className="ml-2 font-medium text-amber-600">Overflow — largest available vehicle still under-covers this manifest</span>}
                      {!match.overflow && match.offLane && <span className="ml-2 font-medium text-amber-600">No same-city vehicle available — nearest fit is in {match.vehicle.city}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => suggest(m.id)} className={btnSecondary}>Re-suggest</button>
                    <button type="button" onClick={() => confirm(m.id)} className={btnPrimary}>Confirm assignment</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {ASSIGNMENT_QUEUE_SEED.length === 0 && (
          <div className={`p-10 text-center text-sm text-slate-400 ${card}`}>Every manifest in the queue has a truck assigned.</div>
        )}
      </div>

      <div className={`overflow-x-auto ${card}`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Fleet availability</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Vehicle</th>
              <th className={thCls}>City</th>
              <th className={thCls}>Capacity</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody>
            {FLEET_SEED.map((v) => (
              <tr key={v.id} className={rowCls}>
                <td className={`${tdCls} font-medium text-slate-800`}>{v.regNo} <span className="font-normal text-slate-400">· {v.type}</span></td>
                <td className={tdCls}>{v.city}</td>
                <td className={tdCls}>{v.capacityKg.toLocaleString('en-IN')} kg · {v.capacityCft.toLocaleString('en-IN')} cft</td>
                <td className={tdCls}>{v.status === 'available' ? 'Available' : v.status === 'on_trip' ? 'On Trip' : 'Maintenance'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

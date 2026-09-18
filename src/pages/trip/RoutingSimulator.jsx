import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { card, btnPrimary, pill } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { ORDERS_SEED, initOrdersSeed } from '../../data/orders.js'
import { eligibleOrdersByLane, buildManifest } from '../../data/trips.js'

// Order aggregation — the first real step of the trip lifecycle. Orders
// past "Inward at Origin Hub" get grouped by lane here, and a confirmed
// group becomes a manifest that lands directly in Supply & Fleet Module's
// Truck Assignment queue (see data/trips.js buildManifest). Multi-leg
// (FM/MM/LM) trip construction and AI route prediction stay out of scope
// for this pass — lane-based aggregation is the concrete, buildable slice
// of "Routing Simulator" that actually connects Order Module to Supply &
// Fleet Module.

export default function RoutingSimulator() {
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState({})
  const [justBuilt, setJustBuilt] = useState(null)

  const laneGroups = useMemo(() => eligibleOrdersByLane(ordersSeed), [ordersSeed, tick])

  function isChecked(laneKey, orderId) {
    return selected[laneKey]?.has(orderId) ?? true
  }

  function toggleOrder(laneKey, orderId, allIds) {
    setSelected((s) => {
      const current = new Set(s[laneKey] ?? allIds)
      if (current.has(orderId)) current.delete(orderId)
      else current.add(orderId)
      return { ...s, [laneKey]: current }
    })
  }

  function handleBuild(group) {
    const allIds = group.orders.map((o) => o.id)
    const chosenIds = selected[group.lane] ?? new Set(allIds)
    const chosenOrders = group.orders.filter((o) => chosenIds.has(o.id))
    if (chosenOrders.length === 0) return
    const manifest = buildManifest(group.lane, chosenOrders)
    setJustBuilt(manifest)
    setSelected((s) => ({ ...s, [group.lane]: undefined }))
    setTick((t) => t + 1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Routing Simulator</h1>
        <p className="mt-1 text-slate-500">Aggregate orders sitting at the origin hub into manifests, by lane.</p>
      </div>

      {justBuilt && (
        <div className={`flex items-center justify-between gap-4 p-4 ${card} border-emerald-200 bg-emerald-50/60`}>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon name="approve" className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <span className="font-medium text-slate-900">{justBuilt.id}</span> built — {justBuilt.awbCount} AWBs,{' '}
              {justBuilt.totalWeightKg.toLocaleString('en-IN')} kg. Sent to Truck Assignment.
            </div>
          </div>
          <Link to="/supply-fleet-module/truck-assignment" className={btnPrimary}>
            Go assign a truck
          </Link>
        </div>
      )}

      {laneGroups.length === 0 && (
        <div className={`p-10 text-center text-sm text-slate-400 ${card}`}>
          No orders are sitting at the origin hub right now — book and mark some Inward at Origin Hub from Pickup Module first.
        </div>
      )}

      <div className="space-y-4">
        {laneGroups.map((group) => {
          const allIds = group.orders.map((o) => o.id)
          const chosenCount = group.orders.filter((o) => isChecked(group.lane, o.id)).length
          const totalWeight = Math.round(group.orders.reduce((sum, o) => sum + o.chargeableWeightKg, 0) * 10) / 10

          return (
            <div key={group.lane} className={`overflow-hidden ${card}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <div className="font-medium text-slate-900">{group.lane}</div>
                  <div className="text-xs text-slate-400">{group.orders.length} orders · {totalWeight.toLocaleString('en-IN')} kg chargeable</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuild(group)}
                  disabled={chosenCount === 0}
                  className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Build Manifest ({chosenCount})
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {group.orders.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-4 px-5 py-3 hover:bg-slate-50/70">
                    <input
                      type="checkbox"
                      checked={isChecked(group.lane, o.id)}
                      onChange={() => toggleOrder(group.lane, o.id, allIds)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                    />
                    <span className="w-28 shrink-0 text-sm font-medium text-slate-800">{o.id}</span>
                    <span className="w-32 shrink-0 text-sm text-slate-600">{o.clientName}</span>
                    <span className="flex-1 text-xs text-slate-400">{o.consignor.city} → {o.consignee.city}</span>
                    <span className="w-20 shrink-0 text-right text-sm text-slate-600">{o.chargeableWeightKg} kg</span>
                    {o.deliveryType === 'Express' && <span className={`${pill} bg-brand-orange/10 text-brand-orange-dark`}>Express</span>}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

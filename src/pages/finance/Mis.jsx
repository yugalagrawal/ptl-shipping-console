import { useMemo, useState } from 'react'
import { card, thCls, tdCls, rowCls } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { ORDERS_SEED, initOrdersSeed } from '../../data/orders.js'

// Cost allocation is a simplification worth flagging: a real system would
// allocate a manifest's actual linehaul+hub cost across its riding AWBs by
// weight share (see Routing Simulator / Trip Tracking for where that
// linehaul cost would come from). Without a cost-per-trip model wired up
// yet, this assumes a flat 65% of base freight as line-haul+hub cost per
// order — a stand-in ratio, not a real allocation — clearly labeled below.
const ASSUMED_COST_RATIO = 0.65

function money(n) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function Mis() {
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))

  const rollup = useMemo(() => {
    const byClient = new Map()
    ordersSeed.forEach((o) => {
      if (o.baseFreight == null) return
      const cost = Math.round(o.baseFreight * ASSUMED_COST_RATIO)
      const chargesTotal = o.appliedCharges.reduce((sum, c) => sum + (c.amount ?? 0), 0)
      const revenue = o.baseFreight + chargesTotal
      const margin = revenue - cost
      if (!byClient.has(o.clientId)) byClient.set(o.clientId, { clientId: o.clientId, clientName: o.clientName, orders: 0, revenue: 0, cost: 0, margin: 0 })
      const entry = byClient.get(o.clientId)
      entry.orders += 1
      entry.revenue += revenue
      entry.cost += cost
      entry.margin += margin
    })
    return [...byClient.values()]
      .map((e) => ({ ...e, marginPct: e.revenue ? Math.round((e.margin / e.revenue) * 1000) / 10 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [ordersSeed])

  const totals = useMemo(
    () => rollup.reduce((acc, r) => ({ orders: acc.orders + r.orders, revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, margin: acc.margin + r.margin }), { orders: 0, revenue: 0, cost: 0, margin: 0 }),
    [rollup]
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">MIS</h1>
        <p className="mt-1 text-slate-500">Freight cost allocation and margin, rolled up by client.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Booked Orders</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{totals.orders}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Revenue</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{money(totals.revenue)}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Assumed Cost</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{money(totals.cost)}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Margin</div>
          <div className="mt-1.5 text-xl font-semibold text-emerald-600">{money(totals.margin)}</div>
        </div>
      </div>

      <div className={`overflow-x-auto ${card}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">By client</h2>
          <span className="text-xs text-slate-400">Cost assumed at {ASSUMED_COST_RATIO * 100}% of base freight — illustrative, not a real allocation model.</span>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Client</th>
              <th className={thCls}>Orders</th>
              <th className={thCls}>Revenue</th>
              <th className={thCls}>Cost</th>
              <th className={thCls}>Margin</th>
              <th className={thCls}>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rollup.map((r) => (
              <tr key={r.clientId} className={rowCls}>
                <td className={`${tdCls} font-medium text-slate-800`}>{r.clientName}</td>
                <td className={tdCls}>{r.orders}</td>
                <td className={tdCls}>{money(r.revenue)}</td>
                <td className={tdCls}>{money(r.cost)}</td>
                <td className={tdCls}>{money(r.margin)}</td>
                <td className={tdCls}>
                  <span className={r.marginPct >= 30 ? 'text-emerald-600' : r.marginPct >= 15 ? 'text-amber-600' : 'text-rose-600'}>
                    {r.marginPct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

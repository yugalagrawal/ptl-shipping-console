import { useMemo, useState } from 'react'
import { card } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { ORDERS_SEED, initOrdersSeed } from '../../data/orders.js'
import { INVOICE_STATUS, initInvoicesSeed } from '../../data/invoices.js'

const BAR_COLORS = ['bg-brand-orange', 'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500']

// Illustrative only — a real month-over-month trend needs orders/invoices
// with real historical dates spread across months, which this prototype's
// seed data doesn't have (bookedAt is relative strings like "3 days ago").
// Flagged with the same amber "concept only" badge Network Simulator uses.
const REVENUE_TREND = [
  { month: 'Mar', revenue: 62000 },
  { month: 'Apr', revenue: 71000 },
  { month: 'May', revenue: 68000 },
  { month: 'Jun', revenue: 79000 },
  { month: 'Jul', revenue: 84000 },
  { month: 'Aug', revenue: 58000 },
]

function money(n) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function parseISODate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return new Date(s)
}

export default function FinanceAnalytics() {
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))
  const [invoicesSeed] = useState(() => initInvoicesSeed(ordersSeed))

  const clientRevenue = useMemo(() => {
    const byClient = new Map()
    ordersSeed.forEach((o) => {
      if (o.total == null) return
      byClient.set(o.clientName, (byClient.get(o.clientName) ?? 0) + o.total)
    })
    return [...byClient.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue)
  }, [ordersSeed])

  const laneRates = useMemo(() => {
    const byLane = new Map()
    ordersSeed.forEach((o) => {
      if (!o.originZone || !o.destZone || o.ratePerKg == null) return
      const key = `${o.originZone} → ${o.destZone}`
      if (!byLane.has(key)) byLane.set(key, [])
      byLane.get(key).push(o.ratePerKg)
    })
    return [...byLane.entries()]
      .map(([lane, rates]) => ({ lane, avgRate: Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 10) / 10 }))
      .sort((a, b) => b.avgRate - a.avgRate)
  }, [ordersSeed])

  const dso = useMemo(() => {
    const gaps = []
    invoicesSeed.forEach((inv) => {
      if (inv.status !== INVOICE_STATUS.PAID) return
      const dispatched = parseISODate(inv.dispatchedAt)
      const paid = parseISODate(inv.paidAt)
      if (dispatched && paid) gaps.push((paid - dispatched) / (1000 * 60 * 60 * 24))
    })
    return gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null
  }, [invoicesSeed])

  const totalRevenue = clientRevenue.reduce((s, c) => s + c.revenue, 0)
  const outstanding = invoicesSeed.filter((i) => i.status === INVOICE_STATUS.DISPATCHED).reduce((s, i) => s + i.amount, 0)
  const maxClientRevenue = Math.max(...clientRevenue.map((c) => c.revenue), 1)
  const maxLaneRate = Math.max(...laneRates.map((l) => l.avgRate), 1)
  const maxTrend = Math.max(...REVENUE_TREND.map((m) => m.revenue), 1)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Finance Analytics</h1>
        <p className="mt-1 text-slate-500">Revenue, margin and DSO trends across every booked order and invoice.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Total Revenue</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{money(totalRevenue)}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Outstanding</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{money(outstanding)}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">DSO</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{dso != null ? `${dso} days` : '—'}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Invoices</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{invoicesSeed.length}</div>
        </div>
      </div>

      <div className={`space-y-4 p-6 ${card}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Revenue trend</h2>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Illustrative · concept only</span>
        </div>
        <div className="flex gap-3" style={{ height: 120 }}>
          {REVENUE_TREND.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t-md bg-brand-orange/70" style={{ height: `${(m.revenue / maxTrend) * 100}%` }} />
              </div>
              <span className="text-[11px] text-slate-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`space-y-4 p-6 ${card}`}>
          <h2 className="text-sm font-semibold text-slate-900">Revenue by client</h2>
          <div className="space-y-3">
            {clientRevenue.map((c, i) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{c.name}</span>
                  <span className="font-medium text-slate-700">{money(c.revenue)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${(c.revenue / maxClientRevenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`space-y-4 p-6 ${card}`}>
          <h2 className="text-sm font-semibold text-slate-900">Average rate/kg by lane</h2>
          <div className="space-y-3">
            {laneRates.map((l, i) => (
              <div key={l.lane}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{l.lane}</span>
                  <span className="font-medium text-slate-700">₹{l.avgRate}/kg</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${(l.avgRate / maxLaneRate) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

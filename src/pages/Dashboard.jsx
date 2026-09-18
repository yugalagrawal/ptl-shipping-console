import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import { card } from '../components/ui.js'

const LT_KPIS = [
  { label: 'Active orders', value: '1,284', dot: 'bg-slate-400' },
  { label: 'Trips in transit', value: '46', dot: 'bg-indigo-500' },
  { label: 'Pending invoices', value: '₹38.2L', dot: 'bg-amber-500' },
  { label: 'Open exceptions', value: '7', dot: 'bg-rose-500' },
]

const CLIENT_KPIS = [
  { label: 'Active orders', value: '32', dot: 'bg-slate-400' },
  { label: 'In transit', value: '11', dot: 'bg-indigo-500' },
  { label: 'Delivered this month', value: '204', dot: 'bg-emerald-500' },
  { label: 'Open invoices', value: '₹4.6L', dot: 'bg-amber-500' },
]

const LIVE_TRIPS = [
  { id: 'MF-1042', route: 'Chennai → Delhi', vehicle: 'TN 09 BZ 4471', pct: 68, status: 'In transit' },
  { id: 'MF-1055', route: 'Bengaluru → Pune', vehicle: 'KA 05 CT 9021', pct: 30, status: 'In transit' },
  { id: 'MF-1061', route: 'Delhi → Lucknow', vehicle: 'DL 1LT 7732', pct: 92, status: 'Out for delivery' },
]

const ACTIVITY = [
  { text: 'LR-CHE-00231 marked delivered', who: 'Auto · POD scanned', time: '12 min ago' },
  { text: 'Invoice INV-3391 raised for Nykaa', who: 'Rahul Mehta', time: '48 min ago' },
  { text: 'New client Mamaearth onboarded', who: 'Priya Sharma', time: '2h ago' },
  { text: 'Manifest MF-1042 dispatched from Chennai hub', who: 'Auto', time: '3h ago' },
]

// Corridor for manifest MF-1042 (Chennai → Delhi, already shown in Live trips) —
// same shipment, viewed at network level instead of trip level.
const NETWORK_CHAIN = [
  { label: 'Chennai', sub: 'First mile', count: 42, unit: 'AWBs staged', status: 'ok' },
  { label: 'Chennai Hub', sub: 'Sort & consolidate', count: 186, unit: 'AWBs on floor', status: 'warn' },
  { label: 'Nagpur Hub', sub: 'Line-haul relay', count: 97, unit: 'AWBs pending', status: 'critical' },
  { label: 'Delhi', sub: 'Last mile', count: 68, unit: 'AWBs for OFD', status: 'ok' },
]

const STATUS_DOT = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  critical: 'bg-rose-500',
}

const BREACH_WATCHLIST = [
  { label: 'EDD already breached', count: 12, level: 'critical' },
  { label: 'Expected to breach EDD', count: 8, level: 'warn' },
  { label: 'Breach ETA within 6 hrs', count: 5, level: 'warn' },
  { label: 'On hold', count: 21, level: 'info' },
]

const LEVEL_BORDER = {
  critical: 'border-rose-400',
  warn: 'border-amber-400',
  info: 'border-slate-300',
}

function Kpi({ label, value, dot }) {
  return (
    <div className={`p-5 ${card}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user, can } = useAuth()
  const isLt = user?.persona === 'lt'
  const kpis = isLt ? LT_KPIS : CLIENT_KPIS

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-slate-500">
            {isLt ? "Here's what's moving across the PTL network today." : "Here's a snapshot of your shipments today."}
          </p>
        </div>
        {can('create-order') && (
          <Link to="/order-module/create-order" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark">
            <Icon name="plus" className="h-4 w-4" />
            New pickup
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      {isLt && (
        <div className={`overflow-hidden ${card}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-medium text-slate-900">Network pendency</h2>
              <p className="text-xs text-slate-400">Chennai – Delhi corridor · manifest MF-1042</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">Live</span>
          </div>

          <div className="flex items-start gap-2 overflow-x-auto px-6 py-6">
            {NETWORK_CHAIN.map((n, i) => (
              <div key={n.label} className="flex items-start">
                <div className="flex w-32 shrink-0 flex-col items-center text-center">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[n.status]}`} />
                  <div className="mt-2 text-xs font-semibold text-slate-800">{n.label}</div>
                  <div className="text-[11px] text-slate-400">{n.sub}</div>
                  <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{n.count}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">{n.unit}</div>
                </div>
                {i < NETWORK_CHAIN.length - 1 && <div className="mt-[5px] h-px w-10 shrink-0 bg-slate-200 sm:w-16" />}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-6 py-4">
            {BREACH_WATCHLIST.map((b) => (
              <div
                key={b.label}
                className={`flex min-w-[160px] flex-1 items-center gap-3 rounded-xl border-l-4 bg-slate-50/60 px-3.5 py-2.5 ${LEVEL_BORDER[b.level]}`}
              >
                <span className="text-lg font-semibold tabular-nums text-slate-900">{b.count}</span>
                <span className="text-xs text-slate-500">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`overflow-hidden ${card}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-medium text-slate-900">Live trips</h2>
            {can('trip-tracking') && (
              <Link to="/trip-management/tracking" className="text-sm font-medium text-brand-orange-dark hover:underline">
                View all
              </Link>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {LIVE_TRIPS.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{t.id}</span>
                  <span className="text-slate-400">{t.status}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {t.route} · {t.vehicle}
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-orange" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`overflow-hidden ${card}`}>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-medium text-slate-900">Recent activity</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {ACTIVITY.map((a) => (
              <div key={a.text} className="flex items-start gap-3 px-6 py-3.5">
                <Avatar name={a.who.split(' · ')[0]} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-700">{a.text}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {a.who} · {a.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

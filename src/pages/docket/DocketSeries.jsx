import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { card, thCls, tdCls, rowCls, pill, pillActive, pillInactive } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { seriesState, SERIES_LOW_AT } from '../../data/docketSeries.js'

// Read-only overview of every client's docket numbering — who is on an
// assigned series, how much of it is used, what's next, and who needs a new
// block. Ranges themselves are still edited in Client Configuration (Docket
// Config), so there is one place to change them.
const th = thCls.replace('px-6', 'px-3')
const td = tdCls.replace('px-6', 'px-3')

const STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  low: { label: 'Running low', cls: 'bg-amber-50 text-amber-700' },
  exhausted: { label: 'Exhausted', cls: 'bg-red-50 text-red-600' },
  auto: { label: 'Auto', cls: 'bg-slate-100 text-slate-500' },
}

function rowFor(client) {
  const s = seriesState(client.id)
  const key = !s.assigned ? 'auto' : s.exhausted ? 'exhausted' : s.low ? 'low' : 'active'
  const total = s.ranges.reduce((n, r) => n + r.total, 0)
  const used = s.ranges.reduce((n, r) => n + r.used, 0)
  return { client, s, key, total, used }
}

function Kpi({ label, value, sub, tone = '' }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone || 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function DocketSeries() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const rows = useMemo(() => ACTIVE_CLIENTS_SEED.map(rowFor), [])

  const assigned = rows.filter((r) => r.s.assigned)
  const attention = rows.filter((r) => r.key === 'low' || r.key === 'exhausted')
  const remaining = assigned.reduce((n, r) => n + r.s.remaining, 0)

  const FILTERS = [
    ['all', 'All', rows.length],
    ['assigned', 'Assigned series', assigned.length],
    ['auto', 'Auto', rows.length - assigned.length],
    ['attention', 'Needs attention', attention.length],
  ]
  const shown = rows.filter((r) => {
    if (filter === 'assigned' && !r.s.assigned) return false
    if (filter === 'auto' && r.s.assigned) return false
    if (filter === 'attention' && !(r.key === 'low' || r.key === 'exhausted')) return false
    return !query.trim() || r.client.name.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Docket Series</h1>
        <p className="text-sm text-slate-500">Docket numbering per client — assigned ranges, usage and what's next. Clients not on an assigned series get system auto numbers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Clients on assigned series" value={assigned.length} sub={`of ${rows.length} active clients`} />
        <Kpi label="Numbers remaining" value={remaining.toLocaleString('en-IN')} sub="across all assigned ranges" />
        <Kpi label="Running low" value={rows.filter((r) => r.key === 'low').length} sub={`${SERIES_LOW_AT} or fewer left`} tone={rows.some((r) => r.key === 'low') ? 'text-amber-600' : ''} />
        <Kpi label="Exhausted" value={rows.filter((r) => r.key === 'exhausted').length} sub="falling back to auto numbers" tone={rows.some((r) => r.key === 'exhausted') ? 'text-red-600' : ''} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={filter === k ? pillActive : pillInactive}>
            {label} <span className="opacity-60">{n}</span>
          </button>
        ))}
        <div className="relative ml-auto w-56">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40" />
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[56rem]">
          <thead>
            <tr>
              <th className={th}>Client</th>
              <th className={th}>Series</th>
              <th className={th}>Usage</th>
              <th className={th}>Next number</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`} />
            </tr>
          </thead>
          <tbody>
            {shown.map(({ client, s, key, total, used }) => (
              <tr key={client.id} className={`${rowCls} align-top`}>
                <td className={`${td} font-medium text-slate-800`}>{client.name}</td>
                <td className={`${td} whitespace-normal`}>
                  {s.assigned ? (
                    s.ranges.length ? (
                      <ul className="space-y-0.5">
                        {s.ranges.map((r) => (
                          <li key={r.id} className="flex items-center gap-2 font-mono text-xs">
                            <span className={r.status === 'exhausted' ? 'text-slate-300 line-through' : 'text-slate-700'}>{r.from} – {r.to}</span>
                            <span className="font-sans text-[10px] capitalize text-slate-400">{r.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-xs text-red-500">No valid range set</span>
                  ) : <span className="text-xs text-slate-400">System auto-generated</span>}
                </td>
                <td className={td}>
                  {s.assigned && total > 0 ? (
                    <div className="w-40">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${key === 'exhausted' ? 'bg-red-400' : key === 'low' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums text-slate-500">{used.toLocaleString('en-IN')} used · {s.remaining.toLocaleString('en-IN')} left{s.ranges.some((r) => r.approx) ? ' (≈)' : ''}</p>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className={`${td} font-mono text-xs text-slate-700`}>{s.assigned ? (s.next ?? '—') : <span className="font-sans text-slate-300">—</span>}</td>
                <td className={td}><span className={`${pill} !py-0.5 ${STATUS[key].cls}`}>{STATUS[key].label}</span></td>
                <td className={`${td} text-right`}>
                  <Link to="/client-module/client-configuration" className="text-xs font-medium text-brand-orange-dark hover:underline">Manage in Client Configuration</Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">No clients match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

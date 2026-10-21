import { card } from '../../components/ui.js'
import { PICKUP_STATUS, PICKUP_STATUS_LABEL } from '../../data/pickups.js'
import { STAGES, OPTIONAL_STAGES } from './pickupDashboardLib.js'

export const STAGE_DOT = {
  [PICKUP_STATUS.DRAFT]: 'bg-slate-300', [PICKUP_STATUS.CREATED]: 'bg-slate-400', [PICKUP_STATUS.ASSIGNED]: 'bg-sky-500',
  [PICKUP_STATUS.ARRIVED]: 'bg-amber-500', [PICKUP_STATUS.STARTED]: 'bg-orange-500', [PICKUP_STATUS.FAILED]: 'bg-red-500',
  [PICKUP_STATUS.IN_PROGRESS]: 'bg-violet-500', [PICKUP_STATUS.COMPLETED]: 'bg-indigo-500',
  [PICKUP_STATUS.AT_HUB]: 'bg-cyan-500', [PICKUP_STATUS.DROPPED]: 'bg-emerald-500',
}

const ATTENTION = [
  ['overdue', 'Overdue slot', 'text-red-600 bg-red-50'],
  ['unassigned', 'Not on a PRS', 'text-slate-700 bg-slate-100'],
  ['urgent', 'Urgent booking', 'text-orange-600 bg-orange-50'],
  ['hazardous', 'Hazardous', 'text-red-600 bg-red-50'],
]

function Panel({ title, sub, children }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/70 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-semibold text-slate-700">{title}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function HBar({ label, value, display, max, barCls, active, dim, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`group block w-full text-left transition-opacity ${dim ? 'opacity-40 hover:opacity-80' : ''}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className={`truncate ${active ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{label}</span>
        <span className="tabular-nums text-slate-500">{display}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barCls} ${active ? 'ring-2 ring-slate-900/20' : ''}`} style={{ width: `${max ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0}%` }} />
      </div>
    </button>
  )
}

const STAGE_HEX = {
  [PICKUP_STATUS.DRAFT]: '#cbd5e1', [PICKUP_STATUS.CREATED]: '#94a3b8', [PICKUP_STATUS.ASSIGNED]: '#0ea5e9',
  [PICKUP_STATUS.ARRIVED]: '#f59e0b', [PICKUP_STATUS.STARTED]: '#f97316', [PICKUP_STATUS.FAILED]: '#ef4444',
  [PICKUP_STATUS.IN_PROGRESS]: '#8b5cf6', [PICKUP_STATUS.COMPLETED]: '#6366f1',
  [PICKUP_STATUS.AT_HUB]: '#06b6d4', [PICKUP_STATUS.DROPPED]: '#10b981',
}
const CLIENT_HEX = ['#f97316', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b']
const OTHER_HEX = '#cbd5e1'

// Donut / pie with a legend. `data`: [{ key, label, value, color, clickable }].
// `pie` fills the hole. Clicking a slice or legend row calls onPick(key).
function Donut({ data, activeKeys = [], onPick, center, pie = false }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  const R = 15.9155
  let offset = 25
  const anyActive = activeKeys.length > 0
  if (!total) return <div className="flex h-40 items-center justify-center text-xs text-slate-400">No pickups in this selection</div>
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
      <svg viewBox="0 0 42 42" className="h-36 w-36 shrink-0">
        {data.filter((d) => d.value > 0).map((d) => {
          const pct = (d.value / total) * 100
          const el = (
            <circle key={d.key} cx="21" cy="21" r={pie ? 10.5 : R} pathLength="100" fill="none" stroke={d.color} strokeWidth={pie ? 21 : 6}
              strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={offset}
              style={{ opacity: anyActive && !activeKeys.includes(d.key) ? 0.3 : 1, cursor: onPick && d.clickable !== false ? 'pointer' : 'default' }}
              onClick={() => onPick && d.clickable !== false && onPick(d.key)}>
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          )
          offset -= pct
          return el
        })}
        {!pie && center && (
          <>
            <text x="21" y="21.5" textAnchor="middle" fontSize="7" fontWeight="600" fill="#0f172a">{center.value}</text>
            <text x="21" y="27" textAnchor="middle" fontSize="3" fill="#94a3b8">{center.label}</text>
          </>
        )}
      </svg>
      <ul className="min-w-[150px] flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.key}>
            <button type="button" onClick={() => onPick && d.clickable !== false && onPick(d.key)}
              className={`flex w-full items-center gap-2 text-left text-xs ${anyActive && !activeKeys.includes(d.key) ? 'opacity-40' : ''}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
              <span className="min-w-0 flex-1 truncate text-slate-600">{d.label}</span>
              <span className="tabular-nums text-slate-500">{d.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const dayLabel = (s) => new Date(`${s}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// Pickups per scheduled day, stacked by stage. Gaps between the first and last
// day are filled (up to 45 days) so a quiet day reads as a quiet day.
function DayChart({ rows }) {
  const dated = rows.filter((r) => r.slotDate)
  const undated = rows.length - dated.length
  if (!dated.length) return <div className="flex h-36 items-center justify-center text-xs text-slate-400">No scheduled pickups in this selection{undated ? ` (${undated} without a date)` : ''}</div>

  const byDay = new Map()
  dated.forEach((r) => {
    const d = byDay.get(r.slotDate) ?? {}
    d[r.status] = (d[r.status] ?? 0) + 1
    byDay.set(r.slotDate, d)
  })
  const keys = [...byDay.keys()].sort()
  let days = keys
  const span = (new Date(keys[keys.length - 1]) - new Date(keys[0])) / 86400000
  if (span <= 45) {
    days = []
    for (let i = 0; i <= span; i += 1) {
      const d = new Date(`${keys[0]}T00:00`)
      d.setDate(d.getDate() + i)
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
  }
  const totals = days.map((k) => Object.values(byDay.get(k) ?? {}).reduce((a, b) => a + b, 0))
  const max = Math.max(...totals, 1)
  const step = Math.max(1, Math.ceil(days.length / 4))

  return (
    <div>
      <div className="flex h-36 items-end gap-[3px] border-b border-slate-200">
        {days.map((k, i) => (
          <div key={k} className="group relative flex h-full min-w-[6px] flex-1 flex-col justify-end" title={`${dayLabel(k)} · ${totals[i]} pickups`}>
            {STAGES.slice().reverse().map((s) => {
              const n = byDay.get(k)?.[s]
              return n ? <div key={s} className={`${STAGE_DOT[s]} first:rounded-t-sm`} style={{ height: `${(n / max) * 100}%` }} /> : null
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[10px] text-slate-400">
        {days.map((k, i) => <div key={k} className="min-w-[6px] flex-1 overflow-visible whitespace-nowrap">{i % step === 0 ? dayLabel(k) : ''}</div>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {STAGES.filter((s) => dated.some((r) => r.status === s)).map((s) => (
          <span key={s} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${STAGE_DOT[s]}`} />{PICKUP_STATUS_LABEL[s]}</span>
        ))}
        {undated > 0 && <span className="text-slate-400">· {undated} without a date</span>}
      </div>
    </div>
  )
}

export default function PickupCharts({ rows, stageRows, filters, toggleIn, attention }) {
  const totalKg = rows.reduce((a, r) => a + r.estWeightKg, 0)

  const stageData = STAGES.map((st) => ({
    key: st, label: PICKUP_STATUS_LABEL[st], value: stageRows.filter((r) => r.status === st).length, color: STAGE_HEX[st],
  })).filter((d) => !OPTIONAL_STAGES.has(d.key) || d.value > 0)

  const hubMap = new Map()
  rows.forEach((r) => { const h = r.dropMiniHubName ?? 'No hub'; hubMap.set(h, (hubMap.get(h) ?? 0) + r.estWeightKg) })
  const hubs = [...hubMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const hubMax = Math.max(...hubs.map((h) => h[1]), 1)

  const clientMap = new Map()
  rows.forEach((r) => clientMap.set(r.clientName, (clientMap.get(r.clientName) ?? 0) + 1))
  const topClients = [...clientMap.entries()].sort((a, b) => b[1] - a[1])
  const clientData = topClients.slice(0, 5).map(([name, n], i) => ({ key: name, label: name, value: n, color: CLIENT_HEX[i] }))
  const restN = topClients.slice(5).reduce((a, [, n]) => a + n, 0)
  if (restN) clientData.push({ key: '__others', label: `${topClients.length - 5} others`, value: restN, color: OTHER_HEX, clickable: false })

  // Slot health only means something before the pickup has been reached.
  const pre = rows.filter((r) => [PICKUP_STATUS.DRAFT, PICKUP_STATUS.CREATED, PICKUP_STATUS.ASSIGNED].includes(r.status))
  const slotData = [
    { key: 'breached', label: 'Slot breached', value: pre.filter((r) => r.overdue).length, color: '#ef4444' },
    { key: 'ontime', label: 'Within slot', value: pre.filter((r) => !r.overdue).length, color: '#10b981', clickable: false },
  ]

  return (
    <div className={`${card} p-4`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{rows.length}</span> pickups
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{totalKg.toLocaleString('en-IN')}</span> kg est.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ATTENTION.map(([k, label, tone]) => (
            <button key={k} type="button" onClick={() => toggleIn('flags', k)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all ${tone} ${filters.flags.includes(k) ? 'ring-current' : 'ring-transparent hover:ring-slate-300'}`}>
              {label} <span className="tabular-nums">{attention[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="By stage" sub="donut · click to filter">
          <Donut data={stageData} activeKeys={filters.status} onPick={(k) => toggleIn('status', k)} center={{ value: stageData.reduce((a, d) => a + d.value, 0), label: 'pickups' }} />
        </Panel>
        <Panel title="Pickups per day" sub="stacked bars · by scheduled date">
          <DayChart rows={rows} />
        </Panel>
        <Panel title="Top Mini Hubs" sub="bars · est. kg · click to filter">
          <div className="space-y-3">
            {hubs.map(([h, kg]) => (
              <HBar key={h} label={h} value={kg} display={`${kg.toLocaleString('en-IN')} kg`} max={hubMax} barCls="bg-brand-orange"
                active={filters.hub.includes(h)} dim={filters.hub.length > 0 && !filters.hub.includes(h)} onClick={() => toggleIn('hub', h)} />
            ))}
            {hubs.length === 0 && <div className="flex h-24 items-center justify-center text-xs text-slate-400">No pickups in this selection</div>}
          </div>
        </Panel>
        <Panel title="Client share" sub="pie · pickups per client">
          <Donut pie data={clientData} activeKeys={filters.client} onPick={(k) => toggleIn('client', k)} />
        </Panel>
        <Panel title="Slot health" sub="before arrival · click to filter">
          <Donut data={slotData} activeKeys={filters.flags.includes('overdue') ? ['breached'] : []} onPick={() => toggleIn('flags', 'overdue')}
            center={{ value: pre.length ? `${Math.round((slotData[0].value / pre.length) * 100)}%` : '–', label: 'breached' }} />
        </Panel>
      </div>
    </div>
  )
}

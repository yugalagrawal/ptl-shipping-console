import { card } from '../../components/ui.js'
import { computePerformance, ON_TIME_GRACE_MIN } from './pickupDashboardLib.js'

const pctTone = (p) => (p == null ? 'text-slate-300' : p >= 90 ? 'text-emerald-600' : p >= 70 ? 'text-amber-600' : 'text-red-600')
const pctBar = (p) => (p == null ? 'bg-slate-200' : p >= 90 ? 'bg-emerald-500' : p >= 70 ? 'bg-amber-500' : 'bg-red-500')

function Kpi({ label, value, unit, sub, tone }) {
  return (
    <div className="rounded-xl border border-slate-200/70 px-4 py-3">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className={`mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums ${tone ?? 'text-slate-900'}`}>
        {value ?? '--'}{value != null && unit && <span className="ml-0.5 text-base font-medium text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function Best({ title, entry }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{title}</div>
      {entry ? (
        <>
          <div className="mt-1 truncate text-lg font-semibold text-slate-900">{entry.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">{entry.onTimePct ?? '--'}% on time · {entry.attempted} pickup{entry.attempted === 1 ? '' : 's'} · {entry.failed} failed</div>
        </>
      ) : <div className="mt-1 text-sm text-slate-400">Not enough data yet</div>}
    </div>
  )
}

function Leaderboard({ title, rows }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/70 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[13px] font-semibold text-slate-700">{title}</div>
        <div className="text-xs text-slate-400">ranked by on-time %</div>
      </div>
      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-slate-400">No pickups attended in this selection</div>
      ) : (
        <ol className="space-y-3">
          {rows.slice(0, 6).map((r, i) => (
            <li key={r.name}>
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{r.name}</span>
                <span className="tabular-nums text-slate-400">{r.attempted} pickup{r.attempted === 1 ? '' : 's'}{r.failed > 0 && <span className="text-red-500"> · {r.failed} failed</span>}</span>
                <span className={`w-10 text-right font-semibold tabular-nums ${pctTone(r.onTimePct)}`}>{r.onTimePct == null ? '--' : `${r.onTimePct}%`}</span>
              </div>
              <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pctBar(r.onTimePct)}`} style={{ width: `${r.onTimePct ?? 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function PickupPerformance({ rows }) {
  const { overall: o, partners, drivers, failReasons } = computePerformance(rows)
  const failMax = Math.max(...failReasons.map((f) => f[1]), 1)

  return (
    <div className={`${card} p-4`}>
      <div className="mb-4 text-xs text-slate-400">
        Based on {o.attempted} attended pickup{o.attempted === 1 ? '' : 's'} in the selected date range and filters. On time = reached the pickup location within {ON_TIME_GRACE_MIN} min of the scheduled slot.
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="On-time pickups" value={o.onTimePct} unit="%" tone={pctTone(o.onTimePct)} sub={`${o.onTime} of ${o.arrived} on time`} />
        <Kpi label="Avg arrival delay" value={o.avgDelayMin} unit=" min" sub="of late arrivals" />
        <Kpi label="Failed pickups" value={o.failedPct} unit="%" tone={o.failedPct > 0 ? 'text-red-600' : undefined} sub={`${o.failed} of ${o.attempted} attempted`} />
        <Kpi label="Avg time on site" value={o.avgOnSiteMin} unit=" min" sub="arrival to last scan" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Best title="Best partner" entry={partners[0]} />
        <Best title="Best driver" entry={drivers[0]} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Leaderboard title="Partner leaderboard" rows={partners} />
        <Leaderboard title="Driver leaderboard" rows={drivers} />
        <div className="min-w-0 rounded-xl border border-slate-200/70 p-4">
          <div className="mb-3 text-[13px] font-semibold text-slate-700">Why pickups fail</div>
          {failReasons.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-xs text-slate-400">No failed pickups</div>
          ) : (
            <div className="space-y-3">
              {failReasons.map(([reason, n]) => (
                <div key={reason}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-600">{reason}</span><span className="tabular-nums text-slate-500">{n}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-400" style={{ width: `${(n / failMax) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

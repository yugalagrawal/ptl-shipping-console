import { useMemo, useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'
import {
  HEADS, HISTORY, FORECAST, BUDGET_FORECAST, LEVERS, NO_LEVERS, PRESETS, applyScenario, fmtInr, fmtPct,
} from '../../data/costing.js'
import { InfoTip } from './InfoTip.jsx'
import { TrendChart } from './charts.jsx'

function Delta({ value, goodWhenDown = true }) {
  if (!Number.isFinite(value)) return null
  const bad = goodWhenDown ? value > 0.0005 : value < -0.0005
  const good = goodWhenDown ? value < -0.0005 : value > 0.0005
  return <span className={`tabular-nums ${bad ? 'text-red-600' : good ? 'text-emerald-600' : 'text-slate-400'}`}>{fmtPct(value)}</span>
}

function Stat({ label, base, scen, fmt, goodWhenDown = true, delta, deltaText }) {
  const d = delta ?? (base ? scen / base - 1 : 0)
  return (
    <div className={`p-4 ${card}`}>
      <p className="flex items-center justify-between gap-1 text-[11px] font-medium text-slate-400"><span>{label}</span><InfoTip id="scenarioStat" /></p>
      <p className="mt-1 whitespace-nowrap text-xl font-semibold tracking-tight text-slate-900">{fmt(scen)}</p>
      <p className="mt-0.5 text-xs">{deltaText ? <span className={`tabular-nums ${Math.abs(d) < 0.0005 ? 'text-slate-400' : (d > 0) === goodWhenDown ? 'text-red-600' : 'text-emerald-600'}`}>{deltaText}</span> : <Delta value={d} goodWhenDown={goodWhenDown} />}</p>
      <p className="text-[11px] text-slate-400">baseline {fmt(base)}</p>
    </div>
  )
}

const LEVER_INFO = { volume: 'leverVolume', diesel: 'leverDiesel', vendor: 'leverVendor', productivity: 'leverProductivity', oda: 'leverOda', rent: 'leverRent' }

export default function CostForecast() {
  const [levers, setLevers] = useState(NO_LEVERS)
  const [preset, setPreset] = useState('base')

  const scen = useMemo(() => FORECAST.map((r) => applyScenario(r, levers)), [levers])
  const changed = LEVERS.some((l) => levers[l.key] !== 0)

  const points = [
    ...HISTORY.slice(-6).map((r) => ({ label: r.label, actual: r.total })),
    ...FORECAST.map((r, k) => ({ label: r.label, forecast: r.total, lo: r.lo, hi: r.hi, budget: BUDGET_FORECAST[k].total, ...(changed ? { scenario: scen[k].total } : {}) })),
  ]

  const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0)
  const baseCost = sum(FORECAST, (r) => r.total), scenCost = sum(scen, (r) => r.total)
  const baseRev = sum(FORECAST, (r) => r.revenue), scenRev = sum(scen, (r) => r.revenue)
  const baseDockets = sum(FORECAST, (r) => r.dockets), scenDockets = sum(scen, (r) => r.dockets)
  const baseMargin = (baseRev - baseCost) / baseRev, scenMargin = (scenRev - scenCost) / scenRev
  const budgetCost = sum(BUDGET_FORECAST, (r) => r.total)

  const setLever = (k, v) => { setLevers((p) => ({ ...p, [k]: v })); setPreset('') }

  const peak = scen.reduce((a, r) => (r.total > a.total ? r : a), scen[0])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Forecast &amp; What-if</h1>
          <p className="mt-1 text-slate-500">Six-month cost outlook from the trend and seasonality in the last 12 months — then pull a lever to see what it does.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Sample data</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" onClick={() => { setLevers(p.levers); setPreset(p.key) }} className={preset === p.key ? pillActive : pillInactive}>{p.label}</button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className={`${card} space-y-4 p-5`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Levers</h3>
            {changed && <button type="button" onClick={() => { setLevers(NO_LEVERS); setPreset('base') }} className="text-xs font-medium text-brand-orange-dark hover:underline">Reset</button>}
          </div>
          {LEVERS.map((l) => {
            const v = levers[l.key]
            return (
              <div key={l.key}>
                <div className="flex items-baseline justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">{l.label} <InfoTip id={LEVER_INFO[l.key]} /></label>
                  <span className={`text-xs font-semibold tabular-nums ${v ? 'text-brand-orange-dark' : 'text-slate-400'}`}>{v > 0 ? '+' : ''}{v}{l.unit === '%' ? '%' : ' pts'}</span>
                </div>
                <input type="range" min={l.min} max={l.max} step={l.step} value={v} onChange={(e) => setLever(l.key, Number(e.target.value))} className="mt-1 w-full accent-[#D94F1C]" />
                <p className="text-[10px] leading-snug text-slate-400">{l.hint}</p>
              </div>
            )
          })}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat label="6-month cost" base={baseCost} scen={scenCost} fmt={fmtInr} />
            <Stat label="Cost per docket" base={baseCost / baseDockets} scen={scenCost / scenDockets} fmt={(n) => `₹${n.toFixed(0)}`} />
            <Stat label="Gross margin" base={baseMargin} scen={scenMargin} fmt={(n) => `${(n * 100).toFixed(1)}%`} goodWhenDown={false} delta={scenMargin - baseMargin} deltaText={`${scenMargin - baseMargin >= 0 ? '+' : '−'}${(Math.abs(scenMargin - baseMargin) * 100).toFixed(1)} pts`} />
            <Stat label="vs budget (6 mo)" base={baseCost - budgetCost} scen={scenCost - budgetCost} fmt={fmtInr} delta={scenCost / budgetCost - 1} deltaText={`${fmtPct(scenCost / budgetCost - 1)} of plan`} />
          </div>

          <div className={`${card} p-5`}>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">Monthly cost outlook <InfoTip id="outlook" /></h3>
            <TrendChart points={points} height={250} scenarioLabel={preset && preset !== 'base' ? PRESETS.find((p) => p.key === preset).label : 'Scenario'} />
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-brand-navy" />Actual</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-brand-orange" />Baseline forecast</span>
              {changed && <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-violet-600" />Your scenario</span>}
              <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-brand-orange/15" />80% confidence</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dotted border-slate-400" />Budget</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Peak month {peak.long}: <b className="text-slate-800">{fmtInr(peak.total)}</b>{changed ? ` (baseline ${fmtInr(FORECAST[scen.indexOf(peak)].total)})` : ''}.</p>
          </div>

          <div className={`${card} overflow-x-auto p-5`}>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">Impact by cost head · 6 months <InfoTip id="impact" /></h3>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <th className="py-1.5">Head</th><th className="py-1.5 text-right">Baseline</th><th className="py-1.5 text-right">{changed ? 'Scenario' : 'Forecast'}</th><th className="py-1.5 text-right">Change</th>
                  <th className="py-1.5 w-[28%]" />
                </tr>
              </thead>
              <tbody>
                {HEADS.map((h) => {
                  const b = sum(FORECAST, (r) => r.heads[h.key]), s = sum(scen, (r) => r.heads[h.key])
                  const d = s - b
                  const maxAbs = Math.max(...HEADS.map((x) => Math.abs(sum(scen, (r) => r.heads[x.key]) - sum(FORECAST, (r) => r.heads[x.key])))) || 1
                  return (
                    <tr key={h.key} className="border-t border-slate-100">
                      <td className="py-1.5"><span className="flex items-center gap-2 text-slate-700"><span className="h-2 w-2 rounded-full" style={{ background: h.color }} />{h.short}</span></td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">{fmtInr(b)}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums text-slate-800">{fmtInr(s)}</td>
                      <td className="py-1.5 text-right">{changed && Math.abs(d) > 1 ? <span className={`tabular-nums ${d > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{d > 0 ? '+' : '−'}{fmtInr(Math.abs(d))}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="py-1.5 pl-4">
                        {changed && Math.abs(d) > 1 && (
                          <div className="flex h-1.5 items-center">
                            <div className="h-1.5 flex-1 rounded-l-full bg-slate-100">{d < 0 && <div className="ml-auto h-1.5 rounded-l-full bg-emerald-500" style={{ width: `${(Math.abs(d) / maxAbs) * 100}%` }} />}</div>
                            <div className="h-1.5 flex-1 rounded-r-full bg-slate-100">{d > 0 && <div className="h-1.5 rounded-r-full bg-red-500" style={{ width: `${(d / maxAbs) * 100}%` }} />}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-slate-400">Forecast: linear trend + seasonal ratio on 12 months of actuals, 80% band from in-sample error. Lever sensitivities are planning assumptions, not measured elasticities.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

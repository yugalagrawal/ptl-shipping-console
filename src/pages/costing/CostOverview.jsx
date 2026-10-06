import { useMemo, useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'
import Icon from '../../components/Icon.jsx'
import {
  HEADS, HEAD_BY_KEY, HISTORY, BUDGET, FORECAST, BUDGET_FORECAST, LANES, CLIENTS, HUB_BY_ID, N_ACTUAL,
  rankNodes, rollup, buildInsights, fmtInr, fmtPct,
} from '../../data/costing.js'
import { InfoTip } from './InfoTip.jsx'
import { TrendChart, Sparkline, CompositionBar } from './charts.jsx'

const TONE = {
  bad: { dot: 'bg-red-500', ring: 'bg-red-50 border-red-100' },
  warn: { dot: 'bg-amber-500', ring: 'bg-amber-50 border-amber-100' },
  info: { dot: 'bg-sky-500', ring: 'bg-sky-50 border-sky-100' },
  good: { dot: 'bg-emerald-500', ring: 'bg-emerald-50 border-emerald-100' },
}

function Delta({ value, goodWhenDown = true, className = '' }) {
  if (value == null || !Number.isFinite(value)) return null
  const bad = goodWhenDown ? value > 0.0005 : value < -0.0005
  const good = goodWhenDown ? value < -0.0005 : value > 0.0005
  return <span className={`tabular-nums ${bad ? 'text-red-600' : good ? 'text-emerald-600' : 'text-slate-400'} ${className}`}>{fmtPct(value)}</span>
}

function Kpi({ label, info, value, sub, delta, goodWhenDown = true, accent }) {
  return (
    <div className={`p-4 ${card} ${accent ? 'border-brand-orange/30 bg-brand-orange/[0.03]' : ''}`}>
      <p className="flex items-center justify-between gap-1 text-[11px] font-medium text-slate-400"><span>{label}</span>{info && <InfoTip id={info} />}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
        {delta != null && <Delta value={delta} goodWhenDown={goodWhenDown} />}
        <span>{sub}</span>
      </p>
    </div>
  )
}

function CostExplorer({ monthIdx }) {
  const [by, setBy] = useState('geo') // geo | client
  const [path, setPath] = useState([]) // geo: [regionName, hubId]; client: [clientId]
  const [leaf, setLeaf] = useState(null)

  const lanes = useMemo(() => rankNodes(LANES, monthIdx), [monthIdx])
  const clients = useMemo(() => rankNodes(CLIENTS, monthIdx), [monthIdx])

  const levelLabel = by === 'geo' ? ['Region', 'Hub', 'Lane'][path.length] : 'Client'
  let rows
  if (by === 'client') rows = clients
  else if (path.length === 0) rows = rollup(lanes, (r) => HUB_BY_ID[r.node.hub].region, (k) => ({ id: k, name: `${k} region` }), monthIdx)
  else if (path.length === 1) rows = rollup(lanes.filter((r) => HUB_BY_ID[r.node.hub].region === path[0]), (r) => r.node.hub, (k) => HUB_BY_ID[k], monthIdx)
  else rows = lanes.filter((r) => r.node.hub === path[1])

  const canDrill = by === 'geo' && path.length < 2
  const maxCost = Math.max(...rows.map((r) => r.cost))
  const crumbs = by === 'geo'
    ? ['Network', ...path.map((p, i) => (i === 0 ? `${p} region` : HUB_BY_ID[p].name))]
    : ['Network', 'By client']
  const netPerKg = HISTORY[monthIdx].total / HISTORY[monthIdx].kg
  const selected = leaf && rows.find((r) => r.node.id === leaf)

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">Cost explorer <InfoTip id="explorer" /></h3>
          <nav className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {crumbs.map((c, i) => (
              <span key={c} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">/</span>}
                {i < crumbs.length - 1 && by === 'geo'
                  ? <button type="button" onClick={() => { setPath(path.slice(0, i)); setLeaf(null) }} className="font-medium text-brand-orange-dark hover:underline">{c}</button>
                  : <span className="font-medium text-slate-700">{c}</span>}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex gap-1.5">
          {[['geo', 'Where (region → hub → lane)'], ['client', 'Who (client)']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setBy(k); setPath([]); setLeaf(null) }} className={by === k ? pillActive : pillInactive}>{l}</button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5">{levelLabel}</th>
              <th className="px-3 py-2.5">Cost</th>
              <th className="px-3 py-2.5 w-[22%]"><span className="flex items-center gap-1">Share of network <InfoTip id="share" /></span></th>
              <th className="px-3 py-2.5"><span className="flex items-center justify-end gap-1">₹ / kg <InfoTip id="perKg" /></span></th>
              <th className="px-3 py-2.5"><span className="flex items-center justify-end gap-1">vs network <InfoTip id="vsNetwork" /></span></th>
              <th className="px-3 py-2.5"><span className="flex items-center justify-end gap-1">MoM <InfoTip id="mom" /></span></th>
              <th className="px-5 py-2.5"><span className="flex items-center justify-end gap-1">12-month <InfoTip id="spark" /></span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = r.node.id
              const hot = r.vsNetwork > 0.12
              return (
                <tr
                  key={id}
                  onClick={() => {
                    if (canDrill) { setPath([...path, by === 'geo' && path.length === 0 ? r.node.id[0].toUpperCase() + r.node.id.slice(1) : id]); setLeaf(null) }
                    else setLeaf(leaf === id ? null : id)
                  }}
                  className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50 ${leaf === id ? 'bg-brand-orange/[0.04]' : ''}`}
                >
                  <td className="px-5 py-2.5">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      {r.node.name}
                      {canDrill && <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90 text-slate-300" />}
                      {hot && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">High</span>}
                    </p>
                    {r.node.km && <p className="text-[11px] text-slate-400">{r.node.km.toLocaleString('en-IN')} km</p>}
                    {r.node.region && !r.node.km && <p className="text-[11px] text-slate-400">{r.node.region}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-slate-900">{fmtInr(r.cost)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-orange" style={{ width: `${(r.cost / maxCost) * 100}%` }} /></div>
                      <span className="w-10 text-right text-xs tabular-nums text-slate-500">{(r.share * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">₹{r.perKg.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right"><Delta value={r.vsNetwork} /></td>
                  <td className="px-3 py-2.5 text-right"><Delta value={r.mom} /></td>
                  <td className="px-5 py-2.5"><div className="flex justify-end"><Sparkline values={r.spark} color={hot ? '#DC2626' : '#1A2B4A'} /></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-slate-700">{selected.node.name} — where its {fmtInr(selected.cost)} goes <span className="font-normal text-slate-400">(₹{selected.perKg.toFixed(2)}/kg vs ₹{netPerKg.toFixed(2)} network)</span></p>
          <CompositionBar parts={HEADS.map((h) => ({ key: h.key, label: h.short, color: h.color, value: selected.heads[h.key] }))} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {HEADS.map((h) => (
              <span key={h.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />{h.short} <b className="tabular-nums text-slate-800">{((selected.heads[h.key] / selected.cost) * 100).toFixed(0)}%</b>
              </span>
            ))}
          </div>
        </div>
      )}
      {!canDrill && !selected && <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Click a row to see its cost-head breakdown.</p>}
      {canDrill && <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Click a row to drill down. Every level adds up to the one above it.</p>}
    </div>
  )
}

export default function CostOverview() {
  const [monthIdx, setMonthIdx] = useState(N_ACTUAL - 1)
  const [headKey, setHeadKey] = useState('all')

  const cur = HISTORY[monthIdx]
  const prev = HISTORY[Math.max(0, monthIdx - 1)]
  const bud = BUDGET[monthIdx]
  const next = FORECAST[0]
  const insights = useMemo(() => buildInsights(monthIdx), [monthIdx])

  const val = (row) => (headKey === 'all' ? row.total : row.heads[headKey])
  const points = [
    ...HISTORY.map((r, i) => ({ label: r.label, actual: val(r), budget: val(BUDGET[i]) })),
    ...FORECAST.map((r, k) => ({
      label: r.label, forecast: val(r), budget: val(BUDGET_FORECAST[k]),
      ...(headKey === 'all' ? { lo: r.lo, hi: r.hi } : {}),
    })),
  ]

  const margin = cur.revenue - cur.total
  const prevMargin = prev.revenue - prev.total
  const ytdCost = HISTORY.slice(0, monthIdx + 1).reduce((s, r) => s + r.total, 0)
  const ytdBud = BUDGET.slice(0, monthIdx + 1).reduce((s, r) => s + r.total, 0)
  const sixMo = FORECAST.reduce((s, r) => s + r.total, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Cost Overview</h1>
          <p className="mt-1 text-slate-500">What it costs to run the network, where it is incurred, and where it is heading.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Sample data</span>
          <select value={monthIdx} onChange={(e) => setMonthIdx(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40">
            {HISTORY.map((r, i) => <option key={r.label} value={i}>{r.long}</option>).reverse()}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi info="totalCost" label={`Total cost · ${cur.label}`} value={fmtInr(cur.total)} delta={cur.total / prev.total - 1} sub="vs last month" />
        <Kpi info="perDocket" label="Cost per docket" value={`₹${(cur.total / cur.dockets).toFixed(0)}`} delta={cur.total / cur.dockets / (prev.total / prev.dockets) - 1} sub={`₹${(cur.total / cur.kg).toFixed(2)} per kg`} />
        <Kpi info="vsBudget" label="vs budget · month" value={fmtInr(cur.total - bud.total)} delta={cur.total / bud.total - 1} sub={`plan ${fmtInr(bud.total)}`} />
        <Kpi info="margin" label="Gross margin" value={`${((margin / cur.revenue) * 100).toFixed(1)}%`} delta={margin / cur.revenue - prevMargin / prev.revenue} goodWhenDown={false} sub={`${fmtInr(margin)} on ${fmtInr(cur.revenue)}`} />
        <Kpi accent info="forecast" label={`Forecast · ${next.label}`} value={fmtInr(next.total)} sub={`range ${fmtInr(next.lo, 1)} – ${fmtInr(next.hi, 1)}`} delta={next.total / HISTORY[N_ACTUAL - 1].total - 1} />
      </div>

      <div className={`${card} p-5`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">Cost trend & 6-month forecast <InfoTip id="trend" /></h3>
            <p className="text-xs text-slate-500">YTD {fmtInr(ytdCost)} vs budget {fmtInr(ytdBud)} (<Delta value={ytdCost / ytdBud - 1} />) · next 6 months projected at {fmtInr(sixMo)}</p>
          </div>
          <select value={headKey} onChange={(e) => setHeadKey(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40">
            <option value="all">All cost heads</option>
            {HEADS.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
          </select>
        </div>
        <TrendChart points={points} />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-brand-navy" />Actual</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-brand-orange" />Forecast</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-brand-orange/15" />80% confidence</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dotted border-slate-400" />Budget</span>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className={`${card} p-5`}>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">What needs attention <InfoTip id="insights" /></h3>
          <div className="space-y-2">
            {insights.map((it) => (
              <div key={it.title} className={`flex gap-2.5 rounded-xl border p-3 ${TONE[it.tone].ring}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[it.tone].dot}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{it.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{it.body}</p>
                </div>
              </div>
            ))}
            {insights.length === 0 && <p className="text-sm text-slate-400">Nothing unusual this month.</p>}
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">Where the money goes · {cur.label} <InfoTip id="heads" /></h3>
          <CompositionBar parts={HEADS.map((h) => ({ key: h.key, label: h.short, color: h.color, value: cur.heads[h.key] }))} />
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <th className="py-1.5">Head</th><th className="py-1.5 text-right">Cost</th><th className="py-1.5 text-right">₹/docket</th><th className="py-1.5"><span className="flex items-center justify-end gap-1">vs budget <InfoTip id="headBudget" /></span></th>
              </tr>
            </thead>
            <tbody>
              {HEADS.map((h) => (
                <tr key={h.key} className="border-t border-slate-100">
                  <td className="py-1.5"><span className="flex items-center gap-2 text-slate-700"><span className="h-2 w-2 rounded-full" style={{ background: h.color }} />{h.short}{h.type === 'fixed' && <span className="text-[10px] text-slate-400">fixed</span>}</span></td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-slate-800">{fmtInr(cur.heads[h.key])}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-500">₹{(cur.heads[h.key] / cur.dockets).toFixed(1)}</td>
                  <td className="py-1.5 text-right"><Delta value={cur.heads[h.key] / bud.heads[h.key] - 1} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CostExplorer monthIdx={monthIdx} />
    </div>
  )
}

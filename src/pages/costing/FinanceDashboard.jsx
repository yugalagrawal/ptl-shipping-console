import { useMemo, useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'
import { MONTHS, REGIONS, HUBS, LANES, CLIENTS, MODES, RECORDS, agg, pct, fmtMoney } from '../../data/financeDashboard.js'

// Finance Dashboard — the whole cost ladder in one place: Gross → Net revenue → Level 1 → Level 2 → Level 3 margin.
// Sample data (src/data/financeDashboard.js), not wired yet. Every number follows the rules on the Level 1/2/3 pages.

const C = { l1: '#fb923c', l2: '#38bdf8', l3: '#94a3b8', rev: '#0f172a', ded: '#f87171', ok: '#10b981', bad: '#ef4444' }
const f1 = (n) => (Math.round(n * 10) / 10).toLocaleString('en-IN')
const inr2 = (n) => '₹' + n.toFixed(2)
const pc = (x, d = 1) => `${(x * 100).toFixed(d)}%`
const dpc = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`
const sel = 'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400'

function Delta({ cur, prev, goodWhenUp = true }) {
  if (prev == null || !prev) return null
  const d = (cur - prev) / Math.abs(prev)
  const good = goodWhenUp ? d > 0 : d < 0
  return <span className={`tabular-nums ${Math.abs(d) < 0.0005 ? 'text-slate-400' : good ? 'text-emerald-600' : 'text-red-600'}`}>{dpc(d)}</span>
}
function DeltaPts({ cur, prev, goodWhenUp = true }) {
  if (prev == null) return null
  const d = (cur - prev) * 100
  const good = goodWhenUp ? d > 0 : d < 0
  return <span className={`tabular-nums ${Math.abs(d) < 0.05 ? 'text-slate-400' : good ? 'text-emerald-600' : 'text-red-600'}`}>{d > 0 ? '+' : d < 0 ? '−' : ''}{Math.abs(d).toFixed(1)} pts</span>
}
function Kpi({ label, value, sub, delta, dark, dot }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${dark ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200/70 bg-white'}`}>
      <p className={`flex items-center gap-1.5 text-[11px] ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] ${dark ? 'text-slate-300' : 'text-slate-400'}`}>{delta}<span>{sub}</span></p>
    </div>
  )
}
const Panel = ({ title, sub, right, children }) => (
  <div className={`p-4 ${card}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-sm font-semibold text-slate-900">{title}</p>{sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}</div>
      {right}
    </div>
    <div className="mt-3">{children}</div>
  </div>
)

// ── Waterfall: from gross revenue to Level 3 margin ──────────────────────────────────────────
function Waterfall({ a }) {
  const steps = [
    ['Gross revenue', a.gross, 'total', C.rev], ['Client deductions', -a.ded, 'delta', C.ded], ['Net revenue', a.net, 'total', C.rev],
    ['First mile', -a.prs, 'delta', C.l1], ['Mid mile', -a.man, 'delta', C.l1], ['Last mile', -a.drs, 'delta', C.l1], ['Level 1 margin', a.m1, 'total', a.m1 >= 0 ? C.ok : C.bad],
    ['Sortation', -a.sort, 'delta', C.l2], ['Storage', -a.stor, 'delta', C.l2], ['Level 2 margin', a.m2, 'total', a.m2 >= 0 ? C.ok : C.bad],
    ['Level 3 cost', -a.l3, 'delta', C.l3], ['Level 3 margin', a.m3, 'total', a.m3 >= 0 ? C.ok : C.bad],
  ]
  const W = 820, H = 250, pl = 8, pr = 8, pt = 24, pb = 44
  const max = a.gross * 1.04 || 1
  const bw = (W - pl - pr) / steps.length
  const y = (v) => pt + (1 - v / max) * (H - pt - pb)
  let run = 0
  const bars = steps.map(([label, v, kind, color], i) => {
    let top, bot
    if (kind === 'total') { run = v; top = Math.max(v, 0); bot = Math.min(v, 0) } else { top = run; bot = run + v; run = bot }
    return { label, v, kind, color, i, top, bot }
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Waterfall from gross revenue to Level 3 margin">
      <line x1={pl} x2={W - pr} y1={y(0)} y2={y(0)} stroke="#e2e8f0" />
      {bars.map((b, i) => {
        const x = pl + i * bw + bw * 0.14, w = bw * 0.72
        const y1 = y(b.top), y2 = y(b.bot)
        const next = bars[i + 1]
        return (
          <g key={b.label}>
            <rect x={x} y={y1} width={w} height={Math.max(2, y2 - y1)} rx="3" fill={b.color} opacity={b.kind === 'delta' ? 0.9 : 1} />
            {next && <line x1={x + w} x2={pl + (i + 1) * bw + bw * 0.14} y1={y(b.kind === 'total' ? b.v : b.bot)} y2={y(b.kind === 'total' ? b.v : b.bot)} stroke="#cbd5e1" strokeDasharray="3 3" />}
            <text x={x + w / 2} y={y1 - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">{b.kind === 'delta' ? '−' : ''}{fmtMoney(Math.abs(b.v)).replace('₹', '')}</text>
            <text x={x + w / 2} y={H - pb + 14} textAnchor="middle" fontSize="9.5" fill="#64748b">{b.label.split(' ').slice(0, 1).join(' ')}</text>
            <text x={x + w / 2} y={H - pb + 26} textAnchor="middle" fontSize="9.5" fill="#64748b">{b.label.split(' ').slice(1).join(' ')}</text>
          </g>
        )
      })}
      <text x={W - pr} y={12} textAnchor="end" fontSize="9.5" fill="#94a3b8">values in ₹ Cr / L</text>
    </svg>
  )
}

// ── Monthly trend: stacked cost by level + Level 3 margin % line ─────────────────────────────
function Trend({ months }) {
  const [hov, setHov] = useState(null)
  const W = 820, H = 250, pl = 46, pr = 40, pt = 14, pb = 28
  const max = Math.max(...months.map((m) => m.a.cost)) * 1.12 || 1
  const mmax = Math.max(0.2, ...months.map((m) => Math.abs(pct(m.a.m3, m.a.net)))) * 1.2
  const bw = (W - pl - pr) / months.length
  const y = (v) => pt + (1 - v / max) * (H - pt - pb)
  const ym = (v) => pt + (1 - (v + mmax * 0.15) / (mmax * 1.15)) * (H - pt - pb)
  const pts = months.map((m, i) => [pl + i * bw + bw / 2, ym(pct(m.a.m3, m.a.net))])
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly cost by level and Level 3 margin">
        {ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={y(max * t)} y2={y(max * t)} stroke="#f1f5f9" /><text x={pl - 6} y={y(max * t) + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">{fmtMoney(max * t).replace('₹', '')}</text></g>)}
        {months.map((m, i) => {
          const x = pl + i * bw + bw * 0.2, w = bw * 0.6
          let acc = 0
          return (
            <g key={m.label} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} opacity={hov == null || hov === i ? 1 : 0.55}>
              {[['l1', C.l1], ['l2', C.l2], ['l3', C.l3]].map(([k, col]) => { const h = y(acc) - y(acc + m.a[k]); const yy = y(acc + m.a[k]); acc += m.a[k]; return <rect key={k} x={x} y={yy} width={w} height={Math.max(0, h)} fill={col} rx={k === 'l3' ? 3 : 0} /> })}
              <rect x={pl + i * bw} y={pt} width={bw} height={H - pt - pb} fill="transparent" />
              <text x={pl + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b">{m.label}</text>
            </g>
          )
        })}
        <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')} fill="none" stroke={C.rev} strokeWidth="2" />
        {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={C.rev} strokeWidth="2" /><text x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">{pc(pct(months[i].a.m3, months[i].a.net))}</text></g>)}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex flex-wrap gap-3">
          {[['Level 1 cost', C.l1], ['Level 2 cost', C.l2], ['Level 3 cost', C.l3]].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: c }} />{l}</span>)}
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-slate-900" />Level 3 margin % (line)</span>
        </div>
        <span className="tabular-nums text-slate-600">{hov != null ? `${months[hov].label}: cost ${fmtMoney(months[hov].a.cost)} · net revenue ${fmtMoney(months[hov].a.net)} · ${inr2(months[hov].a.cost / months[hov].a.kg)}/kg` : 'Hover a month for details'}</span>
      </div>
    </div>
  )
}

// ── Lane economics scatter: net revenue per kg vs cost per kg ───────────────────────────────
function Scatter({ rows, onPick, picked, xLabel = 'Total cost per kg (₹)', yLabel = 'Net revenue per kg (₹)', good = 'earning', bad = 'losing money', aria = 'Revenue per kg against cost per kg' }) {
  const W = 520, H = 330, pl = 42, pr = 14, pt = 14, pb = 34
  const lo = Math.min(...rows.flatMap((r) => [r.rev, r.cost])) * 0.9, hi = Math.max(...rows.flatMap((r) => [r.rev, r.cost])) * 1.06
  const x = (v) => pl + ((v - lo) / (hi - lo)) * (W - pl - pr)
  const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb)
  const maxKg = Math.max(...rows.map((r) => r.kg), 1)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={aria}>
      {ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="#f1f5f9" /><text x={pl - 6} y={y(t) + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">{t.toFixed(2)}</text><text x={x(t)} y={H - 18} textAnchor="middle" fontSize="9.5" fill="#94a3b8">{t.toFixed(2)}</text></g>)}
      <polygon points={`${x(lo)},${y(lo)} ${x(hi)},${y(hi)} ${x(hi)},${y(lo)}`} fill="#fef2f2" opacity="0.7" />
      <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke="#94a3b8" strokeDasharray="4 4" />
      <text x={x(hi) - 6} y={y(lo) - 8} textAnchor="end" fontSize="10" fill="#ef4444">{bad}</text>
      <text x={x(lo) + 6} y={y(hi) + 12} fontSize="10" fill="#10b981">{good}</text>
      <text x={(pl + W - pr) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#64748b">{xLabel}</text>
      <text transform={`translate(10 ${(pt + H - pb) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#64748b">{yLabel}</text>
      {rows.map((r) => {
        const ok = r.rev >= r.cost
        return (
          <g key={r.key} onClick={() => onPick && onPick(r.key)} className={onPick ? 'cursor-pointer' : ''}>
            <circle cx={x(r.cost)} cy={y(r.rev)} r={5 + 10 * Math.sqrt(r.kg / maxKg)} fill={ok ? C.ok : C.bad} opacity={picked == null || picked === r.key ? 0.6 : 0.2} stroke={picked === r.key ? '#0f172a' : '#fff'} strokeWidth={picked === r.key ? 2 : 1} />
            <text x={x(r.cost)} y={y(r.rev) - 9 - 10 * Math.sqrt(r.kg / maxKg)} textAnchor="middle" fontSize="9" fill="#475569">{r.key}</text>
          </g>
        )
      })}
    </svg>
  )
}

const heat = (m) => (m < 0 ? 'bg-red-100 text-red-700' : m < 0.05 ? 'bg-amber-50 text-amber-700' : m < 0.1 ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-100 text-emerald-800')

export default function FinanceDashboard() {
  const [period, setPeriod] = useState('m5') // m0..m5 | q (last 3M) | all
  const [region, setRegion] = useState('All')
  const [client, setClient] = useState('All')
  const [mode, setMode] = useState('All')
  const [dim, setDim] = useState('lane')
  const [sortKey, setSortKey] = useState('net')
  const [picked, setPicked] = useState(null)

  const span = period === 'all' ? [0, 5] : period === 'q' ? [3, 5] : [+period.slice(1), +period.slice(1)]
  const len = span[1] - span[0] + 1
  const prevSpan = span[0] - len >= 0 ? [span[0] - len, span[0] - 1] : null
  const base = useMemo(() => RECORDS.filter((r) => (region === 'All' || r.region === region) && (client === 'All' || r.client === client) && (mode === 'All' || r.mode === mode)), [region, client, mode])
  const inSpan = (s) => base.filter((r) => r.mi >= s[0] && r.mi <= s[1])
  const rows = useMemo(() => inSpan(span), [base, period])
  const a = useMemo(() => agg(rows), [rows])
  const p = useMemo(() => (prevSpan ? agg(inSpan(prevSpan)) : null), [base, period])
  const months = useMemo(() => MONTHS.map((label, mi) => ({ label, a: agg(base.filter((r) => r.mi === mi)) })), [base])
  const prevLabel = prevSpan ? (prevSpan[0] === prevSpan[1] ? MONTHS[prevSpan[0]] : `${MONTHS[prevSpan[0]]} – ${MONTHS[prevSpan[1]]}`) : null

  const groupKey = { lane: (r) => r.lane, client: (r) => r.client, region: (r) => r.region, mode: (r) => r.mode }[dim]
  const groups = useMemo(() => {
    const m = {}
    rows.forEach((r) => { (m[groupKey(r)] ||= []).push(r) })
    return Object.entries(m).map(([key, rs]) => { const g = agg(rs); return { key, g, rev: g.net / g.kg, cost: g.cost / g.kg, kg: g.kg, ded: pct(g.ded, g.gross), m1: pct(g.m1, g.net), m2: pct(g.m2, g.net), m3: pct(g.m3, g.net) } })
  }, [rows, dim])
  const sorted = [...groups].sort((x, y) => (sortKey === 'net' ? y.g.net - x.g.net : sortKey === 'm3' ? y.m3 - x.m3 : sortKey === 'ded' ? y.ded - x.ded : y.cost - x.cost))
  const lanes = useMemo(() => {
    const m = {}
    rows.forEach((r) => { (m[r.lane] ||= []).push(r) })
    return Object.entries(m).map(([key, rs]) => { const g = agg(rs); return { key, g, rev: g.net / g.kg, cost: g.cost / g.kg, kg: g.kg } })
  }, [rows])

  // Warehouse: each hub carries its half of every docket's Level 2 cost on the lanes it sits on.
  const hubs = useMemo(() => HUBS.map((h) => {
    const rs = rows.filter((r) => r.from === h.id || r.to === h.id)
    const sort = rs.reduce((t, r) => t + r.sort / 2, 0), stor = rs.reduce((t, r) => t + r.stor / 2, 0)
    const kg = rs.reduce((t, r) => t + r.kg, 0), kgh = rs.reduce((t, r) => t + r.kgh / 2, 0)
    return { ...h, key: h.name, rev: kg ? (rs.reduce((t, r) => t + (r.net - r.prs - r.man - r.drs) / 2, 0)) / kg : 0, sort, stor, kg, kgh, cost: sort + stor, perKg: kg ? (sort + stor) / kg : 0, hrs: kg ? kgh / kg : 0, storPrice: kgh ? stor / kgh : 0 }
  }).filter((h) => h.kg > 0), [rows])
  const maxHub = Math.max(...hubs.map((h) => h.cost), 1)

  // Insights
  const insights = useMemo(() => {
    const out = []
    const neg = lanes.filter((l) => l.g.m3 < 0).sort((x, y) => x.g.m3 - y.g.m3)
    if (neg.length) out.push({ tone: 'bad', t: `${neg.length} lane${neg.length > 1 ? 's lose' : ' loses'} money after Level 3: ${neg.slice(0, 3).map((l) => l.key).join(', ')}`, d: `Together ${fmtMoney(neg.reduce((t, l) => t + l.g.m3, 0))} for the period. Cost is ${inr2(neg[0].cost)}/kg against ${inr2(neg[0].rev)}/kg earned on ${neg[0].key}.`, act: 'Reprice the lane, raise load factor or stop low-rate clients on it.' })
    const clientAgg = (() => { const m = {}; rows.forEach((r) => { (m[r.client] ||= []).push(r) }); return Object.entries(m).map(([k, rs]) => ({ k, g: agg(rs) })) })()
    const leak = [...clientAgg].sort((x, y) => y.g.ded - x.g.ded)[0]
    if (leak && leak.g.ded > 0) out.push({ tone: 'warn', t: `${leak.k} deducts the most: ${fmtMoney(leak.g.ded)} (${pc(pct(leak.g.ded, leak.g.gross))} of billing)`, d: `All clients together deducted ${fmtMoney(a.ded)}, ${pc(pct(a.ded, a.gross))} of gross revenue. This comes off before any cost.`, act: 'Review short-payments, penalties and POD disputes with this client.' })
    const kol = hubs.filter((h) => h.hrs > 0).sort((x, y) => y.hrs - x.hrs)[0]
    if (kol) out.push({ tone: kol.hrs > 10 ? 'warn' : 'info', t: `${kol.name} holds dockets longest: ${f1(kol.hrs)} billable hours per kg beyond its ${kol.sortHours} sortation hours`, d: `Storage there costs ${inr2(kol.storPrice)} per kg-hour and ${fmtMoney(kol.stor)} in total. Faster outbound clears this directly.`, act: 'Add outbound manifests or cut dwell before adding hub capacity.' })
    if (p) {
      const comps = [['First mile', a.prs / a.kg, p.prs / p.kg], ['Mid mile', a.man / a.kg, p.man / p.kg], ['Last mile', a.drs / a.kg, p.drs / p.kg], ['Sortation', a.sort / a.kg, p.sort / p.kg], ['Storage', a.stor / a.kg, p.stor / p.kg], ['Level 3', a.l3 / a.kg, p.l3 / p.kg]]
      const worst = comps.map(([n, c, q]) => ({ n, c, q, d: c - q })).sort((x, y) => y.d - x.d)[0]
      out.push({ tone: worst.d > 0 ? 'warn' : 'good', t: `Cost per kg is ${inr2(a.cost / a.kg)}, ${a.cost / a.kg >= p.cost / p.kg ? 'up' : 'down'} ${inr2(Math.abs(a.cost / a.kg - p.cost / p.kg))} on ${prevLabel}`, d: `Biggest mover: ${worst.n} at ${inr2(worst.c)}/kg (${worst.d >= 0 ? '+' : '−'}${inr2(Math.abs(worst.d))}). Mid mile is ${pc(a.man / a.cost, 0)} of total cost.`, act: 'Check diesel and manifest load factor first, they drive mid mile.' })
    }
    const best = [...clientAgg].sort((x, y) => pct(y.g.m3, y.g.net) - pct(x.g.m3, x.g.net))[0]
    if (best) out.push({ tone: 'good', t: `${best.k} is the most profitable client at ${pc(pct(best.g.m3, best.g.net))} Level 3 margin`, d: `On ${fmtMoney(best.g.net)} net revenue. Protect this volume and use its rate card as the benchmark.`, act: 'Prioritise capacity and service for this client.' })
    return out
  }, [rows, lanes, hubs, a, p])

  const resetAll = () => { setRegion('All'); setClient('All'); setMode('All'); setPicked(null) }
  const filtered = region !== 'All' || client !== 'All' || mode !== 'All'
  const tone = { bad: 'bg-red-50 border-red-100', warn: 'bg-amber-50 border-amber-100', info: 'bg-sky-50 border-sky-100', good: 'bg-emerald-50 border-emerald-100' }
  const dot = { bad: 'bg-red-500', warn: 'bg-amber-500', info: 'bg-sky-500', good: 'bg-emerald-500' }
  const th = 'py-1.5 pr-3 text-right font-medium'
  const td = 'py-2 pr-3 text-right tabular-nums text-slate-600'
  const components = [['First mile (PRS)', a.prs, p?.prs, C.l1], ['Mid mile (Manifest)', a.man, p?.man, C.l1], ['Last mile (DRS)', a.drs, p?.drs, C.l1], ['Sortation', a.sort, p?.sort, C.l2], ['Storage', a.stor, p?.stor, C.l2], ['Level 3 (non-warehouse)', a.l3, p?.l3, C.l3]]

  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finance Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500">Gross revenue to Level 3 margin, across the network. Sample numbers. Every filter changes every chart on the page.</p>
      </div>

      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 p-3 ${card}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium text-slate-400">Period</span>
          {MONTHS.map((m, i) => <button key={m} onClick={() => setPeriod('m' + i)} className={period === 'm' + i ? pillActive : pillInactive}>{m}</button>)}
          <button onClick={() => setPeriod('q')} className={period === 'q' ? pillActive : pillInactive}>Last 3 months</button>
          <button onClick={() => setPeriod('all')} className={period === 'all' ? pillActive : pillInactive}>All 6 months</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={sel} aria-label="Region"><option value="All">All regions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
          <select value={client} onChange={(e) => setClient(e.target.value)} className={sel} aria-label="Client"><option value="All">All clients</option>{CLIENTS.map((c) => <option key={c.id}>{c.id}</option>)}</select>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={sel} aria-label="Mode"><option value="All">All modes</option>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
          {filtered && <button onClick={resetAll} className="text-xs font-medium text-slate-500 hover:text-slate-900">Reset filters</button>}
        </div>
      </div>

      {rows.length === 0 ? <div className={`p-10 text-center text-sm text-slate-400 ${card}`}>No dockets match these filters.</div> : (<>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi dark label="Net revenue" value={fmtMoney(a.net)} sub={prevLabel ? `vs ${prevLabel}` : 'no earlier period'} delta={p && <Delta cur={a.net} prev={p.net} />} />
          <Kpi label="Gross revenue" value={fmtMoney(a.gross)} sub={`${fmtMoney(a.ded)} deducted (${pc(pct(a.ded, a.gross))})`} delta={p && <Delta cur={a.gross} prev={p.gross} />} />
          <Kpi label="Total cost (Level 1+2+3)" value={fmtMoney(a.cost)} sub={`${pc(pct(a.cost, a.net), 0)} of net revenue`} delta={p && <Delta cur={a.cost} prev={p.cost} goodWhenUp={false} />} />
          <Kpi label="Dockets · kg" value={a.d.toLocaleString('en-IN')} sub={`${(a.kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })} t · ${f1(a.kg / a.d)} kg avg`} delta={p && <Delta cur={a.d} prev={p.d} />} />
          <Kpi dot={C.l1} label="Level 1 margin" value={pc(pct(a.m1, a.net))} sub={fmtMoney(a.m1)} delta={p && <DeltaPts cur={pct(a.m1, a.net)} prev={pct(p.m1, p.net)} />} />
          <Kpi dot={C.l2} label="Level 2 margin" value={pc(pct(a.m2, a.net))} sub={fmtMoney(a.m2)} delta={p && <DeltaPts cur={pct(a.m2, a.net)} prev={pct(p.m2, p.net)} />} />
          <Kpi dot={a.m3 >= 0 ? C.ok : C.bad} label="Level 3 margin" value={pc(pct(a.m3, a.net))} sub={fmtMoney(a.m3)} delta={p && <DeltaPts cur={pct(a.m3, a.net)} prev={pct(p.m3, p.net)} />} />
          <Kpi label="Cost · revenue per kg" value={`${inr2(a.cost / a.kg)} · ${inr2(a.net / a.kg)}`} sub={`${inr2(a.net / a.kg - a.cost / a.kg)} earned per kg`} delta={p && <Delta cur={a.cost / a.kg} prev={p.cost / p.kg} goodWhenUp={false} />} />
        </div>

        <Panel title="From gross revenue to Level 3 margin" sub="Where every rupee billed goes. Orange is Level 1, blue is Level 2, grey is Level 3."><Waterfall a={a} /></Panel>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Panel title="Cost per kg by component" sub={prevLabel ? `Change is against ${prevLabel}` : 'Pick a single month or last 3 months to compare'}>
              <div className="space-y-2.5">
                {components.map(([n, v, pv, col]) => (
                  <div key={n}>
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-700">{n}</span><span className="tabular-nums text-slate-900"><b>{inr2(v / a.kg)}</b> {pv != null && <span className="ml-1 text-[11px]"><Delta cur={v / a.kg} prev={pv / p.kg} goodWhenUp={false} /></span>}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(v / a.cost) * 100}%`, background: col }} /></div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{pc(v / a.cost, 0)} of total cost · {fmtMoney(v)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><b className="text-slate-800">Total {inr2(a.cost / a.kg)} per kg:</b> Level 1 {inr2(a.l1 / a.kg)} · Level 2 {inr2(a.l2 / a.kg)} · Level 3 {inr2(a.l3 / a.kg)}</p>
            </Panel>
          </div>
          <div className="lg:col-span-3">
            <Panel title="Hub economics" sub="Each bubble is a hub, sized by kg. Across the bottom is what the hub costs per kg (Level 2). Up the side is what the dockets through it have left per kg after Level 1. Below the dashed line the hub costs more than its dockets leave to pay for it.">
              <Scatter rows={hubs.map((h) => ({ key: h.key, rev: h.rev, cost: h.perKg, kg: h.kg }))} xLabel="Warehouse (Level 2) cost per kg (₹)" yLabel="Left per kg after Level 1 (₹)" good="covers its cost" bad="costs more than it covers" aria="Margin per kg after Level 1 against warehouse cost per kg for each hub" />
            </Panel>
          </div>
        </div>

        <Panel title="Six-month trend" sub="Stacked bars are cost by level. The line is Level 3 margin %. Region, client and mode filters apply; the period filter does not.">
          <Trend months={months} />
        </Panel>

        <Panel title="Margin league table" sub="Margin is a share of net revenue. Colour: red below 0, amber below 5%, green above."
              right={<div className="flex flex-wrap gap-1.5">{[['lane', 'Lane'], ['client', 'Client'], ['region', 'Region'], ['mode', 'Mode']].map(([k, l]) => <button key={k} onClick={() => { setDim(k); setPicked(null) }} className={dim === k ? pillActive : pillInactive}>{l}</button>)}</div>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400">
                    <th className="py-1.5 pr-3 font-medium">{dim[0].toUpperCase() + dim.slice(1)}</th>
                    {[['net', 'Net revenue'], ['cost', 'Cost per kg'], ['ded', 'Deductions']].map(([k, l]) => <th key={k} className={`${th} cursor-pointer select-none ${sortKey === k ? 'text-slate-800' : ''}`} onClick={() => setSortKey(k)}>{l}{sortKey === k ? ' ↓' : ''}</th>)}
                    <th className={th}>L1 margin</th><th className={th}>L2 margin</th><th className={`${th} cursor-pointer select-none ${sortKey === 'm3' ? 'text-slate-800' : ''}`} onClick={() => setSortKey('m3')}>L3 margin{sortKey === 'm3' ? ' ↓' : ''}</th>
                  </tr></thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.key} onClick={() => dim === 'lane' && setPicked((x) => (x === r.key ? null : r.key))} className={`border-b border-slate-100 ${picked === r.key ? 'bg-slate-50' : ''} ${dim === 'lane' ? 'cursor-pointer' : ''}`}>
                        <td className="py-2 pr-3 font-medium text-slate-800">{r.key}</td>
                        <td className={td}>{fmtMoney(r.g.net)}</td><td className={td}>{inr2(r.cost)}</td>
                        <td className={`${td} ${r.ded > 0.04 ? 'font-semibold text-red-600' : ''}`}>{pc(r.ded)}</td>
                        <td className="py-1.5 pr-3 text-right"><span className={`inline-block min-w-[3.2rem] rounded-md px-1.5 py-0.5 tabular-nums ${heat(r.m1)}`}>{pc(r.m1)}</span></td>
                        <td className="py-1.5 pr-3 text-right"><span className={`inline-block min-w-[3.2rem] rounded-md px-1.5 py-0.5 tabular-nums ${heat(r.m2)}`}>{pc(r.m2)}</span></td>
                        <td className="py-1.5 pr-3 text-right"><span className={`inline-block min-w-[3.2rem] rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${heat(r.m3)}`}>{pc(r.m3)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

        <Panel title="Warehouse cost by hub" sub="Level 2 split into Sortation (by weight) and Storage (by kg-hours beyond the hub's sortation hours). Each hub carries half of the Level 2 cost on every lane it sits on.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400">
                <th className="py-1.5 pr-3 font-medium">Hub</th><th className={th}>Hub factor</th><th className="py-1.5 pr-3 font-medium" style={{ width: '32%' }}>Warehouse cost</th><th className={th}>Storage share</th><th className={th}>₹ per kg</th><th className={th}>Billable hrs per kg</th><th className={th}>Storage ₹/kg-hr</th>
              </tr></thead>
              <tbody>
                {[...hubs].sort((x, y) => y.cost - x.cost).map((h) => (
                  <tr key={h.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3"><span className="font-medium text-slate-800">{h.name}</span> <span className="text-slate-400">· {h.region}</span></td>
                    <td className={td}>{h.sortHours}/24</td>
                    <td className="py-2 pr-3"><div className="flex items-center gap-2"><div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" style={{ width: `${(h.cost / maxHub) * 100}%`, minWidth: 8 }}><span style={{ width: `${(h.sort / h.cost) * 100}%`, background: C.l1 }} /><span style={{ width: `${(h.stor / h.cost) * 100}%`, background: C.l2 }} /></div><span className="whitespace-nowrap tabular-nums text-slate-600">{fmtMoney(h.cost)}</span></div></td>
                    <td className={td}>{pc(h.stor / h.cost, 0)}</td><td className={td}>{inr2(h.perKg)}</td>
                    <td className={`${td} ${h.hrs > 10 ? 'font-semibold text-red-600' : ''}`}>{f1(h.hrs)} h</td><td className={td}>{inr2(h.storPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: C.l1 }} />Sortation</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: C.l2 }} />Storage</span>
            <span>Hubs with more than 10 billable hours per kg are in red.</span>
          </div>
        </Panel>

        <Panel title="What to do with these insights" sub="Generated from the numbers above, so it changes with every filter.">
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((n) => (
              <div key={n.t} className={`rounded-xl border p-3 ${tone[n.tone]}`}>
                <p className="flex items-start gap-2 text-xs font-semibold text-slate-900"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot[n.tone]}`} />{n.t}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{n.d}</p>
                <p className="mt-1.5 text-[11px] font-medium text-slate-800">Next step: <span className="font-normal text-slate-600">{n.act}</span></p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-900">How these cards appear</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">There are <b className="text-slate-800">5 fixed rules</b>. Each rule is a small piece of logic with a trigger, a way of picking the item to talk about, a sentence template and a fixed next step. Nothing is written by hand. Every time a filter or the period changes, all 5 rules run again on the filtered dockets. The <b className="text-slate-800">numbers, names and sentences change</b>; the rules themselves do not. A rule only shows a card if its trigger is met.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[11px]">
                <thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-1.5 pr-3 font-medium">Rule</th><th className="py-1.5 pr-3 font-medium">Card appears when</th><th className="py-1.5 pr-3 font-medium">It picks</th><th className="py-1.5 font-medium">Colour</th></tr></thead>
                <tbody className="text-slate-600">
                  <tr className="border-b border-slate-100 align-top"><td className="py-2 pr-3 font-medium text-slate-800">1. Lanes losing money</td><td className="py-2 pr-3">At least one lane has Level 3 margin below ₹0</td><td className="py-2 pr-3">All such lanes, worst first. Names the top 3</td><td className="py-2">Red</td></tr>
                  <tr className="border-b border-slate-100 align-top"><td className="py-2 pr-3 font-medium text-slate-800">2. Client deductions</td><td className="py-2 pr-3">Any client has deductions above ₹0</td><td className="py-2 pr-3">The client with the highest deduction in ₹</td><td className="py-2">Amber</td></tr>
                  <tr className="border-b border-slate-100 align-top"><td className="py-2 pr-3 font-medium text-slate-800">3. Hub holding dockets</td><td className="py-2 pr-3">Always, when a hub has dockets</td><td className="py-2 pr-3">The hub with the most billable hours per kg (beyond its sortation hours)</td><td className="py-2">Amber above 10 h, else blue</td></tr>
                  <tr className="border-b border-slate-100 align-top"><td className="py-2 pr-3 font-medium text-slate-800">4. Cost per kg moved</td><td className="py-2 pr-3">There is an earlier period to compare. Not for All 6 months</td><td className="py-2 pr-3">The cost component with the biggest rise in ₹ per kg</td><td className="py-2">Amber if it rose, green if every component fell</td></tr>
                  <tr className="align-top"><td className="py-2 pr-3 font-medium text-slate-800">5. Best client</td><td className="py-2 pr-3">Always</td><td className="py-2 pr-3">The client with the highest Level 3 margin %</td><td className="py-2">Green</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500"><b className="text-slate-600">Example:</b> with all filters open, rule 1 may name two lanes. Pick the region East and it may name only KOL-BLR. Pick a client that earns well on every lane and rule 1 disappears, so only four cards show. The margin, cost and deduction numbers are the same ones in the charts above.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500"><b className="text-slate-600">To add an insight</b> a developer adds one more rule: a trigger, the item to pick, a message template and a next step. The thresholds (below ₹0 margin, above 10 h) are config values and can be changed by finance.</p>
          </div>
        </Panel>
      </>)}
    </div>
  )
}

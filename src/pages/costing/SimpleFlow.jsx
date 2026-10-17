import { useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

const EXAMPLES = [
  { key: 'good', label: 'Healthy docket', route: 'Delhi → Chennai', kg: 500, rev: 14000, fmPct: 8, srcDays: 1, dstDays: 1, hubRate: 0.8, mm: 5200, lmRate: 3,
    extras: [['Extra handling', 300]], note: 'Full weight, fair price, left the hubs quickly. Extra handling was billed during the trip.' },
  { key: 'stuck', label: 'Stuck at hub', route: 'Delhi → Chennai', kg: 500, rev: 9000, fmPct: 8, srcDays: 1, dstDays: 5, hubRate: 0.8, mm: 5200, lmRate: 3,
    extras: [['Consignor delay fee', 600]], note: 'Cheaper freight and 5 days at the destination hub. A delay fee is billed, but the hub bill still eats the margin.' },
  { key: 'light', label: 'Light on a long trip', route: 'Delhi → Chennai', kg: 120, rev: 3600, fmPct: 8, srcDays: 1, dstDays: 2, hubRate: 0.8, mm: 3100, lmRate: 3,
    extras: [], note: 'Only 120 kg but it rode the whole line-haul, so its charged weight × km share is large for its revenue.' },
]

function calc(e) {
  const extra = e.extras.reduce((t, x) => t + x[1], 0)
  const rev = e.rev + extra
  const fm = (rev * e.fmPct) / 100
  const h1 = e.kg * e.srcDays * e.hubRate
  const h2 = e.kg * e.dstDays * e.hubRate
  const lm = e.kg * e.lmRate
  const cost = fm + h1 + e.mm + h2 + lm
  return { fm, h1, h2, lm, cost, extra, rev, profit: rev - cost, pct: ((rev - cost) / rev) * 100 }
}

function Node({ n, title, sub, amount, rule, tone = 'cost' }) {
  const isRev = tone === 'rev'
  return (
    <div className={`relative flex-1 rounded-xl border p-3 ${isRev ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <span className={`absolute -top-2.5 left-3 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-white ${isRev ? 'bg-emerald-600' : 'bg-slate-900'}`}>{n}</span>
      <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-[11px] text-slate-500">{sub}</p>
      <p className={`mt-2 text-lg font-semibold tabular-nums ${isRev ? 'text-emerald-700' : 'text-orange-600'}`}>{isRev ? '+' : '−'}{inr(amount)}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{rule}</p>
    </div>
  )
}

const Arrow = () => (
  <div className="flex shrink-0 items-center justify-center text-slate-300 max-md:rotate-90 max-md:py-0.5">
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M0 7h19M14 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
)

export default function SimpleFlow() {
  const [k, setK] = useState('good')
  const e = EXAMPLES.find((x) => x.key === k)
  const c = calc(e)
  const loss = c.profit < 0
  const parts = [
    ['First mile', c.fm, 'bg-sky-400'], ['Mid mile', c.h1 + e.mm + c.h2, 'bg-orange-500'], ['Last mile', c.lm, 'bg-rose-400'],
  ]
  const scale = Math.max(c.rev, c.cost)

  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm text-slate-700">One docket, four stages. <b>Revenue is known at booking.</b> Each stop then adds its own cost. What is left at the end is the docket’s profit.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => <button key={x.key} onClick={() => setK(x.key)} className={k === x.key ? pillActive : pillInactive}>{x.label}</button>)}
        </div>
        <p className="mt-2 text-xs text-slate-500">{e.route} · {e.kg} kg · {e.note}</p>
      </div>

      <div className={`p-4 ${card}`}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Docket revenue <span className="font-normal text-slate-500">— always known at docket level</span></p>
            <p className="text-lg font-semibold tabular-nums text-emerald-700">+{inr(c.rev)}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-emerald-200">At booking <b className="tabular-nums">{inr(e.rev)}</b></span>
            {e.extras.map(([n, v]) => <span key={n} className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-emerald-200">+ {n} <b className="tabular-nums">{inr(v)}</b> <i className="not-italic text-slate-400">added during trip</i></span>)}
            {e.extras.length === 0 && <span className="text-slate-400">nothing added during the trip</span>}
          </div>
        </div>
        <div className="my-2 flex justify-center text-slate-300"><svg width="14" height="22" viewBox="0 0 14 22" fill="none"><path d="M7 0v19M1 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          <Node n="1" title="First mile" sub="Pickup" amount={c.fm} rule={`${e.fmPct}% of revenue`} />
          <Arrow />
          <Node n="2" title="Mid mile" sub="hub + trip + hub" amount={c.h1 + e.mm + c.h2} rule="see breakdown below" />
          <Arrow />
          <Node n="3" title="Last mile" sub="Delivery" amount={c.lm} rule={`${e.kg} kg × ₹${e.lmRate}/kg`} />
        </div>
        <div className="my-2 flex justify-center text-slate-300"><svg width="14" height="22" viewBox="0 0 14 22" fill="none"><path d="M7 0v19M1 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <div className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/30 p-3">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Inside mid mile <span className="font-normal text-slate-500">= hub + trip + hub</span></p>
            <p className="text-sm font-semibold tabular-nums text-orange-600">−{inr(c.h1 + e.mm + c.h2)}</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <Node n="a" title="Source hub" sub="Waiting before the trip" amount={c.h1} rule={`${e.kg} kg × ${e.srcDays} day × ₹${e.hubRate}`} />
            <Arrow />
            <Node n="b" title="Trip" sub="On the road" amount={e.mm} rule="Trip cost × this docket’s charged weight × km share" />
            <Arrow />
            <Node n="c" title="Dest. hub" sub="Waiting after the trip" amount={c.h2} rule={`${e.kg} kg × ${e.dstDays} day${e.dstDays > 1 ? 's' : ''} × ₹${e.hubRate}`} />
          </div>
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Where the money went</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-slate-500">Revenue</span>
            <div className="h-6 rounded bg-emerald-500" style={{ width: `${(c.rev / scale) * 100}%` }} />
            <span className="text-xs font-medium tabular-nums text-slate-700">{inr(c.rev)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-slate-500">Cost</span>
            <div className="flex h-6 overflow-hidden rounded" style={{ width: `${(c.cost / scale) * 100}%` }}>
              {parts.map(([n, v, bg]) => <div key={n} className={bg} style={{ width: `${(v / c.cost) * 100}%` }} title={`${n} ${inr(v)}`} />)}
            </div>
            <span className="text-xs font-medium tabular-nums text-slate-700">{inr(c.cost)}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[76px]">
          {parts.map(([n, v, bg]) => (
            <span key={n} className="flex items-center gap-1.5 text-[11px] text-slate-500"><i className={`h-2 w-2 rounded-sm ${bg}`} />{n} <b className="tabular-nums text-slate-700">{inr(v)}</b> <span className="tabular-nums">({((v / c.rev) * 100).toFixed(0)}%)</span></span>
          ))}
        </div>
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${loss ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div>
            <p className="text-xs text-slate-600">Docket profit = {inr(c.rev)} − {inr(c.cost)}</p>
            <p className={`text-2xl font-semibold tabular-nums ${loss ? 'text-red-600' : 'text-emerald-700'}`}>{loss ? '−' : ''}{inr(Math.abs(c.profit))}</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Margin <b className={`tabular-nums ${loss ? 'text-red-600' : 'text-emerald-700'}`}>{c.pct.toFixed(1)}%</b></p>
            <p className="tabular-nums">₹{(c.profit / e.kg).toFixed(1)} per kg</p>
          </div>
        </div>
      </div>
    </div>
  )
}

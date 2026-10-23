import { Fragment, useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'

const TABS = [['t1', 'PRS/DRS'], ['t2', 'Manifest'], ['t3', 'Mix']]

// The nine Partner Pricing payment types, split by what the vendor invoice is driven by (PRS/DRS — FM/LM only)
const SECTIONS = [
  {
    key: 'docket', name: 'Docket based', tone: 'border-emerald-200 bg-emerald-50/60',
    line: 'The partner’s price is already at docket level — weight, boxes, or a % of the docket’s freight or invoice.',
    types: [
      ['Per Kg', 'Rate × docket weight'],
      ['Per Docket', 'Flat rate × dockets'],
      ['Per Box', 'Box-type rate × boxes'],
      ['% of Freight', '% × docket freight'],
      ['% of Invoice', '% × docket invoice value'],
    ],
  },
  {
    key: 'trip', name: 'Trip based', tone: 'border-orange-200 bg-orange-50/60',
    line: 'The partner is paid for the run, not the docket.',
    types: [
      ['Per Trip', 'Flat rate × trips'],
      ['Per Km', 'Rate × trip distance'],
    ],
  },
  {
    key: 'time', name: 'Time based', tone: 'border-sky-200 bg-sky-50/60',
    line: 'The partner is paid for the time the vehicle is engaged.',
    types: [
      ['Monthly fixed', 'Fixed amount per month'],
      ['Fixed + Per Kg', 'Fixed covers N kg, then rate per kg on the excess'],
      ['Fixed + Per Docket', 'Fixed covers N dockets, then rate per docket on the excess'],
      ['Fixed + Per Box', 'Fixed covers N boxes, then rate per box on the excess'],
      ['Fixed + Per Trip', 'Fixed covers N trips, then rate per trip on the excess'],
      ['Fixed + Per Km', 'Fixed covers N km, then rate per km on the excess'],
      ['Fixed + % of Freight', 'Fixed covers ₹N freight, then % on the excess'],
      ['Fixed + % of Invoice', 'Fixed covers ₹N invoice value, then % on the excess'],
    ],
  },
]

// Worked example — one pickup run, three dockets. Each docket is priced on its own: nothing is shared.
const BOX_RATE = { S: 12, M: 18, L: 25, XL: 35 }
const DOCKETS = [
  { id: 'DKT-101', kg: 120, mix: [['S', 4], ['M', 2]], freight: 3000, invoice: 40000 },
  { id: 'DKT-102', kg: 300, mix: [['M', 5], ['L', 4], ['XL', 1]], freight: 6600, invoice: 90000 },
  { id: 'DKT-103', kg: 80, mix: [['L', 3], ['XL', 1]], freight: 3200, invoice: 25000 },
]
const inr = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
const DOCKET_TYPES = [
  ['Per Kg', '₹2.5 / kg', 'kg × 2.5', (d) => d.kg * 2.5],
  ['Per Docket', '₹150 / docket', 'flat ₹150', () => 150],
  ['Per Box', '₹12 S · ₹18 M · ₹25 L · ₹35 XL', 'Σ boxes × box-type rate', (d) => d.mix.reduce((t, [b, n]) => t + n * BOX_RATE[b], 0)],
  ['% of Freight', '8% of freight', 'freight × 8%', (d) => d.freight * 0.08],
  ['% of Invoice', '0.5% of invoice', 'invoice × 0.5%', (d) => d.invoice * 0.005],
]

function DocketBased() {
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Docket based — the cost is already on the docket</p>
      <p className="mt-1 text-xs text-slate-500">The partner’s rate is applied to the docket’s own weight, boxes, freight or invoice. Nothing is shared across the run, so the cost is known the moment the docket is picked up. Failed pickup cost = ₹0.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className="py-1.5 pr-3 font-medium">Pricing type</th>
              <th className="py-1.5 pr-3 font-medium">Rate</th>
              <th className="py-1.5 pr-3 font-medium">Docket cost</th>
              {DOCKETS.map((d) => <th key={d.id} className="py-1.5 pr-3 text-right font-medium">{d.id}<span className="block font-normal">{d.kg} kg</span></th>)}
            </tr>
          </thead>
          <tbody>
            {DOCKET_TYPES.map(([t, rate, rule, fn]) => (
              <tr key={t} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-800">{t}</td>
                <td className="py-2 pr-3 text-slate-600">{rate}</td>
                <td className="py-2 pr-3 text-slate-600">{rule}</td>
                {DOCKETS.map((d) => <td key={d.id} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{inr(fn(d))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Trip based — the run has one total cost (rate + additional charges); each docket carries its % of actual weight.
const RUN = { km: 36, extra: [['Toll', 150]] }
const TRIP_TYPES = [
  ['Per Trip', '₹1,200 / trip', '1 trip × ₹1,200', 1200],
  ['Per Km', '₹22 / km', `${RUN.km} km × ₹22`, RUN.km * 22],
]
const RUN_KG = DOCKETS.reduce((t, d) => t + d.kg, 0)
const EXTRA_TOTAL = RUN.extra.reduce((t, [, v]) => t + v, 0)

function TripBased() {
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Trip based — one run cost, shared by actual weight</p>
      <p className="mt-1 text-xs text-slate-500">The run’s total cost is known: the partner’s trip or km charge plus any additional charges (toll, parking…). Each docket carries its % of the run’s actual weight, of the whole run cost. Failed pickup cost = ₹0.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {DOCKETS.map((d) => <span key={d.id} className="text-slate-600"><b className="text-slate-800">{d.id}</b> {d.kg} kg · {Math.round((d.kg / RUN_KG) * 1000) / 10}%</span>)}
        <span className="text-slate-400">Run {RUN_KG} kg</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className="py-1.5 pr-3 font-medium">Pricing type</th>
              <th className="py-1.5 pr-3 font-medium">Rate</th>
              <th className="py-1.5 pr-3 font-medium">Charge</th>
              {RUN.extra.map(([n]) => <th key={n} className="py-1.5 pr-3 text-right font-medium">{n}</th>)}
              <th className="py-1.5 pr-3 text-right font-medium">Run cost</th>
              {DOCKETS.map((d) => <th key={d.id} className="py-1.5 pr-3 text-right font-medium">{d.id}</th>)}
            </tr>
          </thead>
          <tbody>
            {TRIP_TYPES.map(([t, rate, rule, base]) => {
              const total = base + EXTRA_TOTAL
              return (
                <tr key={t} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{t}</td>
                  <td className="py-2 pr-3 text-slate-600">{rate}</td>
                  <td className="py-2 pr-3 text-slate-600">{rule} = {inr(base)}</td>
                  {RUN.extra.map(([n, v]) => <td key={n} className="py-2 pr-3 text-right tabular-nums text-slate-600">{inr(v)}</td>)}
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{inr(total)}</td>
                  {DOCKETS.map((d) => <td key={d.id} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{inr((total * d.kg) / RUN_KG)}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Docket cost = run cost × docket actual weight ÷ run actual weight.</p>
    </div>
  )
}

// Time based · Monthly fixed — cumulative (month-to-date) method.
// Daily cost = monthly ÷ operational days. Every day adds its cost to the month's pool; the pool is shared by ALL dockets of the month so far
// by % weight, so idle days are absorbed and docket costs keep revising until month end. Restarts every month.
const FIXED = { monthly: 52000, opDays: 26 }
const DAILY = FIXED.monthly / FIXED.opDays
const DAYS = [1, 2, 3, 4, 5]
const MTD_DOCKETS = [
  { id: 'DKT-101', day: 2, kg: 120 },
  { id: 'DKT-102', day: 2, kg: 300 },
  { id: 'DKT-103', day: 2, kg: 80 },
  { id: 'DKT-201', day: 3, kg: 300 },
  { id: 'DKT-202', day: 5, kg: 200 },
]
const mtd = DAYS.map((day) => {
  const kgToDate = MTD_DOCKETS.filter((d) => d.day <= day).reduce((t, d) => t + d.kg, 0)
  const cost = DAILY * day
  return { day, kgDay: MTD_DOCKETS.filter((d) => d.day === day).reduce((t, d) => t + d.kg, 0), cost, kgToDate, rate: kgToDate ? cost / kgToDate : 0 }
})
const r2 = (n) => Math.round(n * 100) / 100

function MonthlyFixed() {
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Time based · Monthly fixed — cumulative through the month</p>
      <p className="mt-1 text-xs text-slate-500">Daily cost = monthly fixed ÷ partner’s operational days. A day with no dockets carries ₹0 itself, but its cost is not lost: every day, the cost of all days so far is shared by the % weight of all dockets so far. So docket costs keep revising while the month runs, and the whole fixed amount is distributed by month end. It restarts every new month. Failed pickup cost = ₹0.</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <span><b className="text-slate-800">{inr(FIXED.monthly)}</b> monthly fixed</span>
        <span className="text-slate-400">÷</span>
        <span><b className="text-slate-800">{FIXED.opDays}</b> operational days</span>
        <span className="text-slate-400">=</span>
        <span><b className="text-slate-900">{inr(r2(DAILY))}</b> per day</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className="py-1.5 pr-3 font-medium">&nbsp;</th>
              {DAYS.map((d) => <th key={d} className="py-1.5 pr-3 text-right font-medium">Day {d}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 text-slate-600">
              <td className="py-1.5 pr-3">Dockets weight that day</td>
              {mtd.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{m.kgDay ? `${m.kgDay} kg` : '0 docket'}</td>)}
            </tr>
            <tr className="border-b border-slate-100 text-slate-600">
              <td className="py-1.5 pr-3">Cost so far ({inr(r2(DAILY))} × days)</td>
              {mtd.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{inr(r2(m.cost))}</td>)}
            </tr>
            <tr className="border-b border-slate-100 text-slate-600">
              <td className="py-1.5 pr-3">Weight so far</td>
              {mtd.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{m.kgToDate} kg</td>)}
            </tr>
            <tr className="border-b border-slate-200 font-semibold text-slate-800">
              <td className="py-1.5 pr-3">₹ per kg so far</td>
              {mtd.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{m.kgToDate ? inr(r2(m.rate)) : '—'}</td>)}
            </tr>
            {MTD_DOCKETS.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-800">{d.id} <span className="font-normal text-slate-400">· Day {d.day} · {d.kg} kg</span></td>
                {mtd.map((m) => <td key={m.day} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{m.day < d.day ? <span className="font-normal text-slate-300">—</span> : inr(r2(m.rate * d.kg))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Docket cost (as of a day) = cost so far × docket weight ÷ weight so far. On every day with dockets, the dockets so far add up to the whole cost so far.</p>
      <p className="mt-1 text-[11px] text-slate-400">Fixed + rate after cover works the same way: the cover and the quantity are counted month-to-date, and whatever goes beyond the cover earns the rate and joins the pool.</p>
    </div>
  )
}

// Fixed + Per Kg — same cumulative method; month-to-date quantity beyond month-to-date cover earns the rate and joins the pool.
const FP = { cover: 2600, rate: 10 }
const COVER_DAY = FP.cover / FIXED.opDays
const fp = mtd.map((m) => {
  const cover = COVER_DAY * m.day
  const excess = Math.max(0, m.kgToDate - cover)
  const pool = m.cost + excess * FP.rate
  return { ...m, cover, excess, extra: excess * FP.rate, pool, rate: m.kgToDate ? pool / m.kgToDate : 0 }
})

function FixedPlusKg() {
  const row = 'border-b border-slate-100 text-slate-600'
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Time based · Fixed + Per Kg — example of Fixed + rate after cover</p>
      <p className="mt-1 text-xs text-slate-500">Same cumulative method. The fixed amount covers a set quantity a month; the cover builds up day by day (cover ÷ operational days). Month-to-date weight beyond the month-to-date cover earns the per-kg rate, and that extra joins the pool before it is shared by % weight. Cover not used on a light day carries forward, so it builds up over idle or low days; a heavy day uses it up and only the weight beyond it earns the rate. Excess and docket costs keep adjusting until the month closes. Failed pickup cost = ₹0.</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <span><b className="text-slate-800">{inr(FIXED.monthly)}</b> fixed covers <b className="text-slate-800">{FP.cover.toLocaleString('en-IN')} kg</b> a month</span>
        <span className="text-slate-400">·</span>
        <span><b className="text-slate-800">{inr(r2(DAILY))}</b> and <b className="text-slate-800">{r2(COVER_DAY)} kg</b> cover per day</span>
        <span className="text-slate-400">·</span>
        <span>beyond cover <b className="text-slate-800">₹{FP.rate} / kg</b></span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className="py-1.5 pr-3 font-medium">&nbsp;</th>
              {DAYS.map((d) => <th key={d} className="py-1.5 pr-3 text-right font-medium">Day {d}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className={row}><td className="py-1.5 pr-3">Dockets weight that day</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{m.kgDay ? `${m.kgDay} kg` : '0 docket'}</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Weight so far</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{m.kgToDate} kg</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Cover so far</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{r2(m.cover)} kg</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Beyond cover</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{r2(m.excess)} kg</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Fixed so far</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{inr(r2(m.cost))}</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">+ Rate on beyond cover</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{inr(r2(m.extra))}</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Pool so far</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{inr(r2(m.pool))}</td>)}</tr>
            <tr className="border-b border-slate-200 font-semibold text-slate-800"><td className="py-1.5 pr-3">₹ per kg so far</td>{fp.map((m) => <td key={m.day} className="py-1.5 pr-3 text-right tabular-nums">{m.kgToDate ? inr(r2(m.rate)) : '—'}</td>)}</tr>
            {MTD_DOCKETS.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-800">{d.id} <span className="font-normal text-slate-400">· Day {d.day} · {d.kg} kg</span></td>
                {fp.map((m) => <td key={m.day} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{m.day < d.day ? <span className="font-normal text-slate-300">—</span> : inr(r2(m.rate * d.kg))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Pool so far = fixed so far + rate × (weight so far − cover so far, never below 0). Docket cost (as of a day) = pool so far × docket weight ÷ weight so far. The other six “Fixed + …” types work identically with their own quantity (dockets, boxes, trips, km, ₹ freight, ₹ invoice).</p>
    </div>
  )
}

function Split({ note }) {
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Fifteen ways a partner can be paid. Three kinds of cost basis.</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {SECTIONS.map((s, i) => (
          <div key={s.key} className={`flex flex-col rounded-xl border p-3 ${s.tone}`}>
            <p className="text-sm font-semibold text-slate-900">{i + 1}. {s.name}</p>
            <p className="mt-1 text-xs text-slate-600">{s.line}</p>
            <ul className="mt-3 space-y-1.5">
              {s.types.map(([t, rule]) => (
                <li key={t} className="rounded-lg bg-white/80 px-2.5 py-1.5">
                  <p className="text-xs font-semibold text-slate-800">{t}</p>
                  <p className="text-[11px] text-slate-500">{rule}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function Type1() {
  return (
    <div className="space-y-4">
    <Split note="Docket cost keeps revising through the month and is final at month end." />
    <DocketBased />
    <TripBased />
    <MonthlyFixed />
    <FixedPlusKg />
    </div>
  )
}

// Manifest example — network A → B → C → D. A docket rides one or more manifests, depending on how it is routed.
const MF_DOCKETS = [
  { id: 'DKT-1', from: 'A', to: 'D', kg: 400, via: ['A-D'] },
  { id: 'DKT-2', from: 'A', to: 'D', kg: 200, via: ['A-B', 'B-D'] },
  { id: 'DKT-3', from: 'A', to: 'C', kg: 300, via: ['A-B', 'B-C'] },
  { id: 'DKT-4', from: 'A', to: 'C', kg: 150, via: ['A-B', 'B-C'] },
  { id: 'DKT-6', from: 'B', to: 'C', kg: 80, via: ['B-C'] },
  { id: 'DKT-5', from: 'B', to: 'D', kg: 120, via: ['B-D'] },
  { id: 'DKT-7', from: 'A', to: 'B', kg: 100, via: ['A-B'] },
  { id: 'DKT-8', from: 'C', to: 'D', kg: 90, via: ['C-D'] },
  { id: 'DKT-9', from: 'A', to: 'D', kg: 250, via: ['A-B', 'B-C', 'C-D'] },
]
const MANIFESTS = ['A-B', 'B-C', 'C-D', 'A-C', 'B-D', 'A-D'].map((m) => {
  const ds = MF_DOCKETS.filter((d) => d.via.includes(m))
  return { id: m, dockets: ds, kg: ds.reduce((t, d) => t + d.kg, 0) }
})

function ManifestJourney() {
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Manifest — the consolidated load moving from A to B</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">A manifest lists every docket loaded together on one vehicle for a single leg, from an origin hub to a destination hub. It carries the dockets, their weights and package counts, and the vehicle and trip details. Dockets are grouped onto a manifest at the origin and handed over against it at the destination.</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Example — a journey from A to D</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">The network runs A → B → C → D, with six manifests, one for every pair of hubs in the direction of travel: A-B, B-C, C-D, A-C, B-D and A-D. A docket can ride more than one manifest — a docket going A to D may go direct on A-D, or on A-B and then B-D, or on A-B, B-C and C-D. Six is the most manifests one run from A to D can have; a pair with no docket on it, here A-C, makes no manifest at all.</p>
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
        {['A', 'B', 'C', 'D'].map((h, i) => (
          <span key={h} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">──→</span>}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">{h}</span>
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
        <div className="overflow-x-auto">
          <p className="mb-1 text-xs font-semibold text-slate-800">Manifests</p>
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className="py-1.5 pr-3 font-medium">Manifest</th><th className="py-1.5 pr-3 font-medium">Dockets</th><th className="py-1.5 text-right font-medium">Weight</th></tr></thead>
            <tbody>
              {MANIFESTS.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className={`py-2 pr-3 font-semibold ${m.dockets.length ? 'text-slate-800' : 'text-slate-300 line-through'}`}>{m.id}</td>
                  {m.dockets.length ? <td className="py-2 pr-3 text-slate-600">{m.dockets.map((d) => d.id).join(', ')}</td> : <td className="py-2 pr-3 text-slate-400">No docket — no manifest made</td>}
                  <td className="py-2 text-right tabular-nums text-slate-900">{m.dockets.length ? `${m.kg} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <p className="mb-1 text-xs font-semibold text-slate-800">Dockets</p>
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className="py-1.5 pr-3 font-medium">Docket</th><th className="py-1.5 pr-3 font-medium">Journey</th><th className="py-1.5 pr-3 text-right font-medium">Weight</th><th className="py-1.5 font-medium">Manifests</th></tr></thead>
            <tbody>
              {MF_DOCKETS.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{d.id}</td>
                  <td className="py-2 pr-3 text-slate-600">{d.from} → {d.to}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{d.kg} kg</td>
                  <td className="py-2 font-semibold text-slate-900">{d.via.join(' + ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Manifest · Docket based — the manifest's dockets already carry their own cost, so the manifest cost is just their sum.
function ManifestDocketBased() {
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Docket based — manifest cost is the sum of its dockets</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">The docket-level cost is already known (kg, docket, box, % of freight or % of invoice), and the dockets are already inside the manifest. So the manifest’s cost is directly the total of its dockets’ costs. Nothing to distribute.</p>
    </div>
  )
}

// Manifest · Trip based — one trip (one vehicle, A → D) carries several manifests. Trip cost + additional charges are spread over the manifests,
// then each manifest's cost over its dockets by weight.
const LEG_KM = { 'A-B': 100, 'B-C': 150, 'C-D': 200, 'A-C': 250, 'B-D': 350, 'A-D': 450 }
const TRIP = { km: 450, extra: [['Toll', 1500]] }
const TRIP_PRICING = [
  ['trip', 'Per Trip', '₹12,000 / trip', '1 trip × ₹12,000', 12000],
  ['km', 'Per Km', '₹30 / km', `${TRIP.km} km × ₹30`, TRIP.km * 30],
]

function ManifestTrip() {
  const [type, setType] = useState('trip')
  const [, name, rate, rule, base] = TRIP_PRICING.find(([k]) => k === type)
  const extra = TRIP.extra.reduce((t, [, v]) => t + v, 0)
  const total = base + extra
  const live = MANIFESTS.filter((m) => m.dockets.length)
  const weighted = live.map((m) => ({ ...m, km: LEG_KM[m.id], kgKm: m.kg * LEG_KM[m.id] }))
  const den = weighted.reduce((t, m) => t + m.kgKm, 0)
  const mf = weighted.map((m) => ({ ...m, share: m.kgKm / den, cost: (total * m.kgKm) / den }))
  const docketTotal = MF_DOCKETS.map((d) => ({ ...d, cost: mf.filter((m) => d.via.includes(m.id)).reduce((t, m) => t + (m.cost * d.kg) / m.kg, 0) }))
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Trip based — trip cost → manifests → dockets</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">The trip’s total cost is known: the partner’s trip or km charge plus any additional charges (toll, parking…). It is first spread over the manifests that ran on that trip, then each manifest’s cost is spread over its dockets by weight. Additional charges are spread over the manifests the same way as the trip cost.</p>
      <div className="mt-3 flex gap-2">
        {TRIP_PRICING.map(([k, l]) => <button key={k} onClick={() => setType(k)} className={type === k ? pillActive : pillInactive}>{l}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <span><b className="text-slate-800">{name}</b> {rate}</span>
        <span className="text-slate-400">·</span>
        <span>{rule} = <b className="text-slate-800">{inr(base)}</b></span>
        {TRIP.extra.map(([n, v]) => <span key={n} className="flex gap-2"><span className="text-slate-400">+</span><span>{n} <b className="text-slate-800">{inr(v)}</b></span></span>)}
        <span className="text-slate-400">=</span>
        <span>Trip cost <b className="text-slate-900">{inr(total)}</b></span>
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-800">1 · Trip cost → manifests</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className="py-1.5 pr-3 font-medium">Manifest</th>
              <th className="py-1.5 pr-3 text-right font-medium">Weight</th>
              <th className="py-1.5 pr-3 text-right font-medium">Distance</th>
              <th className="py-1.5 pr-3 text-right font-medium">Weight × km</th>
              <th className="py-1.5 pr-3 text-right font-medium">Share</th>
              <th className="py-1.5 text-right font-medium">Manifest cost</th>
            </tr>
          </thead>
          <tbody>
            {mf.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-800">{m.id}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{m.kg} kg</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{m.km} km</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{m.kgKm.toLocaleString('en-IN')}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{Math.round(m.share * 1000) / 10}%</td>
                <td className="py-2 text-right font-semibold tabular-nums text-slate-900">{inr(m.cost)}</td>
              </tr>
            ))}
            <tr className="text-slate-500"><td className="py-2 pr-3 font-medium">Trip</td><td /><td /><td className="py-2 pr-3 text-right tabular-nums">{den.toLocaleString('en-IN')}</td><td className="py-2 pr-3 text-right tabular-nums">100%</td><td className="py-2 text-right font-semibold tabular-nums text-slate-900">{inr(total)}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-800">2 · Manifest cost → its dockets, by weight</p>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {mf.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 p-3">
            <p className="flex items-baseline justify-between text-xs"><b className="text-slate-800">{m.id}</b><span className="font-semibold tabular-nums text-slate-900">{inr(m.cost)}</span></p>
            <ul className="mt-2 space-y-1">
              {m.dockets.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between text-[11px] text-slate-600">
                  <span>{d.id} · {d.kg} kg</span>
                  <span className="font-semibold tabular-nums text-slate-900">{inr((m.cost * d.kg) / m.kg)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-800">3 · Docket total — a docket adds the pieces from every manifest it rode</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <tbody>
            {docketTotal.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="py-1.5 pr-3 font-semibold text-slate-800">{d.id}</td>
                <td className="py-1.5 pr-3 text-slate-600">{d.via.join(' + ')}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">{inr(d.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Manifest cost = trip cost × manifest (weight × km) ÷ trip total (weight × km). Docket cost on a manifest = manifest cost × docket weight ÷ manifest weight.</p>
    </div>
  )
}

// Manifest · Time based — same cumulative month-to-date method as PRS/DRS, but the pool is shared by manifests first (weight × km),
// then each manifest's cost goes to its dockets by weight.
const MFT = [
  { id: 'A-B', day: 2, km: 100, dockets: [['DKT-2', 200], ['DKT-7', 100]] },
  { id: 'B-D', day: 3, km: 350, dockets: [['DKT-5', 120], ['DKT-2', 200]] },
  { id: 'A-D', day: 5, km: 450, dockets: [['DKT-1', 400]] },
].map((m) => { const kg = m.dockets.reduce((t, [, k]) => t + k, 0); return { ...m, kg, kgKm: kg * m.km } })
const mftDays = DAYS.map((day) => {
  const done = MFT.filter((m) => m.day <= day)
  const kgToDate = done.reduce((t, m) => t + m.kg, 0)
  const kgKm = done.reduce((t, m) => t + m.kgKm, 0)
  const cover = COVER_DAY * day
  const excess = Math.max(0, kgToDate - cover)
  const fixed = DAILY * day
  const pool = fixed + excess * FP.rate
  return { day, kgDay: MFT.filter((m) => m.day === day).reduce((t, m) => t + m.kg, 0), kgToDate, kgKm, cover, excess, fixed, extra: excess * FP.rate, pool, rate: kgKm ? pool / kgKm : 0, rateFixed: kgKm ? fixed / kgKm : 0 }
})

function ManifestFixed({ cover }) {
  const th = 'py-1.5 pr-3 text-right font-medium'
  const row = 'border-b border-slate-100 text-slate-600'
  const cell = 'py-1.5 pr-3 text-right tabular-nums'
  const rateOf = (m) => (cover ? m.rate : m.rateFixed)
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">{cover ? 'Time based · Fixed + Per Kg — manifest, then docket' : 'Time based · Monthly fixed — manifest, then docket'}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Same cumulative method as PRS/DRS. Each day the cost so far{cover ? ' (fixed plus the rate on the weight beyond the cover so far)' : ''} is shared over all manifests so far by their weight × km, so docket costs keep revising until the month closes. Then each manifest’s cost goes to its dockets by weight. A day with no manifest carries ₹0 itself; its cost is picked up on the next day.
        {cover && ` Cover is ${FP.cover.toLocaleString('en-IN')} kg a month (${r2(COVER_DAY)} kg per day, unused cover carries forward); beyond it ₹${FP.rate} / kg.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <span><b className="text-slate-800">{inr(FIXED.monthly)}</b> ÷ <b className="text-slate-800">{FIXED.opDays}</b> operational days = <b className="text-slate-900">{inr(r2(DAILY))}</b> per day</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className="py-1.5 pr-3 font-medium">&nbsp;</th>
              {DAYS.map((d) => <th key={d} className={th}>Day {d}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className={row}><td className="py-1.5 pr-3">Manifest made that day</td>{mftDays.map((m) => <td key={m.day} className={cell}>{MFT.filter((x) => x.day === m.day).map((x) => x.id).join(', ') || 'none'}</td>)}</tr>
            {cover && <tr className={row}><td className="py-1.5 pr-3">Weight so far / cover so far</td>{mftDays.map((m) => <td key={m.day} className={cell}>{m.kgToDate} / {r2(m.cover)} kg</td>)}</tr>}
            {cover && <tr className={row}><td className="py-1.5 pr-3">Beyond cover</td>{mftDays.map((m) => <td key={m.day} className={cell}>{r2(m.excess)} kg</td>)}</tr>}
            <tr className={row}><td className="py-1.5 pr-3">{cover ? 'Cost so far (fixed + rate beyond cover)' : `Cost so far (${inr(r2(DAILY))} × days)`}</td>{mftDays.map((m) => <td key={m.day} className={cell}>{inr(r2(cover ? m.pool : m.fixed))}</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Manifests’ weight × km so far</td>{mftDays.map((m) => <td key={m.day} className={cell}>{m.kgKm ? m.kgKm.toLocaleString('en-IN') : '—'}</td>)}</tr>
            <tr className="border-b border-slate-200 font-semibold text-slate-800"><td className="py-1.5 pr-3">₹ per weight × km so far</td>{mftDays.map((m) => <td key={m.day} className={cell}>{m.kgKm ? '₹' + rateOf(m).toFixed(4) : '—'}</td>)}</tr>
            {MFT.map((m) => (
              <Fragment key={m.id}>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{m.id} <span className="font-normal text-slate-400">· Day {m.day} · {m.kg} kg · {m.km} km</span></td>
                  {mftDays.map((d) => <td key={d.day} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{d.day < m.day ? <span className="font-normal text-slate-300">—</span> : inr(r2(rateOf(d) * m.kgKm))}</td>)}
                </tr>
                {m.dockets.map(([id, kg]) => (
                  <tr key={m.id + id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 pl-4 text-slate-600">{id} <span className="text-slate-400">· {kg} kg</span></td>
                    {mftDays.map((d) => <td key={d.day} className="py-1.5 pr-3 text-right tabular-nums text-slate-700">{d.day < m.day ? <span className="text-slate-300">—</span> : inr(r2((rateOf(d) * m.kgKm * kg) / m.kg))}</td>)}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Manifest cost (as of a day) = cost so far × manifest weight × km ÷ all manifests’ weight × km so far. Docket cost = manifest cost × docket weight ÷ manifest weight. DKT-2 rode A-B and B-D, so its total is the sum of both pieces.{cover ? ' The other six “Fixed + …” types work the same way with their own quantity.' : ''}</p>
    </div>
  )
}

function ManifestTab() {
  return (
    <div className="space-y-4">
      <ManifestJourney />
      <Split />
      <ManifestDocketBased />
      <ManifestTrip />
      <ManifestFixed />
      <ManifestFixed cover />
    </div>
  )
}

// Mix — one attached vehicle (one fixed monthly deal) doing manifests and PRS/DRS. Same cumulative month-to-date method as the other tabs:
// the cost so far (daily cost × days, idle days included; for Fixed + rate also the rate on whatever goes beyond the cover so far) is one pool for the
// vehicle. Every day the pool is split between PRS/DRS and Manifest by the docket kg each has carried so far, so the split keeps revising until month end.
// Each side's bucket then runs through its own method (PRS/DRS: dockets by weight · Manifest: manifests by weight × km, then dockets).
const MIX_DAYS = 6
const MIX_COVER = { perDay: 200, rate: 5 } // Fixed + Per Kg: 5,200 kg a month = 200 kg per operational day
const MIX_PRS_DOCKETS = [
  { day: 3, id: 'DKT-A', kg: 120 }, { day: 3, id: 'DKT-B', kg: 300 }, { day: 3, id: 'DKT-C', kg: 80 },
  { day: 5, id: 'DKT-D', kg: 200 }, { day: 6, id: 'DKT-E', kg: 150 },
]
const MIX_MFS = [
  { id: 'A-B', day: 1, km: 100, dockets: [['DKT-2', 200], ['DKT-7', 100]] },
  { id: 'B-D', day: 2, km: 350, dockets: [['DKT-5', 120], ['DKT-2', 200]] },
  { id: 'A-D', day: 5, km: 450, dockets: [['DKT-1', 400]] },
].map((m) => { const kg = m.dockets.reduce((t, [, k]) => t + k, 0); return { ...m, kg, kgKm: kg * m.km } })
const mixCalc = (withCover) => {
  const out = []
  for (let day = 1; day <= MIX_DAYS; day++) {
    const pKg = MIX_PRS_DOCKETS.filter((d) => d.day <= day).reduce((t, d) => t + d.kg, 0)
    const mKg = MIX_MFS.filter((m) => m.day <= day).reduce((t, m) => t + m.kg, 0)
    const tot = pKg + mKg
    const fixed = DAILY * day
    const cover = MIX_COVER.perDay * day
    const excess = withCover ? Math.max(0, tot - cover) : 0
    const pool = fixed + excess * MIX_COVER.rate
    const pShare = tot ? pKg / tot : 0
    out.push({ day, pKg, mKg, tot, fixed, cover, excess, pool, pShare, pB: tot ? pool * pShare : 0, mB: tot ? pool * (1 - pShare) : 0,
      pDay: MIX_PRS_DOCKETS.filter((d) => d.day === day).reduce((t, d) => t + d.kg, 0), mDay: MIX_MFS.filter((m) => m.day === day).reduce((t, m) => t + m.kg, 0) })
  }
  return out
}
const MIX_PRS_KG = MIX_PRS_DOCKETS.reduce((t, d) => t + d.kg, 0)
const MIX_MF_DEN = MIX_MFS.reduce((t, m) => t + m.kgKm, 0)
const mixWhat = (r) => {
  const parts = MIX_MFS.filter((m) => m.day === r.day).map((m) => `Manifest ${m.id}`)
  if (r.pDay) parts.push('PRS/DRS')
  return parts.join(' + ') || 'Idle'
}
const pct = (n) => Math.round(n * 1000) / 10 + '%'

function MixTab() {
  const [withCover, setWithCover] = useState(false)
  const rows = mixCalc(withCover)
  const last = rows[rows.length - 1]
  const th = 'py-1.5 pr-3 text-right font-medium'
  const td = 'py-2 pr-3 text-right tabular-nums'
  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Mix — one vehicle, two jobs, one fixed bill</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">An attached vehicle is contracted for mid mile and runs manifests most days, but on spare days it also does PRS/DRS (first or last mile). The partner still sends <b>one</b> fixed monthly bill for the vehicle. Costing has to decide how much of it belongs to the manifests and how much to the PRS/DRS, without collecting km or hours on every run. Only time based deals have this problem: with Per Kg, Per Trip and the other docket or trip types, each job is already priced on its own.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {['1 · One cumulative pool for the vehicle', '2 · Split the pool by docket kg so far', '3 · Each bucket runs its own method'].map((t, i) => (
            <span key={t} className="flex items-center gap-2">{i > 0 && <span className="text-slate-300">→</span>}<span className="rounded-lg bg-slate-900 px-2.5 py-1 font-medium text-white">{t}</span></span>
          ))}
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">1 + 2 · One pool, split by the docket kg each job has carried so far</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Same as the other tabs. Daily cost = {inr(FIXED.monthly)} ÷ {FIXED.opDays} operational days = <b>{inr(r2(DAILY))}</b>. Every day the cost of all days so far goes into the vehicle’s pool — idle days included, they just wait in it. The pool is split between PRS/DRS and Manifest by the docket kg each has carried <b>so far this month</b>. If only one of them has run so far, it takes all of it. The split keeps revising every day, and the whole fixed amount is distributed by month end. It restarts every new month.</p>
        <div className="mt-3 flex gap-2">
          {[[false, 'Monthly fixed'], [true, 'Fixed + Per Kg']].map(([v, l]) => <button key={l} onClick={() => setWithCover(v)} className={withCover === v ? pillActive : pillInactive}>{l}</button>)}
        </div>
        {withCover && <p className="mt-2 text-xs leading-relaxed text-slate-500">The fixed amount covers {(MIX_COVER.perDay * FIXED.opDays).toLocaleString('en-IN')} kg a month ({MIX_COVER.perDay} kg per operational day; unused cover carries forward). The cover and the kg are counted for the <b>vehicle as a whole</b>, PRS/DRS and manifests together. Weight beyond the cover so far earns ₹{MIX_COVER.rate} / kg, and that extra goes into the pool before the split, so it is shared like the fixed part.</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-400">
                <th className="py-1.5 pr-3 font-medium">Day</th>
                <th className="py-1.5 pr-3 font-medium">What ran</th>
                <th className={th}>PRS/DRS kg so far</th>
                <th className={th}>Manifest kg so far</th>
                {withCover && <th className={th}>Beyond cover</th>}
                <th className={th}>Pool so far</th>
                <th className={th}>PRS/DRS share</th>
                <th className={th}>Manifest bucket</th>
                <th className="py-1.5 text-right font-medium">PRS/DRS bucket</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{r.day}</td>
                  <td className={`py-2 pr-3 ${mixWhat(r) === 'Idle' ? 'text-slate-400' : 'text-slate-600'}`}>{mixWhat(r)}</td>
                  <td className={`${td} text-slate-600`}>{r.pKg || '—'}</td>
                  <td className={`${td} text-slate-600`}>{r.mKg || '—'}</td>
                  {withCover && <td className={`${td} text-slate-600`}>{r2(r.excess)} kg</td>}
                  <td className={`${td} text-slate-600`}>{inr(Math.round(r.pool))}</td>
                  <td className={`${td} text-slate-600`}>{r.tot ? pct(r.pShare) : '—'}</td>
                  <td className={`${td} font-semibold text-slate-900`}>{inr(Math.round(r.mB))}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-slate-900">{inr(Math.round(r.pB))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li><b className="text-slate-800">Days 1, 2:</b> only manifests have run, so Manifest holds the whole pool ({inr(Math.round(rows[1].pool))} by Day 2).</li>
          <li><b className="text-slate-800">Day 3:</b> the first PRS/DRS run brings 500 kg against 620 kg of manifests, so PRS/DRS takes {pct(rows[2].pShare)} of the pool — a part of the cost of Days 1 and 2 moves across with it.</li>
          <li><b className="text-slate-800">Day 4:</b> idle. No new kg, so the share stays at {pct(rows[3].pShare)}; the pool grows by {inr(r2(DAILY))} and both buckets grow in that ratio{withCover ? '. The cover also grows, so the excess falls from ' + r2(rows[2].excess) + ' kg to ' + r2(rows[3].excess) + ' kg' : ''}.</li>
          <li><b className="text-slate-800">Day 5:</b> A-D (400 kg) and 200 kg of PRS/DRS both ran, so the share moves to {pct(rows[4].pShare)}.</li>
          <li><b className="text-slate-800">Day 6:</b> 150 kg more of PRS/DRS; the share is {pct(rows[5].pShare)} and the pool is {inr(Math.round(last.pool))}, split {inr(Math.round(last.mB))} Manifest and {inr(Math.round(last.pB))} PRS/DRS. The two always add up to the pool, so nothing is lost or counted twice.</li>
        </ul>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">3 · Each bucket goes into the method you already have</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">The split only decides how much of the bill each job gets. From there it is exactly the PRS/DRS and Manifest tabs, revising every day until month end. Numbers below are as of Day {MIX_DAYS}.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
            <p className="text-xs font-semibold text-slate-900">PRS/DRS bucket {inr(Math.round(last.pB))} → dockets by % weight</p>
            <p className="mt-1 text-[11px] text-slate-500">Same as the PRS/DRS tab: the bucket is shared by all PRS/DRS dockets of the month so far, by weight ({MIX_PRS_KG} kg).</p>
            <ul className="mt-2 space-y-1">
              {MIX_PRS_DOCKETS.map((d) => (
                <li key={d.id} className="flex justify-between text-[11px] text-slate-600"><span>{d.id} · Day {d.day} · {d.kg} kg · {pct(d.kg / MIX_PRS_KG)}</span><span className="font-semibold tabular-nums text-slate-900">{inr(Math.round((last.pB * d.kg) / MIX_PRS_KG))}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
            <p className="text-xs font-semibold text-slate-900">Manifest bucket {inr(Math.round(last.mB))} → manifests → dockets</p>
            <p className="mt-1 text-[11px] text-slate-500">Same as the Manifest tab: the bucket is shared by manifests by weight × km, then each manifest’s cost goes to its dockets by weight.</p>
            <ul className="mt-2 space-y-2">
              {MIX_MFS.map((m) => {
                const mc = (last.mB * m.kgKm) / MIX_MF_DEN
                return (
                  <li key={m.id}>
                    <p className="flex justify-between text-[11px] font-semibold text-slate-800"><span>{m.id} · {m.kg} kg × {m.km} km · {pct(m.kgKm / MIX_MF_DEN)}</span><span className="tabular-nums">{inr(Math.round(mc))}</span></p>
                    {m.dockets.map(([id, kg]) => <p key={id} className="flex justify-between pl-3 text-[11px] text-slate-600"><span>{id} · {kg} kg</span><span className="tabular-nums text-slate-900">{inr(Math.round((mc * kg) / m.kg))}</span></p>)}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Other cases</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li><b className="text-slate-800">Other “Fixed + …” types:</b> the same, with the deal’s own quantity (dockets, boxes, trips, ₹ freight, ₹ invoice) counted for the vehicle as a whole.</li>
          <li><b className="text-slate-800">Fixed + Per Km:</b> the vehicle’s total km for the month (partner invoice, GPS or odometer) gives the cover and the excess for the whole vehicle. During the month a standard km is used and the month-end figure trues it up. The split between PRS/DRS and Manifest still follows the kg, so no km is needed per run.</li>
          <li><b className="text-slate-800">Docket on two manifests:</b> it counts its kg on each manifest it rode.</li>
          <li><b className="text-slate-800">No dockets yet this month:</b> the pool waits and is split as soon as the first docket arrives.</li>
          <li><b className="text-slate-800">Month change:</b> pool and kg restart on the 1st. A vehicle that never does PRS/DRS has a PRS/DRS bucket of ₹0 and behaves exactly like the Manifest tab.</li>
        </ul>
      </div>
    </div>
  )
}

export default function CostingMethod2() {
  const [tab, setTab] = useState('t1')
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Concept 2</h1>
      <div className="flex gap-2">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? pillActive : pillInactive}>{l}</button>)}
      </div>
      {tab === 't1' ? <Type1 /> : tab === 't2' ? <ManifestTab /> : <MixTab />}
    </div>
  )
}

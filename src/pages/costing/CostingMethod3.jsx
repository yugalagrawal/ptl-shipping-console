import { Fragment, useState } from 'react'
import CostingExperiment from './CostingExperiment.jsx'
import { card, pillActive, pillInactive } from '../../components/ui.js'

const TABS = [['t1', 'PRS/DRS'], ['t2', 'Manifest'], ['t3', 'Mix'], ['t4', 'Experiment - TestCases']]

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

// PRS/DRS · Time based examples — one table for both: cost so far ÷ weight so far, docket by docket, day by day.
// Monthly fixed: cost so far = fixed so far. Fixed + rate after cover: the cover is one monthly quantity (not spread per day); once the
// weight so far passes it, the rate on the excess is added to the cost so far.
const PV = { cover: 700, rate: 10 }
const timeRows = (withCover) => mtd.map((m) => {
  const excess = withCover ? Math.max(0, m.kgToDate - PV.cover) : 0
  const extra = excess * PV.rate
  const pool = m.cost + extra
  return { ...m, excess, extra, pool, rate: m.kgToDate ? pool / m.kgToDate : 0 }
})

function TimeExample({ withCover }) {
  const rows = timeRows(withCover)
  const row = 'border-b border-slate-100 text-slate-600'
  const cell = 'py-1.5 pr-3 text-right tabular-nums'
  const last = rows[rows.length - 1]
  const story = rows.map((m, i) => {
    const prev = rows[i - 1]
    if (m.day === 1) return `Day 1: no docket yet. ${inr(r2(DAILY))} is added to the cost so far and waits.`
    if (!m.kgDay) return `Day ${m.day}: idle. No new kg, so the cost so far grows by ${inr(r2(DAILY))} and ₹ per kg rises from ${inr(r2(prev.rate))} to ${inr(r2(m.rate))}.`
    if (withCover && m.excess > 0 && prev.excess === 0) return `Day ${m.day}: ${m.kgToDate} kg so far crosses the ${PV.cover} kg cover. The ${m.excess} kg beyond it earns ₹${PV.rate} / kg = ${inr(m.extra)}, which joins the cost so far.`
    if (withCover && m.excess > 0) return `Day ${m.day}: cover is already exhausted, so every new kg earns ₹${PV.rate}. Beyond cover is now ${m.excess} kg = ${inr(m.extra)}.`
    return `Day ${m.day}: ${m.kgDay} kg arrives. ${m.kgToDate} kg so far shares ${inr(r2(m.pool))}, so ₹ per kg falls to ${inr(r2(m.rate))}.`
  })
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">{withCover ? 'Time based · Monthly fixed + variable after cover' : 'Time based · Monthly fixed'}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {withCover
          ? `The fixed amount covers ${PV.cover.toLocaleString('en-IN')} kg for the month. The cover is not spread over the days: it simply gets used up as weight comes in. Until then, cost so far is only the fixed so far. After it is exhausted, ₹${PV.rate} / kg on the weight beyond the cover is added to the cost so far.`
          : 'The partner is paid a fixed amount for the month. Each operational day adds its share to the cost so far, and the whole of it is shared by the weight of all dockets so far. Idle days are never lost.'}
        {' '}Docket costs keep revising until month end, then they are final. Failed pickup cost = ₹0.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span><b className="text-slate-800">{inr(FIXED.monthly)}</b> ÷ <b className="text-slate-800">{FIXED.opDays}</b> operational days = <b className="text-slate-900">{inr(r2(DAILY))}</b> per day</span>
        {withCover && <><span className="text-slate-300">·</span><span>cover <b className="text-slate-800">{PV.cover} kg</b></span><span className="text-slate-300">·</span><span>beyond cover <b className="text-slate-800">₹{PV.rate} / kg</b></span></>}
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
            <tr className={row}><td className="py-1.5 pr-3">Dockets weight that day</td>{rows.map((m) => <td key={m.day} className={cell}>{m.kgDay ? `${m.kgDay} kg` : <span className="text-slate-300">idle</span>}</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Weight so far</td>{rows.map((m) => <td key={m.day} className={cell}>{m.kgToDate} kg</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Fixed so far ({inr(r2(DAILY))} × days)</td>{rows.map((m) => <td key={m.day} className={cell}>{inr(r2(m.cost))}</td>)}</tr>
            {withCover && <tr className={row}><td className="py-1.5 pr-3">Beyond cover ({PV.cover} kg)</td>{rows.map((m) => <td key={m.day} className={`${cell} ${m.excess ? 'font-semibold text-orange-600' : ''}`}>{m.excess ? `${m.excess} kg` : '—'}</td>)}</tr>}
            {withCover && <tr className={row}><td className="py-1.5 pr-3">+ Rate on beyond cover</td>{rows.map((m) => <td key={m.day} className={cell}>{m.extra ? inr(r2(m.extra)) : '—'}</td>)}</tr>}
            <tr className={`${row} font-semibold text-slate-800`}><td className="py-1.5 pr-3">Cost so far</td>{rows.map((m) => <td key={m.day} className={cell}>{inr(r2(m.pool))}</td>)}</tr>
            <tr className="border-b border-slate-200 font-semibold text-slate-800"><td className="py-1.5 pr-3">₹ per kg so far</td>{rows.map((m) => <td key={m.day} className={cell}>{m.kgToDate ? inr(r2(m.rate)) : '—'}</td>)}</tr>
            {MTD_DOCKETS.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-800">{d.id} <span className="font-normal text-slate-400">· Day {d.day} · {d.kg} kg</span></td>
                {rows.map((m) => <td key={m.day} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{m.day < d.day ? <span className="font-normal text-slate-300">—</span> : inr(r2(m.rate * d.kg))}</td>)}
              </tr>
            ))}
            <tr className="text-slate-500"><td className="py-2 pr-3 font-medium">All dockets</td>{rows.map((m) => <td key={m.day} className="py-2 pr-3 text-right font-semibold tabular-nums">{m.kgToDate ? inr(r2(m.pool)) : '—'}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-800">What happens each day</p>
      <ul className="mt-1 space-y-1 text-xs leading-relaxed text-slate-600">
        {story.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
      <p className="mt-3 text-[11px] text-slate-400">Docket cost (as of a day) = cost so far × docket kg ÷ weight so far. On every day with dockets, the dockets add up to the whole cost so far.{withCover ? ` Cost so far = fixed so far + ₹${PV.rate} × (weight so far − ${PV.cover}, never below 0). The other six “Fixed + …” types work the same way with their own quantity (dockets, boxes, trips, km, ₹ freight, ₹ invoice).` : ''}</p>
    </div>
  )
}
const MonthlyFixed = () => <TimeExample />
const FixedPlusKg = () => <TimeExample withCover />

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

// Manifest example — network A → B → C → D. Each docket sits on exactly one manifest, the one for its own origin and destination.
const MF_DOCKETS = [
  { id: 'DKT-1', from: 'A', to: 'D', kg: 400, via: ['A-D'] },
  { id: 'DKT-2', from: 'A', to: 'D', kg: 200, via: ['A-D'] },
  { id: 'DKT-3', from: 'A', to: 'C', kg: 300, via: ['A-C'] },
  { id: 'DKT-4', from: 'A', to: 'C', kg: 150, via: ['A-C'] },
  { id: 'DKT-6', from: 'B', to: 'C', kg: 80, via: ['B-C'] },
  { id: 'DKT-5', from: 'B', to: 'D', kg: 120, via: ['B-D'] },
  { id: 'DKT-7', from: 'A', to: 'B', kg: 100, via: ['A-B'] },
  { id: 'DKT-8', from: 'C', to: 'D', kg: 90, via: ['C-D'] },
  { id: 'DKT-9', from: 'A', to: 'D', kg: 250, via: ['A-D'] },
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
      <p className="mt-1 text-xs leading-relaxed text-slate-500">The network runs A → B → C → D, with six manifests, one for every pair of hubs in the direction of travel: A-B, B-C, C-D, A-C, B-D and A-D. Manifests are already created by origin and destination, so a docket belongs to one manifest only: a docket from A to C is on A-C, not on A-B or B-C. Six is the most manifests one run from A to D can have; a pair with no docket on it makes no manifest at all.</p>
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
      <p className="mt-2 text-[11px] text-slate-400">Manifest cost = trip cost × manifest (weight × km) ÷ trip total (weight × km). Docket cost on a manifest = manifest cost × docket weight ÷ manifest weight.</p>
    </div>
  )
}

// Manifest · Time based — same cumulative month-to-date method as PRS/DRS, with manifests in place of dockets: cost so far ÷ manifest weight so far.
// Km plays no role here (it matters only in Trip based). Each manifest's cost then goes to its dockets by weight.
const MFP = { cover: 500, rate: 10 }
const MFT = [
  { id: 'A-B', day: 2, km: 100, dockets: [['DKT-7', 100]] },
  { id: 'B-D', day: 3, km: 350, dockets: [['DKT-5', 120]] },
  { id: 'A-D', day: 5, km: 450, dockets: [['DKT-1', 400], ['DKT-2', 200]] },
].map((m) => { const kg = m.dockets.reduce((t, [, k]) => t + k, 0); return { ...m, kg } })
const mftDays = DAYS.map((day) => {
  const kgToDate = MFT.filter((m) => m.day <= day).reduce((t, m) => t + m.kg, 0)
  const fixed = DAILY * day
  const excess = Math.max(0, kgToDate - MFP.cover)
  const extra = excess * MFP.rate
  return { day, kgDay: MFT.filter((m) => m.day === day).reduce((t, m) => t + m.kg, 0), kgToDate, fixed, excess, extra, pool: fixed + extra, rateFixed: kgToDate ? fixed / kgToDate : 0, rate: kgToDate ? (fixed + extra) / kgToDate : 0 }
})

function ManifestFixed({ cover }) {
  const th = 'py-1.5 pr-3 text-right font-medium'
  const row = 'border-b border-slate-100 text-slate-600'
  const cell = 'py-1.5 pr-3 text-right tabular-nums'
  const rateOf = (m) => (cover ? m.rate : m.rateFixed)
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">{cover ? 'Time based · Monthly fixed + variable after cover — manifest, then docket' : 'Time based · Monthly fixed — manifest, then docket'}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Same cumulative method as PRS/DRS, with manifests in place of dockets. Each day the cost so far is shared over all manifests so far by manifest weight only; km plays no role here. Then each manifest’s cost goes to its dockets by weight. Docket costs keep revising until the month closes. A day with no manifest carries ₹0 itself; its cost is picked up on the next day.
        {cover && ` The fixed amount covers ${MFP.cover.toLocaleString('en-IN')} kg for the month, not spread over the days. Until the weight so far passes it, cost so far is only the fixed so far; after that, ₹${MFP.rate} / kg on the weight beyond the cover is added.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span><b className="text-slate-800">{inr(FIXED.monthly)}</b> ÷ <b className="text-slate-800">{FIXED.opDays}</b> operational days = <b className="text-slate-900">{inr(r2(DAILY))}</b> per day</span>
        {cover && <><span className="text-slate-300">·</span><span>cover <b className="text-slate-800">{MFP.cover} kg</b></span><span className="text-slate-300">·</span><span>beyond cover <b className="text-slate-800">₹{MFP.rate} / kg</b></span></>}
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
            <tr className={row}><td className="py-1.5 pr-3">Manifest made that day</td>{mftDays.map((m) => <td key={m.day} className={cell}>{MFT.filter((x) => x.day === m.day).map((x) => x.id).join(', ') || <span className="text-slate-300">none</span>}</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Manifest weight so far</td>{mftDays.map((m) => <td key={m.day} className={cell}>{m.kgToDate} kg</td>)}</tr>
            <tr className={row}><td className="py-1.5 pr-3">Fixed so far ({inr(r2(DAILY))} × days)</td>{mftDays.map((m) => <td key={m.day} className={cell}>{inr(r2(m.fixed))}</td>)}</tr>
            {cover && <tr className={row}><td className="py-1.5 pr-3">Beyond cover ({MFP.cover} kg)</td>{mftDays.map((m) => <td key={m.day} className={`${cell} ${m.excess ? 'font-semibold text-orange-600' : ''}`}>{m.excess ? `${m.excess} kg` : '—'}</td>)}</tr>}
            {cover && <tr className={row}><td className="py-1.5 pr-3">+ Rate on beyond cover</td>{mftDays.map((m) => <td key={m.day} className={cell}>{m.extra ? inr(r2(m.extra)) : '—'}</td>)}</tr>}
            <tr className={`${row} font-semibold text-slate-800`}><td className="py-1.5 pr-3">Cost so far</td>{mftDays.map((m) => <td key={m.day} className={cell}>{inr(r2(cover ? m.pool : m.fixed))}</td>)}</tr>
            <tr className="border-b border-slate-200 font-semibold text-slate-800"><td className="py-1.5 pr-3">₹ per kg so far</td>{mftDays.map((m) => <td key={m.day} className={cell}>{m.kgToDate ? inr(r2(rateOf(m))) : '—'}</td>)}</tr>
            {MFT.map((m) => (
              <Fragment key={m.id}>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{m.id} <span className="font-normal text-slate-400">· Day {m.day} · {m.kg} kg</span></td>
                  {mftDays.map((d) => <td key={d.day} className="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{d.day < m.day ? <span className="font-normal text-slate-300">—</span> : inr(r2(rateOf(d) * m.kg))}</td>)}
                </tr>
                {m.dockets.map(([id, kg]) => (
                  <tr key={m.id + id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 pl-4 text-slate-600">{id} <span className="text-slate-400">· {kg} kg</span></td>
                    {mftDays.map((d) => <td key={d.day} className="py-1.5 pr-3 text-right tabular-nums text-slate-700">{d.day < m.day ? <span className="text-slate-300">—</span> : inr(r2(rateOf(d) * kg))}</td>)}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Manifest cost (as of a day) = cost so far × manifest weight ÷ all manifests’ weight so far. Docket cost = manifest cost × docket weight ÷ manifest weight, which is the same as ₹ per kg so far × docket kg.{cover ? ` Cost so far = fixed so far + ₹${MFP.rate} × (weight so far − ${MFP.cover}, never below 0). The other six “Fixed + …” types work the same way with their own quantity.` : ''}</p>
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

// Mix — one attached vehicle (one fixed monthly deal) doing PRS/DRS and manifests. Nothing to split into buckets: every docket the vehicle
// carried, on a pickup run or on a manifest, goes into one list. Cost so far ÷ kg so far (all dockets, actual kg) = ₹ per kg, same as the PRS/DRS tab.
// A manifest's cost is just the sum of its dockets.
const MIX_DAYS = 6
const MIX_COVER = { kg: 1000, rate: 10 }
const MIX_DOCKETS = [
  { id: 'DKT-7', day: 1, kg: 100, job: 'Manifest A-B' },
  { id: 'DKT-5', day: 2, kg: 120, job: 'Manifest B-D' },
  { id: 'DKT-A', day: 3, kg: 120, job: 'PRS/DRS' },
  { id: 'DKT-B', day: 3, kg: 300, job: 'PRS/DRS' },
  { id: 'DKT-C', day: 3, kg: 80, job: 'PRS/DRS' },
  { id: 'DKT-1', day: 5, kg: 400, job: 'Manifest A-D' },
  { id: 'DKT-2', day: 5, kg: 200, job: 'Manifest A-D' },
  { id: 'DKT-D', day: 5, kg: 200, job: 'PRS/DRS' },
  { id: 'DKT-E', day: 6, kg: 150, job: 'PRS/DRS' },
]
const mixCalc = (withCover) => Array.from({ length: MIX_DAYS }, (_, i) => {
  const day = i + 1
  const today = MIX_DOCKETS.filter((d) => d.day === day)
  const kgDay = today.reduce((t, d) => t + d.kg, 0)
  const kgToDate = MIX_DOCKETS.filter((d) => d.day <= day).reduce((t, d) => t + d.kg, 0)
  const fixed = DAILY * day
  const excess = withCover ? Math.max(0, kgToDate - MIX_COVER.kg) : 0
  const extra = excess * MIX_COVER.rate
  const pool = fixed + extra
  const jobs = [...new Set(today.map((d) => d.job))]
  return { day, kgDay, kgToDate, fixed, excess, extra, pool, rate: kgToDate ? pool / kgToDate : 0, ran: jobs.join(' + ') }
})

function MixTab() {
  const [withCover, setWithCover] = useState(false)
  const rows = mixCalc(withCover)
  const last = rows[rows.length - 1]
  const th = 'py-1.5 pr-3 text-right font-medium'
  const td = 'py-2 pr-3 text-right tabular-nums text-slate-600'
  const jobs = [...new Set(MIX_DOCKETS.map((d) => d.job))].sort((x, y) => (x === 'PRS/DRS' ? -1 : y === 'PRS/DRS' ? 1 : x.localeCompare(y)))
  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Mix — one vehicle, PRS/DRS and manifests, one fixed bill</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">An attached vehicle runs manifests most days and PRS/DRS on spare days, but the partner sends <b>one</b> fixed monthly bill. There is nothing to split between the two jobs. Treat the vehicle as one: every docket it carried, on a pickup run or on a manifest, counts by its actual kg. Cost so far ÷ kg so far gives one ₹ per kg, and each docket pays that × its kg. A manifest’s cost is the sum of its dockets.</p>
        <div className="mt-3 flex gap-2">
          {[[false, 'Monthly fixed'], [true, 'Monthly fixed + variable after cover']].map(([v, l]) => <button key={l} onClick={() => setWithCover(v)} className={withCover === v ? pillActive : pillInactive}>{l}</button>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span><b className="text-slate-800">{inr(FIXED.monthly)}</b> ÷ <b className="text-slate-800">{FIXED.opDays}</b> operational days = <b className="text-slate-900">{inr(r2(DAILY))}</b> per day</span>
          {withCover && <><span className="text-slate-300">·</span><span>cover <b className="text-slate-800">{MIX_COVER.kg.toLocaleString('en-IN')} kg</b> for the vehicle</span><span className="text-slate-300">·</span><span>beyond cover <b className="text-slate-800">₹{MIX_COVER.rate} / kg</b></span></>}
        </div>
        {withCover && <p className="mt-2 text-xs leading-relaxed text-slate-500">The cover is one monthly quantity for the whole vehicle, PRS/DRS and manifest kg together. Once kg so far passes it, ₹{MIX_COVER.rate} / kg on the excess is added to the cost so far.</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-400">
                <th className="py-1.5 pr-3 font-medium">Day</th>
                <th className="py-1.5 pr-3 font-medium">What ran</th>
                <th className={th}>Kg that day</th>
                <th className={th}>Kg so far</th>
                <th className={th}>Fixed so far</th>
                {withCover && <th className={th}>Beyond cover</th>}
                {withCover && <th className={th}>+ Rate</th>}
                <th className={th}>Cost so far</th>
                <th className="py-1.5 text-right font-medium">₹ per kg so far</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{r.day}</td>
                  <td className={`py-2 pr-3 ${r.ran ? 'text-slate-600' : 'text-slate-400'}`}>{r.ran || 'Idle'}</td>
                  <td className={td}>{r.kgDay || '—'}</td>
                  <td className={td}>{r.kgToDate || '—'}</td>
                  <td className={td}>{inr(Math.round(r.fixed))}</td>
                  {withCover && <td className={`${td} ${r.excess ? 'font-semibold text-orange-600' : ''}`}>{r.excess ? `${r.excess} kg` : '—'}</td>}
                  {withCover && <td className={td}>{r.extra ? inr(Math.round(r.extra)) : '—'}</td>}
                  <td className={`${td} font-semibold text-slate-900`}>{inr(Math.round(r.pool))}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-slate-900">{r.kgToDate ? inr(r2(r.rate)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li><b className="text-slate-800">Days 1, 2:</b> only manifest dockets so far. {rows[1].kgToDate} kg shares {inr(Math.round(rows[1].pool))}.</li>
          <li><b className="text-slate-800">Day 3:</b> a PRS/DRS run adds {rows[2].kgDay} kg. Nothing is moved between jobs; they just join the same kg so far, and ₹ per kg falls to {inr(r2(rows[2].rate))}.</li>
          <li><b className="text-slate-800">Day 4:</b> idle. The cost so far grows by {inr(r2(DAILY))} and ₹ per kg rises to {inr(r2(rows[3].rate))}.</li>
          {withCover && <li><b className="text-slate-800">Day 5:</b> {rows[4].kgToDate} kg so far crosses the {MIX_COVER.kg} kg cover. The {rows[4].excess} kg beyond it earns ₹{MIX_COVER.rate} / kg = {inr(rows[4].extra)}, which joins the cost so far.</li>}
          <li><b className="text-slate-800">Day 6:</b> {last.kgToDate} kg so far shares {inr(Math.round(last.pool))}, so ₹ per kg is {inr(r2(last.rate))}. The dockets add up to the whole cost so far.</li>
        </ul>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Docket cost as of Day {MIX_DAYS}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Docket cost = ₹ per kg so far × its kg, whichever job it was on. Costs keep revising until month end, then they are final. Failed pickup cost = ₹0.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {jobs.map((j) => {
            const ds = MIX_DOCKETS.filter((d) => d.job === j)
            const total = ds.reduce((t, d) => t + d.kg * last.rate, 0)
            return (
              <div key={j} className={`rounded-xl border p-3 ${j === 'PRS/DRS' ? 'border-orange-200 bg-orange-50/60' : 'border-sky-200 bg-sky-50/60'}`}>
                <p className="flex items-baseline justify-between text-xs"><b className="text-slate-900">{j}</b><span className="font-semibold tabular-nums text-slate-900">{inr(Math.round(total))}</span></p>
                <ul className="mt-2 space-y-1">
                  {ds.map((d) => (
                    <li key={d.id} className="flex justify-between text-[11px] text-slate-600"><span>{d.id} · Day {d.day} · {d.kg} kg</span><span className="font-semibold tabular-nums text-slate-900">{inr(Math.round(d.kg * last.rate))}</span></li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Manifest cost = sum of its dockets. A job with no docket this month shows nothing and costs ₹0.</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Other cases</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li><b className="text-slate-800">Other “Fixed + …” types:</b> the same, with the deal’s own quantity (dockets, boxes, trips, ₹ freight, ₹ invoice) counted for the vehicle as a whole. The cost is still shared by kg.</li>
          <li><b className="text-slate-800">Fixed + Per Km:</b> the vehicle’s total km for the month (partner invoice, GPS or odometer) gives the cover and the excess. During the month a standard km is used and the month-end figure trues it up.</li>
          <li><b className="text-slate-800">No dockets yet this month:</b> the cost waits and is shared as soon as the first docket arrives.</li>
          <li><b className="text-slate-800">Month change:</b> cost and kg restart on the 1st.</li>
        </ul>
      </div>
    </div>
  )
}

export default function CostingMethod3() {
  const [tab, setTab] = useState('t1')
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Costing Method 3</h1>
      <div className="flex gap-2">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? pillActive : pillInactive}>{l}</button>)}
      </div>
      {tab === 't1' ? <Type1 /> : tab === 't2' ? <ManifestTab /> : tab === 't3' ? <MixTab /> : <CostingExperiment />}
    </div>
  )
}

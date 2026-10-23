import { useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'
import SimpleFlow from './SimpleFlow.jsx'
import Calculation from './Calculation.jsx'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

function Section({ n, title, sub, children }) {
  return (
    <section className={`p-5 ${card}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{n}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

const Chip = ({ children, tone = 'slate' }) => {
  const t = { slate: 'bg-slate-100 text-slate-600', orange: 'bg-orange-50 text-orange-700', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-600' }[tone]
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${t}`}>{children}</span>
}

/* Lifecycle: where revenue / cost attach to a docket */
const LIFECYCLE = [
  { step: 'Order booked', what: 'Revenue identified', src: 'Docket', basis: 'Billed freight (net of SLA deductions)', tone: 'green' },
  { step: 'Pickup', what: 'First-mile cost', src: 'Pickup / FM trip', basis: '% of revenue (commission) — partner is paid a share', tone: 'orange' },
  { step: 'Mid mile · source hub', what: 'Hub cost', src: 'Hub ops + rent', basis: '₹/kg/day × days the docket sat in the hub', tone: 'orange' },
  { step: 'Mid mile · trip', what: 'Feeder / line-haul cost', src: 'Trips · vendor invoices', basis: 'Trip cost shared by charged weight × km actually ridden', tone: 'orange' },
  { step: 'Mid mile · dest. hub', what: 'Hub cost', src: 'Hub ops + rent', basis: '₹/kg/day × dwell days', tone: 'orange' },
  { step: 'Last mile', what: 'Delivery cost', src: 'Delivery / LM trip', basis: '₹/kg (rate card)', tone: 'orange' },
]

/* Worked example for mid-mile */
const LEGS = [['A→B', 100], ['B→C', 150], ['C→D', 200], ['D→A (return)', 450]]
const RATE = 30
const STOPS = ['A', 'B', 'C', 'D']
const DOCKETS = [
  { id: 'DKT-1', from: 0, to: 2, kg: 400 },
  { id: 'DKT-2', from: 0, to: 3, kg: 600 },
  { id: 'DKT-3', from: 1, to: 3, kg: 300 },
]

function midMileExample() {
  const tripKm = LEGS.reduce((s, l) => s + l[1], 0)
  const tripCost = tripKm * RATE
  const fwd = LEGS.slice(0, 3).map((l) => l[1])
  const rows = DOCKETS.map((d) => {
    const km = fwd.slice(d.from, d.to).reduce((s, x) => s + x, 0)
    return { ...d, km, kgkm: d.kg * km }
  })
  const total = rows.reduce((s, r) => s + r.kgkm, 0)
  return { tripKm, tripCost, rows: rows.map((r) => ({ ...r, share: r.kgkm / total, cost: (r.kgkm / total) * tripCost })) }
}

const PNL = [
  { t: 'Gross revenue', k: 'rev' },
  { t: 'Deductions (SLA)', k: 'minus' },
  { t: 'Net revenue', k: 'sub' },
  { t: 'First-mile cost', k: 'cost' },
  { t: 'Mid-mile cost', k: 'cost' },
  { t: 'Last-mile cost', k: 'cost' },
  { t: 'Total transport cost', k: 'sub' },
  { t: 'Gross profit / margin', k: 'total' },
  { t: 'Hub handling', k: 'cost' },
  { t: 'Hub rent', k: 'cost' },
  { t: 'Hub other opex', k: 'cost' },
  { t: 'Total hub cost', k: 'sub' },
  { t: 'Contribution / margin', k: 'total' },
  { t: 'On-roll people', k: 'cost2' },
  { t: 'Corporate overheads', k: 'cost2' },
  { t: 'Customer claims', k: 'cost2' },
  { t: 'EBITDA', k: 'total' },
]

function Detail() {
  const ex = midMileExample()
  return (
    <div className="space-y-4">

      <Section n="1" title="The problem" sub="Revenue and cost live at different levels">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
            <p className="text-xs font-semibold text-emerald-700">Docket</p>
            <p className="mt-1 text-sm text-slate-700">Has revenue. Cost is not booked on it.</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
            <p className="text-xs font-semibold text-orange-700">Trip</p>
            <p className="mt-1 text-sm text-slate-700">Has cost. No revenue is allocated to it.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Hub / floor</p>
            <p className="mt-1 text-sm text-slate-700">Has cost (rent, people, handling). No revenue either.</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          <b>Goal:</b> docket revenue − docket cost = <b>docket P&amp;L</b>. So the work is to <b>push trip and hub cost down onto the dockets</b> that used them, with rules a business user can read in one line.
        </p>
      </Section>

      <Section n="2" title="One docket, start to finish" sub="Revenue is known on day 0; cost is picked up leg by leg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3 font-medium">Stage</th><th className="pr-3 font-medium">What attaches</th><th className="pr-3 font-medium">Comes from</th><th className="font-medium">How it reaches the docket</th>
              </tr>
            </thead>
            <tbody>
              {LIFECYCLE.map((r) => (
                <tr key={r.step} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-900">{r.step}</td>
                  <td className="pr-3"><Chip tone={r.tone}>{r.what}</Chip></td>
                  <td className="pr-3 text-slate-600">{r.src}</td>
                  <td className="text-slate-600">{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="3" title="Mid-mile: share a trip by charged weight × km ridden" sub="Whiteboard: A→B→C→D→A loop, ₹/km × km = ₹/trip, then segment km split">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Trip cost = rate (₹/km) × total km of the loop — or the flat ₹/trip if the vendor bills that way.</li>
          <li>Split the loop into segments (A→B, B→C, C→D, and the return D→A).</li>
          <li>Each docket rides only some segments. Its share = <b>charged weight × km it rode</b> ÷ the sum of the same for all dockets on the trip.</li>
          <li>The empty return is not free — it stays inside the trip cost, so loaded dockets carry it.</li>
        </ol>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">Worked example · sample numbers</p>
        <div className="mt-1 text-sm text-slate-600">
          Loop {LEGS.map((l) => `${l[0]} ${l[1]} km`).join(' · ')} = <b>{ex.tripKm} km</b> × ₹{RATE}/km = <b>{inr(ex.tripCost)}</b>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-2 font-medium">Docket</th><th className="font-medium">Route</th><th className="text-right font-medium">Charged kg</th><th className="text-right font-medium">Km ridden</th><th className="text-right font-medium">Kg × km</th><th className="text-right font-medium">Share</th><th className="text-right font-medium">Mid-mile cost</th><th className="text-right font-medium">₹/kg</th>
              </tr>
            </thead>
            <tbody>
              {ex.rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-medium text-slate-900">{r.id}</td>
                  <td className="text-slate-600">{STOPS[r.from]}→{STOPS[r.to]}</td>
                  <td className="text-right">{r.kg}</td><td className="text-right">{r.km}</td><td className="text-right">{r.kgkm.toLocaleString('en-IN')}</td>
                  <td className="text-right">{(r.share * 100).toFixed(1)}%</td><td className="text-right font-medium text-slate-900">{inr(r.cost)}</td><td className="text-right">{(r.cost / r.kg).toFixed(1)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-300 font-semibold text-slate-900">
                <td className="py-2" colSpan={6}>Total allocated</td><td className="text-right">{inr(ex.rows.reduce((s, r) => s + r.cost, 0))}</td><td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Check: allocated total always equals the trip cost — nothing is lost or double-counted. Manifest weight is what ties a docket to a trip.</p>
      </Section>

      <Section n="4" title="First mile, last mile, handling" sub="Known rate cards — apply directly, no sharing needed">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['First mile', '% of revenue', 'Partner commission on the docket’s billed freight.'],
            ['Last mile', '₹ / kg', 'Delivery rate × docket chargeable weight.'],
            ['Handling', '₹ / kg (trip level)', 'Loading / unloading billed per trip, spread by charged weight.'],
          ].map(([a, b, c]) => (
            <div key={a} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{a}</p>
              <p className="mt-0.5"><Chip tone="orange">{b}</Chip></p>
              <p className="mt-1.5 text-xs text-slate-600">{c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section n="5" title="Hub cost: fixed + variable, blended into ₹/kg/day" sub="Second board — a hub is a space-and-time resource">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p><b>Fixed</b> — rent, supervisors, utilities. Same whether the floor is full or empty.</p>
            <p><b>Variable</b> — handling, sortation, waiting/detention charges, other opex. Moves with volume.</p>
            <p><b>Blend</b> — add them up and divide by the hub’s <b>kg-days</b> for the month. That gives one ₹/kg/day.</p>
            <p>A docket then pays <b>kg × days it stayed</b> × ₹/kg/day. Sit 3 days, pay for 3 days; leave in under 24 h, pay ~0 of the waiting part.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">What sets a hub’s capacity</p>
            <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700">
              <li>Sq ft &amp; aspect ratio</li><li>Handler count</li><li>Bay count</li><li>Day-of-week seasonality</li><li>Festival peaks</li><li>Pallet load (500 kg; PTL-adjusted 300 kg)</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">Rule of thumb on the board: ~20 sq ft per tonne-per-minute… to be confirmed, see open questions.</p>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm tabular-nums">
            <thead><tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400"><th className="py-2 font-medium">Day on floor</th><th className="text-right font-medium">Kg</th><th className="text-right font-medium">Days waited</th><th className="text-right font-medium">Kg-days</th></tr></thead>
            <tbody>
              {[['Day 1', 200, 1], ['Day 2', 700, 3], ['Day 10', 2000, 0]].map(([d, kg, w]) => (
                <tr key={d} className="border-b border-slate-100 last:border-0"><td className="py-1.5 text-slate-600">{d}</td><td className="text-right">{kg}</td><td className="text-right">{w === 0 ? '< 24 h (0)' : w}</td><td className="text-right font-medium text-slate-900">{(kg * w).toLocaleString('en-IN')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="6" title="The P&amp;L ladder this feeds" sub="Docket-level rows roll up to trip, lane, hub, client, company">
        <div className="grid gap-x-8 sm:grid-cols-2">
          <div className="divide-y divide-slate-100">
            {PNL.map((r) => (
              <div key={r.t} className={`flex items-center justify-between py-1.5 text-sm ${r.k === 'total' ? 'font-semibold text-slate-900' : r.k === 'sub' ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                <span className={r.k === 'cost' || r.k === 'cost2' ? 'pl-3' : ''}>{r.t}</span>
                <span className="flex gap-1">
                  {r.k === 'total' && <Chip tone="green">margin</Chip>}
                  {r.k === 'cost2' && <Chip>not allocated to docket</Chip>}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <p><b>Docket P&amp;L</b> stops at <b>Contribution</b> — everything above the wavy line on the board is directly caused by the docket. People, overheads and claims are company level, and only show from EBITDA.</p>
            <p><b>Every line is shown four ways:</b> ₹, ₹/kg, ₹/km, and % of revenue (₹/month for fixed items).</p>
            <p><b>Sources</b></p>
            <ul className="list-disc space-y-0.5 pl-5 text-slate-600">
              <li>Revenue — Docket, Customer Invoice</li>
              <li>Cost — Trips, THC, Vendor Invoices</li>
              <li>Hub — Warehouse &amp; Hub Ops, rent masters</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section n="7" title="Open questions" sub="To settle before building the engine">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Empty return leg: carried by all loaded dockets (as above), or only by the dockets going to the farthest stop?</li>
          <li>Provisional vs final: dockets need a cost on delivery day, but vendor invoices arrive weeks later — estimate from rate card, then true-up?</li>
          <li>Hub ₹/kg/day: computed monthly per hub, or one rolling rate?</li>
          <li>Where the “20 sq ft per TPM” hub-capacity rule should apply.</li>
        </ul>
      </Section>
    </div>
  )
}

const TABS = [['simple', 'Simple FLOW'], ['calc', 'Calculation'], ['detail', 'Concept']]

export default function CostingConcept() {
  const [tab, setTab] = useState('simple')
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Concept 1</h1>
        <p className="mt-1 text-sm text-slate-500">How FLOW arrives at cost and profit for every docket — simple enough to run, real enough to decide on.</p>
      </div>
      <div className="flex gap-2">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? pillActive : pillInactive}>{l}</button>)}
      </div>
      {tab === 'simple' ? <SimpleFlow /> : tab === 'calc' ? <Calculation /> : <Detail />}
    </div>
  )
}

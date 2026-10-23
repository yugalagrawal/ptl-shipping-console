import { Fragment, useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'

// Hub Cost Method — ideation page. Everything except the road cost (that is Level 1 Cost).
// Hub pool (fixed + variable lines) → three charges (Sortation · Waiting · Other OPEX) → each has its own driver → docket.
const inr = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const HUB_TYPES = [
  ['Own hub', 'Cost comes from the hub’s own ledger. Each bill is tagged Fixed or Variable.'],
  ['Mini hub (partner-run, monthly deal)', 'One monthly bill, like a fixed truck deal. Same cumulative method as Level 1 Cost: cost so far ÷ kg so far, with cover and variable after cover. Its bill is the hub’s cost.'],
  ['Partner hub (per kg / per docket rate)', 'Docket based. The rate is the docket’s hub cost directly. Nothing to share.'],
]

const field = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-800 outline-none focus:border-slate-400'
const lbl = 'mb-0.5 block text-[11px] text-slate-400'
const Num = ({ label, value, onChange }) => (
  <label className="block"><span className={lbl}>{label}</span>
    <input type="number" min="0" value={value} onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} className={field} /></label>
)

function Arrow({ label }) {
  return (
    <div className="flex flex-col items-center py-1.5 text-slate-300">
      <span className="h-3 w-px bg-slate-300" />
      {label && <span className="my-0.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">{label}</span>}
      <span className="text-sm leading-none">▼</span>
    </div>
  )
}

function Structure() {
  const box = 'rounded-xl border px-3 py-2.5 text-center'
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">How a hub’s cost reaches a docket</p>
      <p className="mt-1 text-xs text-slate-500">One running total of what the hub has cost this month, shared by weight. No bill needs to be tagged or split. A docket that stays beyond 24 hours counts for a little extra weight for each extra day, so it pays more. Transport cost is already in Level 1.</p>

      <div className="mt-4 flex flex-col items-center">
        <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <div className={`${box} border-slate-300 bg-slate-100`}>
            <p className="text-sm font-semibold text-slate-900">Fixed cost</p>
            <p className="text-[11px] text-slate-600">Monthly fixed ÷ calendar days in the month = cost per day, added every day</p>
            <p className="mt-1 text-[11px] text-slate-500">rent · salaries · security · electricity</p>
          </div>
          <div className={`${box} border-slate-300 bg-slate-100`}>
            <p className="text-sm font-semibold text-slate-900">Variable cost</p>
            <p className="text-[11px] text-slate-600">Added day by day, as it comes</p>
            <p className="mt-1 text-[11px] text-slate-500">e.g. extra labour ₹5,000 today</p>
          </div>
        </div>
        <Arrow label="add both" />

        <div className={`${box} w-full max-w-3xl border-slate-900 bg-slate-900 text-white`}>
          <p className="text-sm font-semibold">Total hub cost so far this month</p>
          <p className="text-[11px] text-slate-300">Fixed so far + variable so far. Always running.</p>
        </div>
        <Arrow label="divide by weight so far" />

        <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <div className={`${box} border-slate-200 bg-white`}>
            <p className="text-sm font-semibold text-slate-900">Weight of all dockets so far</p>
            <p className="text-[11px] text-slate-600">Every docket counts its kg once</p>
          </div>
          <div className={`${box} border-sky-200 bg-sky-50/60`}>
            <p className="text-sm font-semibold text-slate-900">+ Waiting weight</p>
            <p className="text-[11px] text-slate-600">After 24 h in the hub, each extra day adds kg × waiting factor</p>
          </div>
        </div>
        <Arrow label="gives a price per kg so far" />

        <div className={`${box} w-full max-w-sm border-slate-300 bg-white`}>
          <p className="text-sm font-semibold text-slate-900">Hub cost per kg so far</p>
          <p className="text-[11px] text-slate-600">Updated every day. Same price for every docket.</p>
        </div>
        <Arrow label="docket pays price × (its kg + its waiting weight)" />

        <div className={`${box} w-full max-w-[18rem] border-orange-500 bg-orange-500 text-white`}>
          <p className="text-sm font-semibold">Docket’s hub cost</p>
          <p className="text-[11px] text-orange-50">Longer in the hub, higher cost</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-3">
        <p className="text-xs font-semibold text-slate-900">The waiting factor</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">The first 24 hours are free. For each extra day after that (each started day), the docket’s weight grows by <b className="text-slate-800">kg × waiting factor</b>.</p>
        <div className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white">
          Waiting factor ≈ <b>Space cost</b> ÷ (<b>Space cost</b> + <b>Work cost</b>)
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Space cost is the part of hub cost that comes from time spent in the hub (rent, floor space). Work cost is the rest (handling, labour). The factor is set for each hub in its configuration, as an approximate number close to this formula, for example 0.3 if about 30% of the hub’s cost is space. It is a rough figure, not a calculation done on every bill, so no bill needs to be tagged.</p>
        <div className="mt-2 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">Docket A:</b> 100 kg, leaves in 20 h. No extra day, so it counts 100 kg.</div>
          <div className="rounded-lg bg-sky-50/60 px-3 py-2"><b className="text-slate-800">Docket B:</b> 100 kg, stays 72 h = 2 extra days. At factor 0.5 it counts 100 + 50 + 50 = 200 kg, so it pays 2× A.</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
        <p className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">Same method as Level 1:</b> cost so far ÷ weight so far.</p>
        <p className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">Nothing extra is created:</b> waiting weight only moves a bigger share of the same hub cost to the dockets that wait.</p>
        <p className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">End of month:</b> the price stops changing and the cost is final.</p>
      </div>
    </div>
  )
}

const DAYS10 = Array.from({ length: 10 }, (_, i) => i + 1)
const SAMPLE = [
  { id: 'A', day: 1, kg: 500, stay: 0 },
  { id: 'B', day: 1, kg: 800, stay: 4 },
  { id: 'C', day: 2, kg: 300, stay: 1 },
  { id: 'D', day: 3, kg: 1200, stay: 0 },
  { id: 'E', day: 4, kg: 600, stay: 5 },
  { id: 'F', day: 5, kg: 400, stay: 2 },
  { id: 'G', day: 6, kg: 900, stay: 0 },
  { id: 'H', day: 7, kg: 700, stay: 3 },
  { id: 'I', day: 8, kg: 500, stay: 0 },
  { id: 'J', day: 9, kg: 1000, stay: 1 },
]

function Tile({ label, value, sub, tone = 'bg-slate-50' }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tone}`}>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

function MiniBars({ title, values, fmt, day, onPick, tone }) {
  const max = Math.max(...values, 1)
  return (
    <div>
      <p className="text-xs font-semibold text-slate-800">{title}</p>
      <div className="mt-2 flex h-28 items-end gap-1.5">
        {values.map((v, i) => (
          <button key={i} onClick={() => onPick(i + 1)} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Day ${i + 1}: ${fmt(v)}`}>
            <span className={`text-[10px] tabular-nums ${day === i + 1 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{day === i + 1 ? fmt(v) : ''}</span>
            <span className={`w-full rounded-t ${day === i + 1 ? tone : 'bg-slate-200 group-hover:bg-slate-300'}`} style={{ height: `${Math.max(4, (v / max) * 78)}%` }} />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">{values.map((_, i) => <span key={i} className={`flex-1 text-center text-[10px] ${day === i + 1 ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{i + 1}</span>)}</div>
    </div>
  )
}

function Example() {
  const [monthly, setMonthly] = useState(300000)
  const [calDays, setCalDays] = useState(30)
  const [factor, setFactor] = useState(0.3)
  const [vari, setVari] = useState([0, 2000, 0, 5000, 0, 0, 3000, 0, 0, 1000])
  const [dockets, setDockets] = useState(SAMPLE)
  const [day, setDay] = useState(10)
  const upd = (i, k, v) => setDockets((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: v } : d)))
  const perDay = monthly / (calDays || 1)

  // First 24 h free, then each started day waited counts as an extra day.
  const extraAt = (d, n) => Math.max(0, Math.min(n - d.day, d.stay) - 1)
  const wt = (d, n) => d.kg * (1 + factor * extraAt(d, n))
  const days = DAYS10.map((n) => {
    const fixed = perDay * n
    const variable = vari.slice(0, n).reduce((t, v) => t + v, 0)
    const cost = fixed + variable
    const here = dockets.filter((d) => d.day <= n)
    const kg = here.reduce((t, d) => t + d.kg, 0)
    const eff = here.reduce((t, d) => t + wt(d, n), 0)
    return { n, fixed, variable, cost, kg, eff, price: eff ? cost / eff : 0 }
  })
  const cur = days[day - 1]
  const rows = dockets.filter((d) => d.day <= day).map((d) => {
    const extra = extraAt(d, day)
    const eff = wt(d, day)
    return { ...d, extra, eff, cost: cur.price * eff, byWeight: cur.price * d.kg }
  })
  const sum = rows.reduce((t, r) => t + r.cost, 0)
  const maxCost = Math.max(...rows.map((r) => r.cost), 1)
  const waitKg = cur.eff - cur.kg
  const th = 'py-1.5 pr-3 text-right font-medium'
  const td = 'py-2 pr-3 text-right tabular-nums text-slate-600'

  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Example — one hub, 10 days</p>
        <p className="mt-1 text-xs text-slate-500">Sample numbers, change anything. Each day: total hub cost so far ÷ weight so far = price per kg. A docket pays price × its weight, and dockets that stay beyond 24 hours count for extra weight.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Num label="Monthly fixed cost (₹)" value={monthly} onChange={setMonthly} />
          <Num label="Calendar days in the month" value={calDays} onChange={setCalDays} />
          <Num label="Waiting factor (per extra day)" value={factor} onChange={setFactor} step="0.05" />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Fixed per day = {inr(monthly)} ÷ {calDays} = <b className="text-slate-800">{inr(perDay)}</b></p>

        <p className="mt-3 text-[11px] font-medium text-slate-500">Variable cost added each day (₹), for example extra labour</p>
        <div className="mt-1 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {DAYS10.map((n, i) => (
            <label key={n} className="block"><span className="mb-0.5 block text-center text-[10px] text-slate-400">Day {n}</span>
              <input type="number" min="0" value={vari[i]} onChange={(e) => setVari(vari.map((v, j) => (j === i ? Math.max(0, parseFloat(e.target.value) || 0) : v)))} className={`${field} text-center`} /></label>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-medium text-slate-500">Dockets (stays: days in the hub after arriving; 0 or 1 = within the free 24 h)</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {dockets.map((d, i) => (
            <div key={d.id} className="rounded-xl border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-800">Docket {d.id}</p>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                <label className="block"><span className="block text-[10px] text-slate-400">Arrives</span><input type="number" min="1" max="10" value={d.day} onChange={(e) => upd(i, 'day', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} className={field} /></label>
                <label className="block"><span className="block text-[10px] text-slate-400">Kg</span><input type="number" min="0" value={d.kg} onChange={(e) => upd(i, 'kg', Math.max(0, parseFloat(e.target.value) || 0))} className={field} /></label>
                <label className="block"><span className="block text-[10px] text-slate-400">Stays</span><input type="number" min="0" max="10" value={d.stay} onChange={(e) => upd(i, 'stay', Math.max(0, parseInt(e.target.value) || 0))} className={field} /></label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Result as of Day {day}</p>
          <div className="flex flex-wrap gap-1.5">{DAYS10.map((n) => <button key={n} onClick={() => setDay(n)} className={day === n ? pillActive : pillInactive}>Day {n}</button>)}</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Total hub cost so far" value={inr(cur.cost)} sub={`${inr(cur.fixed)} fixed + ${inr(cur.variable)} variable`} tone="bg-slate-900 text-white [&_p]:!text-white [&_p:nth-child(2)]:!text-white" />
          <Tile label="Weight so far" value={`${cur.kg.toLocaleString('en-IN')} kg`} sub={`${rows.length} dockets`} />
          <Tile label="Waiting weight" value={`+ ${Math.round(waitKg).toLocaleString('en-IN')} kg`} sub="from dockets past 24 h" tone="bg-sky-50" />
          <Tile label="Price per kg so far" value={cur.eff ? inr(cur.price) : '—'} sub={`${inr(cur.cost)} ÷ ${Math.round(cur.eff).toLocaleString('en-IN')} kg`} tone="bg-orange-50" />
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">No docket has arrived yet. The cost so far waits and is shared once the first docket arrives.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-400">
                  <th className="py-1.5 pr-3 font-medium">Docket</th><th className={th}>Kg</th><th className={th}>Waited</th><th className={th}>Counts as</th><th className={th}>Hub cost</th><th className={th}>₹ per kg</th><th className="w-40 py-1.5 font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{r.id}</td>
                    <td className={td}>{r.kg}</td>
                    <td className="py-2 pr-3 text-right">{r.extra ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">{r.extra} extra {r.extra === 1 ? 'day' : 'days'}</span> : <span className="text-slate-300">free</span>}</td>
                    <td className={td}>{Math.round(r.eff).toLocaleString('en-IN')} kg</td>
                    <td className={`${td} font-semibold text-slate-900`}>{inr(r.cost)}</td>
                    <td className={td}>{inr(r.cost / r.kg)}</td>
                    <td className="py-2">
                      <div className="flex h-2.5 w-40 overflow-hidden rounded-full bg-slate-100">
                        <span className="bg-orange-400" style={{ width: `${(r.byWeight / maxCost) * 100}%` }} />
                        <span className="bg-sky-400" style={{ width: `${((r.cost - r.byWeight) / maxCost) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="text-slate-500">
                  <td className="py-2 pr-3 font-medium">All dockets</td><td className={td}>{cur.kg.toLocaleString('en-IN')}</td><td /><td className={td}>{Math.round(cur.eff).toLocaleString('en-IN')} kg</td>
                  <td className={`${td} font-semibold text-slate-900`}>{inr(sum)}</td><td /><td className="py-2 text-[11px] text-emerald-700">= total hub cost so far ✓</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" />Cost by weight</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Extra for waiting</span>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">Docket cost = price per kg so far × (its kg + its own waiting weight). Costs keep revising each day and are final at month end. Pick a day to see how it looked then.</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Over the 10 days</p>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <MiniBars title="Total hub cost so far (₹)" values={days.map((d) => d.cost)} fmt={(v) => inr(Math.round(v))} day={day} onPick={setDay} tone="bg-slate-800" />
          <MiniBars title="Price per kg so far (₹)" values={days.map((d) => d.price)} fmt={(v) => inr(v)} day={day} onPick={setDay} tone="bg-orange-500" />
        </div>
        <p className="mt-3 text-[11px] text-slate-400">The price per kg falls on days with a lot of new weight and rises on quiet days and when dockets keep waiting. Click a bar to jump to that day.</p>
      </div>
    </div>
  )
}

function Rules() {
  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Rules so far</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li><b className="text-slate-800">Fixed cost:</b> monthly fixed ÷ calendar days in that month = cost per day, added every day.</li>
          <li><b className="text-slate-800">Variable cost:</b> added day by day as it comes (for example extra labour of ₹5,000).</li>
          <li><b className="text-slate-800">Total hub cost so far</b> = fixed so far + variable so far. No tagging or splitting of bills.</li>
          <li><b className="text-slate-800">Method:</b> same as Level 1. Price per kg so far = total hub cost so far ÷ weight so far. Docket pays price × its weight.</li>
          <li><b className="text-slate-800">Waiting:</b> the first 24 h in the hub are free. For each extra day (each started day), the docket’s weight grows by kg × waiting factor, so it takes a bigger share.</li>
          <li><b className="text-slate-800">Waiting factor</b> ≈ Space cost ÷ (Space cost + Work cost). One approximate number per hub, set in the hub’s configuration to be close to this formula (for example 0.3 if about 30% of hub cost is space). It is a rough figure, so no bill needs to be tagged.</li>
          <li><b className="text-slate-800">Every hub touched:</b> a docket pays at each hub it passes through.</li>
          <li><b className="text-slate-800">Failed pickup:</b> ₹0, as in Level 1.</li>
          <li><b className="text-slate-800">Month end:</b> the price stops changing and docket cost is final.</li>
        </ul>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Own hub, mini hub, partner hub</p>
        <div className="mt-3 space-y-2">
          {HUB_TYPES.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold text-slate-900">{t}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-600">{d}</p></div>
          ))}
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Still to decide</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li>· Waiting factor: who sets each hub’s number, and how often is it reviewed? Should it rise on later days?</li>
          <li>· Waiting clock: inbound scan to outbound scan at the hub?</li>
          <li>· Transit hub: one touch or two (in and out)?</li>
          <li>· Idle hub days: absorbed by the month’s dockets or shown separately?</li>
        </ul>
      </div>
    </div>
  )
}

export default function HubCostMethod() {
  const [tab, setTab] = useState('s')
  const tabs = [['s', 'Structure'], ['t', 'Example'], ['r', 'Rules']]
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Level 2 Cost</h1>
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Level 2 cost = hub cost</p>
        <p className="mt-1 text-xs text-slate-500">All direct cost of operating the hubs a docket passes through: facility, labour and handling. Transport cost is excluded and sits in Level 1.</p>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2">
          <div className="rounded-xl border px-3 py-2 border-slate-300 bg-slate-100 text-slate-900">
            <p className="text-sm font-semibold">Level 1 margin</p>
            <p className="text-[11px] opacity-80">Net revenue minus Level 1 cost</p>
          </div>
          <div className="rounded-xl border px-3 py-2 border-sky-200 bg-sky-50/60 text-slate-900">
            <p className="text-sm font-semibold">− Level 2 cost (hub cost)</p>
            <p className="text-[11px] opacity-80">Facility, labour and handling at the hubs the docket touches</p>
          </div>
          <div className="rounded-xl border px-3 py-2 border-orange-500 bg-orange-500 text-white">
            <p className="text-sm font-semibold">= Level 2 margin</p>
            <p className="text-[11px] opacity-80">Before indirect cost (Level 3)</p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-medium text-slate-600">Level 2 cost = hub cost of every hub the docket touches. How it is attributed is under ideation in the tabs below.</p>
      </div>
      <div className="flex gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? pillActive : pillInactive}>{l}</button>)}</div>
      {tab === 's' && <Structure />}
      {tab === 't' && <Example />}
      {tab === 'r' && <Rules />}
    </div>
  )
}

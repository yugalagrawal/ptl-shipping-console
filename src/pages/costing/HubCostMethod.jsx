import { Fragment, useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'

// Warehouse Cost Method — ideation page. Everything except the road cost (that is Level 1 Cost).
// Hub pool (fixed + variable) → split by Hub factor (sortation hours ÷ 24) → Sortation (by kg) + Storage (by kg-hours beyond sortation hours) → docket.
const inr = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const HUB_TYPES = [
  ['Own hub', 'Cost comes from the hub’s own ledger. Each bill is tagged Fixed or Variable.'],
  ['Mini hub (partner-run, monthly deal)', 'One monthly bill, like a fixed truck deal. Same cumulative method as Level 1 Cost: cost so far ÷ kg so far, with cover and variable after cover. Its bill is the hub’s cost.'],
  ['Partner hub (per kg / per docket rate)', 'Docket based. The rate is the docket’s warehouse cost directly. Nothing to share.'],
]

const field = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-800 outline-none focus:border-slate-400'
const lbl = 'mb-0.5 block text-[11px] text-slate-400'
const Num = ({ label, value, onChange }) => (
  <label className="block"><span className={lbl}>{label}</span>
    <input type="number" min="0" value={value} onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} className={field} /></label>
)

function Arrow({ label, note }) {
  return (
    <div className="flex flex-col items-center py-1.5 text-slate-300">
      <span className="h-3 w-px bg-slate-300" />
      {label && (
        <div className="my-0.5 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">{label}</span>
          {note && <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-medium text-white">{note}</span>}
        </div>
      )}
      <span className="text-sm leading-none">▼</span>
    </div>
  )
}

function Structure() {
  const box = 'rounded-xl border px-3 py-2.5 text-center'
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">How a hub’s cost reaches a docket</p>
      <p className="mt-1 text-xs text-slate-500">One running total of what the hub has cost this month, split into Sortation cost and Storage cost by the Hub factor. Sortation is shared by weight. Storage is shared by kg-hours, and only hours beyond the sortation hours count. Transport cost is already in Level 1.</p>

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
          <p className="text-sm font-semibold">Total warehouse cost so far this month</p>
          <p className="text-[11px] text-slate-300">Fixed so far + variable so far. Always running.</p>
        </div>
        <Arrow label="split by Hub factor" note="Hub factor = sortation hours / 24" />

        <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <div className={`${box} border-orange-200 bg-orange-50/60`}>
            <p className="text-sm font-semibold text-slate-900">A. Sortation cost</p>
            <p className="text-[11px] text-slate-600">Total × Hub factor</p>
          </div>
          <div className={`${box} border-sky-200 bg-sky-50/60`}>
            <p className="text-sm font-semibold text-slate-900">B. Storage cost</p>
            <p className="text-[11px] text-slate-600">Total × (1 − Hub factor)</p>
          </div>
        </div>
        <Arrow label="each shared with its own driver" />

        <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <div className={`${box} border-slate-200 bg-white`}>
            <p className="text-sm font-semibold text-slate-900">By weight</p>
            <p className="text-[11px] text-slate-600">Sortation cost so far ÷ weight of all dockets so far = price per kg. Docket pays price × its kg.</p>
          </div>
          <div className={`${box} border-slate-200 bg-white`}>
            <p className="text-sm font-semibold text-slate-900">By kg-hours</p>
            <p className="text-[11px] text-slate-600">Storage cost so far ÷ all dockets’ kg-hours so far = price per kg-hour. Docket pays price × its kg × hours beyond the sortation hours.</p>
          </div>
        </div>
        <Arrow label="add the two" />

        <div className={`${box} w-full max-w-[18rem] border-orange-500 bg-orange-500 text-white`}>
          <p className="text-sm font-semibold">Docket’s warehouse cost</p>
          <p className="text-[11px] text-orange-50">Sortation + storage. Longer in the hub, higher cost</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-3">
        <p className="text-xs font-semibold text-slate-900">The Hub factor</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Set for each hub as a number from 1/24 to 24/24: the hours of the day the hub spends on sortation, out of the 24 hours of the day. A hub with <b className="text-slate-800">16 sortation hours</b> has a Hub factor of <b className="text-slate-800">16/24</b>. A docket that leaves within the sortation hours is not charged for storage.</p>
        <div className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white">
          Hub factor = <b>Sortation hours</b> ÷ <b>Total hours of the day (24)</b> · Sortation = Total × Hub factor · Storage = Total × (1 − Hub factor)
        </div>
        <div className="mt-2 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">24/24 (24 sortation hours):</b> all cost is Sortation, shared by weight. No storage cost.</div>
          <div className="rounded-lg bg-sky-50/60 px-3 py-2"><b className="text-slate-800">16/24 (16 sortation hours):</b> two thirds is Sortation by weight. One third is Storage, shared only by dockets that stay beyond 16 h.</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
        <p className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">Same method as Level 1:</b> cost so far ÷ driver so far, revised every day.</p>
        <p className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">Nothing extra is created:</b> the two pools always add up to the total warehouse cost.</p>
        <p className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-800">End of month:</b> the prices stop changing and the cost is final.</p>
      </div>
    </div>
  )
}

const DAYS10 = Array.from({ length: 10 }, (_, i) => i + 1)
// hrs = total hours the docket stays in the hub from arrival.
const SAMPLE = [
  { id: 'A', day: 1, kg: 500, hrs: 10 },
  { id: 'B', day: 1, kg: 800, hrs: 96 },
  { id: 'C', day: 2, kg: 300, hrs: 30 },
  { id: 'D', day: 3, kg: 1200, hrs: 20 },
  { id: 'E', day: 4, kg: 600, hrs: 120 },
  { id: 'F', day: 5, kg: 400, hrs: 48 },
  { id: 'G', day: 6, kg: 900, hrs: 12 },
  { id: 'H', day: 7, kg: 700, hrs: 72 },
  { id: 'I', day: 8, kg: 500, hrs: 8 },
  { id: 'J', day: 9, kg: 1000, hrs: 36 },
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
  const [free, setFree] = useState(16)
  const [mlen, setMlen] = useState(3)
  const [vari, setVari] = useState([0, 2000, 0, 5000, 0, 0, 3000, 0, 0, 1000])
  const [dockets, setDockets] = useState(SAMPLE)
  const [day, setDay] = useState(10)
  const upd = (i, k, v) => setDockets((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: v } : d)))
  const perDay = monthly / (calDays || 1)
  const hubFactor = free / 24
  const ml = Math.min(9, Math.max(1, mlen)) // last day of Month 1 inside this 10-day window
  const dateOf = (n) => (n <= ml ? Math.max(1, calDays - ml + n) : n - ml)
  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th')

  // Hours in the hub by the end of day n, and the part of it beyond the sortation hours.
  // The clock runs straight through the month end.
  const hoursAt = (d, n) => Math.max(0, Math.min(d.hrs, (n - d.day + 1) * 24))
  const billAt = (d, n) => Math.max(0, hoursAt(d, n) - free)
  // One month's pool, counted from its first day s up to day e. Each month starts again from zero.
  const pool = (m, e) => {
    const s = m === 1 ? 1 : ml + 1
    const fixed = perDay * (e - s + 1)
    const variable = vari.slice(s - 1, e).reduce((t, v) => t + v, 0)
    const cost = fixed + variable
    const sort = cost * hubFactor
    const stor = cost - sort
    const kg = dockets.filter((d) => d.day >= s && d.day <= e).reduce((t, d) => t + d.kg, 0) // sortation: arrival month
    const kgh = dockets.filter((d) => d.day <= e).reduce((t, d) => t + d.kg * (billAt(d, e) - billAt(d, s - 1)), 0) // storage: hours inside this month
    return { m, s, e, fixed, variable, cost, sort, stor, kg, kgh, sortPrice: kg ? sort / kg : 0, storPrice: kgh ? stor / kgh : 0 }
  }
  const days = DAYS10.map((n) => ({ n, ...pool(n <= ml ? 1 : 2, n) }))
  const cur = days[day - 1]
  const m1 = pool(1, Math.min(day, ml)) // Month 1 is final once day passes its last day
  const m2 = day > ml ? cur : null
  const rows = dockets.filter((d) => d.day <= day).map((d) => {
    const sort = (d.day <= ml ? m1 : m2).sortPrice * d.kg
    const stor1 = m1.storPrice * d.kg * (billAt(d, m1.e) - billAt(d, 0))
    const stor2 = m2 ? m2.storPrice * d.kg * (billAt(d, day) - billAt(d, ml)) : 0
    return { ...d, hours: hoursAt(d, day), bill: billAt(d, day), sort, stor1, stor2, cost: sort + stor1 + stor2 }
  })
  const sum = rows.reduce((t, r) => t + r.cost, 0)
  const unshared = m1.cost + (m2 ? m2.cost : 0) - sum
  const maxCost = Math.max(...rows.map((r) => r.cost), 1)
  const th = 'py-1.5 pr-3 text-right font-medium'
  const td = 'py-2 pr-3 text-right tabular-nums text-slate-600'
  const money = (v) => (v > 0.005 ? inr(v) : <span className="text-slate-300">—</span>)

  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Example — one hub, 10 days across a month end</p>
        <p className="mt-1 text-xs text-slate-500">Sample numbers, change anything. Each month has its own cost pool that starts from zero on the 1st. Sortation is shared by kg in the month the docket arrives. Storage is shared by kg-hours, in the month those hours fall. A docket that stays over the month end pays storage to both months.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Num label="Monthly fixed cost (₹)" value={monthly} onChange={setMonthly} />
          <Num label="Calendar days in the month" value={calDays} onChange={setCalDays} />
          <Num label="Sortation hours (1 to 24)" value={free} onChange={(v) => setFree(Math.min(24, Math.max(1, Math.round(v))))} />
          <Num label="Days of Month 1 in this window (1 to 9)" value={mlen} onChange={(v) => setMlen(Math.min(9, Math.max(1, Math.round(v))))} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Fixed per day = {inr(monthly)} ÷ {calDays} = <b className="text-slate-800">{inr(perDay)}</b> · Hub factor = {free} sortation hours ÷ 24 = <b className="text-slate-800">{Math.round(hubFactor * 1000) / 10}%</b> Sortation, {Math.round((1 - hubFactor) * 1000) / 10}% Storage · Day 1 = {ord(dateOf(1))}, the month ends after Day {ml} ({ord(dateOf(ml))}), Day {ml + 1} = 1st of the next month</p>

        <p className="mt-3 text-[11px] font-medium text-slate-500">Variable cost added each day (₹), for example extra labour</p>
        <div className="mt-1 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {DAYS10.map((n, i) => (
            <label key={n} className="block"><span className="mb-0.5 block text-center text-[10px] text-slate-400">Day {n} · {ord(dateOf(n))}</span>
              <input type="number" min="0" value={vari[i]} onChange={(e) => setVari(vari.map((v, j) => (j === i ? Math.max(0, parseFloat(e.target.value) || 0) : v)))} className={`${field} text-center`} /></label>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-medium text-slate-500">Dockets (hours = total time the docket stays in the hub after arriving)</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {dockets.map((d, i) => (
            <div key={d.id} className="rounded-xl border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-800">Docket {d.id}</p>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                <label className="block"><span className="block text-[10px] text-slate-400">Arrives</span><input type="number" min="1" max="10" value={d.day} onChange={(e) => upd(i, 'day', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} className={field} /></label>
                <label className="block"><span className="block text-[10px] text-slate-400">Kg</span><input type="number" min="0" value={d.kg} onChange={(e) => upd(i, 'kg', Math.max(0, parseFloat(e.target.value) || 0))} className={field} /></label>
                <label className="block"><span className="block text-[10px] text-slate-400">Hours</span><input type="number" min="0" value={d.hrs} onChange={(e) => upd(i, 'hrs', Math.max(0, parseFloat(e.target.value) || 0))} className={field} /></label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Result as of Day {day} · {ord(dateOf(day))} · Month {day <= ml ? 1 : 2}</p>
          <div className="flex flex-wrap gap-1.5">{DAYS10.map((n) => <button key={n} onClick={() => setDay(n)} className={`${day === n ? pillActive : pillInactive} ${n === ml + 1 ? 'ml-2' : ''}`}>Day {n}</button>)}</div>
        </div>
        {m2 && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><b className="text-slate-800">Month 1 closed after Day {ml}, now final:</b> total {inr(m1.cost)} = sortation {inr(m1.sort)} + storage {inr(m1.stor)}. The tiles below are Month 2’s pool, started from zero.</p>}

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label={`Month ${cur.m} warehouse cost so far`} value={inr(cur.cost)} sub={`${inr(cur.fixed)} fixed + ${inr(cur.variable)} variable`} tone="bg-slate-900 text-white [&_p]:!text-white [&_p:nth-child(2)]:!text-white" />
          <Tile label="A. Sortation cost" value={inr(cur.sort)} sub={`${inr(cur.cost)} × ${free}/24`} tone="bg-orange-50" />
          <Tile label="B. Storage cost" value={inr(cur.stor)} sub={`${inr(cur.cost)} × ${24 - free}/24`} tone="bg-sky-50" />
          <Tile label="Weight arrived · billable kg-hours" value={`${cur.kg.toLocaleString('en-IN')} kg`} sub={`${Math.round(cur.kgh).toLocaleString('en-IN')} kg-hours beyond ${free} h this month`} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile label="Sortation price per kg so far" value={cur.kg ? inr(cur.sortPrice) : '—'} sub={`${inr(cur.sort)} ÷ ${cur.kg.toLocaleString('en-IN')} kg`} tone="bg-orange-50" />
          <Tile label="Storage price per kg-hour so far" value={cur.kgh ? inr(cur.storPrice) : '—'} sub={`${inr(cur.stor)} ÷ ${Math.round(cur.kgh).toLocaleString('en-IN')} kg-hours`} tone="bg-sky-50" />
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">No docket has arrived yet. The cost so far waits and is shared once the first docket arrives.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-400">
                  <th className="py-1.5 pr-3 font-medium">Docket</th><th className={th}>Kg</th><th className={th}>Arrived</th><th className={th}>Hours in hub</th><th className={th}>Beyond {free} h</th><th className={th}>Sortation (arrival month)</th><th className={th}>Storage · Month 1</th><th className={th}>Storage · Month 2</th><th className={th}>Warehouse cost</th><th className="w-32 py-1.5 font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{r.id}</td>
                    <td className={td}>{r.kg}</td>
                    <td className={td}>{ord(dateOf(r.day))} · M{r.day <= ml ? 1 : 2}</td>
                    <td className={td}>{Math.round(r.hours)} h</td>
                    <td className="py-2 pr-3 text-right">{r.bill ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">{Math.round(r.bill)} h</span> : <span className="text-slate-300">free</span>}</td>
                    <td className={td}>{money(r.sort)}</td>
                    <td className={td}>{money(r.stor1)}</td>
                    <td className={td}>{money(r.stor2)}</td>
                    <td className={`${td} font-semibold text-slate-900`}>{inr(r.cost)}</td>
                    <td className="py-2">
                      <div className="flex h-2.5 w-32 overflow-hidden rounded-full bg-slate-100">
                        <span className="bg-orange-400" style={{ width: `${(r.sort / maxCost) * 100}%` }} />
                        <span className="bg-sky-400" style={{ width: `${((r.stor1 + r.stor2) / maxCost) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="text-slate-500">
                  <td className="py-2 pr-3 font-medium">All dockets</td><td className={td}>{rows.reduce((t, r) => t + r.kg, 0).toLocaleString('en-IN')}</td><td /><td /><td />
                  <td className={td}>{inr(rows.reduce((t, r) => t + r.sort, 0))}</td><td className={td}>{inr(rows.reduce((t, r) => t + r.stor1, 0))}</td><td className={td}>{inr(rows.reduce((t, r) => t + r.stor2, 0))}</td>
                  <td className={`${td} font-semibold text-slate-900`}>{inr(sum)}</td>
                  <td className={`py-2 text-[11px] ${unshared > 0.5 ? 'text-amber-700' : 'text-emerald-700'}`}>{unshared > 0.5 ? `${inr(unshared)} not shared yet` : '= month pools ✓'}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" />Sortation (by weight)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Storage (by kg-hours)</span>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">Docket cost = sortation in its arrival month + storage in each month its billable hours fall in. The sortation-hours clock runs straight through the month end; the billable hours are split at midnight of the month end. Month 1 is final after its last day and is not revised. Storage cost that nobody has earned yet waits and is shared once a docket passes the sortation hours.</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Over the 10 days</p>
        <div className="mt-3 grid gap-6 md:grid-cols-3">
          <MiniBars title="Month cost so far (₹)" values={days.map((d) => d.cost)} fmt={(v) => inr(Math.round(v))} day={day} onPick={setDay} tone="bg-slate-800" />
          <MiniBars title="Sortation price per kg (₹)" values={days.map((d) => d.sortPrice)} fmt={(v) => inr(v)} day={day} onPick={setDay} tone="bg-orange-500" />
          <MiniBars title="Storage price per kg-hour (₹)" values={days.map((d) => d.storPrice)} fmt={(v) => inr(v)} day={day} onPick={setDay} tone="bg-sky-500" />
        </div>
        <p className="mt-3 text-[11px] text-slate-400">The month cost drops back at Day {ml + 1} because the new month starts from zero. Click a bar to jump to that day.</p>
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
          <li><b className="text-slate-800">Total warehouse cost so far</b> = fixed so far + variable so far. No tagging or splitting of bills.</li>
          <li><b className="text-slate-800">Hub factor</b> = sortation hours ÷ total hours of the day (24), any value from 1/24 to 24/24. It splits the total into two types of cost: <b className="text-slate-800">A. Sortation cost</b> = total × Hub factor and <b className="text-slate-800">B. Storage cost</b> = total × (1 − Hub factor).</li>
          <li><b className="text-slate-800">Sortation cost:</b> shared by weight. Price per kg so far = sortation cost so far ÷ weight of all dockets so far. Docket pays price × its kg. Revised every day.</li>
          <li><b className="text-slate-800">Storage cost:</b> shared by kg-hours. Only hours beyond the sortation hours count, so a docket that leaves within the sortation hours pays no storage. Price per kg-hour so far = storage cost so far ÷ all dockets’ kg-hours so far. Docket pays price × its kg × hours beyond the sortation hours.</li>
          <li><b className="text-slate-800">Sortation hours:</b> 24 by default, can be set lower (for example 16) for a hub. At 24/24 the whole cost is Sortation.</li>
          <li><b className="text-slate-800">Month end:</b> each month has its own cost pool that starts from zero on the 1st and is final after its last day.</li>
          <li><b className="text-slate-800">Docket over a month end</b> (for example arrives on the 28th, leaves on the 3rd): <b className="text-slate-800">sortation</b> goes to the month it arrived. <b className="text-slate-800">Storage</b> goes to the first month for the billable hours up to the month end, and to the second month for the billable hours after it.</li>
          <li><b className="text-slate-800">Sortation hours clock</b> starts at arrival and runs straight through the month end. Only the billable hours (beyond the sortation hours) are split at midnight of the month end.</li>
          <li><b className="text-slate-800">Closed month is not revised.</b> A docket still in the hub at month end has its storage for that month fixed at that point.</li>
          <li><b className="text-slate-800">Docket’s warehouse cost</b> = sortation share + storage share. The two always add up to the total warehouse cost.</li>
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
          <li>· Hub factor: who sets each hub’s sortation hours, and how often is it reviewed?</li>
          <li>· Storage cost with no docket past the sortation hours yet: wait and share later (as now), or share by weight?</li>
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
        <p className="text-sm font-semibold text-slate-900">Level 2 cost = warehouse cost</p>
        <p className="mt-1 text-xs text-slate-500">All direct cost of operating the hubs a docket passes through: facility, hub payroll, labour and handling. Transport cost is excluded and sits in Level 1.</p>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2">
          <div className="rounded-xl border px-3 py-2 border-slate-300 bg-slate-100 text-slate-900">
            <p className="text-sm font-semibold">Level 1 margin</p>
          </div>
          <div className="rounded-xl border px-3 py-2 border-sky-200 bg-sky-50/60 text-slate-900">
            <p className="text-sm font-semibold">− Level 2 cost (warehouse cost)</p>
            <p className="text-[11px] opacity-80">Facility, payroll, labour and handling at the hubs the docket touches</p>
          </div>
          <div className="rounded-xl border px-3 py-2 border-orange-500 bg-orange-500 text-white">
            <p className="text-sm font-semibold">= Level 2 margin</p>
            <p className="text-[11px] opacity-80">Before indirect cost (Level 3)</p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-medium text-slate-600">Level 2 cost = warehouse cost of every hub the docket touches. How it is attributed is under ideation in the tabs below.</p>
      </div>
      <div className="flex gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? pillActive : pillInactive}>{l}</button>)}</div>
      {tab === 's' && <Structure />}
      {tab === 't' && <Example />}
      {tab === 'r' && <Rules />}
    </div>
  )
}

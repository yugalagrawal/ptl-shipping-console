import { useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'
import MidMileManifest from './MidMile.jsx'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const fmt = (n) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10).toLocaleString('en-IN')
const inr1 = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

// One pickup run (PRS) = one vehicle visiting several consignors
const RUN = { km: 36, toll: 150 }
const DOCKETS = [
  { id: 'DKT-101', consignor: 'Sharma Textiles', kg: 120, boxes: 6, mix: [['S', 4], ['M', 2]], freight: 3000, invoice: 40000 },
  { id: 'DKT-102', consignor: 'Delhi Auto Parts', kg: 300, boxes: 10, mix: [['M', 5], ['L', 4], ['XL', 1]], freight: 6600, invoice: 90000 },
  { id: 'DKT-103', consignor: 'Kapoor Electricals', kg: 80, boxes: 4, mix: [['L', 3], ['XL', 1]], freight: 3200, invoice: 25000 },
]
const DAYS_IN_MONTH = 31 // October
const BOX_RATE = { S: 12, M: 18, L: 25, XL: 35 }
const boxCost = (d) => d.mix.reduce((t, [b, n]) => t + n * BOX_RATE[b], 0)
const TOTAL_FREIGHT = 12800
const TOTAL_KG = DOCKETS.reduce((s, d) => s + d.kg, 0)
// Only the estimated weight is known for a failed stop
const FAILED = { id: 'Stop 4', consignor: 'Verma Traders', kg: 60, freight: 0 }
const FAILED_KG = FAILED.kg
// Fixed deals work in a Mon–Sun bucket: the week's fixed cost (per-day cost × days in the week) is spread over every docket of that
// week by % weight, so idle days are absorbed inside the week. The example dockets are Monday's.
const WEEK_DAYS = [['Mon', TOTAL_KG + FAILED_KG], ['Tue', 0], ['Wed', 700], ['Thu', 0], ['Fri', 640], ['Sat', 0], ['Sun', 0]]
const WEEK_KG = WEEK_DAYS.reduce((a, [, k]) => a + k, 0)
// Fixed + rate after cover works on any Partner Pricing basis. The monthly cover is split by week (cover × days in week ÷ days in month);
// what the week carries beyond its weekly cover earns the basis rate, spread over the week's dockets by % weight. `week` = that week's total.
const FR_BASES = [
  { key: 'kg', label: 'Per Kg', unit: 'kg', cover: 6000, week: WEEK_KG, rate: '₹1.5 / kg', price: (n) => n * 1.5 },
  { key: 'docket', label: 'Per Docket', unit: 'dockets', cover: 30, week: 9, rate: '₹50 / docket', price: (n) => n * 50 },
  { key: 'box', label: 'Per Box', unit: 'boxes', cover: 200, week: 62, rate: '₹21 avg per box (₹12 S · ₹18 M · ₹25 L · ₹35 XL)', price: (n) => n * 21 },
  { key: 'pf', label: '% of Freight', unit: '₹ freight', cover: 200000, week: 52000, rate: '8% of freight', price: (n) => n * 0.08 },
  { key: 'pi', label: '% of Invoice', unit: '₹ invoice', cover: 3000000, week: 700000, rate: '0.5% of invoice', price: (n) => n * 0.005 },
  { key: 'trip', label: 'Per Trip', unit: 'trips', cover: 15, week: 4, rate: '₹800 / trip', price: (n) => n * 800 },
  { key: 'km', label: 'Per Km', unit: 'km', cover: 450, week: 150, rate: '₹22 / km', price: (n) => n * 22 },
]

// bucket: direct = each docket priced on its own · run = one run cost shared · month = monthly deal turned into a ₹/kg rate
const TYPES = [
  { key: 'kg', label: 'Per Kg', bucket: 'direct', rate: '₹2.5 / kg', rule: 'docket kg × rate', cost: (d) => d.kg * 2.5 },
  { key: 'docket', label: 'Per Docket', driver: ['Docket charge', () => inr(150)], bucket: 'direct', rate: '₹150 / docket', rule: '₹150 per docket, whatever its weight', cost: () => 150 },
  { key: 'box', label: 'Per Box', driver: ['Boxes × box-type rate', (d) => d.mix.map(([b, n]) => `${n} ${b} × ₹${BOX_RATE[b]}`).join(' + ')], bucket: 'direct', rate: '₹12 S · ₹18 M · ₹25 L · ₹35 XL', rule: 'box count × rate of that box type, added up inside the docket', cost: boxCost },
  { key: 'pf', label: '% of Freight', driver: ['Freight', (d) => inr(d.freight)], driverTotal: () => inr(TOTAL_FREIGHT), bucket: 'run', rate: '8% of freight', rule: "run freight × 8% = run cost, then spread by % weight", run: () => TOTAL_FREIGHT * 0.08, note: 'Run cost = total freight of the run × 8%. It is spread by weight, so the run total always equals revenue × %, and a docket priced above average (DKT-103) does not carry more than its weight share.' },
  { key: 'pi', label: '% of Invoice', driver: ['Invoice value', (d) => inr(d.invoice)], bucket: 'direct', rate: '0.5% of invoice', rule: 'docket invoice value × 0.5%', cost: (d) => d.invoice * 0.005 },
  { key: 'trip', label: 'Per Trip', bucket: 'run', rate: '₹1,200 / run', rule: 'run cost × docket kg ÷ run kg', run: () => 1200 },
  { key: 'km', label: 'Per Km', bucket: 'run', rate: '₹22 / km', rule: 'km × rate = run cost, then by charged weight', run: () => RUN.km * 22 },
  { key: 'fixed', label: 'Monthly fixed', bucket: 'month', rate: '₹60,000 / month', rule: "Per-day cost = ₹60,000 ÷ days in month, spread by % weight", day: () => 60000 / DAYS_IN_MONTH },
  { key: 'fixedrate', label: 'Fixed + rate after cover', bucket: 'month', rate: '₹40,000 / month covers a set amount of any basis, then that basis’ rate', rule: "Per-day cost = ₹40,000 ÷ days in month, spread by % weight, + the basis rate on whatever goes beyond the cover", day: () => 40000 / DAYS_IN_MONTH },
]

const BUCKETS = {
  direct: { name: 'Direct', tone: 'border-emerald-200 bg-emerald-50/60', chip: 'bg-emerald-100 text-emerald-700', line: 'The docket carries its own price. Nothing to share.', when: 'Known the moment the docket is picked up.' },
  run: { name: 'Shared run', tone: 'border-orange-200 bg-orange-50/60', chip: 'bg-orange-100 text-orange-700', line: 'One cost for the whole pickup run, shared by docket kg.', when: 'Known when the run closes.' },
  month: { name: 'Fixed deal', tone: 'border-sky-200 bg-sky-50/60', chip: 'bg-sky-100 text-sky-700', line: 'Spread the fixed amount evenly over the days. Each day’s share goes to that day’s dockets by charged weight.', when: 'Exact every day. Adds up to the invoice — no forecast, no true-up.' },
}


function allocate(t, toll, perKg, extraKg = 0) {
  const den = TOTAL_KG + extraKg
  const tollShare = (d) => (toll ? (RUN.toll * d.kg) / den : 0)
  return DOCKETS.map((d) => {
    let base
    if (t.bucket === 'direct') base = t.cost(d)
    else if (t.bucket === 'run') base = (t.run() * d.kg) / den
    else base = perKg * d.kg
    return { ...d, base, toll: tollShare(d), cost: base + tollShare(d) }
  })
}

function Flow() {
  const cols = ['direct', 'run', 'month']
  return (
    <div className={`p-4 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Nine ways a partner can be paid. Three ways to put it on a docket.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {cols.map((b) => (
          <div key={b} className={`flex flex-col rounded-xl border p-3 ${BUCKETS[b].tone}`}>
            <p className="text-sm font-semibold text-slate-900">{BUCKETS[b].name}</p>
            <div className="mt-2 flex flex-wrap content-start gap-1.5 md:min-h-[3.5rem]">
              {TYPES.filter((t) => t.bucket === b).map((t) => <span key={t.key} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BUCKETS[b].chip}`}>{t.label}</span>)}
            </div>
            <div className="my-2 flex justify-center text-slate-400"><svg width="14" height="20" viewBox="0 0 14 20" fill="none"><path d="M7 0v17M1 12l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <p className="text-xs text-slate-700 md:min-h-[3.75rem]">{BUCKETS[b].line}</p>
            <p className="mt-1 text-[11px] text-slate-500">{BUCKETS[b].when}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Detail({ t }) {
  const [toll, setToll] = useState(false)
  const extraKg = FAILED_KG
  const den = TOTAL_KG + extraKg
  const month = t.bucket === 'month'
  const fr = t.key === 'fixedrate'
  const [fb, setFb] = useState('kg')
  const B = FR_BASES.find((x) => x.key === fb)
  const weekFixed = month ? t.day() * WEEK_DAYS.length : 0
  const weekCover = fr ? (B.cover * WEEK_DAYS.length) / DAYS_IN_MONTH : 0
  const weekBeyond = fr ? Math.max(0, B.week - weekCover) : 0
  const weekExtra = fr ? B.price(weekBeyond) : 0
  const fixedPerKg = weekFixed / WEEK_KG
  const extraPerKg = weekExtra / WEEK_KG
  const rows = allocate(t, toll, fixedPerKg + extraPerKg, extraKg).map((r) => ({ ...r, fixedShare: r.kg * fixedPerKg, extra: r.kg * extraPerKg }))
  const failedBase = t.bucket === 'direct' ? 0 : t.bucket === 'run' ? (t.run() * FAILED_KG) / den : (fixedPerKg + extraPerKg) * FAILED_KG
  const pctOf = (kg) => ((kg / (month ? WEEK_KG : den)) * 100).toFixed(0)
  const failedToll = toll ? (RUN.toll * FAILED_KG) / den : 0
  const failedCost = failedBase + failedToll
  const total = rows.reduce((s, r) => s + r.cost, 0) + failedCost
  return (
    <div className="bg-slate-50/70 px-4 py-3">
      <>
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${BUCKETS[t.bucket].tone}`}>
        <div><span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${BUCKETS[t.bucket].chip}`}>{BUCKETS[t.bucket].name}</span><b className="text-slate-900">{t.rate}</b></div>
        <div className="text-slate-600">{t.rule}</div>
      </div>


      {month && (
        <div className="mt-3 rounded-lg border border-sky-200 bg-white p-3 text-sm text-slate-700">
          <p className="text-xs text-slate-500"><b className="text-slate-700">Weekly bucket, Mon–Sun.</b> The whole week’s cost is spread over every docket of the week by % weight — idle days stay inside the bucket. Final when the week closes on Sunday.</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5 text-center text-xs">
            {WEEK_DAYS.map(([d, k], i) => (
              <div key={d} className={`rounded-lg border py-1.5 ${i === 0 ? 'border-sky-300 bg-sky-50 text-sky-900' : k ? 'border-slate-200 bg-white text-slate-700' : 'border-dashed border-slate-200 bg-slate-50 text-slate-400'}`}>
                <div className="font-medium">{d}</div><div className="tabular-nums">{k ? `${k} kg` : 'idle'}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Per-day cost <b className="tabular-nums text-slate-900">{inr(t.day())}</b> <span className="text-xs text-slate-400">({t.key === 'fixed' ? '₹60,000' : '₹40,000'} ÷ {DAYS_IN_MONTH} days)</span></span>
            <span className="text-slate-300">×</span><span><b className="text-slate-900">{WEEK_DAYS.length} days</b></span>
            <span className="text-slate-300">=</span><span>Week cost <b className="tabular-nums text-slate-900">{inr(weekFixed)}</b></span>
            <span className="text-slate-300">÷</span><span>Week weight <b className="tabular-nums text-slate-900">{WEEK_KG.toLocaleString('en-IN')} kg</b></span>
            <span className="text-slate-300">=</span><b className="tabular-nums text-slate-900">₹{fixedPerKg.toFixed(2)} / kg</b>
          </div>
          {fr && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-1.5 text-xs text-slate-500">Cover can be on any pricing basis — pick one:</p>
              <div className="flex flex-wrap gap-1.5">{FR_BASES.map((x) => <button key={x.key} onClick={() => setFb(x.key)} className={fb === x.key ? pillActive : pillInactive}>{x.label}</button>)}</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Week’s cover <b className="tabular-nums text-slate-900">{fmt(weekCover)} {B.unit}</b> <span className="text-xs text-slate-400">({fmt(B.cover)} × {WEEK_DAYS.length} ÷ {DAYS_IN_MONTH})</span></span>
                <span className="text-slate-300">·</span><span>Week carried <b className="tabular-nums text-slate-900">{fmt(B.week)}</b></span>
                <span className="text-slate-300">→</span><span>Beyond <b className="tabular-nums text-slate-900">{fmt(weekBeyond)}</b> × {B.rate} = <b className="tabular-nums text-slate-900">{inr(weekExtra)}</b></span>
                <span className="text-slate-300">÷</span><span>{WEEK_KG.toLocaleString('en-IN')} kg =</span><b className="tabular-nums text-slate-900">₹{extraPerKg.toFixed(2)} / kg extra</b>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Each week gets its own slice of the cover, so a docket in week 1 and one in week 4 follow the same rule.</p>
            </div>
          )}
        </div>
      )}

      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={toll} onChange={(e) => setToll(e.target.checked)} /> Additional charge on this run (toll, parking…) — {inr(RUN.toll)}, split by docket weight ÷ total load of the trip
      </label>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-2 font-medium">Docket</th><th className="text-right font-medium">Charged kg</th><th className="text-right font-medium">% by weight</th>
              {t.driver && <th className="text-right font-medium">{t.driver[0]}</th>}
              {fr && <><th className="text-right font-medium">Fixed share</th><th className="text-right font-medium">Extra after cover</th></>}
              <th className="text-right font-medium">Additional charges spread</th><th className="text-right font-medium">First-mile cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2"><span className="font-medium text-slate-900">{r.id}</span> <span className="text-xs text-slate-400">{r.consignor}</span></td>
                <td className="text-right">{r.kg}</td><td className="text-right">{pctOf(r.kg)}%</td>
                {t.driver && <td className="text-right">{t.driver[1](r)}</td>}
                {fr && <><td className="text-right">{inr(r.fixedShare)}</td><td className="text-right">{r.extra ? inr(r.extra) : '–'}</td></>}
                <td className="text-right">{toll ? inr(r.toll) : '–'}</td>
                <td className="text-right font-semibold text-slate-900">{inr(r.cost)}</td>
              </tr>
            ))}
            <tr className="border-b border-slate-100 bg-red-50/60 text-red-700">
              <td className="py-2"><span className="font-medium">{FAILED.id}</span> <span className="text-xs">{FAILED.consignor} · failed (consignor / consignee closed) · estimated weight counts as charged weight</span></td>
              <td className="text-right">{FAILED_KG} est.</td><td className="text-right">{pctOf(FAILED_KG)}%</td>
              {t.driver && <td className="text-right">–</td>}
              {fr && <><td className="text-right">{inr(fixedPerKg * FAILED_KG)}</td><td className="text-right">{extraPerKg ? inr(extraPerKg * FAILED_KG) : '–'}</td></>}
              <td className="text-right">{toll ? inr(failedToll) : '–'}</td><td className="text-right font-semibold">{inr(failedCost)}</td>
            </tr>
            <tr className="font-semibold text-slate-900">
              <td className="py-2">{month ? 'These dockets (of the week)' : 'Whole run'}</td><td className="text-right">{den}</td><td className="text-right">{pctOf(den)}%</td>
              {t.driver && <td className="text-right">{t.driverTotal ? t.driverTotal() : ''}</td>}
              {fr && <><td className="text-right">{inr(fixedPerKg * den)}</td><td className="text-right">{extraPerKg ? inr(extraPerKg * den) : '–'}</td></>}
              <td className="text-right">{toll ? inr(RUN.toll) : '–'}</td><td className="text-right">{inr(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        <b className="text-red-700">Failed stop:</b> Direct types cost ₹0 (paid on absolutes). On Shared run and Fixed deal the attempt used the vehicle and the day, so it stays on the run (PRS / DRS) with its estimated weight as charged weight and takes its own share, booked as a failed-attempt cost; picked dockets pay only for their own weight.{' '}
        {t.note ? t.note : null}
        {!t.note && t.bucket === 'direct' && 'The partner is paid on absolutes (kg, docket, box, invoice value), so a failed stop costs ₹0 here — nothing was picked, nothing is charged. Additional charges on the run are spread by % weight, failed stop included.'}
        {!t.note && t.bucket === 'run' && 'The run cost is fixed no matter what was picked. The same run with fewer kg would load a higher ₹/kg onto every docket.'}
        {t.bucket === 'month' && 'No expected volume anywhere. The week’s fixed cost is spread over that week’s dockets, failed pickups included, by docket weight — idle days are absorbed inside the week. A week with no dockets at all is booked as “Unabsorbed fixed”.'}
      </p>
      </>
    </div>
  )
}

export default function FirstMile() {
  const [open, setOpen] = useState('kg')
  const [sub, setSub] = useState('prs')
  const prs = sub === 'prs'
  const tabs = (
    <div className="flex gap-2">
      {[['prs', 'PRS / DRS'], ['mf', 'Manifest / THC']].map(([k, l]) => <button key={k} onClick={() => setSub(k)} className={sub === k ? pillActive : pillInactive}>{l}</button>)}
    </div>
  )
  return (
    <div className="space-y-4">
      {prs && <Flow />}

      <div className={`p-4 ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Every way a partner is paid</p>
          {tabs}
        </div>
        {!prs && <div className="mt-3"><MidMileManifest /></div>}
        {prs && <>
        <p className="mt-0.5 text-xs text-slate-500">Open one to see how it lands on a docket. Example run: {RUN.km} km · {TOTAL_KG} kg · three dockets · sample rates.</p>
        <div className="mt-3 space-y-4">
          {['direct', 'run', 'month'].map((b) => (
            <div key={b}>
              <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BUCKETS[b].chip}`}>{BUCKETS[b].name}</span>{b === 'direct' && <span className="text-xs font-normal text-slate-500">Actual Cost at Docket Level + Additional Cost spread by %Weight · Failed pickups attract no cost</span>}{b === 'run' && <span className="text-xs font-normal text-slate-500">Failed pickups attract cost (their % weight share of the run)</span>}{b === 'month' && <span className="text-xs font-normal text-slate-500">Failed pickups attract cost (their % weight share of the day’s fixed amount)</span>}</p>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {TYPES.filter((x) => x.bucket === b).map((x) => {
                  const on = open === x.key
                  return (
                    <div key={x.key}>
                      <button onClick={() => setOpen(on ? null : x.key)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
                        <svg className={`h-3.5 w-3.5 shrink-0 transition-transform ${on ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="w-44 shrink-0 font-medium">{x.label}</span>
                        <span className={`flex-1 truncate text-xs ${on ? 'text-slate-300' : 'text-slate-500'}`}>{x.rate}</span>
                      </button>
                      {on && <Detail t={x} />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        </>}
      </div>

      {prs && <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">To confirm with you</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Fixed deals: OK to book each day’s share by charged weight, with idle days shown as “Unabsorbed fixed”?</li>
          <li>Failed stop on Shared run / Fixed deal: where should its cost finally land — on the order’s re-attempt, or as a separate failure cost?</li>
          <li>A run that drops dockets at different hubs: still one run, shared across all?</li>
          <li>Should the % types use revenue including the late extras (delay fee, extra handling)?</li>
        </ul>
      </div>}
    </div>
  )
}

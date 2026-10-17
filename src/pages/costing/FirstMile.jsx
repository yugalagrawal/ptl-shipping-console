import { useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const inr1 = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

// One pickup run (PRS) = one vehicle visiting several consignors
const RUN = { km: 36, toll: 150 }
const DOCKETS = [
  { id: 'DKT-101', consignor: 'Sharma Textiles', kg: 120, boxes: 6, mix: [['S', 4], ['M', 2]], freight: 3000, invoice: 40000 },
  { id: 'DKT-102', consignor: 'Delhi Auto Parts', kg: 300, boxes: 10, mix: [['M', 5], ['L', 4], ['XL', 1]], freight: 6600, invoice: 90000 },
  { id: 'DKT-103', consignor: 'Kapoor Electricals', kg: 80, boxes: 4, mix: [['L', 3], ['XL', 1]], freight: 3200, invoice: 25000 },
]
const MTD_KG = 19800 // partner kg already picked this month, before this run
const BOX_RATE = { S: 12, M: 18, L: 25, XL: 35 }
const boxCost = (d) => d.mix.reduce((t, [b, n]) => t + n * BOX_RATE[b], 0)
const TOTAL_FREIGHT = 12800
const TOTAL_KG = DOCKETS.reduce((s, d) => s + d.kg, 0)

// bucket: direct = each docket priced on its own · run = one run cost shared · month = monthly deal turned into a ₹/kg rate
const TYPES = [
  { key: 'kg', label: 'Per Kg', bucket: 'direct', rate: '₹2.5 / kg', rule: 'docket kg × rate', cost: (d) => d.kg * 2.5 },
  { key: 'docket', label: 'Per Docket', driver: ['Docket charge', () => inr(150)], bucket: 'direct', rate: '₹150 / docket', rule: '₹150 per docket, whatever its weight', cost: () => 150 },
  { key: 'box', label: 'Per Box', driver: ['Boxes × box-type rate', (d) => d.mix.map(([b, n]) => `${n} ${b} × ₹${BOX_RATE[b]}`).join(' + ')], bucket: 'direct', rate: '₹12 S · ₹18 M · ₹25 L · ₹35 XL', rule: 'box count × rate of that box type, added up inside the docket', cost: boxCost },
  { key: 'pf', label: '% of Freight', driver: ['Freight', (d) => inr(d.freight)], driverTotal: () => inr(TOTAL_FREIGHT), bucket: 'run', rate: '8% of freight', rule: "run freight × 8% = run cost, then spread by % weight", run: () => TOTAL_FREIGHT * 0.08, note: 'Run cost = total freight of the run × 8%. It is spread by weight, so the run total always equals revenue × %, and a docket priced above average (DKT-103) does not carry more than its weight share.' },
  { key: 'pi', label: '% of Invoice', driver: ['Invoice value', (d) => inr(d.invoice)], bucket: 'direct', rate: '0.5% of invoice', rule: 'docket invoice value × 0.5%', cost: (d) => d.invoice * 0.005 },
  { key: 'trip', label: 'Per Trip', bucket: 'run', rate: '₹1,200 / run', rule: 'run cost × docket kg ÷ run kg', run: () => 1200 },
  { key: 'km', label: 'Per Km', bucket: 'run', rate: '₹22 / km', rule: 'km × rate = run cost, then by charged weight', run: () => RUN.km * 22 },
  { key: 'fixed', label: 'Monthly fixed', bucket: 'month', rate: '₹60,000 / month', rule: "₹60,000 ÷ 30 days = ₹2,000 a day, shared by that day's charged weight", day: () => 2000, excess: () => 0 },
  { key: 'fixedrate', label: 'Fixed + rate after cover', bucket: 'month', rate: '₹40,000 covers 20,000 kg, then ₹1.5/kg', rule: "₹40,000 ÷ 30 = ₹1,333 a day by that day's charged weight, + ₹1.5 on every kg beyond the 20,000 cover", day: () => 40000 / 30, excess: () => Math.max(0, MTD_KG + TOTAL_KG - 20000) - Math.max(0, MTD_KG - 20000), excessRate: 1.5 },
]

const BUCKETS = {
  direct: { name: 'Direct', tone: 'border-emerald-200 bg-emerald-50/60', chip: 'bg-emerald-100 text-emerald-700', line: 'The docket carries its own price. Nothing to share.', when: 'Known the moment the docket is picked up.' },
  run: { name: 'Shared run', tone: 'border-orange-200 bg-orange-50/60', chip: 'bg-orange-100 text-orange-700', line: 'One cost for the whole pickup run, shared by docket kg.', when: 'Known when the run closes.' },
  month: { name: 'Fixed deal', tone: 'border-sky-200 bg-sky-50/60', chip: 'bg-sky-100 text-sky-700', line: 'Spread the fixed amount evenly over the days. Each day’s share goes to that day’s dockets by charged weight.', when: 'Exact every day. Adds up to the invoice — no forecast, no true-up.' },
}

const FAILED_KG = 60 // estimated weight of the failed stop, used as its charged weight

function allocate(t, toll, dayKg, extraKg = 0) {
  const den = TOTAL_KG + extraKg
  const tollShare = (d) => (toll ? (RUN.toll * d.kg) / den : 0)
  return DOCKETS.map((d) => {
    let base
    if (t.bucket === 'direct') base = t.cost(d)
    else if (t.bucket === 'run') base = (t.run() * d.kg) / den
    else base = (t.day() / dayKg) * d.kg + (t.excess() * (t.excessRate ?? 0) * d.kg) / den
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
          <div key={b} className={`rounded-xl border p-3 ${BUCKETS[b].tone}`}>
            <p className="text-sm font-semibold text-slate-900">{BUCKETS[b].name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TYPES.filter((t) => t.bucket === b).map((t) => <span key={t.key} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BUCKETS[b].chip}`}>{t.label}</span>)}
            </div>
            <div className="my-2 flex justify-center text-slate-400"><svg width="14" height="20" viewBox="0 0 14 20" fill="none"><path d="M7 0v17M1 12l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <p className="text-xs text-slate-700">{BUCKETS[b].line}</p>
            <p className="mt-1 text-[11px] text-slate-500">{BUCKETS[b].when}</p>
          </div>
        ))}
      </div>
      <div className="my-2 flex justify-center text-slate-300"><svg width="14" height="22" viewBox="0 0 14 22" fill="none"><path d="M7 0v19M1 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
      <div className="rounded-xl bg-slate-900 p-3 text-center text-sm font-semibold text-white">First-mile cost on the docket <span className="font-normal text-slate-300">(+ additional charges, split by docket weight ÷ total load of the trip)</span></div>
    </div>
  )
}

const MM_TRIP = 12000
const MM_EXTRA = 900
const MM_LEGS = [
  { name: 'To', route: 'A → D', dockets: [['MM-101', 'Sharma Textiles', 400], ['MM-102', 'Delhi Auto Parts', 600], ['MM-103', 'Kapoor Electricals', 300]] },
  { name: 'Return', route: 'D → A', dockets: [['MM-201', 'Rao Pharma', 500], ['MM-202', 'Gupta Traders', 250]] },
]

function MidMile() {
  const [extra, setExtra] = useState(false)
  const half = MM_TRIP / 2
  const xHalf = extra ? MM_EXTRA / 2 : 0
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3 text-sm">
        <div><span className="mr-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">Shared run</span><b className="text-slate-900">{inr(MM_TRIP)} / trip</b></div>
        <div className="text-slate-600">trip cost ÷ 2 = To cost + Return cost, then spread by % weight</div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">Trip <b className="tabular-nums">{inr(MM_TRIP)}</b></span>
        <span className="text-slate-300">→</span>
        <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">To <b className="tabular-nums">{inr(half)}</b></span>
        <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">Return <b className="tabular-nums">{inr(half)}</b></span>
      </div>
      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} /> Additional charge on this trip (toll, parking…) — {inr(MM_EXTRA)}, halved like the trip cost, then spread by % weight
      </label>
      {MM_LEGS.map((L) => {
        const kg = L.dockets.reduce((t, d) => t + d[2], 0)
        return (
          <div key={L.name} className="mt-4">
            <p className="text-sm font-semibold text-slate-900">{L.name} leg <span className="font-normal text-slate-500">· {L.route} · manifest total {kg} kg · leg cost {inr(half + xHalf)}</span></p>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm tabular-nums">
                <thead><tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-medium">Docket</th><th className="text-right font-medium">Charged kg</th><th className="text-right font-medium">% by weight</th><th className="text-right font-medium">Additional charges spread</th><th className="text-right font-medium">Mid-mile cost</th>
                </tr></thead>
                <tbody>
                  {L.dockets.map(([id, who, w]) => (
                    <tr key={id} className="border-b border-slate-100">
                      <td className="py-2"><span className="font-medium text-slate-900">{id}</span> <span className="text-xs text-slate-400">{who}</span></td>
                      <td className="text-right">{w}</td><td className="text-right">{((w / kg) * 100).toFixed(0)}%</td>
                      <td className="text-right">{extra ? inr((xHalf * w) / kg) : '–'}</td>
                      <td className="text-right font-semibold text-slate-900">{inr(((half + xHalf) * w) / kg)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold text-slate-900"><td className="py-2">{L.name} leg</td><td className="text-right">{kg}</td><td className="text-right">100%</td><td className="text-right">{extra ? inr(xHalf) : '–'}</td><td className="text-right">{inr(half + xHalf)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      <p className="mt-3 text-xs text-slate-500">Each leg is paid for half the trip, however full it is. A lightly loaded return leg therefore makes its dockets dearer per kg than the To leg — that is a real cost of the empty run, and it stays visible.</p>
    </div>
  )
}

const KM_RATE = 30
const KM_SEGS = [['A → B', 100], ['B → C', 150], ['C → D', 200], ['D → A', 450]]
const KM_DOCKETS = [
  { id: 'MM-101', who: 'Sharma Textiles', route: 'A → C', kg: 400, segs: [0, 1], leg: 'To' },
  { id: 'MM-102', who: 'Delhi Auto Parts', route: 'A → D', kg: 600, segs: [0, 1, 2], leg: 'To' },
  { id: 'MM-103', who: 'Kapoor Electricals', route: 'B → D', kg: 300, segs: [1, 2], leg: 'To' },
  { id: 'MM-201', who: 'Rao Pharma', route: 'D → A', kg: 500, segs: [3], leg: 'Return' },
  { id: 'MM-202', who: 'Gupta Traders', route: 'D → A', kg: 250, segs: [3], leg: 'Return' },
]

const KM_COLORS = [
  { bar: 'bg-sky-500', soft: 'bg-sky-50 text-sky-800 ring-sky-200' },
  { bar: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  { bar: 'bg-violet-500', soft: 'bg-violet-50 text-violet-800 ring-violet-200' },
  { bar: 'bg-amber-500', soft: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { bar: 'bg-rose-500', soft: 'bg-rose-50 text-rose-800 ring-rose-200' },
]

function MidMileKm() {
  const [extra, setExtra] = useState(false)
  const segCost = KM_SEGS.map(([, km]) => km * KM_RATE)
  const board = KM_SEGS.map((_, i) => KM_DOCKETS.filter((d) => d.segs.includes(i)).reduce((t, d) => t + d.kg, 0))
  const boardSum = board.reduce((a, b) => a + b, 0)
  const segExtra = board.map((w) => (extra ? (MM_EXTRA * w) / boardSum : 0))
  const piece = (d, i) => ((segCost[i] + segExtra[i]) * d.kg) / board[i]
  const rows = KM_DOCKETS.map((d, n) => ({ ...d, n, pieces: d.segs.map((i) => [i, piece(d, i)]), cost: d.segs.reduce((t, i) => t + piece(d, i), 0) }))
  const total = rows.reduce((t, r) => t + r.cost, 0)
  const cols = { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3 text-sm">
        <div><span className="mr-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">Shared run</span><b className="text-slate-900">₹{KM_RATE} / km</b></div>
        <div className="text-slate-600">price each segment (km × rate) → split by weight on board → each docket adds its pieces</div>
      </div>

      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} /> Additional charge on this trip (toll, parking…) — {inr(MM_EXTRA)}: spread over the segments by weight on board, then within a segment by % weight
      </label>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[720px]">
          <p className="text-sm font-semibold text-slate-900">Step 1 · Who is on the truck, segment by segment</p>
          <div className="mt-2 grid gap-2" style={cols}>
            {KM_SEGS.map(([n, km], i) => (
              <div key={n} className={`rounded-lg px-2 py-1.5 text-center ${i === 3 ? 'bg-slate-200/70' : 'bg-slate-100'}`}>
                <p className="text-sm font-semibold text-slate-900">{n}</p>
                <p className="text-[11px] text-slate-500">{km} km{i === 3 ? ' · return' : ''}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5">
            {KM_DOCKETS.map((d, n) => (
              <div key={d.id} className="grid gap-2" style={cols}>
                <div className={`${KM_COLORS[n].bar} flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-white`} style={{ gridColumn: `${d.segs[0] + 1} / ${d.segs[d.segs.length - 1] + 2}` }}>
                  <span>{d.id} <span className="font-normal opacity-80">{d.who}</span></span><span>{d.kg} kg</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-900">Step 2 · Price each segment and split it by weight on board</p>
          <div className="mt-2 grid gap-2" style={cols}>
            {KM_SEGS.map(([n, km], i) => (
              <div key={n} className="flex flex-col rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-2.5 py-2">
                  <p className="text-[11px] text-slate-500">{n} · {km} km × ₹{KM_RATE}</p>
                  <p className="text-lg font-semibold tabular-nums text-slate-900">{inr(segCost[i])}</p>
                  {extra && <p className="text-[11px] tabular-nums text-orange-600">+ {inr(segExtra[i])} extra</p>}
                  <p className="text-[11px] text-slate-500">{board[i]} kg on board</p>
                </div>
                <div className="flex h-2 overflow-hidden">
                  {KM_DOCKETS.map((d, k) => d.segs.includes(i) && <div key={d.id} className={KM_COLORS[k].bar} style={{ width: `${(d.kg / board[i]) * 100}%` }} />)}
                </div>
                <div className="space-y-1 p-2">
                  {KM_DOCKETS.map((d, k) => d.segs.includes(i) && (
                    <div key={d.id} className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ring-1 ${KM_COLORS[k].soft}`}>
                      <span className="font-medium">{d.id}</span>
                      <span className="tabular-nums">{((d.kg / board[i]) * 100).toFixed(0)}% · <b>{inr(piece(d, i))}</b></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-900">Step 3 · Each docket adds up its pieces</p>
      <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-sm ${KM_COLORS[r.n].bar}`} />
            <span className="w-44 shrink-0"><b className="text-slate-900">{r.id}</b> <span className="text-xs text-slate-400">{r.who} · {r.kg} kg</span></span>
            <span className="flex flex-1 flex-wrap items-center gap-1 text-xs tabular-nums text-slate-600">
              {r.pieces.map(([i, v], k) => <span key={i} className="flex items-center gap-1">{k > 0 && <span className="text-slate-300">+</span>}<span className="rounded bg-slate-100 px-1.5 py-0.5">{KM_SEGS[i][0].replace(/ /g, '')} {inr(v)}</span></span>)}
            </span>
            <span className="w-24 text-right text-base font-semibold tabular-nums text-slate-900">{inr(r.cost)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"><span>Whole trip{extra ? ' (incl. additional charge)' : ''}</span><span className="tabular-nums">{inr(total)}</span></div>
      </div>
      <p className="mt-2 text-xs text-slate-500">A docket that unloads early stops paying. A segment with nothing on board (an empty return) has no docket to land on — see the question below.</p>
    </div>
  )
}

function Detail({ t }) {
  const [toll, setToll] = useState(false)
  const [dayKg, setDayKg] = useState(1000)
  const [sub, setSub] = useState('run')
  const [mode, setMode] = useState('PRS')
  const isTrip = t.key === 'trip'
  const hasSub = isTrip || t.key === 'km'
  const extraKg = isTrip ? FAILED_KG : 0
  const den = TOTAL_KG + extraKg
  const rows = allocate(t, toll, dayKg, extraKg)
  const failedBase = isTrip ? (t.run() * FAILED_KG) / den : 0
  const failedToll = isTrip && toll ? (RUN.toll * FAILED_KG) / den : 0
  const failedCost = failedBase + failedToll
  const total = rows.reduce((s, r) => s + r.cost, 0) + failedCost
  return (
    <div className="bg-slate-50/70 px-4 py-3">
      {hasSub && (
        <div className="mb-3 flex gap-1.5">
          {[['run', 'PRS / DRS'], ['mid', 'Mid mile']].map(([v, l]) => <button key={v} onClick={() => setSub(v)} className={sub === v ? pillActive : pillInactive}>{l}</button>)}
        </div>
      )}
      {hasSub && sub === 'mid' ? (
        isTrip ? <MidMile /> : <MidMileKm />
      ) : (<>
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${BUCKETS[t.bucket].tone}`}>
        <div><span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${BUCKETS[t.bucket].chip}`}>{BUCKETS[t.bucket].name}</span><b className="text-slate-900">{t.rate}</b></div>
        <div className="text-slate-600">{t.rule}</div>
      </div>

      {isTrip && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          <span>Run type</span>
          {['PRS', 'DRS'].map((m) => <button key={m} onClick={() => setMode(m)} className={mode === m ? pillActive : pillInactive}>{m}</button>)}
          <span className="text-slate-500">{mode === 'PRS' ? 'Pickup run sheet' : 'Delivery run sheet'} · 4 stops, 1 failed</span>
        </div>
      )}

      {t.bucket === 'month' && (
        <div className="mt-3 rounded-lg border border-sky-200 bg-white p-3">
          <p className="text-xs text-slate-600">How busy was the partner <b>that day</b> (all runs together)? Our run is {TOTAL_KG} kg of it.</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {[[500, 'Quiet · 500 kg'], [1000, 'Normal · 1,000 kg'], [2000, 'Busy · 2,000 kg']].map(([v, l]) => <button key={v} onClick={() => setDayKg(v)} className={dayKg === v ? pillActive : pillInactive}>{l}</button>)}
            <span className="ml-2 text-xs text-slate-500">{inr(t.day())} ÷ {dayKg.toLocaleString('en-IN')} kg = <b className="text-slate-800">{inr1(t.day() / dayKg)} / kg</b>{t.excess() > 0 && <> · cover runs out inside this run: <b className="text-slate-800">{t.excess()} kg</b> × ₹{t.excessRate} extra</>}</span>
          </div>
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
              <th className="text-right font-medium">Additional charges spread</th><th className="text-right font-medium">First-mile cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2"><span className="font-medium text-slate-900">{r.id}</span> <span className="text-xs text-slate-400">{r.consignor}</span></td>
                <td className="text-right">{r.kg}</td><td className="text-right">{((r.kg / den) * 100).toFixed(0)}%</td>
                {t.driver && <td className="text-right">{t.driver[1](r)}</td>}
                <td className="text-right">{toll ? inr(r.toll) : '–'}</td>
                <td className="text-right font-semibold text-slate-900">{inr(r.cost)}</td>
              </tr>
            ))}
            {isTrip && (
              <tr className="border-b border-slate-100 bg-red-50/60 text-red-700">
                <td className="py-2"><span className="font-medium">Stop 4</span> <span className="text-xs">Verma Traders · {mode === 'PRS' ? 'pickup failed — consignor closed' : 'delivery failed — consignee closed'} · estimated weight counts as charged weight</span></td>
                <td className="text-right">{FAILED_KG} est.</td><td className="text-right">{((FAILED_KG / den) * 100).toFixed(0)}%</td><td className="text-right">{toll ? inr(failedToll) : '–'}</td><td className="text-right font-semibold">{inr(failedCost)}</td>
              </tr>
            )}
            <tr className="font-semibold text-slate-900">
              <td className="py-2">Whole run</td><td className="text-right">{den}</td><td className="text-right">100%</td>
              {t.driver && <td className="text-right">{t.driverTotal ? t.driverTotal() : ''}</td>}
              <td className="text-right">{toll ? inr(RUN.toll) : '–'}</td><td className="text-right">{inr(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isTrip && `The run costs ${inr(t.run())} whether or not every stop succeeds. A failed or exception ${mode === 'PRS' ? 'pickup' : 'delivery'} stays on this ${mode} and its estimated weight is used as its charged weight, so it takes its own % weight share of the ${inr(t.run())}. That share is a failed-attempt cost; the picked dockets pay only for their own weight.`}
        {t.note ? t.note : null}
        {!t.note && t.bucket === 'direct' && 'The docket’s own charge needs no sharing. Only additional charges on the run are spread, by % weight.'}
        {!isTrip && !t.note && t.bucket === 'run' && 'The run cost is fixed no matter what was picked. The same run with fewer kg would load a higher ₹/kg onto every docket.'}
        {t.bucket === 'month' && 'No expected volume anywhere. Today’s fixed share is spread over today’s actual charged weight, so quiet days cost more per kg and busy days less. A day with no pickups is booked as “Unabsorbed fixed”, not pushed onto other days — every rupee of the invoice lands somewhere.'}
      </p>
      </>)}
    </div>
  )
}

export default function FirstMile() {
  const [open, setOpen] = useState('kg')
  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm text-slate-700"><b>First mile = the pickup run.</b> One vehicle visits several consignors and brings dockets to the hub. The partner is paid on whatever basis their Partner Pricing says. Our job: land a fair ₹ on each docket.</p>
        <p className="mt-2 text-xs text-slate-500">Rule of thumb: <b>share by charged weight</b> — never by docket count. Any additional charge on the run (toll, parking…) goes to a docket as <b>docket weight ÷ total load of the trip</b>.</p>
      </div>

      <Flow />

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Every way a partner is paid</p>
        <p className="mt-0.5 text-xs text-slate-500">Open one to see how it lands on a docket. Example run: {RUN.km} km · {TOTAL_KG} kg · three dockets · sample rates.</p>
        <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {TYPES.map((x) => {
            const on = open === x.key
            return (
              <div key={x.key}>
                <button onClick={() => setOpen(on ? null : x.key)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
                  <svg className={`h-3.5 w-3.5 shrink-0 transition-transform ${on ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="w-44 shrink-0 font-medium">{x.label}</span>
                  <span className={`flex-1 truncate text-xs ${on ? 'text-slate-300' : 'text-slate-500'}`}>{x.rate}</span>
                  <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline ${on ? 'bg-white/15 text-white' : BUCKETS[x.bucket].chip}`}>{BUCKETS[x.bucket].name}</span>
                </button>
                {on && <Detail t={x} />}
              </div>
            )
          })}
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">To confirm with you</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Fixed deals: OK to book each day’s share by charged weight, with idle days shown as “Unabsorbed fixed”?</li>
          <li>A run that drops dockets at different hubs: still one run, shared across all?</li>
          <li>Should the % types use revenue including the late extras (delay fee, extra handling)?</li>
        </ul>
      </div>
    </div>
  )
}

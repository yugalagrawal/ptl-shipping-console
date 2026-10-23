import { useState } from 'react'
import { card, pillActive, pillInactive } from '../../components/ui.js'

// Experimenter for Costing Method 3 — type dockets and a deal, see the cost. Same rules as the other tabs:
// Docket based: each docket priced on its own · Trip based: trip cost → (manifests by weight × km) → dockets by weight
// Time based: cost so far ÷ weight so far (actual kg), cover is one monthly quantity · Failed pickup = ₹0.
const inr = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const r2 = (n) => Math.round(n * 100) / 100
const PRS = 'PRS/DRS'

const SAMPLE_DOCKETS = [
  { id: 'DKT-1', day: 2, kg: 120, boxes: 4, freight: 900, invoice: 20000, run: PRS, failed: false },
  { id: 'DKT-2', day: 2, kg: 300, boxes: 10, freight: 2200, invoice: 55000, run: PRS, failed: false },
  { id: 'DKT-3', day: 3, kg: 300, boxes: 6, freight: 2500, invoice: 80000, run: 'A-C', failed: false },
  { id: 'DKT-4', day: 4, kg: 150, boxes: 5, freight: 1400, invoice: 30000, run: 'A-C', failed: false },
  { id: 'DKT-5', day: 5, kg: 400, boxes: 12, freight: 4200, invoice: 120000, run: 'A-D', failed: false },
  { id: 'DKT-6', day: 5, kg: 80, boxes: 2, freight: 600, invoice: 9000, run: PRS, failed: true },
]
const SAMPLE_MANIFESTS = [{ id: 'A-C', km: 250 }, { id: 'A-D', km: 450 }]

const DOCKET_TYPES = [
  ['kg', 'Per Kg', '₹ / kg'], ['docket', 'Per Docket', '₹ / docket'], ['box', 'Per Box', '₹ / box'],
  ['freight', '% of Freight', '%'], ['invoice', '% of Invoice', '%'],
]
const VAR_TYPES = [
  ['none', 'None (Monthly fixed)', ''], ['kg', 'Per Kg', '₹ / kg'], ['docket', 'Per Docket', '₹ / docket'], ['box', 'Per Box', '₹ / box'],
  ['trip', 'Per Trip', '₹ / trip'], ['km', 'Per Km', '₹ / km'], ['freight', '% of Freight', '%'], ['invoice', '% of Invoice', '%'],
]
const COVER_UNIT = { kg: 'kg', docket: 'dockets', box: 'boxes', trip: 'trips', km: 'km', freight: '₹ freight', invoice: '₹ invoice' }

const field = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-800 outline-none focus:border-slate-400'
const lbl = 'mb-0.5 block text-[11px] text-slate-400'

function Num({ label, value, onChange, step = 1 }) {
  return (
    <label className="block">
      <span className={lbl}>{label}</span>
      <input type="number" min="0" step={step} value={value} onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} className={field} />
    </label>
  )
}

function Pills({ options, value, onChange }) {
  return <div className="flex flex-wrap gap-2">{options.map(([k, l]) => <button key={k} onClick={() => onChange(k)} className={value === k ? pillActive : pillInactive}>{l}</button>)}</div>
}

const qtyOf = (type, ds, extra) => {
  if (type === 'kg') return ds.reduce((t, d) => t + d.kg, 0)
  if (type === 'docket') return ds.length
  if (type === 'box') return ds.reduce((t, d) => t + d.boxes, 0)
  if (type === 'freight') return ds.reduce((t, d) => t + d.freight, 0)
  if (type === 'invoice') return ds.reduce((t, d) => t + d.invoice, 0)
  return extra[type] || 0 // trip, km — entered
}

export default function CostingExperiment() {
  const [dockets, setDockets] = useState(SAMPLE_DOCKETS)
  const [manifests, setManifests] = useState(SAMPLE_MANIFESTS)
  const [scope, setScope] = useState('prs')
  const [basis, setBasis] = useState('docket')
  const [dType, setDType] = useState('kg')
  const [dRate, setDRate] = useState(12)
  const [tType, setTType] = useState('trip')
  const [tRate, setTRate] = useState(12000)
  const [trips, setTrips] = useState(1)
  const [tKm, setTKm] = useState(450)
  const [tExtra, setTExtra] = useState(1500)
  const [monthly, setMonthly] = useState(52000)
  const [opDays, setOpDays] = useState(26)
  const [vType, setVType] = useState('none')
  const [cover, setCover] = useState(700)
  const [vRate, setVRate] = useState(10)
  const [tripsSoFar, setTripsSoFar] = useState(5)
  const [kmSoFar, setKmSoFar] = useState(900)
  const [asOf, setAsOf] = useState(5)

  const eScope = basis !== 'time' && scope === 'mix' ? 'prs' : scope
  const upd = (i, k, v) => setDockets((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: v } : d)))
  const runs = [PRS, ...manifests.map((m) => m.id)]
  const kmOf = (id) => manifests.find((m) => m.id === id)?.km || 0

  const inScope = dockets.filter((d) => (eScope === 'mix' ? true : eScope === 'prs' ? d.run === PRS : d.run !== PRS))
  const live = inScope.filter((d) => !d.failed)
  const cost = new Map(inScope.map((d) => [d.id + '#' + dockets.indexOf(d), 0]))
  const key = (d) => d.id + '#' + dockets.indexOf(d)
  const notes = []
  let manifestRows = []
  let progression = []
  let headline = ''

  if (basis === 'docket') {
    const [, name, unit] = DOCKET_TYPES.find(([k]) => k === dType)
    live.forEach((d) => {
      const c = dType === 'kg' ? dRate * d.kg : dType === 'docket' ? dRate : dType === 'box' ? dRate * d.boxes : dType === 'freight' ? (dRate / 100) * d.freight : (dRate / 100) * d.invoice
      cost.set(key(d), c)
    })
    headline = `${name} ${dRate} ${unit}`
    notes.push('Each docket is priced on its own. Nothing is shared.')
    if (eScope !== 'prs') notes.push('A manifest’s cost is the sum of its dockets.')
  }

  if (basis === 'trip') {
    const base = tType === 'trip' ? tRate * trips : tRate * tKm
    const total = base + tExtra
    headline = `${tType === 'trip' ? `${trips} trip × ${inr(tRate)}` : `${tKm} km × ${inr(tRate)}`} = ${inr(base)} + extra ${inr(tExtra)} = ${inr(total)}`
    if (eScope === 'prs') {
      const kg = live.reduce((t, d) => t + d.kg, 0)
      live.forEach((d) => cost.set(key(d), kg ? (total * d.kg) / kg : 0))
      notes.push('Trip cost is shared over the run’s dockets by weight.')
    } else {
      const groups = manifests.map((m) => {
        const ds = live.filter((d) => d.run === m.id)
        const kg = ds.reduce((t, d) => t + d.kg, 0)
        return { id: m.id, km: m.km, kg, kgKm: kg * m.km, ds }
      }).filter((g) => g.kg)
      const den = groups.reduce((t, g) => t + g.kgKm, 0)
      groups.forEach((g) => {
        const mc = den ? (total * g.kgKm) / den : 0
        g.cost = mc
        manifestRows.push({ id: g.id, detail: `${g.kg} kg × ${g.km} km = ${g.kgKm.toLocaleString('en-IN')}`, share: den ? g.kgKm / den : 0, cost: mc })
        g.ds.forEach((d) => cost.set(key(d), (mc * d.kg) / g.kg))
      })
      notes.push('Trip cost → manifests by weight × km → dockets by weight. Km matters only here.')
    }
  }

  if (basis === 'time') {
    const daily = monthly / (opDays || 1)
    const unit = VAR_TYPES.find(([k]) => k === vType)[2]
    const step = (day) => {
      const ds = live.filter((d) => d.day <= day)
      const kg = ds.reduce((t, d) => t + d.kg, 0)
      const fixed = daily * day
      const qty = vType === 'none' ? 0 : qtyOf(vType, ds, { trip: tripsSoFar, km: kmSoFar })
      const excess = vType === 'none' ? 0 : Math.max(0, qty - cover)
      const extra = vType === 'freight' || vType === 'invoice' ? (excess * vRate) / 100 : excess * vRate
      const pool = fixed + extra
      return { day, kg, fixed, qty, excess, extra, pool, rate: kg ? pool / kg : 0 }
    }
    const last = step(asOf)
    progression = Array.from({ length: asOf }, (_, i) => step(i + 1))
    live.filter((d) => d.day <= asOf).forEach((d) => cost.set(key(d), last.rate * d.kg))
    headline = `${inr(monthly)} ÷ ${opDays} days = ${inr(r2(daily))} per day${vType !== 'none' ? ` · cover ${cover} ${COVER_UNIT[vType]} · beyond cover ${vRate} ${unit}` : ''}`
    notes.push(`As of Day ${asOf}: cost so far ${inr(r2(last.pool))} ÷ ${last.kg} kg so far = ${inr(r2(last.rate))} per kg. Each docket pays that × its kg.`)
    if (vType !== 'none') notes.push(`Cost so far = fixed so far ${inr(r2(last.fixed))} + rate on ${r2(last.excess)} ${COVER_UNIT[vType]} beyond cover = ${inr(r2(last.extra))}. The cover is one monthly quantity, not spread per day.`)
    if (eScope !== 'prs') {
      const groups = manifests.map((m) => ({ id: m.id, ds: live.filter((d) => d.run === m.id && d.day <= asOf) })).filter((g) => g.ds.length)
      groups.forEach((g) => {
        const kg = g.ds.reduce((t, d) => t + d.kg, 0)
        manifestRows.push({ id: g.id, detail: `${kg} kg`, cost: g.ds.reduce((t, d) => t + cost.get(key(d)), 0) })
      })
      notes.push('Manifest cost is by manifest weight only (no km): the sum of its dockets.')
    }
  }

  const total = inScope.reduce((t, d) => t + (cost.get(key(d)) || 0), 0)
  const kgCosted = inScope.filter((d) => !d.failed && (basis !== 'time' || d.day <= asOf)).reduce((t, d) => t + d.kg, 0)
  const th = 'py-1.5 pr-2 text-left font-medium'
  const td = 'py-1 pr-2'

  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Experiment — type the dockets and the deal, see the cost</p>
        <p className="mt-1 text-xs text-slate-500">Uses the same rules as the other tabs. Failed pickup dockets cost ₹0 and are left out of the weight.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <span className={lbl}>Job</span>
            <Pills value={eScope} onChange={setScope} options={[['prs', 'PRS/DRS'], ['mf', 'Manifest'], ...(basis === 'time' ? [['mix', 'Mix']] : [])]} />
          </div>
          <div>
            <span className={lbl}>Cost basis</span>
            <Pills value={basis} onChange={setBasis} options={[['docket', 'Docket based'], ['trip', 'Trip based'], ['time', 'Time based']]} />
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          {basis === 'docket' && (
            <div className="grid items-end gap-3 sm:grid-cols-3">
              <label className="block"><span className={lbl}>Pricing type</span>
                <select value={dType} onChange={(e) => setDType(e.target.value)} className={field}>{DOCKET_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <Num label={`Rate (${DOCKET_TYPES.find(([k]) => k === dType)[2]})`} value={dRate} onChange={setDRate} step="0.5" />
            </div>
          )}
          {basis === 'trip' && (
            <div className="grid items-end gap-3 sm:grid-cols-5">
              <label className="block"><span className={lbl}>Pricing type</span>
                <select value={tType} onChange={(e) => setTType(e.target.value)} className={field}><option value="trip">Per Trip</option><option value="km">Per Km</option></select></label>
              <Num label={tType === 'trip' ? 'Rate (₹ / trip)' : 'Rate (₹ / km)'} value={tRate} onChange={setTRate} />
              {tType === 'trip' ? <Num label="Trips" value={trips} onChange={setTrips} /> : <Num label="Trip km" value={tKm} onChange={setTKm} />}
              <Num label="Additional charges (toll…) ₹" value={tExtra} onChange={setTExtra} />
            </div>
          )}
          {basis === 'time' && (
            <div className="space-y-3">
              <div className="grid items-end gap-3 sm:grid-cols-4">
                <Num label="Monthly fixed (₹)" value={monthly} onChange={setMonthly} />
                <Num label="Operational days" value={opDays} onChange={setOpDays} />
                <Num label="As of day" value={asOf} onChange={(v) => setAsOf(Math.min(31, Math.max(1, v)))} />
              </div>
              <div className="grid items-end gap-3 sm:grid-cols-5">
                <label className="block sm:col-span-2"><span className={lbl}>Variable after cover</span>
                  <select value={vType} onChange={(e) => setVType(e.target.value)} className={field}>{VAR_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                {vType !== 'none' && <Num label={`Cover (${COVER_UNIT[vType]})`} value={cover} onChange={setCover} />}
                {vType !== 'none' && <Num label={`Rate (${VAR_TYPES.find(([k]) => k === vType)[2]})`} value={vRate} onChange={setVRate} step="0.5" />}
                {vType === 'trip' && <Num label="Trips so far" value={tripsSoFar} onChange={setTripsSoFar} />}
                {vType === 'km' && <Num label="Km so far" value={kmSoFar} onChange={setKmSoFar} />}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Dockets</p>
          <div className="flex gap-2">
            <button onClick={() => setDockets((ds) => [...ds, { id: `DKT-${ds.length + 1}`, day: 1, kg: 100, boxes: 1, freight: 500, invoice: 10000, run: eScope === 'mf' ? runs[1] || PRS : PRS, failed: false }])} className={pillActive}>+ Add docket</button>
            <button onClick={() => { setDockets(SAMPLE_DOCKETS); setManifests(SAMPLE_MANIFESTS) }} className={pillInactive}>Reset sample</button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-400">
                <th className={th}>Docket</th><th className={th}>Day</th><th className={th}>Kg</th><th className={th}>Boxes</th><th className={th}>Freight ₹</th><th className={th}>Invoice ₹</th><th className={th}>Run</th><th className={th}>Failed</th><th className="py-1.5 pr-2 text-right font-medium">Cost</th><th />
              </tr>
            </thead>
            <tbody>
              {dockets.map((d, i) => {
                const inUse = inScope.includes(d)
                return (
                  <tr key={i} className={`border-b border-slate-100 ${inUse ? '' : 'opacity-40'}`}>
                    <td className={td}><input value={d.id} onChange={(e) => upd(i, 'id', e.target.value)} className={`${field} w-20`} /></td>
                    {['day', 'kg', 'boxes', 'freight', 'invoice'].map((k) => (
                      <td key={k} className={td}><input type="number" min="0" value={d[k]} onChange={(e) => upd(i, k, Math.max(0, parseFloat(e.target.value) || 0))} className={`${field} ${k === 'day' || k === 'boxes' ? 'w-14' : 'w-20'}`} /></td>
                    ))}
                    <td className={td}><select value={d.run} onChange={(e) => upd(i, 'run', e.target.value)} className={`${field} w-28`}>{runs.map((r) => <option key={r}>{r}</option>)}</select></td>
                    <td className={td}><input type="checkbox" checked={d.failed} onChange={(e) => upd(i, 'failed', e.target.checked)} /></td>
                    <td className={`${td} text-right font-semibold tabular-nums text-slate-900`}>{inUse ? (d.failed ? '₹0' : basis === 'time' && d.day > asOf ? <span className="font-normal text-slate-300">not yet</span> : inr(cost.get(key(d)) || 0)) : '—'}</td>
                    <td className="py-1 text-right"><button onClick={() => setDockets((ds) => ds.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500">✕</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-700">Manifests (km is used only in Trip based)</span>
          {manifests.map((m, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <input value={m.id} onChange={(e) => { const v = e.target.value; setDockets((ds) => ds.map((d) => (d.run === m.id ? { ...d, run: v } : d))); setManifests((ms) => ms.map((x, j) => (j === i ? { ...x, id: v } : x))) }} className={`${field} w-16`} />
              <input type="number" min="0" value={m.km} onChange={(e) => setManifests((ms) => ms.map((x, j) => (j === i ? { ...x, km: Math.max(0, parseFloat(e.target.value) || 0) } : x)))} className={`${field} w-16`} /><span className="text-slate-400">km</span>
              <button onClick={() => { setDockets((ds) => ds.map((d) => (d.run === m.id ? { ...d, run: PRS } : d))); setManifests((ms) => ms.filter((_, j) => j !== i)) }} className="text-slate-300 hover:text-red-500">✕</button>
            </div>
          ))}
          <button onClick={() => setManifests((ms) => [...ms, { id: `M-${ms.length + 1}`, km: 100 }])} className={pillInactive}>+ Manifest</button>
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Result</p>
        <p className="mt-1 text-xs text-slate-500">{headline}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[['Total cost', inr(total)], ['Kg costed', `${kgCosted} kg`], ['₹ per kg', kgCosted ? inr(total / kgCosted) : '—']].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] text-slate-400">{l}</p><p className="text-lg font-semibold tabular-nums text-slate-900">{v}</p></div>
          ))}
        </div>
        {manifestRows.length > 0 && (
          <table className="mt-3 w-full text-xs">
            <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className={th}>Manifest</th><th className={th}>Basis</th><th className="py-1.5 pr-2 text-right font-medium">Share</th><th className="py-1.5 text-right font-medium">Cost</th></tr></thead>
            <tbody>{manifestRows.map((m) => (
              <tr key={m.id} className="border-b border-slate-100"><td className={`${td} font-semibold text-slate-800`}>{m.id}</td><td className={`${td} text-slate-600`}>{m.detail}</td><td className={`${td} text-right tabular-nums text-slate-600`}>{m.share != null ? Math.round(m.share * 1000) / 10 + '%' : '—'}</td><td className="py-1 text-right font-semibold tabular-nums text-slate-900">{inr(m.cost)}</td></tr>
            ))}</tbody>
          </table>
        )}
        {progression.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <p className="mb-1 text-xs font-semibold text-slate-800">Day by day</p>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className={th}>Day</th><th className="py-1.5 pr-2 text-right font-medium">Kg so far</th><th className="py-1.5 pr-2 text-right font-medium">Fixed so far</th>{vType !== 'none' && <th className="py-1.5 pr-2 text-right font-medium">Beyond cover</th>}{vType !== 'none' && <th className="py-1.5 pr-2 text-right font-medium">+ Rate</th>}<th className="py-1.5 pr-2 text-right font-medium">Cost so far</th><th className="py-1.5 text-right font-medium">₹ per kg</th></tr></thead>
              <tbody>{progression.map((p) => (
                <tr key={p.day} className="border-b border-slate-100 text-slate-600">
                  <td className={`${td} font-semibold text-slate-800`}>{p.day}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.kg || '—'}</td>
                  <td className={`${td} text-right tabular-nums`}>{inr(r2(p.fixed))}</td>
                  {vType !== 'none' && <td className={`${td} text-right tabular-nums ${p.excess ? 'font-semibold text-orange-600' : ''}`}>{p.excess ? r2(p.excess) : '—'}</td>}
                  {vType !== 'none' && <td className={`${td} text-right tabular-nums`}>{p.extra ? inr(r2(p.extra)) : '—'}</td>}
                  <td className={`${td} text-right font-semibold tabular-nums text-slate-900`}>{inr(r2(p.pool))}</td>
                  <td className="py-1 text-right tabular-nums">{p.kg ? inr(r2(p.rate)) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <ul className="mt-3 space-y-1 text-xs leading-relaxed text-slate-600">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </div>
  )
}

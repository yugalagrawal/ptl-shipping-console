import { useMemo, useState } from 'react'
import { card, pill, pillActive, pillInactive } from '../../components/ui.js'
import { FACILITIES, VARIABLE_CATEGORIES, getSheet, hasSheet, addFixedRow, addVariableRow, removeRow, updateRow, copyFixedFrom, prevMonth, daysInMonth, num, getSortHours, setSortHours } from '../../data/hubCosts.js'

const inr = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const TODAY = '2026-10-23'
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400'
const lbl = 'mb-1 block text-xs font-medium text-slate-500'

function Picker({ onPick }) {
  const [kind, setKind] = useState('All')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return FACILITIES.filter((f) => (kind === 'All' || f.type === kind) && (!s || `${f.name} ${f.code} ${f.zone} ${f.region}`.toLowerCase().includes(s)))
  }, [kind, q])
  return (
    <div className={`p-5 ${card}`}>
      <p className="text-sm font-semibold text-slate-900">Select a Hub or Mini Hub</p>
      <p className="mt-1 text-xs text-slate-500">Pick the type, search by name or code, then open its ledger.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {['All', 'Hub', 'Mini Hub'].map((k) => <button key={k} onClick={() => setKind(k)} className={kind === k ? pillActive : pillInactive}>{k}</button>)}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hub name, code, zone or region…" className={`${input} mt-3`} autoFocus />
      <p className="mt-3 text-[11px] text-slate-400">{list.length} {list.length === 1 ? 'result' : 'results'}</p>
      <div className="mt-1 max-h-[22rem] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No hub or mini hub matches “{q}”.</p>}
        {list.map((f) => (
          <button key={f.code} onClick={() => onPick(f)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50">
            <span>
              <span className="block text-sm font-medium text-slate-800">{f.name}</span>
              <span className="block text-[11px] text-slate-400">{f.code} · {f.zone} · {f.region}</span>
            </span>
            <span className={`${pill} ${f.type === 'Hub' ? 'bg-slate-900 text-white' : 'bg-orange-50 text-orange-700'}`}>{f.type}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const cellIn = 'w-full bg-transparent px-3 py-2 text-sm text-slate-800 outline-none focus:bg-orange-50/50'
const sheetTh = 'border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 last:border-r-0'
const sheetTd = 'border-b border-r border-slate-100 p-0 last:border-r-0'

function HubFactor({ fac, total, bump }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const set = getSortHours(fac.code)
  const hours = set ?? 24
  const factor = hours / 24
  const pct = (v) => `${Math.round(v * 1000) / 10}%`
  const save = () => { setSortHours(fac.code, parseFloat(typed)); bump(); setOpen(false) }
  return (
    <div className={`p-5 ${card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Hub factor — {fac.name}</p>
          <p className="mt-1 text-[11px] text-slate-500">Used in Level 2 Cost. Hub factor = sortation hours ÷ 24. It splits the month’s cost into Sortation cost (shared by weight) and Storage cost (shared by kg-hours beyond the sortation hours).</p>
        </div>
        <button onClick={() => { setOpen((o) => !o); setTyped(String(hours)) }} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">{open ? 'Close' : 'Configure Hub Factor'}</button>
      </div>

      {open && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-4">
          <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Sortation hours (1 to 24)</span>
            <input type="number" min="1" max="24" step="1" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. 16" className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-slate-400" /></label>
          <button onClick={save} className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark">Save</button>
          <p className="text-[11px] text-slate-400">Hub factor will be {Math.min(24, Math.max(1, Math.round(parseFloat(typed)) || 24))}/24</p>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[11px] text-slate-500">Sortation hours</p><p className="text-xl font-semibold tabular-nums text-slate-900">{hours} h{set == null && <span className="ml-1 text-[11px] font-normal text-slate-400">default</span>}</p></div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[11px] text-slate-500">Hub factor</p><p className="text-xl font-semibold tabular-nums text-slate-900">{hours}/24</p><p className="text-[11px] text-slate-400">sortation hours ÷ 24</p></div>
        <div className="rounded-xl bg-orange-50 px-3 py-2.5"><p className="text-[11px] text-slate-500">A. Sortation cost this month</p><p className="text-xl font-semibold tabular-nums text-slate-900">{inr(total * factor)}</p><p className="text-[11px] text-slate-400">{inr(total)} × {hours}/24 ({pct(factor)})</p></div>
        <div className="rounded-xl bg-sky-50 px-3 py-2.5"><p className="text-[11px] text-slate-500">B. Storage cost this month</p><p className="text-xl font-semibold tabular-nums text-slate-900">{inr(total * (1 - factor))}</p><p className="text-[11px] text-slate-400">{inr(total)} × {24 - hours}/24 ({pct(1 - factor)})</p></div>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <span className="bg-orange-400" style={{ width: pct(factor) }} />
        <span className="bg-sky-400" style={{ width: pct(1 - factor) }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">A docket that leaves within {hours} h pays sortation only. Beyond {hours} h it also takes a share of storage. Each month is its own pool; a docket staying over a month end pays storage to both months.</p>
    </div>
  )
}

function Ledger({ fac, onBack }) {
  const [tick, setTick] = useState(0)
  const [month, setMonth] = useState(TODAY.slice(0, 7))
  const bump = () => setTick((t) => t + 1)
  const sheet = getSheet(fac.code, month)
  const days = daysInMonth(month)
  const prev = prevMonth(month)

  const upd = (kind, id, patch) => { updateRow(fac.code, month, kind, id, patch); bump() }
  const fixedTotal = sheet.fixed.reduce((t, r) => t + num(r.amount), 0)
  const varTotal = sheet.variable.reduce((t, r) => t + num(r.amount), 0)
  const first = `${month}-01`
  const last = `${month}-${String(days).padStart(2, '0')}`

  return (
    <div className="space-y-5">
      <div className={`flex flex-wrap items-center justify-between gap-3 p-4 ${card}`}>
        <div className="flex items-center gap-3">
          <span className={`${pill} ${fac.type === 'Hub' ? 'bg-slate-900 text-white' : 'bg-orange-50 text-orange-700'}`}>{fac.type}</span>
          <div>
            <p className="text-base font-semibold text-slate-900">{fac.name}</p>
            <p className="text-[11px] text-slate-400">{fac.code} · {fac.zone} · {fac.region}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-500">Month
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700" /></label>
          <button onClick={onBack} className="text-xs font-medium text-slate-500 hover:text-slate-900">← Change hub</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Fixed (monthly)', inr(fixedTotal)], [`Fixed per day (÷ ${days} days)`, inr(fixedTotal / days)], ['Variable this month', inr(varTotal)], ['Warehouse cost for the month', inr(fixedTotal + varTotal)]].map(([l, v], i) => (
          <div key={l} className={`rounded-2xl border px-4 py-3 ${i === 3 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200/70 bg-white'}`}>
            <p className={`text-[11px] ${i === 3 ? 'text-slate-300' : 'text-slate-500'}`}>{l}</p>
            <p className="text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <HubFactor fac={fac} total={fixedTotal + varTotal} bump={bump} />

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Fixed cost — monthly bills</p>
            <p className="text-[11px] text-slate-400">Enter the monthly amount. Each bill is spread over the {days} calendar days of the month.</p>
          </div>
          <div className="flex gap-2">
            {hasSheet(fac.code, prev) && <button onClick={() => { copyFixedFrom(fac.code, prev, month); bump() }} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Copy from {prev}</button>}
            <button onClick={() => { addFixedRow(fac.code, month); bump() }} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">+ Add row</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse">
            <thead><tr><th className={`${sheetTh} w-10 text-center`}>#</th><th className={`${sheetTh} w-80`}>Item</th><th className={`${sheetTh} w-40 text-right`}>Monthly amount (₹)</th><th className={`${sheetTh} w-36 text-right`}>Per day</th><th className={sheetTh}>Note</th><th className={`${sheetTh} w-10`} /></tr></thead>
            <tbody>
              {sheet.fixed.map((r, i) => (
                <tr key={r.id}>
                  <td className={`${sheetTd} bg-slate-50/60 text-center text-xs text-slate-400`}>{i + 1}</td>
                  <td className={sheetTd}><input value={r.item} onChange={(e) => upd('fixed', r.id, { item: e.target.value })} placeholder="Item name" className={`${cellIn} ${r.custom ? '' : 'font-medium'}`} /></td>
                  <td className={sheetTd}><input type="number" min="0" value={r.amount} onChange={(e) => upd('fixed', r.id, { amount: e.target.value })} placeholder="0" className={`${cellIn} text-right tabular-nums`} /></td>
                  <td className={`${sheetTd} px-3 text-right text-sm tabular-nums text-slate-500`}>{num(r.amount) ? inr(num(r.amount) / days) : '—'}</td>
                  <td className={sheetTd}><input value={r.note} onChange={(e) => upd('fixed', r.id, { note: e.target.value })} placeholder="Optional" className={`${cellIn} text-slate-500`} /></td>
                  <td className={`${sheetTd} text-center`}><button onClick={() => { removeRow(fac.code, month, 'fixed', r.id); bump() }} className="text-slate-300 hover:text-red-500" title="Remove row">✕</button></td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="border-r border-slate-100" /><td className="px-3 py-2 text-sm">Total fixed</td>
                <td className="px-3 py-2 text-right text-sm tabular-nums">{inr(fixedTotal)}</td><td className="px-3 py-2 text-right text-sm tabular-nums">{inr(fixedTotal / days)}</td><td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Variable / ad-hoc cost — day by day</p>
            <p className="text-[11px] text-slate-400">Each cost is added on its date, for example extra labour on a peak day.</p>
          </div>
          <button onClick={() => { addVariableRow(fac.code, month); bump() }} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">+ Add row</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr><th className={`${sheetTh} w-10 text-center`}>#</th><th className={`${sheetTh} w-44`}>Date</th><th className={`${sheetTh} w-52`}>Category</th><th className={sheetTh}>Note</th><th className={`${sheetTh} w-44 text-right`}>Amount (₹)</th><th className={`${sheetTh} w-10`} /></tr></thead>
            <tbody>
              {sheet.variable.map((r, i) => (
                <tr key={r.id}>
                  <td className={`${sheetTd} bg-slate-50/60 text-center text-xs text-slate-400`}>{i + 1}</td>
                  <td className={sheetTd}><input type="date" min={first} max={last} value={r.date} onChange={(e) => upd('variable', r.id, { date: e.target.value })} className={cellIn} /></td>
                  <td className={sheetTd}><select value={r.category} onChange={(e) => upd('variable', r.id, { category: e.target.value })} className={cellIn}>{VARIABLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></td>
                  <td className={sheetTd}><input value={r.note} onChange={(e) => upd('variable', r.id, { note: e.target.value })} placeholder="e.g. 8 extra loaders for peak day" className={`${cellIn} text-slate-500`} /></td>
                  <td className={sheetTd}><input type="number" min="0" value={r.amount} onChange={(e) => upd('variable', r.id, { amount: e.target.value })} placeholder="0" className={`${cellIn} text-right tabular-nums`} /></td>
                  <td className={`${sheetTd} text-center`}><button onClick={() => { removeRow(fac.code, month, 'variable', r.id); bump() }} className="text-slate-300 hover:text-red-500" title="Remove row">✕</button></td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="border-r border-slate-100" /><td className="px-3 py-2 text-sm" colSpan={3}>Total variable</td>
                <td className="px-3 py-2 text-right text-sm tabular-nums">{inr(varTotal)}</td><td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function HubCostLedger() {
  const [fac, setFac] = useState(null)
  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Warehouse Cost Ledger</h1>
        <p className="mt-1 text-sm text-slate-500">Log what each hub or mini warehouse costs. Level 2 Cost reads from here: fixed bills are spread over the calendar days of the month, and variable costs are added on the day they happen.</p>
      </div>
      {fac ? <Ledger fac={fac} onBack={() => setFac(null)} /> : <Picker onPick={setFac} />}
    </div>
  )
}

import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { card, thCls, tdCls, rowCls, pill, btnPrimary, btnSecondary } from '../../components/ui.js'
import { DOCKETS_SEED } from '../../data/dockets.js'
import { fmtDocket } from '../../data/docketNumber.js'
import {
  PKG_BLOCKS, fmtPackage, sourceOfPackage, lookupPackage, packagesOfDocket, blockUsage, allDocketLabelRows,
  allocateAutomated, linkStock,
} from '../../data/packageSeries.js'

const th = thCls.replace('px-6', 'px-3')
const td = tdCls.replace('px-6', 'px-3')
const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40'
const SRC_LABEL = { automated: 'Automated', stock: 'Stock' }
const SRC_CLS = { automated: 'bg-sky-50 text-sky-700', stock: 'bg-violet-50 text-violet-700' }
const docketOf = (n) => DOCKETS_SEED.find((d) => String(d.docketNumber) === String(n))

// Compact span for a docket's labels: first – last, or "n numbers" when not contiguous.
function spanOf(list) {
  if (!list.length) return '—'
  const contiguous = list[list.length - 1] - list[0] === list.length - 1
  return contiguous ? (list.length === 1 ? fmtPackage(list[0]) : `${fmtPackage(list[0])} – ${fmtPackage(list[list.length - 1])}`) : `${fmtPackage(list[0])} … ${fmtPackage(list[list.length - 1])} (${list.length} numbers)`
}

function Tile({ u }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{u.label}</h2>
        <span className={`${pill} !py-0.5 ${SRC_CLS[u.id]}`}>{u.id === 'automated' ? 'Printed labels' : 'Pre-printed stock'}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-slate-500">{fmtPackage(u.from)} – {fmtPackage(u.to)}</p>
      <div className="mt-3 flex gap-6 text-sm">
        <div><p className="text-xs text-slate-400">Used</p><p className="font-semibold tabular-nums text-slate-900">{u.used.toLocaleString('en-IN')}</p></div>
        <div><p className="text-xs text-slate-400">Left</p><p className="font-semibold tabular-nums text-slate-900">{u.left.toLocaleString('en-IN')}</p></div>
        {u.next && <div><p className="text-xs text-slate-400">Next barcode</p><p className="font-mono text-sm font-semibold text-slate-900">{fmtPackage(u.next)}</p></div>}
      </div>
    </div>
  )
}

// One modal for both ways a docket gets its parcel numbers.
function LabelsModal({ initialDocket, onClose, onDone }) {
  const [mode, setMode] = useState('automated')
  const [docket, setDocket] = useState(initialDocket ?? '')
  const [count, setCount] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const d = docketOf(docket)
  const mapped = docket ? packagesOfDocket(docket).length : 0
  const pending = d ? Math.max((d.awbCount ?? 0) - mapped, 0) : 0
  const submit = () => {
    if (!docket) return setErr('Pick a docket.')
    const r = mode === 'automated' ? allocateAutomated(docket, count || pending) : linkStock(docket, text)
    if (r.error) return setErr(r.error)
    onDone({ docket, barcodes: r.barcodes, source: mode })
  }
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Map package labels to a docket</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex gap-2">
            {Object.values(PKG_BLOCKS).map((b) => (
              <button key={b.id} type="button" onClick={() => { setMode(b.id); setErr('') }} className={`${pill} ${mode === b.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{b.label}</button>
            ))}
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Docket</span>
            <select value={docket} onChange={(e) => { setDocket(e.target.value); setErr('') }} className={`${inputCls} mt-1`}>
              <option value="">Select a docket</option>
              {DOCKETS_SEED.map((x) => <option key={x.docketNumber} value={x.docketNumber}>{fmtDocket(x.docketNumber)} · {x.clientName} · {x.awbCount} parcels</option>)}
            </select>
          </label>
          {d && <p className="text-xs text-slate-500">{d.awbCount} parcels · {mapped} already mapped{pending ? ` · ${pending} to go` : ' · all mapped'}</p>}
          {mode === 'automated' ? (
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Number of labels</span>
              <input type="number" min="1" value={count} placeholder={pending ? String(pending) : '1'} onChange={(e) => { setCount(e.target.value); setErr('') }} className={`${inputCls} mt-1`} />
              <span className="mt-1 block text-xs text-slate-400">The next unused sequential barcodes are reserved for this docket, ready to print.</span>
            </label>
          ) : (
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Stock label numbers</span>
              <textarea rows={3} value={text} onChange={(e) => { setText(e.target.value); setErr('') }} placeholder="600000000101 – 600000000110, 600000000150" className={`${inputCls} mt-1 font-mono`} />
              <span className="mt-1 block text-xs text-slate-400">Type the numbers written on the labels. Separate with commas or spaces; use a dash for a range.</span>
            </label>
          )}
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" onClick={submit} className={btnPrimary}>{mode === 'automated' ? 'Generate labels' : 'Link labels'}</button>
        </div>
      </div>
    </div>
  )
}

function SearchResult({ q }) {
  const digits = q.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 12) {
    const hit = lookupPackage(digits)
    const src = sourceOfPackage(digits)
    if (hit) {
      const list = packagesOfDocket(hit.docket)
      return <p className={`${card} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm`}>
        <span className="font-mono font-semibold tracking-wider text-slate-900">{fmtPackage(digits)}</span>
        <span className={`${pill} !py-0.5 ${SRC_CLS[hit.source]}`}>{SRC_LABEL[hit.source]}</span>
        <span className="text-slate-600">Parcel {list.indexOf(Number(digits)) + 1} of {list.length} · Docket <span className="font-mono">{fmtDocket(hit.docket)}</span></span>
        <span className="text-slate-400">{docketOf(hit.docket)?.clientName}</span>
      </p>
    }
    return <p className={`${card} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm`}>
      <span className="font-mono font-semibold tracking-wider text-slate-900">{fmtPackage(digits)}</span>
      {src ? <><span className={`${pill} !py-0.5 bg-emerald-50 text-emerald-700`}>Not used yet</span><span className="text-slate-600">{SRC_LABEL[src]} series</span></> : <span className="text-red-500">Outside the package series</span>}
    </p>
  }
  return null
}

export default function PackageSeries() {
  const { hasFunction } = useAuth()
  const canManage = hasFunction('package-series.manage')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null) // { docket? }
  const [flash, setFlash] = useState('')
  const [tick, setTick] = useState(0)
  const digits = query.replace(/\D/g, '')

  const usage = useMemo(() => [blockUsage('automated'), blockUsage('stock')], [tick])
  const rows = useMemo(() => {
    const labelled = new Map(allDocketLabelRows().map((r) => [r.docket, r]))
    const out = DOCKETS_SEED.map((d) => {
      const l = labelled.get(String(d.docketNumber))
      return { docket: String(d.docketNumber), client: d.clientName, parcels: d.awbCount ?? 0, list: l?.list ?? [], source: l?.source, ts: l?.ts ?? 0 }
    })
    const q = digits
    return out.filter((r) => !q || r.docket.includes(q) || r.list.some((b) => String(b).includes(q)))
      .sort((a, b) => (b.ts - a.ts) || (b.parcels - a.parcels))
  }, [tick, digits])

  const done = ({ docket, barcodes, source }) => {
    setModal(null); setTick((t) => t + 1)
    setFlash(`${barcodes.length} ${SRC_LABEL[source].toLowerCase()} label${barcodes.length > 1 ? 's' : ''} mapped to docket ${fmtDocket(docket)}.`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Package Series</h1>
        <button type="button" disabled={!canManage} onClick={() => setModal({})} className={`${btnPrimary} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none`}>
          <Icon name="plus" className="h-4 w-4" />Map labels to a docket
        </button>
      </div>
      {flash && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{flash}</p>}

      <div className="grid gap-4 md:grid-cols-2">{usage.map((u) => <Tile key={u.id} u={u} />)}</div>

      <div className="space-y-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a package barcode or docket number" aria-label="Search package series"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40" autoComplete="off" />
        </div>
        <SearchResult q={query} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Labels by docket</h2>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[48rem]">
            <thead>
              <tr>
                <th className={th}>Docket</th><th className={th}>Client</th><th className={`${th} text-right`}>Parcels</th>
                <th className={th}>Labels</th><th className={th}>Series</th><th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const short = r.parcels - r.list.length
                return (
                  <tr key={r.docket} className={rowCls}>
                    <td className={`${td} font-mono text-xs font-semibold tracking-wider text-slate-800`}>{fmtDocket(r.docket)}</td>
                    <td className={td}>{r.client}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.parcels}</td>
                    <td className={`${td} font-mono text-xs text-slate-700`}>{spanOf(r.list)}</td>
                    <td className={td}>{r.source ? <span className={`${pill} !py-0.5 ${SRC_CLS[r.source]}`}>{SRC_LABEL[r.source]}</span> : '—'}</td>
                    <td className={td}>
                      {short <= 0 && r.list.length ? <span className={`${pill} !py-0.5 bg-emerald-50 text-emerald-700`}>All mapped</span>
                        : <button type="button" disabled={!canManage} onClick={() => setModal({ docket: r.docket })} className="text-xs font-medium text-brand-orange-dark hover:underline disabled:text-slate-300 disabled:no-underline">{short === r.parcels ? 'No labels — map' : `${short} to go — map`}</button>}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">No docket or package matches.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {modal && <LabelsModal initialDocket={modal.docket} onClose={() => setModal(null)} onDone={done} />}
    </div>
  )
}

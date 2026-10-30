import { useState } from 'react'
import { btnPrimary } from './ui.js'
import Icon from './Icon.jsx'
import { printLabelSheet } from '../pages/docket/docketPrintSheet.js'
import { allocateAutomated, linkStock, packagesOfDocket, sourceOfPackage, fmtPackage } from '../data/packageSeries.js'

// Package labels for one docket — print system-generated ones, or link pre-printed stock labels
// (the same two routes PTL APP offers at pickup). Used right after a docket is created and from
// the Docket Dashboard's "Pending Label Print" tab.
export default function DocketLabelsPanel({ docket, packages, onChange, title = 'Package labels', titleNote }) {
  const [, bump] = useState(0)
  const [route, setRoute] = useState(null) // 'print' | 'stock'
  const [stock, setStock] = useState('')
  const [error, setError] = useState('')
  const labels = packagesOfDocket(docket.docketNumber)
  const source = labels.length ? sourceOfPackage(labels[0]) : null
  const need = Math.max(0, packages - labels.length)

  function printNew() {
    const r = allocateAutomated(docket.docketNumber, packages)
    if (r.error) { setError(r.error); return }
    setError(''); bump((n) => n + 1); onChange?.()
    printLabelSheet(docket, r.barcodes, fmtPackage)
  }
  function assignStock() {
    const r = linkStock(docket.docketNumber, stock)
    if (r.error) { setError(r.error); return }
    setError(''); setStock(''); bump((n) => n + 1); onChange?.()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{title} <span className="font-normal text-slate-500">{titleNote ? `· ${titleNote} ` : ''}· {packages} package{packages === 1 ? '' : 's'}</span></p>
          {labels.length > 0 && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${need === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{labels.length} of {packages} assigned</span>}
        </div>

        {labels.length === 0 && !route && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setRoute('print')} className="rounded-xl border border-slate-200 p-3 text-left hover:border-brand-orange/50 hover:bg-slate-50">
              <span className="block text-sm font-semibold text-slate-900">Print labels</span>
              <span className="block text-xs text-slate-500">System-generated package numbers, printed now.</span>
            </button>
            <button type="button" onClick={() => setRoute('stock')} className="rounded-xl border border-slate-200 p-3 text-left hover:border-brand-orange/50 hover:bg-slate-50">
              <span className="block text-sm font-semibold text-slate-900">Assign pre-printed labels</span>
              <span className="block text-xs text-slate-500">Link the stock stickers you already have.</span>
            </button>
          </div>
        )}

        {labels.length === 0 && route === 'print' && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">{packages} label{packages === 1 ? '' : 's'} will be numbered and sent to the printer.</p>
            <button type="button" onClick={printNew} className={btnPrimary}><Icon name="invoice" className="h-4 w-4" /> Print {packages} label{packages === 1 ? '' : 's'}</button>
            <button type="button" onClick={() => { setRoute(null); setError('') }} className="text-xs font-medium text-slate-400 hover:text-slate-600">Back</button>
          </div>
        )}

        {(route === 'stock' && labels.length === 0 || (source === 'stock' && need > 0)) && (
          <div className="mt-3 space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Pre-printed label numbers — 12 digits each, or a range (e.g. 600000000101-600000000105). {need > 0 ? `${need} more needed.` : ''}</span>
              <textarea value={stock} onChange={(e) => setStock(e.target.value)} rows={2} placeholder="600000000101-600000000105" className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm tabular-nums focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40" />
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={assignStock} disabled={!stock.trim()} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>Assign labels</button>
              {labels.length === 0 && <button type="button" onClick={() => { setRoute(null); setError('') }} className="text-xs font-medium text-slate-400 hover:text-slate-600">Back</button>}
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

        {labels.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-slate-500">{source === 'stock' ? 'Pre-printed (stock) labels linked' : 'System-generated labels'}</p>
            <p className="break-words text-xs tabular-nums text-slate-700">{labels.map((b) => fmtPackage(b)).join(' · ')}</p>
            {source === 'automated' && <button type="button" onClick={() => printLabelSheet(docket, labels, fmtPackage)} className="text-xs font-semibold text-brand-orange-dark hover:underline">Reprint labels</button>}
          </div>
        )}
      </div>
  )
}

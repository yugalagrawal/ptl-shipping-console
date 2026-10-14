import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { card, pill } from '../../components/ui.js'
import { DOCKETS_SEED, DOCKET_STATUS_LABEL, DOCKET_STATUS_BADGE, MODE_LABEL } from '../../data/dockets.js'
import { fmtDocket } from '../../data/docketNumber.js'
import { fmtPackage, sourceOfPackage, lookupPackage, packagesOfDocket, blockUsage } from '../../data/packageSeries.js'

const SRC_LABEL = { automated: 'System Generated', stock: 'Stock' }
const SRC_CLS = { automated: 'bg-sky-50 text-sky-700', stock: 'bg-violet-50 text-violet-700' }

function Info({ u }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{SRC_LABEL[u.id]}</h2>
        <span className={`${pill} !py-0.5 ${SRC_CLS[u.id]}`}>{u.id === 'automated' ? 'Printed labels' : 'Pre-printed stock'}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-slate-500">{fmtPackage(u.from)} – {fmtPackage(u.to)}</p>
      <div className="mt-3 flex gap-6 text-sm">
        <div><p className="text-xs text-slate-400">Used</p><p className="font-semibold tabular-nums text-slate-900">{u.used.toLocaleString('en-IN')}</p></div>
        {u.next && <div><p className="text-xs text-slate-400">Next barcode</p><p className="font-mono text-sm font-semibold text-slate-900">{fmtPackage(u.next)}</p></div>}
      </div>
    </div>
  )
}

const Row = ({ k, children }) => (
  <div className="flex gap-3 py-1.5 text-sm"><dt className="w-32 shrink-0 text-slate-400">{k}</dt><dd className="text-slate-800">{children}</dd></div>
)

function Result({ digits }) {
  if (digits.length < 12) return <p className="px-1 text-xs text-slate-400">{digits.length} of 12 digits</p>
  const series = sourceOfPackage(digits)
  const hit = lookupPackage(digits)
  const head = (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
      <span className="font-mono text-base font-semibold tracking-wider text-slate-900">{fmtPackage(digits)}</span>
      {series && <span className={`${pill} !py-0.5 ${SRC_CLS[series]}`}>{SRC_LABEL[series]}</span>}
      <span className={`${pill} !py-0.5 ${hit ? 'bg-slate-100 text-slate-600' : series ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{hit ? 'Used' : series ? 'Not used yet' : 'Not in package series'}</span>
    </div>
  )
  if (!hit) {
    return (
      <div className={card}>
        {head}
        <p className="px-5 py-4 text-sm text-slate-500">
          {series ? `This barcode is free in the ${SRC_LABEL[series]} series and isn't linked to any docket.` : 'This number is outside both package series, so it can\'t be a package barcode.'}
        </p>
      </div>
    )
  }
  const d = DOCKETS_SEED.find((x) => String(x.docketNumber) === hit.docket)
  const list = packagesOfDocket(hit.docket)
  return (
    <div className={card}>
      {head}
      <dl className="divide-y divide-slate-50 px-5 py-2">
        <Row k="Docket"><span className="font-mono font-semibold tracking-wider">{fmtDocket(hit.docket)}</span></Row>
        <Row k="Parcel">{list.indexOf(Number(digits)) + 1} of {list.length}</Row>
        {d && <>
          <Row k="Docket status"><span className={`${pill} !py-0.5 ${DOCKET_STATUS_BADGE[d.status]}`}>{DOCKET_STATUS_LABEL[d.status]}</span></Row>
          <Row k="Client">{d.clientName}</Row>
          <Row k="Pickup">{d.pickupId}</Row>
          <Row k="Route">{d.originCity} → {d.consignee.city}</Row>
          <Row k="Consignee">{d.consignee.name}</Row>
          <Row k="Mode">{MODE_LABEL[d.mode] ?? 'Surface'}</Row>
          {d.tripId && <Row k="Trip">{d.tripId}</Row>}
        </>}
        <Row k="Linked on">{new Date(hit.ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Row>
      </dl>
    </div>
  )
}

export default function PackageSeries() {
  const [query, setQuery] = useState('')
  const digits = query.replace(/\D/g, '').slice(0, 12)
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">Package Series</h1>
      <div className="grid gap-4 md:grid-cols-2">{['automated', 'stock'].map(blockUsage).map((u) => <Info key={u.id} u={u} />)}</div>
      <div className="space-y-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} inputMode="numeric" placeholder="Type a 12-digit package number" aria-label="Search package number"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 font-mono text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40" autoComplete="off" />
        </div>
        {digits && <Result digits={digits} />}
      </div>
    </div>
  )
}

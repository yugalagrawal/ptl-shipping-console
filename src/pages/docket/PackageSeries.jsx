import BackButton from '../../components/BackButton.jsx'
import { useRef, useState } from 'react'
import { card, pill, thCls, tdCls, rowCls } from '../../components/ui.js'
import { DOCKETS_SEED, DOCKET_STATUS_LABEL, DOCKET_STATUS_BADGE, MODE_LABEL } from '../../data/dockets.js'
import Code128 from '../../components/Code128.jsx'
import { fmtDocket } from '../../data/docketNumber.js'
import { fmtPackage, sourceOfPackage, lookupPackage, packagesOfDocket, blockUsage, searchPackages } from '../../data/packageSeries.js'

const th = thCls.replace('px-6', 'px-3')
const td = tdCls.replace('px-6', 'px-3').replace('whitespace-nowrap', '')
const SRC_LABEL = { automated: 'System Generated', stock: 'Stock Printed' }
const SRC_CLS = { automated: 'bg-sky-50 text-sky-700', stock: 'bg-violet-50 text-violet-700' }

function SeriesTable() {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Series assigned info</h2>
      <div className={`${card} overflow-x-auto`}>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Type</th>
            <th className={th}>Series</th>
          </tr>
        </thead>
        <tbody>
          {['automated', 'stock'].map((id) => {
            const u = blockUsage(id)
            return (
              <tr key={id} className={`${rowCls} align-top`}>
                <td className={`${td} whitespace-nowrap`}><span className={`${pill} !py-0.5 ${SRC_CLS[id]}`}>{SRC_LABEL[id]}</span></td>
                <td className={`${td} font-mono text-xs text-slate-700`}>{fmtPackage(u.from)} – {fmtPackage(u.to)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

const Row = ({ k, children }) => (
  <div className="flex gap-3 py-1.5 text-sm"><dt className="w-32 shrink-0 text-slate-400">{k}</dt><dd className="text-slate-800">{children}</dd></div>
)

function Result({ digits }) {
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

// Twelve single-digit boxes (4 · 4 · 4). Typing advances, Backspace steps back,
// pasting a number fills them all.
function DigitBoxes({ value, onChange, onFocusChange }) {
  const refs = useRef([])
  const focusAt = (i) => refs.current[Math.max(0, Math.min(11, i))]?.focus()
  const put = (i, text) => {
    const d = text.replace(/\D/g, '')
    if (!d) return
    onChange((value.slice(0, i) + d).slice(0, 12))
    focusAt(i + d.length)
  }
  const keyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) onChange(value.slice(0, i) + value.slice(i + 1))
      else if (i > 0) { onChange(value.slice(0, i - 1) + value.slice(i)); focusAt(i - 1) }
      if (value[i]) return
    } else if (e.key === 'ArrowLeft') focusAt(i - 1)
    else if (e.key === 'ArrowRight') focusAt(i + 1)
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft" onFocus={() => onFocusChange(true)} onBlur={() => onFocusChange(false)}>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className={`flex ${i > 0 && i % 4 === 0 ? 'ml-3' : ''}`}>
          <input
            ref={(el) => { refs.current[i] = el }}
            value={value[i] ?? ''}
            inputMode="numeric"
            maxLength={12}
            aria-label={`Digit ${i + 1}`}
            autoComplete="off"
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => keyDown(i, e)}
            onFocus={(e) => e.target.select()}
            onPaste={(e) => { e.preventDefault(); onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 12)); focusAt(11) }}
            className={`h-12 w-full min-w-0 rounded-lg border text-center font-mono text-lg font-semibold text-slate-900 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/30 ${value[i] ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'}`}
            style={{ width: '2.6rem' }}
          />
        </span>
      ))}
    </div>
  )
}

function Suggestions({ digits, onPick }) {
  const hits = searchPackages(digits)
  return (
    <div className={`${card} p-1.5`}>
      <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{digits ? 'Matching packages' : 'Recent packages'}</p>
      {hits.length === 0 && <p className="px-2.5 py-3 text-sm text-slate-400">No used package starts with {fmtPackage(digits)}{sourceOfPackage(digits.padEnd(12, '0')) ? ' — this part of the series is free.' : '.'}</p>}
      {hits.map((k) => {
        const h = lookupPackage(k)
        const d = DOCKETS_SEED.find((x) => String(x.docketNumber) === h.docket)
        return (
          <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(String(k))} className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-50">
            <span className="font-mono font-semibold tracking-wider text-slate-900">{fmtPackage(k)}</span>
            <span className={`${pill} !py-0 text-[11px] ${SRC_CLS[h.source]}`}>{SRC_LABEL[h.source]}</span>
            <span className="text-xs text-slate-500">Docket <span className="font-mono">{fmtDocket(h.docket)}</span></span>
            {d && <span className="text-xs text-slate-400">{d.clientName}</span>}
            {d && <span className={`${pill} !py-0 text-[11px] ${DOCKET_STATUS_BADGE[d.status]}`}>{DOCKET_STATUS_LABEL[d.status]}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function PackageSeries() {
  const [digits, setDigits] = useState('')
  const [focus, setFocus] = useState(false)
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton />
      <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Package Series</h1>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Enter package number</h2>
        <DigitBoxes value={digits} onChange={setDigits} onFocusChange={setFocus} />
        {digits.length < 12 && focus && <Suggestions digits={digits} onPick={setDigits} />}
        {digits.length > 0 && digits.length < 12 && !focus && <p className="px-1 text-xs text-slate-400">{digits.length} of 12 digits</p>}
        {digits.length === 12 && (
          <div className={`${card} flex flex-col items-center px-6 py-4`}>
            <Code128 value={digits} className="h-16 w-full max-w-sm text-slate-900" />
            <p className="mt-1.5 font-mono text-sm tracking-[0.25em] text-slate-700">{fmtPackage(digits)}</p>
          </div>
        )}
        {digits.length === 12 && <Result digits={digits} />}
      </div>
      <SeriesTable />
    </div>
  )
}

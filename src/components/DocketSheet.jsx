import { useEffect, useRef, useState } from 'react'
import { buildDocketSheetBody, docketSheetCss, DOCKET_SHEET_WIDTH, COPY_OPTIONS } from './docketSheetHtml.js'

// Which copies to print — each one takes a half of an A4 sheet, so two make one page.
export function CopyPicker({ value, onChange }) {
  const toggle = (c) => onChange(value.includes(c) ? value.filter((x) => x !== c) : COPY_OPTIONS.filter((x) => x === c || value.includes(x)))
  const sheets = Math.ceil(value.length / 2)
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-slate-500">Print copies</span>
      {COPY_OPTIONS.map((c) => {
        const on = value.includes(c)
        return (
          <button key={c} type="button" onClick={() => toggle(c)} aria-pressed={on} className={`rounded-full border px-3 py-1 font-medium transition ${on ? 'border-brand-orange bg-brand-orange/10 text-brand-orange-dark' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
            {on ? '✓ ' : ''}{c}
          </button>
        )
      })}
      <span className="text-slate-400">{value.length ? `${value.length} cop${value.length === 1 ? 'y' : 'ies'} · ${sheets} A4 sheet${sheets === 1 ? '' : 's'} (2 per sheet)` : 'Pick at least one copy'}</span>
    </div>
  )
}

// The physical LT consignment note — one A4 half (210 × 148.5 mm landscape), drawn at its natural
// 1000px width and scaled down to fit whatever space it's given (Create Docket's preview, the
// Docket Dashboard modal). Markup + styles come from docketSheetHtml.js — the very same source the
// print window uses, where two copies share an A4 sheet.
export default function DocketSheet({ docket, copy }) {
  const wrapRef = useRef(null)
  const sheetRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const sheet = sheetRef.current
    if (!wrap || !sheet) return
    function fit() {
      const s = Math.min(1, wrap.clientWidth / DOCKET_SHEET_WIDTH)
      setScale(s)
      setHeight(sheet.offsetHeight * s)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    ro.observe(sheet)
    return () => ro.disconnect()
  }, [])

  // contain: inline-size — the 1000px sheet must not widen the page; the
  // wrapper takes whatever width the layout gives it and the sheet scales to it.
  return (
    <div ref={wrapRef} className="w-full min-w-0 overflow-hidden" style={{ height: height || undefined, contain: 'inline-size' }}>
      <style>{docketSheetCss}</style>
      <div
        ref={sheetRef}
        style={{ width: DOCKET_SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        dangerouslySetInnerHTML={{ __html: buildDocketSheetBody(docket, copy) }}
      />
    </div>
  )
}

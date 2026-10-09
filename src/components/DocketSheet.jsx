import { useEffect, useRef, useState } from 'react'
import { buildDocketSheetBody, docketSheetCss, DOCKET_SHEET_WIDTH } from './docketSheetHtml.js'

// The physical LT consignment note, drawn at its natural 1000px landscape
// width and scaled down to fit whatever space it's given (Create Docket's
// preview, the Docket Dashboard modal). Markup + styles come from
// docketSheetHtml.js — the very same source the print window uses.
export default function DocketSheet({ docket }) {
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
        dangerouslySetInnerHTML={{ __html: buildDocketSheetBody(docket) }}
      />
    </div>
  )
}

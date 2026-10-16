// Printable docket sheet — the same LT consignment note the on-screen
// DocketSheet draws (markup + styles both come from
// components/docketSheetHtml.js, so print and preview can't drift apart),
// opened in its own window so printing never fights the app shell's CSS.
import { buildDocketSheetBody, docketSheetCss, DOCKET_SHEET_WIDTH, COPY_OPTIONS } from '../../components/docketSheetHtml.js'

// Two dockets per A4 sheet — each copy (Shipper, Consignor, …) takes one half of a portrait page.
export function printDocketSheet(docket, copies = COPY_OPTIONS.slice(0, 2)) {
  const win = window.open('', '_blank', 'width=900,height=960')
  if (!win) return
  win.document.write(buildDocketSheetHtml(docket, copies))
  win.document.close()
  win.focus()
  win.print()
}

export function buildDocketSheetHtml(docket, copies = COPY_OPTIONS.slice(0, 2)) {
  const list = copies.length ? copies : COPY_OPTIONS.slice(0, 1)
  const pages = []
  for (let i = 0; i < list.length; i += 2) pages.push(list.slice(i, i + 2))
  const body = pages.map((pair) => `<section class="page">${pair.map((c) => `<div class="half"><div class="fit">${buildDocketSheetBody(docket, c)}</div></div>`).join('')}</section>`).join('')
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Docket ${escapeHtml(docket.docketNumber)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #e2e8f0; }
  .page { width: 210mm; height: 297mm; margin: 12px auto; background: #fff; box-sizing: border-box; page-break-after: always; break-after: page; display: flex; flex-direction: column; }
  .half { height: 148.5mm; box-sizing: border-box; padding: 4mm 6mm; display: flex; align-items: center; justify-content: center; }
  .half + .half { border-top: 1px dashed #b8b8b8; }
  .fit { zoom: ${(198 / ((DOCKET_SHEET_WIDTH * 25.4) / 96)).toFixed(4)}; }
  ${docketSheetCss}
  @media print {
    body { background: #fff; }
    .page { margin: 0; }
  }
</style>
</head>
<body>${body}</body>
</html>`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}


// Package labels — one sticker per parcel (docket no., parcel x of N, consignee, 12-digit package
// barcode). The bars are a deterministic visual from the digits, standing in for a real Code 128
// until label printing is wired to the label printer.
function barsSvg(code) {
  let x = 0
  const rects = []
  String(code).split('').forEach((d, i) => {
    const n = Number(d)
    ;[1 + (n % 3), 1 + ((n + i) % 2), 1 + ((n * 2) % 3)].forEach((w, k) => {
      if (k % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w}" height="40" />`)
      x += w
    })
    x += 1
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 40" preserveAspectRatio="none" style="width:100%;height:34px;fill:#000">${rects.join('')}</svg>`
}

export function printLabelSheet(docket, barcodes, fmt = (n) => String(n)) {
  const win = window.open('', '_blank', 'width=700,height=900')
  if (!win) return
  const total = barcodes.length
  const labels = barcodes.map((b, i) => `
    <div class="lbl">
      <div class="top"><b>LetsTransport</b><span>${escapeHtml(docket.mode ? String(docket.mode).toUpperCase() : 'SURFACE')}</span></div>
      <div class="dn">${escapeHtml(docket.docketNumber)}</div>
      <div class="meta">${escapeHtml(docket.consignee?.name ?? '')}<br>${escapeHtml([docket.consignee?.city, docket.consignee?.pincode].filter(Boolean).join(' · '))}</div>
      <div class="bars">${barsSvg(b)}</div>
      <div class="bc">${escapeHtml(fmt(b))}</div>
      <div class="pk">Pkg ${i + 1} of ${total}</div>
    </div>`).join('')
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Labels ${escapeHtml(docket.docketNumber)}</title>
<style>
  @page { size: 100mm 75mm; margin: 0; }
  body { margin: 0; font-family: Arial, sans-serif; }
  .lbl { box-sizing: border-box; width: 100mm; height: 75mm; padding: 5mm; page-break-after: always; display: flex; flex-direction: column; gap: 2mm; border: 1px dashed #bbb; }
  .top { display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 1.5mm; }
  .dn { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
  .meta { font-size: 11px; line-height: 1.3; flex: 1; }
  .bc { font-size: 15px; font-weight: 700; text-align: center; letter-spacing: 1.5px; }
  .pk { font-size: 12px; text-align: right; }
  @media print { .lbl { border: none; } }
</style></head><body>${labels}</body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

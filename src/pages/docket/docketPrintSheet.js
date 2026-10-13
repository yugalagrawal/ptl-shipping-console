// Printable docket sheet — the same LT consignment note the on-screen
// DocketSheet draws (markup + styles both come from
// components/docketSheetHtml.js, so print and preview can't drift apart),
// opened in its own window so printing never fights the app shell's CSS.
import { buildDocketSheetBody, docketSheetCss } from '../../components/docketSheetHtml.js'

export function printDocketSheet(docket) {
  const win = window.open('', '_blank', 'width=900,height=960')
  if (!win) return
  win.document.write(buildDocketSheetHtml(docket))
  win.document.close()
  win.focus()
  win.print()
}

export function buildDocketSheetHtml(docket) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Docket ${escapeHtml(docket.docketNumber)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  body { margin: 0; padding: 20px; background: #e2e8f0; }
  .wrap { width: fit-content; margin: 0 auto; }
  ${docketSheetCss}
  @media print {
    body { padding: 0; background: #fff; }
    .wrap { zoom: 0.93; }
  }
</style>
</head>
<body><div class="wrap">${buildDocketSheetBody(docket)}</div></body>
</html>`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

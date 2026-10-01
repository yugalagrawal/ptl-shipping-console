// Shared CSV / print-to-PDF export for any master sheet — pass whatever
// rows are currently visible (post search + column filters) so the export
// always matches what's on screen.

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export function exportCSV(filename, headers, rows) {
  const lines = [headers.map((h) => h.label).join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((h) => `"${String(h.value(row)).replace(/"/g, '""')}"`).join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Opens the browser print dialog against a clean printable table — the
// person picks "Save as PDF" as the destination. No PDF library needed.
export function exportPDF(title, headers, rows) {
  const win = window.open('', '_blank')
  if (!win) return
  const theadHtml = headers.map((h) => `<th>${escapeHtml(h.label)}</th>`).join('')
  const rowsHtml = rows
    .map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(h.value(row))}</td>`).join('')}</tr>`)
    .join('')
  win.document.write(`<!doctype html>
<html>
<head>
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  p { color: #64748b; font-size: 12px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #f8fafc; text-transform: uppercase; font-size: 9px; letter-spacing: .04em; color: #94a3b8; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${rows.length} row${rows.length !== 1 ? 's' : ''} · exported ${escapeHtml(new Date().toLocaleString())}</p>
  <table><thead><tr>${theadHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
</body>
</html>`)
  win.document.close()
  win.focus()
  win.print()
}

// Printable docket sheet — the physical document a docket represents.
// Visual layout (branded header, big docket-number/barcode block, bordered
// info panels, packages table, signature footer) is modeled on the
// reference HTML's DocketSheet screen, which is what a real driver/customer
// expects a docket to look like on paper. The Mode/E-way Bill/Payment/POD
// panel only renders when those fields are present on the docket (Create
// Docket's detailed form sets them; the two original seed dockets predate
// this field set and print exactly as before, panel omitted rather than
// shown empty) — same conditional DocketSheetModal.jsx (the on-screen
// preview this mirrors) renders.
// Opens in its own window so printing never fights the app shell's own
// layout/CSS — a standard, self-contained "print this document" pattern.
import { MODE_LABEL, DELIVERY_TYPE_LABEL, PAYMENT_TERM_LABEL, POD_TYPE_LABEL } from '../../data/dockets.js'

export function printDocketSheet(docket) {
  const win = window.open('', '_blank', 'width=900,height=960')
  if (!win) return
  win.document.write(buildDocketSheetHtml(docket))
  win.document.close()
  win.focus()
  win.print()
}

// Deterministic decorative barcode — bar widths derived from the docket
// number's own digits, purely visual (not a real scannable symbology).
function barcodeBars(docketNumber) {
  const digits = String(docketNumber).replace(/\D/g, '').split('').map(Number)
  return digits.map((d, i) => `<div class="bar" style="width:${2 + (d % 4)}px;margin-left:${i % 3 === 0 ? 2 : 1}px"></div>`).join('')
}

export function buildDocketSheetHtml(docket) {
  const consigneeRows = docket.consignee
    ? `<tr><td>${escapeHtml(docket.consignee.name)}</td><td>${escapeHtml(docket.consignee.city || '—')}</td><td>${escapeHtml(docket.consignee.pincode || '—')}</td></tr>`
    : `<tr><td colspan="3" class="muted">No consignee on file for this pickup.</td></tr>`

  const packRows = docket.awbNumbers
    .map((awb, i) => `<tr><td>${i + 1}</td><td class="mono">${escapeHtml(awb)}</td></tr>`)
    .join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Docket ${escapeHtml(docket.docketNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px; background: #e2e8f0; }
  .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #94a3b8; }
  .header { display: flex; justify-content: space-between; align-items: stretch; border-bottom: 2px solid #0f172a; }
  .brand { padding: 16px 20px; }
  .brand .name { font-weight: 800; font-size: 20px; color: #a83710; letter-spacing: 0.01em; }
  .brand .tag { font-size: 11px; color: #64748b; margin-top: 2px; }
  .docket-box { padding: 12px 20px; border-left: 2px solid #0f172a; text-align: center; min-width: 240px; }
  .docket-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
  .docket-box .value { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; margin: 2px 0 6px; }
  .barcode { display: flex; align-items: flex-end; justify-content: center; height: 28px; }
  .bar { background: #0f172a; height: 100%; }
  .info-strip { display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid #cbd5e1; }
  .info-strip .field { padding: 8px 14px; border-right: 1px solid #e2e8f0; }
  .info-strip .field:last-child { border-right: none; }
  .info-strip .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
  .info-strip .value { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .body-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .panel { padding: 14px 20px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  .panel:nth-child(2n) { border-right: none; }
  .panel h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 9px; text-transform: uppercase; color: #94a3b8; }
  .mono { font-variant-numeric: tabular-nums; font-family: 'Courier New', monospace; }
  .muted { color: #94a3b8; font-style: italic; }
  .status-pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #fef3c7; color: #92400e; }
  .footer { display: grid; grid-template-columns: 1fr 1fr; }
  .footer .sig { padding: 30px 20px 14px; border-right: 1px solid #e2e8f0; }
  .footer .sig:last-child { border-right: none; }
  .footer .sig .line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; color: #64748b; }
  @media print { body { padding: 0; background: #fff; } .sheet { border: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <div class="name">LETSTRANSPORT</div>
        <div class="tag">Part Truck Load Network — Consignment Docket</div>
      </div>
      <div class="docket-box">
        <div class="label">Docket No.</div>
        <div class="value">${escapeHtml(docket.docketNumber)}</div>
        <div class="barcode">${barcodeBars(docket.docketNumber)}</div>
      </div>
    </div>

    <div class="info-strip">
      <div class="field"><div class="label">Status</div><div class="value"><span class="status-pill">${escapeHtml(docket.status)}</span></div></div>
      <div class="field"><div class="label">Client</div><div class="value">${escapeHtml(docket.clientName)}</div></div>
      <div class="field"><div class="label">Pickup ID</div><div class="value">${escapeHtml(docket.pickupId)}</div></div>
      <div class="field"><div class="label">Drop Mini Hub</div><div class="value">${escapeHtml(docket.dropMiniHubName)}</div></div>
      <div class="field"><div class="label">Raised</div><div class="value">${escapeHtml(docket.createdAt)}</div></div>
    </div>

    ${docket.mode != null ? `<div class="info-strip" style="grid-template-columns: repeat(3, 1fr); background: #f8fafc;">
      <div class="field"><div class="label">Mode</div><div class="value">${escapeHtml(MODE_LABEL[docket.mode])}</div></div>
      <div class="field"><div class="label">Payment</div><div class="value">${escapeHtml(PAYMENT_TERM_LABEL[docket.paymentTerm] ?? '—')}</div></div>
      <div class="field"><div class="label">POD type</div><div class="value">${escapeHtml(POD_TYPE_LABEL[docket.podType] ?? '—')}</div></div>
    </div>` : ''}

    <div class="body-grid">
      <div class="panel">
        <h2>Consignee</h2>
        <table>
          <thead><tr><th>Name</th><th>City</th><th>Pincode</th></tr></thead>
          <tbody>${consigneeRows}</tbody>
        </table>
      </div>
      <div class="panel">
        <h2>Packages (${docket.awbCount}) · ${escapeHtml(String(docket.totalWeightKg))} kg total</h2>
        <table>
          <thead><tr><th>#</th><th>Pack ID</th></tr></thead>
          <tbody>${packRows}</tbody>
        </table>
      </div>
    </div>

    ${docket.mode != null ? `<div class="body-grid" style="border-top: 1px solid #cbd5e1;">
      <div class="panel">
        <h2>E-Way Bill / Vehicle</h2>
        <p style="font-size:12px;margin:0;">${escapeHtml(docket.ewayBillNo || 'Not applicable to this move')}${docket.ewayUnverified ? ' (not verified)' : ''}</p>
        ${docket.vehicleNo ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">Vehicle ${escapeHtml(docket.vehicleNo)}${docket.transporterGstin ? ` · ${escapeHtml(docket.transporterGstin)}` : ''}</p>` : ''}
      </div>
      <div class="panel">
        <h2>Charges</h2>
        <p style="font-size:12px;margin:0;">Total <b>₹${escapeHtml(String(docket.pricing?.total ?? '—'))}</b> <span style="color:#94a3b8;">(incl. GST)</span></p>
      </div>
    </div>` : ''}

    <div class="footer">
      <div class="sig"><div class="line">Booked by</div></div>
      <div class="sig"><div class="line">Received by</div></div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

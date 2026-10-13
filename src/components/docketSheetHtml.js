// The physical LT consignment note (docket) — landscape, red label bars, the
// layout of the real printed form (Consignor/Consignee, booking strip,
// goods + volume table, payment/risk/insurance, charges, documents, POD,
// GST list, terms, label stickers). One source for both uses: DocketSheet.jsx
// drops the body markup into the Create Docket preview / Docket Dashboard
// modal, and docketPrintSheet.js wraps the very same markup + styles in its
// own print window — so the two can never drift apart.
//
// Pure string templates (not JSX) precisely so the print window can reuse
// them. Every dynamic value goes through esc(). Barcode / QR are decorative
// stand-ins derived from the docket number, not scannable symbologies.
import { MODE_LABEL, PAYMENT_TERM } from '../data/dockets.js'

export const DOCKET_SHEET_WIDTH = 1000

const RED = '#e24a33'

export const docketSheetCss = `
.dkt { width: ${DOCKET_SHEET_WIDTH}px; box-sizing: border-box; background: #fff; color: #1a1a1a; font: 11px/1.3 Arial, Helvetica, sans-serif; border: 1.5px solid #3a3a3a; }
.dkt *, .dkt *::before, .dkt *::after { box-sizing: border-box; }
.dkt table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.dkt td { border: 1px solid #4a4a4a; padding: 3px 6px; vertical-align: top; }
.dkt td.np { padding: 0; }
.dkt .lb { background: ${RED}; color: #fff; font-weight: 700; font-size: 10.5px; padding: 3px 6px; }
.dkt .lb.row { display: flex; justify-content: space-between; align-items: center; }
.dkt .k { color: ${RED}; font-weight: 700; font-size: 9.5px; }
.dkt .v { font-weight: 600; font-size: 11.5px; min-height: 14px; }
.dkt .big { font-size: 12.5px; font-weight: 700; }
.dkt .mut { color: #666; font-weight: 400; }
.dkt .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.dkt .cb { display: inline-block; width: 10px; height: 10px; border: 1px solid #333; margin: 0 3px 0 5px; vertical-align: -1px; text-align: center; font-size: 9px; line-height: 9px; font-weight: 800; }
.dkt .mini td { font-size: 10px; }
.dkt .brand { display: flex; align-items: center; gap: 9px; }
.dkt .brand { gap: 5px; }
.dkt .brand .wm { font-size: 29px; font-weight: 700; letter-spacing: -0.03em; color: #2b2b2b; line-height: 1; }
.dkt .addr { font-size: 9.5px; line-height: 1.35; color: #333; }
.dkt .bars { display: flex; align-items: stretch; justify-content: center; height: 46px; margin-top: 4px; }
.dkt .bars i { display: block; background: #111; }
.dkt .foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 8px 10px; border-top: 1px solid #4a4a4a; }
.dkt .copy { color: ${RED}; font-weight: 800; font-size: 13px; letter-spacing: 0.04em; }
.dkt .stk { display: flex; align-items: center; gap: 8px; border: 1px solid #bbb; border-radius: 8px; padding: 4px 10px; }
.dkt .stk .bars { height: 24px; margin: 0; }
.dkt .stk .n { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
.dkt .gen svg { display: inline-block; margin-left: 2px; }
.dkt .gen { text-align: right; padding: 0 10px 4px; font-size: 7px; color: #8a8a8a; letter-spacing: .02em; }
.dkt .qr { display: flex; align-items: center; gap: 8px; font-size: 8.5px; font-weight: 700; color: ${RED}; max-width: 120px; line-height: 1.2; }
`

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const dash = (v) => (v === undefined || v === null || v === '' ? '' : esc(v))
const money = (n) => (n || n === 0 ? Number(n).toLocaleString('en-IN') : '')
const cb = (on) => `<span class="cb">${on ? '✓' : ''}</span>`

function bars(docketNumber, count = 46) {
  const digits = String(docketNumber).replace(/\D/g, '').split('').map(Number)
  if (!digits.length) return ''
  let out = ''
  for (let i = 0; i < count; i++) {
    const d = digits[i % digits.length]
    const w = 1 + ((d + i) % 3)
    out += `<i style="width:${w}px;margin-right:${1 + ((d * 7 + i) % 2)}px"></i>`
  }
  return `<div class="bars">${out}</div>`
}

function qrSvg(docketNumber, size = 54) {
  const n = 21
  let seed = Number(String(docketNumber).replace(/\D/g, '').slice(-9)) || 7
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const inFinder = (x, y) => (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8)
  let cells = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let on
      if (inFinder(x, y)) {
        const fx = x < 7 ? x : x - (n - 7)
        const fy = y < 7 ? y : y - (n - 7)
        on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
      } else on = rnd() > 0.52
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#111">${cells}</svg>`
}

// The real LetsTransport cube mark (traced polygons from the brand pack) and
// the FLOW wordmark (navy, for white paper) — both inline vectors.
const ltMark = (size) => `<svg width="${size}" height="${size}" viewBox="1520 186 530 608" aria-hidden="true" style="width:${size * 0.87}px;height:${size}px"><polygon points="1784.00,196.54 1868.71,245.45 1614.59,392.18 1529.88,343.27" fill="#FB6B24"/><polygon points="1953.41,294.36 2038.12,343.27 1953.41,392.18 1868.71,343.27" fill="#FB6B24"/><polygon points="1784.00,392.18 1868.71,441.09 1784.00,490.00 1699.29,441.09" fill="#FB6B24"/><polygon points="1529.88,343.27 1614.59,392.18 1614.59,587.82 1784.00,685.64 1784.00,783.46 1529.88,636.73" fill="#D94423"/><polygon points="1699.29,441.09 1784.00,490.00 1784.00,587.82 1699.29,538.91" fill="#D94423"/><polygon points="1784.00,490.00 1868.71,441.09 1868.71,636.73 1953.41,587.82 1953.41,392.18 2038.12,343.27 2038.12,636.73 1784.00,783.46" fill="#AD351A"/></svg>`
const flowWordmark = (h) => `<svg viewBox="4 30 3275 920" style="height:${h}px;width:auto;vertical-align:middle" aria-label="FLOW"><path d="M74.0 146.0 L630.0 146.0 L630.0 311.0 L295.0 311.0 L295.0 429.0 L583.0 429.0 L583.0 587.0 L295.0 587.0 L295.0 834.0 L74.0 834.0Z M751.0 146.0 L972.0 146.0 L972.0 658.0 L1325.0 658.0 L1325.0 834.0 L751.0 834.0Z M2219.0 146.0 L2449.0 146.0 L2530.0 536.0 L2610.0 146.0 L2828.0 146.0 L2913.0 536.0 L2989.0 146.0 L3209.0 146.0 L3048.0 834.0 L2805.0 834.0 L2714.0 416.0 L2623.0 834.0 L2380.0 834.0Z" fill="#1A2B4A"/><rect x="1404" y="110" width="760" height="760" rx="190" ry="190" fill="#1A2B4A"/><polygon points="1784.00,196.54 1868.71,245.45 1614.59,392.18 1529.88,343.27" fill="#FB6B24"/><polygon points="1953.41,294.36 2038.12,343.27 1953.41,392.18 1868.71,343.27" fill="#FB6B24"/><polygon points="1784.00,392.18 1868.71,441.09 1784.00,490.00 1699.29,441.09" fill="#FB6B24"/><polygon points="1529.88,343.27 1614.59,392.18 1614.59,587.82 1784.00,685.64 1784.00,783.46 1529.88,636.73" fill="#D94423"/><polygon points="1699.29,441.09 1784.00,490.00 1784.00,587.82 1699.29,538.91" fill="#D94423"/><polygon points="1784.00,490.00 1868.71,441.09 1868.71,636.73 1953.41,587.82 1953.41,392.18 2038.12,343.27 2038.12,636.73 1784.00,783.46" fill="#AD351A"/></svg>`

function bookingDate(docket) {
  const d = docket.createdTs ? new Date(docket.createdTs) : new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function lineValue(pricing, label) {
  return pricing?.lines?.find((l) => l.label.startsWith(label))?.value
}

export function buildDocketSheetBody(docket) {
  const cn = docket.consignee ?? {}
  const cr = docket.consignor ?? {}
  const rows = (docket.packageRows ?? []).filter((r) => r.l || r.b || r.h)
  const dimRows = Array.from({ length: Math.max(3, rows.length) }, (_, i) => rows[i] ?? {})
  const pricing = docket.pricing
  const vol = docket.volumetricWeightKg
  const actual = docket.totalWeightKg
  const chargeWt = pricing?.chargeableWeight ?? (actual || vol ? Math.max(Number(actual) || 0, Number(vol) || 0) : '')
  const pay = docket.paymentTerm
  const consignorAddr = [cr.address, [cr.city, cr.state].filter(Boolean).join(', '), cr.pincode].filter(Boolean).join(' · ')
  const consigneeAddr = [cn.address, [cn.city, cn.state].filter(Boolean).join(', '), cn.pincode].filter(Boolean).join(' · ')
  const charge = (label) => money(lineValue(pricing, label))
  const dimTable = dimRows.map((r) => `<tr><td class="v">${dash(r.l)}</td><td class="v">${dash(r.b)}</td><td class="v">${dash(r.h)}</td><td class="v">${dash(r.qty)}</td></tr>`).join('')

  return `<div class="dkt">
  <table><tr>
    <td style="width:62%;padding:8px 10px">
      <div class="brand"><span class="wm">lets</span>${ltMark(38)}<span class="wm">transport</span></div>
      <div class="big" style="margin-top:4px;color:#333">(Diptab Ventures Private Limited)</div>
      <div class="k" style="font-size:11px;letter-spacing:.04em">EXPRESS DISTRIBUTION</div>
      <div class="addr" style="margin-top:3px">COLLAB24 EPIP, Regent Gateway Road No. 2, Seetharampalya, Whitefield, Bengaluru, Karnataka 560048 · Email: ptl@letstransport.team</div>
    </td>
    <td class="np" style="width:38%">
      <div class="lb">Goods Consignment Note (CN) No.</div>
      <div style="padding:5px 10px 6px;text-align:center">${bars(docket.docketNumber)}<div style="font-size:19px;font-weight:800;letter-spacing:.06em;margin-top:3px">${esc(docket.docketNumber)}</div></div>
    </td>
  </tr></table>

  <table><tr>
    <td style="width:15%"><div class="k">Booking Date</div><div class="v">${esc(bookingDate(docket))}</div></td>
    <td style="width:17%"><div class="k">Expected Dly Date</div><div class="v">${dash(docket.expectedDeliveryDate)}</div></td>
    <td style="width:17%"><div class="k">Origin Code</div><div class="v">${dash((cr.city || docket.originCity || '').toUpperCase())}</div></td>
    <td style="width:17%"><div class="k">Destination Code</div><div class="v">${dash((cn.city || '').toUpperCase())}</div></td>
    <td style="width:14%"><div class="k">ODA Delivery</div><div class="v">${cb(docket.isOda === true)}YES ${cb(docket.isOda === false)}NO</div></td>
    <td style="width:20%"><div class="k">ODA Location Name</div><div class="v">${docket.isOda ? dash(cn.city) : ''}</div></td>
  </tr></table>

  <table><tr>
    <td class="np" style="width:50%">
      <div class="lb row"><span>Consignor Name &amp; Address</span><span>CLIENT CODE: ${dash(docket.clientCode ?? docket.clientName)}</span></div>
      <div style="padding:5px 8px;min-height:74px">
        <div class="big">${dash(cr.name ?? docket.clientName)}</div>
        ${cr.company && cr.company !== cr.name ? `<div class="mut">${esc(cr.company)}</div>` : ''}
        <div>${esc(consignorAddr)}</div>
        ${cr.phone ? `<div class="mut">Ph ${esc(cr.phone)}</div>` : ''}
      </div>
    </td>
    <td class="np" style="width:50%">
      <div class="lb">Consignee Name &amp; Address</div>
      <div style="padding:5px 8px;min-height:74px">
        <div class="big">${dash(cn.name)}</div>
        <div>${esc(consigneeAddr)}</div>
        ${docket.consigneeGstin ? `<div class="mut">GSTIN ${esc(docket.consigneeGstin)}</div>` : ''}
      </div>
    </td>
  </tr></table>

  <table><tr>
    <td class="np" style="width:42%">
      <table class="mini">
        <tr><td class="k" style="width:38%">Package Type</td><td class="v"></td></tr>
        <tr><td class="k">Said to Contain</td><td class="v">${dash(docket.goodsDescription || docket.contentDescription || docket.contentType)}${docket.handling?.length ? ` <span class="mut">· ${esc(docket.handling.join(', '))}</span>` : ''}</td></tr>
        <tr><td class="k">Insured Value</td><td class="v">${docket.insuredValue ? `₹${money(docket.insuredValue)}` : ''}</td></tr>
        <tr><td class="k">Invoice Value</td><td class="v">${docket.invoiceValue ? `₹${money(docket.invoiceValue)}` : ''}</td></tr>
        <tr><td class="k">GST payable by</td><td class="v">${cb(docket.gstPayableBy === 'consignor')}Consignor ${cb(docket.gstPayableBy === 'consignee')}Consignee ${cb(docket.gstPayableBy === 'lt')}LT</td></tr>
        <tr><td class="k">Vehicle Registration No</td><td class="v">${dash(docket.vehicleNo)}</td></tr>
      </table>
    </td>
    <td class="np" style="width:58%">
      <table class="mini">
        <tr><td class="lb" colspan="4" style="border-color:#4a4a4a">Volume in Cubic cms</td></tr>
        <tr><td class="k">L (cms)</td><td class="k">B (cms)</td><td class="k">H (cms)</td><td class="k">No. of pcs</td></tr>
        ${dimTable}
      </table>
      <table class="mini">
        <tr>
          <td><div class="k">No. of Pkts / Boxes</div><div class="v">${dash(docket.awbCount)}</div></td>
          <td><div class="k">Actual Wt. Kg</div><div class="v">${dash(actual)}</div></td>
          <td><div class="k">Vol. Wt. Kg</div><div class="v">${dash(vol)}</div></td>
          <td><div class="k">Charge Wt. Kg</div><div class="v">${dash(chargeWt)}</div></td>
        </tr>
        <tr><td colspan="4"><span class="k">MODE</span>${cb(docket.mode === 'surface')}Surface ${cb(docket.mode === 'rail')}Train ${cb(docket.mode === 'air')}Air ${docket.mode === 'sea' ? `${cb(true)}${esc(MODE_LABEL.sea)}` : ''}</td></tr>
      </table>
    </td>
  </tr></table>

  <table><tr>
    <td class="np" style="width:42%">
      <table class="mini">
        <tr><td colspan="2"><span class="k">The Shipper has to state:</span>${cb(pay === PAYMENT_TERM.PAID)}Paid ${cb(pay === PAYMENT_TERM.TO_PAY)}To Pay ${cb(pay === PAYMENT_TERM.TBB)}TBB</td></tr>
        <tr><td colspan="2"><span class="k">Risk:</span>${cb(docket.riskCover === 'owners_risk')}Owner Risk ${cb(docket.riskCover === 'carriers_risk')}Carriers Risk</td></tr>
        <tr><td class="k" style="width:38%">Ins Policy No</td><td class="v">${dash(docket.policyNo)}</td></tr>
        <tr><td class="k">Insurance Company</td><td class="v">${dash(docket.insuranceCompany)}</td></tr>
        <tr><td class="k">Amount</td><td class="v">${docket.insuredValue ? `₹${money(docket.insuredValue)}` : ''}</td></tr>
      </table>
    </td>
    <td class="np" style="width:58%">
      <table class="mini">
        <tr><td class="k" style="width:27%">Basic Freight</td><td class="num" style="width:23%">${charge('Basic freight')}</td><td class="k" style="width:27%">FSC</td><td class="num" style="width:23%">${charge('FSC')}</td></tr>
        <tr><td class="k">Docket Charges</td><td class="num">${charge('Docket charges')}</td><td class="k">ESS</td><td class="num">${charge('ESS')}</td></tr>
        <tr><td class="k">Exception Charges</td><td class="num">${charge('Exception')}</td><td class="k">Appointment</td><td class="num">${charge('Appointment')}</td></tr>
        <tr><td class="k">FOV: Owner Risk</td><td class="num">${charge('FOV')}</td><td class="k">Handling</td><td class="num">${charge('Handling')}</td></tr>
        <tr><td class="k">ODA</td><td class="num">${charge('ODA')}</td><td class="k">Others</td><td class="num">${charge('Others')}</td></tr>
        <tr><td class="k">GST</td><td class="num">${money(pricing?.gst)}</td><td class="k">Total Charges</td><td class="num" style="font-size:12.5px">${pricing?.total != null ? `₹${money(pricing.total)}` : ''}</td></tr>
      </table>
    </td>
  </tr></table>

  <table><tr>
    <td class="np" style="width:34%">
      <div class="lb">Document Received</div>
      <table class="mini">
        <tr><td style="width:22px" class="k">1</td><td class="k" style="width:70px">Invoice #</td><td class="v">${dash(docket.invoiceNo)}</td></tr>
        <tr><td class="k">2</td><td class="k">GST NO#</td><td class="v">${dash(docket.consigneeGstin)}</td></tr>
        <tr><td class="k">3</td><td class="k">Form / Permit #</td><td class="v"></td></tr>
        <tr><td class="k">4</td><td class="k">Declaration</td><td class="v">${docket.documents?.declaration ? '✓' : ''}</td></tr>
        <tr><td colspan="2" class="k">Eway Bill No.</td><td class="v">${dash(docket.ewayBillNo)}${docket.ewayUnverified ? ' <span class="mut">(not verified)</span>' : ''}${!docket.ewayBillNo && docket.ewayExemptReason ? `<span class="mut">Not required — ${esc(docket.ewayExemptReason)}</span>` : ''}</td></tr>
      </table>
    </td>
    <td class="np" style="width:26%">
      <div class="lb">Message</div>
      <div style="min-height:92px"></div>
    </td>
    <td class="np" style="width:40%">
      <div class="lb">Proof of Delivery${docket.podType ? ` — ${esc({ epod: 'ePOD', hardcopy: 'Hardcopy', consignor_dc: 'Consignor DC' }[docket.podType] ?? '')}` : ''}</div>
      <table class="mini">
        <tr><td class="k" style="width:25%">Name</td><td></td><td class="k" style="width:15%">Date</td><td style="width:22%"></td></tr>
        <tr><td class="k">Time</td><td></td><td class="k">Cell No</td><td></td></tr>
        <tr><td colspan="4" style="height:44px"><span class="k">Receiver Seal &amp; Signature</span></td></tr>
      </table>
    </td>
  </tr></table>

  <table><tr>
    <td style="width:26%;font-size:10px;line-height:1.5">
      <div class="k">GST NO:</div>
      <b>Delhi</b> 07AAFCD3098K1ZB<br><b>Mumbai</b> 27AAFCD3098K1Z9<br><b>Kolkata</b> 19AAFCD3098K1Z6<br><b>Bangalore</b> 29AAFCD3098K1Z5
    </td>
    <td style="width:36%;font-size:8.5px;line-height:1.4;color:#c23622;font-weight:600">
      1. Any duties or taxes applicable on the shipment will be paid by the consignee at the time of delivery.<br>
      2. LT reserves the right of lien on any shipment till all its dues are paid in full.<br>
      3. In case this shipment contains anything of value, LT recommends insurance of the same.
    </td>
    <td class="np" style="width:38%">
      <div style="background:${RED};color:#fff;font-size:8.5px;line-height:1.35;padding:4px 6px;font-weight:600">I hereby agree to the terms and conditions set forth on the reverse of this (Consignor's Copy) of this non-negotiable RXB and warrant that the information contained on this RXB is true and correct.</div>
      <div style="height:34px;padding:3px 6px"><span class="k">Sender Seal &amp; Signature</span></div>
    </td>
  </tr></table>

  <table><tr>
    <td style="width:26%"><span class="k">Booking Staff</span></td>
    <td style="width:36%"><span class="k">Name &amp; Sign</span></td>
    <td style="width:38%"><span class="k">Date</span></td>
  </tr></table>

  <div class="foot">
    <span class="copy">SHIPPER COPY</span>
    <div class="stk">${ltMark(24)}<div>${bars(docket.docketNumber, 30)}<div class="n">${esc(docket.docketNumber)}</div></div></div>
    <div class="stk">${ltMark(24)}<div>${bars(docket.docketNumber, 30)}<div class="n">${esc(docket.docketNumber)}</div></div></div>
    <div class="qr">${qrSvg(docket.docketNumber)}<span>SCAN QR CODE TO TRACK SHIPMENT</span></div>
  </div>
  <div class="gen">Auto-generated by ${flowWordmark(8)}</div>
</div>`
}

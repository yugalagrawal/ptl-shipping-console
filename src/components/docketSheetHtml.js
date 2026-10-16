// The physical LT consignment note (docket) — A4-half landscape (210 × 148.5 mm), orange ruled boxes (prints
// fine in black & white), laid out around what Create Docket's "Fill details" collects. Design was iterated
// in design-docs/docket-design.html and ported here 1:1.
//
// One source for both uses: DocketSheet.jsx drops the body markup into the Create Docket preview / Docket
// Dashboard modal, and docketPrintSheet.js wraps the very same markup + styles in its own print window
// (two copies per A4 sheet) — so the two can never drift apart.
//
// Pure string templates (not JSX) precisely so the print window can reuse them. Every dynamic value goes
// through esc(). Barcode / QR are decorative stand-ins derived from the docket number, not scannable symbologies.
import { PAYMENT_TERM } from '../data/dockets.js'
import { getClientConfigValues } from '../data/clientConfigFields.js'
import { fmtDocket } from '../data/docketNumber.js'

export const DOCKET_SHEET_WIDTH = 1000
// A4 half (210 × 148.5 mm, landscape) — two dockets fit one A4 sheet. At 1000px wide that is 707px tall.
export const DOCKET_SHEET_HEIGHT = Math.round((DOCKET_SHEET_WIDTH * 148.5) / 210)
// The copies a docket can be printed as; each prints on its own half-sheet.
export const COPY_OPTIONS = ['Shipper Copy', 'Consignor Copy', 'Consignee Copy', 'Driver Copy']

export const docketSheetCss = `
.dkt { --ink:#16181d; --mut:#5f6673; --line:#cfd3da; --soft:#f4f5f7; --acc:#d2541f; --acc-d:#a83f14;
  width: ${DOCKET_SHEET_WIDTH}px; height: ${DOCKET_SHEET_HEIGHT}px; padding: 14px 16px 10px; background: #fff; color: var(--ink);
  display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto 1fr auto auto; gap: 8px; position: relative; overflow: hidden;
  font: 11px/1.3 "Helvetica Neue", Arial, sans-serif; box-sizing: border-box; }
.dkt *, .dkt *::before, .dkt *::after { box-sizing: border-box; }
.dkt .lab { font-size: 8.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--mut); }
.dkt .val { font-size: 12px; font-weight: 600; min-height: 15px; }
.dkt .box { border: 1px solid var(--ink); }
.dkt .hd { background: var(--acc); color: #fff; font-size: 9px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; padding: 3px 8px; display: flex; justify-content: space-between; }
.dkt .cb { display: inline-block; width: 10px; height: 10px; border: 1.2px solid var(--ink); margin: 0 3px 0 6px; vertical-align: -1.5px; text-align: center; font-size: 9px; line-height: 9px; font-weight: 800; }
.dkt .cb:first-child { margin-left: 0; }
.dkt .top { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: stretch; }
.dkt .brand { display: flex; align-items: center; gap: 12px; border: 1px solid var(--ink); padding: 5px 12px; }
.dkt .brand .wm { font-size: 26px; font-weight: 700; letter-spacing: -.03em; color: #2b2b2b; }
.dkt .brand .co { font-size: 10px; color: var(--mut); line-height: 1.35; }
.dkt .brand .co b { color: var(--ink); font-size: 11.5px; }
.dkt .gcn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border: 1px solid var(--ink); padding: 6px 14px; }
.dkt .gcn .gbars { width: 100%; }
.dkt .gcn .no { font-size: 25px; font-weight: 800; letter-spacing: .06em; line-height: 1; }
.dkt .bars { display: flex; height: 30px; margin-top: 2px; }
.dkt .bars i { display: block; background: #111; }
.dkt .mode { background: var(--acc-d); color: #fff; font-weight: 800; font-size: 13px; letter-spacing: .1em; padding: 7px 12px; text-align: center; }
.dkt .mode small { display: block; font-size: 8px; font-weight: 600; letter-spacing: .08em; opacity: .85; }
.dkt .facts { display: grid; grid-template-columns: repeat(5, 1fr) 1.6fr; border: 1px solid var(--ink); }
.dkt .facts > div { padding: 4px 9px; border-left: 1px solid var(--ink); }
.dkt .facts > div:first-child { border-left: 0; }
.dkt .facts .big { font-size: 13px; font-weight: 800; }
.dkt .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dkt .party { min-height: 62px; }
.dkt .party .body { padding: 5px 9px; position: relative; }
.dkt .party .tag { position: absolute; top: 4px; right: 9px; font-size: 9px; color: var(--mut); font-weight: 600; letter-spacing: .03em; }
.dkt .party .tag b { color: var(--ink); font-weight: 800; }
.dkt .party .tag.code { font-size: 12.5px; font-weight: 800; color: var(--ink); letter-spacing: .05em; top: 3px; }
.dkt .party .nm { font-size: 13px; font-weight: 800; }
.dkt .party .ad { color: #333; font-size: 10.5px; }
.dkt .party .g { color: var(--mut); font-size: 9.5px; margin-top: 1px; }
.dkt .mid { display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(0, 1.32fr) minmax(0, .9fr); gap: 8px; min-height: 0; }
.dkt .mid .box { display: flex; flex-direction: column; min-height: 0; }
.dkt .col3 { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
.dkt .col3 .chg { flex: 0 0 auto; }
.dkt .col3 .decl3 { flex: 1; }
.dkt .decl3 .terms { padding: 5px 8px; font-size: 8px; line-height: 1.35; }
.dkt .decl3 .sealbox { flex: 1; border-top: 1px solid var(--ink); min-height: 40px; }
.dkt .rows { padding: 0; }
.dkt .rows.sep { border-top: 1px solid var(--ink); }
.dkt .rows .r { display: flex; align-items: stretch; border-bottom: 1px solid var(--ink); }
.dkt .rows .r:last-child { border-bottom: 0; }
.dkt .rows .r .k { flex: 0 0 36%; display: flex; align-items: center; padding: 3px 8px; border-right: 1px solid var(--ink); color: var(--mut); font-size: 9.5px; font-weight: 600; }
.dkt .rows .r .v { flex: 1; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; padding: 3px 8px; font-weight: 700; text-align: right; }
.dkt .chip { display: inline-block; border: 1px solid var(--ink); padding: 0 7px; font-size: 9px; font-weight: 700; margin-left: 4px; }
.dkt .chip.haz { background: #fde8e0; border-color: var(--acc-d); color: var(--acc-d); }
.dkt .wt { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid var(--ink); }
.dkt .wt > div { padding: 5px 7px; border-left: 1px solid var(--ink); }
.dkt .wt .lab { white-space: nowrap; }
.dkt .wt > div:first-child { border-left: 0; }
.dkt .wt .n { font-size: 17px; font-weight: 800; line-height: 1.1; }
.dkt .wt .n small { font-size: 9px; color: var(--mut); font-weight: 600; }
.dkt .wt .hi { background: var(--soft); }
.dkt table.dim { width: 100%; border-collapse: collapse; margin: 0; table-layout: fixed; }
.dkt table.dim th { font-size: 8.5px; color: var(--mut); text-align: left; padding: 2px 9px; letter-spacing: .06em; text-transform: uppercase; border-bottom: 1px solid var(--ink); border-right: 1px solid var(--ink); }
.dkt table.dim th:last-child, .dkt table.dim td:last-child { border-right: 0; }
.dkt table.dim td { padding: 1px 9px; font-weight: 600; height: 17px; border-bottom: 1px solid var(--ink); border-right: 1px solid var(--ink); }
.dkt table.dim tr.more td { font-weight: 700; color: var(--acc-d); font-size: 10px; }
.dkt table.dim tr.tt td { background: var(--soft); border-bottom: 0; font-weight: 800; }
.dkt table.dim tr.tt .ttin { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.dkt table.dim .cm3 { font-weight: 600; color: var(--mut); font-size: 10px; }
.dkt .chg .r.tot { border-top: 1.5px solid var(--ink); border-bottom: 0; }
.dkt .chg .rows .r .k { flex: 1; }
.dkt .docs .r { min-height: 21px; }
.dkt .ship .r .k { flex: 0 0 134px; white-space: nowrap; }
.dkt .vnum { display: flex; align-items: center; justify-content: center; height: 28px; font-size: 16px; font-weight: 800; letter-spacing: .08em; padding: 2px 8px; }
.dkt .copyblk { border-top: 1px solid var(--ink); margin-top: auto; }
.dkt .copyblk .hd { font-size: 10px; letter-spacing: .12em; justify-content: center; }
.dkt .gstwrap { display: flex; }
.dkt .gstv { flex: 0 0 22px; display: flex; align-items: center; justify-content: center; background: var(--soft); border-right: 1px solid var(--ink); font-size: 10px; font-weight: 800; letter-spacing: .2em; color: var(--acc-d); writing-mode: vertical-rl; transform: rotate(180deg); }
.dkt .gstwrap .gstrows { flex: 1; min-width: 0; }
.dkt .gstrows .r .k { flex: 0 0 134px; font-size: 10px; color: var(--ink); }
.dkt .gstrows .r .v { justify-content: flex-start; text-align: left; font-size: 11.5px; letter-spacing: .06em; }
.dkt .msg { border-top: 1px solid var(--ink); }
.dkt .staff { margin-top: 0; }
.dkt .msg .mt { font-size: 8px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--mut); padding: 1px 8px; }
.dkt .msg .ml { min-height: 15px; border-top: 1px solid var(--ink); padding: 2px 8px; display: flex; align-items: center; font-size: 7px; line-height: 1.25; font-weight: 600; color: #333; }
.dkt .staff .hd { font-size: 8px; padding: 2px 8px; border-top: 1px solid var(--ink); }
.dkt .staff .srow { height: 30px; padding: 3px 8px; border-top: 1px solid var(--ink); }
.dkt .staff .sl { font-size: 8px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--mut); }
.dkt .sigcell { flex: 1; min-height: 40px; border-top: 1px solid var(--ink); display: flex; flex-direction: column; }
.dkt .podrows .r .k { flex: 0 0 90px; }
.dkt .docs .r .k { flex: 0 0 158px; white-space: nowrap; }
.dkt .docs .r .v { white-space: nowrap; font-size: 11px; }
.dkt .chg .rows .r .v { flex: 0 0 36%; border-left: 0; }
.dkt .chg .rows .r .k, .dkt .chg .rows .r .v { padding-top: 2px; padding-bottom: 2px; }
.dkt .chg .rows .r.gstby { border-top: 1px solid var(--ink); }
.dkt .chg .rows .r.gstby .k { flex: 0 0 auto; white-space: nowrap; }
.dkt .chg .rows .r.gstby .v { flex: 1; flex-wrap: nowrap; white-space: nowrap; font-size: 10px; padding: 2px 6px; justify-content: flex-end; }
.dkt .chg .r.tot .v { font-size: 16px; font-weight: 800; }
.dkt .chg .hint { font-size: 7px; color: #888; font-weight: 400; display: block; line-height: 1.1; }
.dkt .low { display: grid; grid-template-columns: 1fr; gap: 8px; }
.dkt .decl { display: grid; grid-template-columns: 1fr 1fr; flex: 1; }
.dkt .decl .terms { padding: 6px 10px; font-size: 8.5px; border-right: 1px solid var(--ink); }
.dkt .sealbox { padding: 3px 8px; font-size: 8.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--mut); min-height: 50px; }
.dkt .low .box { display: flex; flex-direction: column; }
.dkt .dochead { display: grid; grid-template-columns: auto 1fr; padding: 0; }
.dkt .dochead > span { padding: 3px 8px; border-bottom: 1px solid var(--ink); display: flex; align-items: center; }
.dkt .dochead > span.lab { border-right: 1px solid var(--ink); }
.dkt .dochead > span:nth-last-child(-n+2) { border-bottom: 0; }
.dkt .pod { padding: 0; display: grid; grid-template-columns: 1fr 1fr; }
.dkt .pod > .lab { padding: 4px 8px 12px; border-bottom: 1px solid var(--ink); border-right: 1px solid var(--ink); }
.dkt .pod > .lab:nth-child(2n) { border-right: 0; }
.dkt .pod .sig { grid-column: 1 / -1; border: 0; height: 40px; padding: 3px 8px; color: var(--mut); font-size: 8.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.dkt .terms { font-size: 8px; line-height: 1.35; color: #444; padding: 4px 9px; }
.dkt .sign { padding: 0 8px 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dkt .sign div { border: 1px solid var(--ink); padding: 2px 5px; height: 24px; font-size: 8.5px; color: var(--mut); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; height: 28px; }
.dkt .foot { display: flex; align-items: center; gap: 14px; border-top: 2px solid var(--acc); padding-top: 5px; }
.dkt .foot .copy { font-size: 13px; font-weight: 900; letter-spacing: .12em; color: var(--acc); }
.dkt .foot .gst { font-size: 8.5px; color: #333; line-height: 1.3; flex: 1; }
.dkt .foot .gst b { font-weight: 700; }
.dkt .qr { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 7px; font-weight: 700; color: var(--acc); white-space: nowrap; letter-spacing: .02em; line-height: 1; border: 1px solid var(--ink); padding: 5px 8px; }
.dkt .gen { margin-top: 3px; font-size: 7px; color: #8a8a8a; display: flex; align-items: center; gap: 3px; }
`

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const dash = (v) => (v === undefined || v === null || v === '' ? '' : esc(v))
const money = (n) => (n || n === 0 ? Number(n).toLocaleString('en-IN') : '')
const cb = (on) => `<span class="cb">${on ? '✓' : ''}</span>`

function bars(docketNumber, count = 44) {
  const digits = String(docketNumber).replace(/\D/g, '').split('').map(Number)
  if (!digits.length) return ''
  let out = ''
  for (let i = 0; i < count; i++) {
    const d = digits[i % digits.length]
    out += `<i style="width:${1 + ((d + i) % 3)}px;margin-right:${1 + ((d * 7 + i) % 2)}px"></i>`
  }
  return `<div class="bars">${out}</div>`
}

function qrSvg(docketNumber, size = 38) {
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

const MODE_TEXT = { surface: 'SURFACE', air: 'AIR', rail: 'RAIL', sea: 'SEA' }
const POD_TEXT = { epod: 'ePOD', hardcopy: 'Hardcopy', consignor_dc: 'Consignor DC' }

export function buildDocketSheetBody(docket, copyLabel = COPY_OPTIONS[0]) {
  const cn = docket.consignee ?? {}
  const cr = docket.consignor ?? {}
  const rows = (docket.packageRows ?? []).filter((r) => r.l || r.b || r.h)
  const dimRows = Array.from({ length: Math.max(5, rows.length) }, (_, i) => rows[i] ?? {}) // five ruled lines, filled top-down
  const totalPcs = rows.reduce((n, r) => n + (Number(r.qty) || 0), 0)
  const totalCm3 = rows.reduce((n, r) => n + (Number(r.l) || 0) * (Number(r.b) || 0) * (Number(r.h) || 0) * (Number(r.qty) || 0), 0)
  const pricing = docket.pricing
  const vol = docket.volumetricWeightKg
  const actual = docket.totalWeightKg
  const chargeWt = pricing?.chargeableWeight ?? (actual || vol ? Math.max(Number(actual) || 0, Number(vol) || 0) : '')
  const pay = docket.paymentTerm
  const cityLine = (p) => [p.city, p.state, p.pincode].filter(Boolean).join(' - ')
  const addr = (p) => [p.address, [p.city, p.state].filter(Boolean).join(', '), p.pincode].filter(Boolean).join(' · ')
  // A per-docket choice (Create Docket's "Print on docket") wins; otherwise the client's "Print Pricing on Docket" setting decides.
  const showPricing = typeof docket.printPricing === 'boolean' ? docket.printPricing : (!docket.clientId || getClientConfigValues(docket.clientId)['pricing-on-docket'] !== 'No')
  const charge = (label) => (showPricing ? money(lineValue(pricing, label)) : '')
  const hazardous = (docket.handling ?? []).includes('Hazardous')
  const eway = docket.ewayBillNo
    ? `${esc(docket.ewayBillNo)}${docket.ewayUnverified ? ' <span style="font-weight:500;color:var(--mut)">(not verified)</span>' : ''}`
    : (docket.ewayExemptReason ? `<span style="font-weight:500;color:var(--mut);font-size:10px">Not required — ${esc(docket.ewayExemptReason)}</span>` : '')
  // Five ruled lines, always. With more than five sizes, lines 1–4 are real and line 5 folds the rest into one "+ N more sizes" line (the rest is written on the back by hand); the Total stays the real total.
  const folded = rows.length > 5
  const shown = folded ? rows.slice(0, 4) : dimRows
  const rest = folded ? rows.slice(4) : []
  const restPcs = rest.reduce((n, r) => n + (Number(r.qty) || 0), 0)
  const dimTable = shown.map((r) => `<tr><td>${dash(r.l)}</td><td>${dash(r.b)}</td><td>${dash(r.h)}</td><td>${dash(r.qty)}</td></tr>`).join('')
    + (folded ? `<tr class="more"><td colspan="3">+ ${rest.length} more sizes · write on back if required</td><td>${restPcs}</td></tr>` : '')
  // Exactly the lines Create Docket's Pricing panel carries — labels come from the pricing itself (so FSC shows its rate).
  const pLine = (label) => pricing?.lines?.find((l) => l.label.startsWith(label))
  const charges = [['Basic freight', 'Basic freight'], ['Docket charges', 'Docket charges'], ['Exception charges', 'Exception'], ['FOV: Owner Risk', 'FOV'], ['FSC', 'FSC'], ['ESS (emergency)', 'ESS'], ['Appointment', 'Appointment'], ['Handling', 'Handling'], ['ODA', 'ODA']]
    .map(([l, k]) => `<div class="r"><span class="k">${esc(pLine(k)?.label ?? l)}</span><span class="v">${charge(k)}</span></div>`).join('')

  return `<div class="dkt">
  <div class="top">
    <div class="brand">
      <div style="display:flex;align-items:center;gap:6px"><span class="wm">lets</span>${ltMark(32)}<span class="wm">transport</span></div>
      <div class="co"><b>Diptab Ventures Private Limited</b><br>EXPRESS DISTRIBUTION · COLLAB24 EPIP, Regent Gateway Road No. 2, Seetharampalya, Whitefield, Bengaluru 560048<br>ptl@letstransport.team<div class="gen">Auto-generated by ${flowWordmark(8)}</div></div>
    </div>
    <div style="display:flex;gap:8px;align-items:stretch">
      <div class="qr">${qrSvg(docket.docketNumber, 66)}<span>SCAN QR CODE TO TRACK SHIPMENT</span></div>
      <div class="gcn"><div class="gbars">${bars(docket.docketNumber, 44)}</div><div class="no">${esc(fmtDocket(docket.docketNumber))}</div></div>
    </div>
  </div>

  <div class="facts">
    <div><div class="lab">Booking date</div><div class="val">${esc(bookingDate(docket))}</div></div>
    <div><div class="lab">Expected delivery</div><div class="val">${dash(docket.expectedDeliveryDate)}</div></div>
    <div><div class="lab">Origin</div><div class="val big">${dash((cr.city || docket.originCity || '').toUpperCase())}</div></div>
    <div><div class="lab">Destination</div><div class="val big">${dash((cn.city || '').toUpperCase())}</div></div>
    <div><div class="lab">Mode</div><div class="val big" style="color:var(--acc-d);letter-spacing:.08em">${esc(MODE_TEXT[docket.mode] ?? '')}</div></div>
    <div><div class="lab">Delivery</div><div class="val" style="white-space:nowrap">${cb(docket.isOda === true)}ODA <span style="display:inline-block;min-width:60px;font-weight:800">${docket.isOda ? '· ' + esc(cn.pincode ?? '') : ''}</span>${cb(docket.appointment === true)}Appointment</div></div>
  </div>

  <div class="parties">
    <div class="box party"><div class="hd"><span>Consignor Name &amp; Address</span></div><div class="body"><div class="tag code">${dash(docket.clientCode ?? docket.clientName)}</div><div class="nm">${dash(cr.name ?? docket.clientName)}</div>${cr.address ? `<div class="ad">${esc(cr.address)}</div>` : ''}<div class="ad">${esc(cityLine(cr))}</div></div></div>
    <div class="box party"><div class="hd"><span>Consignee Name &amp; Address</span></div><div class="body"><div class="tag">${docket.consigneeGstin ? 'GSTIN · <b>' + esc(docket.consigneeGstin) + '</b>' : ''}</div><div class="nm">${dash(cn.name)}</div>${cn.address ? `<div class="ad">${esc(cn.address)}</div>` : ''}<div class="ad">${esc(cityLine(cn))}</div></div></div>
  </div>

  <div class="mid">
    <div class="box">
      <div class="hd"><span>Pickup Vehicle Reg No.</span></div>
      <div class="vnum">${dash(docket.vehicleNo)}</div>
      <div class="hd" style="border-top:1px solid var(--ink)"><span>Documents</span></div>
      <div class="rows docs">
        <div class="r"><span class="k">1 · Invoice no. &amp; date</span><span class="v">${dash(docket.invoiceNo)}${docket.invoiceDate ? ' · ' + esc(docket.invoiceDate) : ''}</span></div>
        <div class="r"><span class="k">2 · Invoice value</span><span class="v">${docket.invoiceValue ? '₹' + money(docket.invoiceValue) : ''}</span></div>
        <div class="r"><span class="k">3 · E-way bill no.</span><span class="v">${eway}</span></div>
        <div class="r"><span class="k">4 · Form / Permit / Declaration</span><span class="v"></span></div>
      </div>
      <div class="hd" style="border-top:1px solid var(--ink)"><span>Proof of delivery</span><span>${esc(POD_TEXT[docket.podType] ?? '')}</span></div>
      <div class="rows ship podrows">
        <div class="r"><span class="k">Name</span><span class="v"></span></div>
        <div class="r"><span class="k">Date</span><span class="v"></span></div>
        <div class="r"><span class="k">Cell no.</span><span class="v"></span></div>
      </div>
      <div class="sigcell"><div class="hd"><span>Receiver seal &amp; signature</span></div></div>
      <div class="msg"><div class="mt">Message</div><div class="ml">1. Any duties or taxes applicable on the shipment will be paid by the consignee at the time of delivery.</div><div class="ml">2. LT reserves the right of lien on any shipment till all its dues are paid in full.</div><div class="ml">3. In case this shipment contains anything of value, LT recommends insurance of the same.</div></div>
    </div>

    <div class="box">
      <div class="hd"><span>Shipment Details</span><span>Volume in cubic cms</span></div>
      <div class="rows ship">
        <div class="r"><span class="k">Goods description - HSN</span><span class="v">${[docket.goodsDescription, docket.hsnCode].filter(Boolean).map(esc).join(' - ')}</span></div>
        <div class="r"><span class="k">Fragile / Hazardous</span><span class="v" style="justify-content:flex-start;flex-wrap:nowrap;white-space:nowrap">${cb((docket.handling ?? []).includes('Fragile'))}Fragile ${cb(hazardous)}Hazardous<span style="display:inline-block;min-width:92px;margin-left:8px;color:var(--acc-d)">${hazardous ? esc(['Class ' + String(docket.hazardClass ?? '').replace(/^Class\s*/i, '').split(' ')[0], docket.unNumber].filter(Boolean).join(' · ')) : ''}</span></span></div>
      </div>
      <div class="wt" style="border-top:1px solid var(--ink)">
        <div><div class="lab">Package count</div><div class="n">${dash(docket.awbCount)}</div></div>
        <div><div class="lab">Actual Wt</div><div class="n">${dash(actual)}<small> kg</small></div></div>
        <div><div class="lab">Volumetric Wt</div><div class="n">${dash(vol)}<small> kg</small></div></div>
        <div class="hi"><div class="lab">Charge wt</div><div class="n">${dash(chargeWt)}<small> kg</small></div></div>
      </div>
      <table class="dim"><tr><th>L (cms)</th><th>B (cms)</th><th>H (cms)</th><th>No. of pcs</th></tr>${dimTable}<tr class="tt"><td colspan="3"><div class="ttin"><span class="lab">Total</span><span class="cm3">${totalCm3 ? money(totalCm3) + ' cm³' : ''}</span></div></td><td>${totalPcs || ''}</td></tr></table>
      <div class="rows sep ship">
        <div class="r"><span class="k">Payment</span><span class="v">${cb(pay === PAYMENT_TERM.PAID)}Paid ${cb(pay === PAYMENT_TERM.TO_PAY)}To-Pay ${cb(pay === PAYMENT_TERM.TBB)}TBB</span></div>
        <div class="r"><span class="k">Risk</span><span class="v">${cb(docket.riskCover === 'owners_risk')}Owner ${cb(docket.riskCover === 'carriers_risk')}Carrier</span></div>
        <div class="r"><span class="k">Insurance</span><span class="v">${dash(docket.policyNo)}${docket.insuredValue ? ' · ₹' + money(docket.insuredValue) : ''}</span></div>
      </div>
      <div class="copyblk">
        <div class="hd"><span>${esc(String(copyLabel).toUpperCase())}</span></div>
        <div class="gstwrap">
          <div class="gstv">GST</div>
          <div class="rows gstrows">
            <div class="r"><span class="k">Delhi</span><span class="v">07AAFCD3098K1ZB</span></div>
            <div class="r"><span class="k">Mumbai</span><span class="v">27AAFCD3098K1Z9</span></div>
            <div class="r"><span class="k">Kolkata</span><span class="v">19AAFCD3098K1Z6</span></div>
            <div class="r"><span class="k">Bangalore</span><span class="v">29AAFCD3098K1Z5</span></div>
          </div>
        </div>
      </div>
      <div class="staff">
        <div class="hd"><span>Booking staff</span></div>
        <div class="srow"><span class="sl">Date, Name &amp; sign</span></div>
      </div>
    </div>

    <div class="col3">
      <div class="box chg">
        <div class="hd"><span>Charges</span><span>₹</span></div>
        <div class="rows">
          ${charges}
          <div class="r"><span class="k">Others<span class="hint">e.g. COD fee, Mathadi, other agreed</span></span><span class="v">${charge('Others')}</span></div>
          <div class="r"><span class="k">Subtotal</span><span class="v">${showPricing && pricing ? money(pricing.subtotal ?? (pricing.total - pricing.gst)) : ''}</span></div>
          <div class="r"><span class="k">GST (18%)</span><span class="v">${showPricing ? money(pricing?.gst) : ''}</span></div>
          <div class="r tot"><span class="k" style="color:var(--ink);font-size:10.5px">TOTAL CHARGES</span><span class="v">${showPricing && pricing?.total != null ? '₹' + money(pricing.total) : ''}</span></div>
          <div class="r gstby"><span class="k">GST payable by</span><span class="v">${cb(docket.gstPayableBy === 'consignor')}Consignor ${cb(docket.gstPayableBy === 'consignee')}Consignee ${cb(docket.gstPayableBy === 'lt')}LT</span></div>
        </div>
      </div>
      <div class="box decl3">
        <div class="hd"><span>Consignor's declaration</span></div>
        <div class="terms">I agree to the terms and conditions on the reverse of this consignor's copy and certify that the information given is true and correct.</div>
        <div class="sealbox">Sender seal &amp; signature</div>
      </div>
    </div>
  </div>

</div>`
}


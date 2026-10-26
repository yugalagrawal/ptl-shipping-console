import { ZONES } from './logistics.js'

// Warehouse Cost Ledger — the source of Level 2 cost. One sheet per hub per month.
//  Fixed sheet    — monthly bills (rent, electricity, salaries…). Cost per day = monthly amount ÷ calendar days in that month, added every day.
//  Variable sheet — ad-hoc costs on a date (extra labour, packing material…). Added on that day.
// Kept in memory until the console is wired to a backend. Amounts start blank.

// Every Hub and Mini Hub from the Location Master (logistics.js).
export const FACILITIES = ZONES.flatMap((z) => [
  { code: z.hubCode, name: z.hubName, type: 'Hub', zone: z.zone, region: z.region },
  ...z.branches.flatMap((b) => b.miniHubs.map((m) => ({ code: m.code, name: m.name, type: 'Mini Hub', zone: z.zone, region: z.region, branch: b.name }))),
])

// Cost lines common to a hub in the industry. Amount left blank for the hub to fill in.
export const DEFAULT_FIXED_ITEMS = ['Rent', 'Electricity', 'Water', 'Payroll — hub-only staff (not managers)', 'Security', 'Housekeeping & maintenance', 'Internet & IT', 'Insurance']

export const VARIABLE_CATEGORIES = ['Extra labour', 'Packing material', 'Equipment & fuel', 'Repairs', 'Housekeeping', 'Other']

const SHEETS = {}
let seq = 1
const rid = () => `r${seq++}`

export const blankVariableRow = (month) => ({ id: rid(), date: `${month}-01`, category: VARIABLE_CATEGORIES[0], note: '', amount: '' })

export function getSheet(code, month) {
  const k = `${code}|${month}`
  if (!SHEETS[k]) {
    SHEETS[k] = {
      fixed: DEFAULT_FIXED_ITEMS.map((item) => ({ id: rid(), item, note: '', amount: '', custom: false })),
      variable: [blankVariableRow(month), blankVariableRow(month), blankVariableRow(month)],
    }
  }
  return SHEETS[k]
}

export const hasSheet = (code, month) => !!SHEETS[`${code}|${month}`]

export function addFixedRow(code, month) {
  getSheet(code, month).fixed.push({ id: rid(), item: '', note: '', amount: '', custom: true })
}
export function addVariableRow(code, month) {
  getSheet(code, month).variable.push(blankVariableRow(month))
}
export function removeRow(code, month, kind, id) {
  const s = getSheet(code, month)
  s[kind] = s[kind].filter((r) => r.id !== id)
}
export function updateRow(code, month, kind, id, patch) {
  const r = getSheet(code, month)[kind].find((x) => x.id === id)
  if (r) Object.assign(r, patch)
}
export function copyFixedFrom(code, fromMonth, toMonth) {
  const src = getSheet(code, fromMonth).fixed
  getSheet(code, toMonth).fixed = src.map((r) => ({ ...r, id: rid() }))
}

export const prevMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const num = (v) => Math.max(0, parseFloat(v) || 0)

// Hub factor per hub = sortation hours ÷ 24 (1/24 to 24/24). It splits the month's cost into Sortation cost and Storage cost.
// A docket's billable storage hours are the hours beyond the sortation hours. Default is 24 until the hub is configured.
const SORT_HOURS = {}
export const getSortHours = (code) => SORT_HOURS[code] ?? null
export const setSortHours = (code, h) => { SORT_HOURS[code] = Math.min(24, Math.max(1, Math.round(h) || 24)) }

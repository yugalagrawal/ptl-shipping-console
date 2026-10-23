import { ZONES } from './logistics.js'

// Hub Cost Ledger — the source of Level 2 cost. One sheet per hub per month.
//  Fixed sheet    — monthly bills (rent, electricity, salaries…). Cost per day = monthly amount ÷ calendar days in that month, added every day.
//  Variable sheet — ad-hoc costs on a date (extra labour, packing material…). Added on that day.
// Kept in memory until the console is wired to a backend. Amounts start blank.

// Every Hub and Mini Hub from the Location Master (logistics.js).
export const FACILITIES = ZONES.flatMap((z) => [
  { code: z.hubCode, name: z.hubName, type: 'Hub', zone: z.zone, region: z.region },
  ...z.branches.flatMap((b) => b.miniHubs.map((m) => ({ code: m.code, name: m.name, type: 'Mini Hub', zone: z.zone, region: z.region, branch: b.name }))),
])

// Cost lines common to a hub in the industry. Amount left blank for the hub to fill in.
export const DEFAULT_FIXED_ITEMS = ['Rent', 'Electricity', 'Water', 'Salaries — supervisors & staff', 'Security', 'Housekeeping & maintenance', 'Internet & IT', 'Insurance']

// Default Space / Work tag. Space cost grows with time in the hub (floor, premises); Work cost is done once per docket (labour, handling).
export const FIXED_TAG = { 'Rent': 'space', 'Electricity': 'space', 'Water': 'space', 'Salaries — supervisors & staff': 'work', 'Security': 'space', 'Housekeeping & maintenance': 'space', 'Internet & IT': 'work', 'Insurance': 'space' }
export const VAR_TAG = { 'Extra labour': 'work', 'Packing material': 'work', 'Equipment & fuel': 'work', 'Repairs': 'space', 'Housekeeping': 'space', 'Other': 'work' }

export const VARIABLE_CATEGORIES = ['Extra labour', 'Packing material', 'Equipment & fuel', 'Repairs', 'Housekeeping', 'Other']

const SHEETS = {}
let seq = 1
const rid = () => `r${seq++}`

export const blankVariableRow = (month) => ({ id: rid(), date: `${month}-01`, category: VARIABLE_CATEGORIES[0], tag: VAR_TAG[VARIABLE_CATEGORIES[0]], note: '', amount: '' })

export function getSheet(code, month) {
  const k = `${code}|${month}`
  if (!SHEETS[k]) {
    SHEETS[k] = {
      fixed: DEFAULT_FIXED_ITEMS.map((item) => ({ id: rid(), item, tag: FIXED_TAG[item] || 'work', note: '', amount: '', custom: false })),
      variable: [blankVariableRow(month), blankVariableRow(month), blankVariableRow(month)],
    }
  }
  return SHEETS[k]
}

export const hasSheet = (code, month) => !!SHEETS[`${code}|${month}`]

export function addFixedRow(code, month) {
  getSheet(code, month).fixed.push({ id: rid(), item: '', tag: 'work', note: '', amount: '', custom: true })
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

// Waiting factor per hub — typed by the hub's configurer. Recommended = Space cost ÷ (Space cost + Work cost).
const FACTORS = {}
export const getFactor = (code) => FACTORS[code] ?? null
export const setFactor = (code, v) => { FACTORS[code] = v }
export function spaceWork(sheet) {
  let space = 0, work = 0
  ;[...sheet.fixed, ...sheet.variable].forEach((r) => { if (r.tag === 'space') space += num(r.amount); else work += num(r.amount) })
  return { space, work, factor: space + work ? space / (space + work) : null }
}

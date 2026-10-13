// Docket number = 9-digit body from a sequence + 1 check digit (10 digits, text).
// Weighted mod-11 scheme per the "Docket Number Specification" (PTL 2.0): read
// the body right-to-left, double the digits in odd positions (1st, 3rd, …
// 9th; subtract 9 when ≥ 10), sum, take the remainder mod 11, and use it as
// the check digit — a remainder of 10 is written as 0.
//
// That 10 → 0 mapping is the known defect in the spec (§8): remainders 0 and 10
// give the same check digit, so some errors slip through. The product decision
// is pending, so both options are supported behind one switch:
//   Option A — keep the rule as written (10 → 0).
//   Option B — recommended: never issue a body whose remainder is 10, and
//              reject any docket whose recomputed remainder is 10.
export const SKIP_REMAINDER_10 = true // Option B. Set false for Option A.

export const BODY_DIGITS = 9
export const DOCKET_DIGITS = 10
export const MAX_BODY = 999999999

const isDigits = (s, n) => typeof s === 'string' && s.length === n && /^\d+$/.test(s)

// Doubled-and-reduced value of a digit sitting in an odd position.
export const doubled = (d) => (d * 2 > 9 ? d * 2 - 9 : d * 2)

// Per-digit working, right to left (position 1 = rightmost body digit).
export function workingOf(body) {
  if (!isDigits(body, BODY_DIGITS)) throw new Error('body must be exactly 9 digits')
  return [...body].map((ch, idx) => {
    const position = BODY_DIGITS - idx // 1 = rightmost
    const digit = Number(ch)
    const isDoubled = position % 2 === 1
    return { digit, position, isDoubled, value: isDoubled ? doubled(digit) : digit }
  })
}

export const weightedSum = (body) => workingOf(body).reduce((n, w) => n + w.value, 0)
export const remainderOf = (body) => weightedSum(body) % 11
export const checkDigit = (body) => String(remainderOf(body) === 10 ? 0 : remainderOf(body))

// Can this body be issued at all? (Option B skips remainder-10 bodies.)
export const isIssuableBody = (body) => !SKIP_REMAINDER_10 || remainderOf(body) !== 10

export const bodyStr = (n) => String(n).padStart(BODY_DIGITS, '0')
export const makeDocket = (body) => body + checkDigit(body)
export const docketOfBody = (n) => makeDocket(bodyStr(n))
export const bodyOfDocket = (docket) => Number(String(docket).slice(0, BODY_DIGITS))

// Smallest issuable body number ≥ n (null past the end of the sequence).
export function nextIssuableBody(n) {
  for (let b = Math.max(0, n); b <= MAX_BODY; b++) if (isIssuableBody(bodyStr(b))) return b
  return null
}

// How many issuable bodies lie in [from, to]. Exact up to 2M bodies, a 10/11
// estimate beyond (Option B) so a huge range never freezes the page.
export function countIssuable(fromBody, toBody) {
  const span = toBody - fromBody + 1
  if (span <= 0) return { count: 0, approx: false }
  if (span > 2_000_000) return { count: Math.round(SKIP_REMAINDER_10 ? (span * 10) / 11 : span), approx: SKIP_REMAINDER_10 }
  let n = 0
  for (let b = fromBody; b <= toBody; b++) if (isIssuableBody(bodyStr(b))) n++
  return { count: n, approx: false }
}

// Validate a docket string; `reason` is the message for the user (§7).
export function inspectDocket(docket) {
  const s = String(docket ?? '')
  if (s.length !== DOCKET_DIGITS) return { valid: false, reason: `Docket number must be ${DOCKET_DIGITS} digits (got ${s.length}).` }
  if (!/^\d+$/.test(s)) return { valid: false, reason: 'Docket number must contain digits only.' }
  const body = s.slice(0, BODY_DIGITS)
  const rem = remainderOf(body)
  const expected = checkDigit(body)
  const base = { body, remainder: rem, expected, sum: weightedSum(body), working: workingOf(body) }
  if (SKIP_REMAINDER_10 && rem === 10) return { ...base, valid: false, reason: 'Invalid docket number — this body can never be issued (remainder 10). Check for typos.' }
  if (expected !== s[9]) return { ...base, valid: false, reason: `Invalid docket number — check digit should be ${expected}. Check for typos.` }
  return { ...base, valid: true, reason: 'Valid docket number.' }
}
export const isValidDocket = (docket) => inspectDocket(docket).valid

// §4 test vectors (check digits are for the rule as written — all five bodies
// have a remainder other than 10 except the first, which is why 123456789 is
// issuable only under Option A).
export const TEST_VECTORS = [
  { body: '123456789', docket: '1234567890', note: 'Sum 43, remainder 10 → 0' },
  { body: '100000000', docket: '1000000002', note: 'Sum 2' },
  { body: '000000001', docket: '0000000012', note: 'Leading zeros — store as text' },
  { body: '000000000', docket: '0000000000', note: 'All zeros' },
  { body: '999999999', docket: '9999999994', note: 'Sum 81, remainder 4' },
]
export const NEGATIVE_VECTORS = [
  { input: '1234567891', note: 'Wrong check digit' },
  { input: '123456789', note: 'Wrong length' },
  { input: '12345678A0', note: 'Non-digit character' },
]

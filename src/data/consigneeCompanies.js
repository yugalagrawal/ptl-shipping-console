import { LEGAL_ENTITY_SUGGESTIONS } from './groups.js'

// Consignee Company Name is a separate, broader master list than Client
// Company (the onboarded legal-entity roster in groups.js). A consignee is
// "anyone" — a client's own end customer, or their employer, or a small
// business that will never itself go through client onboarding — so this
// list starts with every onboarded legal entity name (picking a known
// client as a consignee's company still works) but is also freely
// extended by typing a brand-new name, same "type to add" pattern as
// ensureUserTag() for User Relations tags. EXTRA_CONSIGNEE_COMPANIES seeds a
// few non-client names so the dropdown has real "doesn't require
// onboarding" examples from the start, not just client legal entities.
const EXTRA_CONSIGNEE_COMPANIES = ['Croma Retail', 'Apollo Pharmacy', 'More Supermarket', 'Infosys BPM Ltd']

export const CONSIGNEE_COMPANY_NAMES = [
  ...new Set([...LEGAL_ENTITY_SUGGESTIONS.map((e) => e.label), ...EXTRA_CONSIGNEE_COMPANIES]),
]

// Case-insensitive add-if-new — typing "reliance digital" resolves to the
// existing "Reliance Digital" instead of creating a near-duplicate entry.
// Mutates the shared array in place so the new name shows up in every other
// order's Company dropdown immediately, not just this session's.
export function ensureConsigneeCompany(name) {
  const trimmed = name.trim()
  if (!trimmed) return ''
  const existing = CONSIGNEE_COMPANY_NAMES.find((c) => c.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  CONSIGNEE_COMPANY_NAMES.push(trimmed)
  return trimmed
}

export function consigneeCompanySuggestions() {
  return CONSIGNEE_COMPANY_NAMES.map((name) => ({ value: name, label: name }))
}

// One rule for every person's name in the system (POCs, drivers, team members,
// alternate contacts): First name + Last name, stored separately, with the full
// name always DERIVED from the two — never typed. Entities (client, partner,
// company, site) stay a single name field and don't use any of this.

// Typing: letters (any language), space, . ' - only; no digits or symbols, no
// leading or double spaces.
export function typingFilter(value) {
  return value.replace(/[^\p{L} .'-]/gu, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ')
}

// On blur: trim, collapse spaces, Capitalise Each Word ("ritesh KUMAR" -> "Ritesh Kumar",
// "d'souza" -> "D'Souza", "anne-marie" -> "Anne-Marie").
export function tidyName(value) {
  return value
    .trim()
    .replace(/\s{2,}/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
}

export const namePartOk = (value = '') => /^\p{L}[\p{L} .'-]*$/u.test(value.trim())

export function joinName(first = '', last = '') {
  return [first, last].map((x) => x.trim()).filter(Boolean).join(' ')
}

// For records that only carry a full name (older data): everything before the
// last word is the first name, the last word is the last name.
export function splitName(full = '') {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

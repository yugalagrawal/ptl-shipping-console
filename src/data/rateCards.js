// Multiple standard rate cards — Standard_V1 (the original standard rate
// card — always first/default, and what every new card seeds from) plus a
// couple of vertical-specific samples (Pharma needs temperature-controlled
// handling, priced at a premium over Standard_V1). Sample data only, to
// demo the rate-card picker UI in ClientPricingConfiguration.jsx; a
// client's own tier discount still only ever applies off whichever card is
// active.

import { STANDARD_MATRIX } from './pricing.js'

function scaledMatrix(multiplier) {
  return STANDARD_MATRIX.map((row) => row.map((v) => Math.round(v * multiplier * 20) / 20))
}

export const RATE_CARDS_SEED = [
  { id: 'standard-v1', code: 'STANDARD_V1', name: 'Standard_V1', isGeneral: true, matrix: STANDARD_MATRIX.map((row) => [...row]) },
  { id: 'pharma-01', code: 'PHARMA-01', name: 'Pharma-01', matrix: scaledMatrix(1.12) },
  { id: 'pharma-02', code: 'PHARMA-02', name: 'Pharma-02', matrix: scaledMatrix(1.08) },
]

export function slugFromCode(code) {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Starter suggestions for the Code combobox in "Create rate card" — picking
// one doesn't create anything by itself, and typing a code not in this list
// is just as valid (the combobox offers to create it on the fly).
export const INDUSTRY_CODES = [
  'PHARMA',
  'FMCG',
  'ELECTRONICS',
  'CONSTRUCTION',
  'AUTOMOTIVE',
  'TEXTILES',
  'AGRICULTURE',
  'CHEMICALS',
  'RETAIL',
  'FURNITURE',
  'E-COMMERCE',
  'PERISHABLES',
]

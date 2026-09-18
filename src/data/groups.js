// A Customer Group is a parent holding entity that can own several separately
// GST/PAN-registered legal entities underneath it (e.g. "Tata Group" owning
// both "Tata Consumer Products Ltd" and "Tata Cliq Retail Pvt Ltd"). Matches
// the Group → Legal Entity hierarchy already used in LT-Console. Shared by
// the New Client wizard (Customer Group / Legal Entity typeaheads) and the
// Client Groups tab on My Clients.
export const CUSTOMER_GROUPS = [
  { id: 'GRP-001', name: 'Tata Group', legalEntities: ['Tata Consumer Products Ltd', 'Tata Cliq Retail Pvt Ltd'] },
  { id: 'GRP-002', name: 'Reliance Retail', legalEntities: ['Reliance Retail Ltd', 'Reliance Digital Ltd'] },
  { id: 'GRP-003', name: 'Nykaa', legalEntities: ['FSN E-Commerce Ventures Ltd'] },
  { id: 'GRP-004', name: 'Lenskart', legalEntities: ['Lenskart Solutions Pvt Ltd'] },
  { id: 'GRP-005', name: 'Oriflame', legalEntities: ['Oriflame India Pvt Ltd'] },
  { id: 'GRP-006', name: 'Mamaearth', legalEntities: ['Honasa Consumer Ltd'] },
  { id: 'GRP-007', name: 'Zepto', legalEntities: ['Kiranakart Technologies Pvt Ltd'] },
  { id: 'GRP-008', name: 'boAt', legalEntities: ['Imagine Marketing Ltd'] },
  { id: 'GRP-009', name: 'Wow Skin Science', legalEntities: ['Wow Skin Science Pvt Ltd'] },
  { id: 'GRP-010', name: 'Country Delight', legalEntities: ['Continental Milkose Pvt Ltd'] },
  { id: 'GRP-011', name: 'Licious', legalEntities: ['Delightful Gourmet Pvt Ltd'] },
  { id: 'GRP-012', name: 'Meesho', legalEntities: ['Fashnear Technologies Pvt Ltd'] },
]

export const GROUP_SUGGESTIONS = CUSTOMER_GROUPS.map((g) => ({ id: g.id, label: g.name }))

export const LEGAL_ENTITY_SUGGESTIONS = CUSTOMER_GROUPS.flatMap((g) =>
  g.legalEntities.map((name, i) => ({ id: `${g.id}-${i}`, label: name, groupId: g.id, groupName: g.name })),
)

export function groupById(id) {
  return CUSTOMER_GROUPS.find((g) => g.id === id) ?? null
}

// Box master — the standard cartons ops picks from when sizing a docket's
// goods, so nobody retypes L × B × H for every consignment. Starter set of
// five common corrugated courier/PTL cartons (cm); master data should confirm
// the real list. "Create" in Create Docket adds a new entry here, available to
// every docket afterwards.
export const BOX_MASTER = [
  { id: 'box-s', name: 'S', l: 30, b: 20, h: 15 },
  { id: 'box-m', name: 'M', l: 40, b: 30, h: 25 },
  { id: 'box-l', name: 'L', l: 50, b: 40, h: 35 },
  { id: 'box-xl', name: 'XL', l: 60, b: 45, h: 45 },
  { id: 'box-xxl', name: 'XXL', l: 75, b: 55, h: 50 },
]

// Every created box is simply "Custom" — told apart by its size in the dropdown
// ("Custom — 25×25×50"), so there's no name to type.
export function addBoxToMaster({ l, b, h, name = 'Custom' }) {
  const box = { id: `box-${Date.now()}`, name: String(name).trim() || 'Custom', l: Number(l), b: Number(b), h: Number(h) }
  BOX_MASTER.push(box)
  return box
}

// Edit a box's name / size in place (dimensions in cm). Dockets already created keep
// the size they were booked with — they copy L × B × H, not a reference.
export function updateBox(id, { name, l, b, h }) {
  const box = BOX_MASTER.find((x) => x.id === id)
  if (!box) return null
  Object.assign(box, { name: String(name).trim() || box.name, l: Number(l), b: Number(b), h: Number(h) })
  return box
}

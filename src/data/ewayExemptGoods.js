// Goods that don't need an e-Way Bill (CGST Rule 138(14) and the notified
// exempt-goods lists), keyed by HSN prefix. STARTER LIST from memory —
// compliance owns the real one and must confirm/extend it before the real
// build; the point is that exemption is decided by what the goods *are*
// (their HSN), never by anyone's say-so. `note` is shown to ops where the
// exemption carries a condition. Some exempt categories have no HSN at all
// (used personal/household effects, postal baggage) — those can't be matched
// here and need a separate declared-category path.
export const EWAY_EXEMPT_GOODS = [
  { hsn: '71', label: 'Pearls, precious & semi-precious stones, precious metals, jewellery (Chapter 71)' },
  { hsn: '0508', label: 'Coral, unworked' },
  { hsn: '9601', label: 'Coral, worked' },
  { hsn: '4907', label: 'Currency notes / banknotes' },
  { hsn: '0401', label: 'Milk', note: 'Fresh, unbranded, un-concentrated milk only.' },
  { hsn: '0407', label: 'Birds\' eggs in shell', note: 'Fresh eggs only.' },
  { hsn: '0701', label: 'Fresh vegetables — potatoes' },
  { hsn: '0702', label: 'Fresh vegetables — tomatoes' },
  { hsn: '0703', label: 'Fresh vegetables — onions, garlic' },
  { hsn: '0704', label: 'Fresh vegetables — cabbages, cauliflower' },
  { hsn: '0709', label: 'Fresh vegetables — other' },
  { hsn: '271113', label: 'LPG for household / exempted-category supply', note: 'Only when supplied to households or non-domestic exempted customers.' },
  { hsn: '271019', label: 'Kerosene sold under PDS', note: 'Only kerosene supplied under the Public Distribution System.' },
]

// Longest matching HSN prefix wins. Returns the list entry, or null.
export function exemptGoodsFor(hsn) {
  const code = String(hsn ?? '').replace(/\D/g, '')
  if (!code) return null
  let best = null
  for (const e of EWAY_EXEMPT_GOODS) {
    if (code.startsWith(e.hsn) && (!best || e.hsn.length > best.hsn.length)) best = e
  }
  return best
}

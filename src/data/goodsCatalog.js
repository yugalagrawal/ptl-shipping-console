// Goods a docket / e-Way Bill is usually raised for, keyed by HSN — lets Create
// Docket autofill the pair: pick the goods and the HSN fills in, type the HSN
// and the goods fill in. Starter list covering LT's current clients plus the
// e-Way-Bill-exempt categories (so those are findable too); compliance/master
// data owns the real list. `unit` is the e-Way Bill quantity unit.
import { EWAY_EXEMPT_GOODS } from './ewayExemptGoods.js'

export const GOODS_CATALOG = [
  { hsn: '3304', name: 'Cosmetics & beauty products', unit: 'BOX' },
  { hsn: '3305', name: 'Hair care products', unit: 'BOX' },
  { hsn: '3307', name: 'Fragrances & toiletries', unit: 'BOX' },
  { hsn: '3401', name: 'Soaps & body wash', unit: 'BOX' },
  { hsn: '3005', name: 'Medical consumables', unit: 'CTN' },
  { hsn: '2106', name: 'Nutrition supplements & food preparations', unit: 'BOX' },
  { hsn: '0402', name: 'Dairy products (packed)', unit: 'CTN' },
  { hsn: '1905', name: 'Bakery & packaged snacks', unit: 'CTN' },
  { hsn: '9004', name: 'Eyewear & frames', unit: 'PCS' },
  { hsn: '6403', name: 'Footwear', unit: 'PCS' },
  { hsn: '6109', name: 'Apparel — knitwear', unit: 'PCS' },
  { hsn: '6204', name: 'Apparel — woven', unit: 'PCS' },
  { hsn: '4202', name: 'Bags & luggage', unit: 'PCS' },
  { hsn: '8517', name: 'Mobile phones & accessories', unit: 'PCS' },
  { hsn: '8471', name: 'Laptops & computers', unit: 'PCS' },
  { hsn: '8504', name: 'Electrical equipment', unit: 'PCS' },
  { hsn: '9503', name: 'Toys & games', unit: 'PCS' },
  ...EWAY_EXEMPT_GOODS.map((g) => ({ hsn: g.hsn, name: g.label.replace(/\s*\(.*\)\s*$/, ''), unit: 'KGS' })),
]

export const goodsByHsn = (hsn) => GOODS_CATALOG.find((g) => g.hsn === String(hsn ?? '').trim()) ?? null

export function searchGoods(q, limit = 7) {
  const t = String(q ?? '').trim().toLowerCase()
  if (!t) return GOODS_CATALOG.slice(0, limit)
  return GOODS_CATALOG.filter((g) => g.name.toLowerCase().includes(t) || g.hsn.startsWith(t)).slice(0, limit)
}

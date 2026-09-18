// Finance Management — invoices generated off booked orders' own freight
// totals (already computed by data/pricing.js at booking time), carried
// through Invoicing -> Collections -> Analytics. A simplification worth
// flagging: a real system would only invoice orders on a *delivered* trip
// against the client's actual billing cycle (fortnightly/monthly, see
// client.billing.billingPeriod); this prototype invoices any booked order
// not yet invoiced, and uses a flat 15-day credit period for every client,
// rather than modeling each client's real billing cycle end-to-end.

export const INVOICE_STATUS = {
  GENERATED: 'generated',
  DISPATCHED: 'dispatched',
  PAID: 'paid',
}

export const INVOICE_STATUS_LABEL = {
  [INVOICE_STATUS.GENERATED]: 'Generated',
  [INVOICE_STATUS.DISPATCHED]: 'Dispatched',
  [INVOICE_STATUS.PAID]: 'Paid',
}

export const INVOICE_STATUS_BADGE = {
  [INVOICE_STATUS.GENERATED]: 'bg-slate-100 text-slate-600',
  [INVOICE_STATUS.DISPATCHED]: 'bg-sky-50 text-sky-700',
  [INVOICE_STATUS.PAID]: 'bg-emerald-50 text-emerald-700',
}

export const CREDIT_PERIOD_DAYS = 15

let invoiceSeq = 5501
function generateInvoiceId() {
  return `INV-FY26-${invoiceSeq++}`
}

// Order ids already rolled into an invoice — mirrors trips.js's
// MANIFESTED_ORDER_IDS pattern so "Generate Invoice" never double-bills the
// same order.
export const INVOICED_ORDER_IDS = new Set()

export const INVOICES_SEED = []

function seedInvoice({ id, clientId, clientName, orderIds, amount, status, generatedAt, dispatchedAt = null, paidAt = null, daysOverdue = 0 }) {
  orderIds.forEach((oid) => INVOICED_ORDER_IDS.add(oid))
  return { id, clientId, clientName, orderIds, amount, status, generatedAt, dispatchedAt, paidAt, daysOverdue }
}

export function initInvoicesSeed(orders) {
  if (INVOICES_SEED.length) return INVOICES_SEED
  const byClient = (clientId) => orders.filter((o) => o.clientId === clientId)

  const lenskartOrders = byClient('lenskart')
  const oriflameOrders = byClient('oriflame')

  INVOICES_SEED.push(
    seedInvoice({
      id: generateInvoiceId(), clientId: 'lenskart', clientName: 'Lenskart',
      orderIds: lenskartOrders.length ? [lenskartOrders[0].id] : [],
      amount: lenskartOrders.length ? lenskartOrders[0].total : 450,
      status: INVOICE_STATUS.PAID, generatedAt: '2026-07-10', dispatchedAt: '2026-07-11', paidAt: '2026-07-20', daysOverdue: 0,
    }),
    seedInvoice({
      id: generateInvoiceId(), clientId: 'oriflame', clientName: 'Oriflame',
      orderIds: oriflameOrders.length ? [oriflameOrders[0].id] : [],
      amount: oriflameOrders.length ? oriflameOrders[0].total : 2100,
      status: INVOICE_STATUS.DISPATCHED, generatedAt: '2026-07-05', dispatchedAt: '2026-07-06', daysOverdue: 42,
    }),
    seedInvoice({
      id: generateInvoiceId(), clientId: 'wow-skin-science', clientName: 'Wow Skin Science',
      orderIds: [],
      amount: 8300,
      status: INVOICE_STATUS.DISPATCHED, generatedAt: '2026-07-18', dispatchedAt: '2026-07-19', daysOverdue: 18,
    }),
    seedInvoice({
      id: generateInvoiceId(), clientId: 'mamaearth', clientName: 'Mamaearth',
      orderIds: [],
      amount: 3150,
      status: INVOICE_STATUS.DISPATCHED, generatedAt: '2026-07-25', dispatchedAt: '2026-07-26', daysOverdue: 5,
    }),
  )
  return INVOICES_SEED
}

// Orders booked for a client that haven't been rolled into any invoice yet
// (see INVOICED_ORDER_IDS) — grouped so Invoicing can show "N orders, ₹X
// ready to bill" per client and generate one invoice per click.
export function uninvoicedOrdersByClient(orders) {
  const eligible = orders.filter((o) => !INVOICED_ORDER_IDS.has(o.id))
  const byClient = new Map()
  eligible.forEach((o) => {
    if (!byClient.has(o.clientId)) byClient.set(o.clientId, { clientId: o.clientId, clientName: o.clientName, orders: [] })
    byClient.get(o.clientId).orders.push(o)
  })
  return [...byClient.values()].map((g) => ({ ...g, amount: Math.round(g.orders.reduce((sum, o) => sum + (o.total ?? 0), 0) * 100) / 100 }))
}

export function generateInvoice(group) {
  const invoice = seedInvoice({
    id: generateInvoiceId(),
    clientId: group.clientId,
    clientName: group.clientName,
    orderIds: group.orders.map((o) => o.id),
    amount: group.amount,
    status: INVOICE_STATUS.GENERATED,
    generatedAt: 'Just now',
  })
  INVOICES_SEED.unshift(invoice)
  return invoice
}

export function dispatchInvoice(id) {
  const invoice = INVOICES_SEED.find((i) => i.id === id)
  if (invoice) {
    invoice.status = INVOICE_STATUS.DISPATCHED
    invoice.dispatchedAt = 'Just now'
  }
  return invoice
}

export function markInvoicePaid(id) {
  const invoice = INVOICES_SEED.find((i) => i.id === id)
  if (invoice) {
    invoice.status = INVOICE_STATUS.PAID
    invoice.paidAt = 'Just now'
  }
  return invoice
}

export function ageingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'Current'
  if (daysOverdue <= 30) return '1–30 days'
  if (daysOverdue <= 60) return '31–60 days'
  if (daysOverdue <= 90) return '61–90 days'
  return '90+ days'
}

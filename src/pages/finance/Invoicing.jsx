import { useMemo, useState } from 'react'
import { card, thCls, tdCls, rowCls, pill, btnPrimary, btnSecondary } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { ORDERS_SEED, initOrdersSeed } from '../../data/orders.js'
import {
  INVOICE_STATUS, INVOICE_STATUS_LABEL, INVOICE_STATUS_BADGE,
  initInvoicesSeed, uninvoicedOrdersByClient, generateInvoice, dispatchInvoice,
} from '../../data/invoices.js'

function money(n) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function Invoicing() {
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))
  const [invoicesSeed] = useState(() => initInvoicesSeed(ordersSeed))
  const [tick, setTick] = useState(0)

  const readyToBill = useMemo(() => uninvoicedOrdersByClient(ordersSeed), [ordersSeed, tick])
  const invoices = useMemo(() => [...invoicesSeed].sort((a, b) => (a.id < b.id ? 1 : -1)), [invoicesSeed, tick])

  function handleGenerate(group) {
    generateInvoice(group)
    setTick((t) => t + 1)
  }
  function handleDispatch(id) {
    dispatchInvoice(id)
    setTick((t) => t + 1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Invoicing</h1>
        <p className="mt-1 text-slate-500">Generate client invoices off booked orders, then dispatch them.</p>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Ready to bill</h2>
          <p className="mt-0.5 text-xs text-slate-500">Orders booked but not yet on any invoice, rolled up by client.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {readyToBill.map((group) => (
            <div key={group.clientId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <div className="text-sm font-medium text-slate-800">{group.clientName}</div>
                <div className="text-xs text-slate-400">{group.orders.length} order{group.orders.length > 1 ? 's' : ''} · {money(group.amount)}</div>
              </div>
              <button type="button" onClick={() => handleGenerate(group)} className={btnPrimary}>Generate Invoice</button>
            </div>
          ))}
          {readyToBill.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Every booked order has been invoiced.</div>
          )}
        </div>
      </div>

      <div className={`overflow-x-auto ${card}`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Invoices</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thCls}>Invoice No.</th>
              <th className={thCls}>Client</th>
              <th className={thCls}>Orders</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Generated</th>
              <th className={thCls}>Status</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className={rowCls}>
                <td className={`${tdCls} font-medium text-slate-800`}>{inv.id}</td>
                <td className={tdCls}>{inv.clientName}</td>
                <td className={tdCls}>{inv.orderIds.length || '—'}</td>
                <td className={tdCls}>{money(inv.amount)}</td>
                <td className={tdCls}>{inv.generatedAt}</td>
                <td className={tdCls}><span className={`${pill} ${INVOICE_STATUS_BADGE[inv.status]}`}>{INVOICE_STATUS_LABEL[inv.status]}</span></td>
                <td className={tdCls}>
                  {inv.status === INVOICE_STATUS.GENERATED && (
                    <button type="button" onClick={() => handleDispatch(inv.id)} className={btnSecondary}>Dispatch</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

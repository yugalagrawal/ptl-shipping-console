import { useMemo, useState } from 'react'
import { card, thCls, tdCls, rowCls, pill, btnPrimary, btnSecondary } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { initOrdersSeed } from '../../data/orders.js'
import { INVOICE_STATUS, initInvoicesSeed, markInvoicePaid, ageingBucket } from '../../data/invoices.js'

const BUCKETS = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days']
const BUCKET_COLOR = {
  'Current': 'text-slate-500',
  '1–30 days': 'text-amber-600',
  '31–60 days': 'text-amber-700',
  '61–90 days': 'text-rose-600',
  '90+ days': 'text-rose-700',
}

function money(n) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function Collections() {
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))
  const [invoicesSeed] = useState(() => initInvoicesSeed(ordersSeed))
  const [tick, setTick] = useState(0)
  const [followUps, setFollowUps] = useState({})
  const [notingId, setNotingId] = useState(null)

  const outstanding = useMemo(
    () => invoicesSeed.filter((i) => i.status === INVOICE_STATUS.DISPATCHED).sort((a, b) => b.daysOverdue - a.daysOverdue),
    [invoicesSeed, tick]
  )

  const bucketTotals = useMemo(() => {
    const totals = Object.fromEntries(BUCKETS.map((b) => [b, 0]))
    outstanding.forEach((inv) => { totals[ageingBucket(inv.daysOverdue)] += inv.amount })
    return totals
  }, [outstanding])

  function handleMarkPaid(id) {
    markInvoicePaid(id)
    setTick((t) => t + 1)
  }
  function handleNote(id, note) {
    setFollowUps((f) => ({ ...f, [id]: [...(f[id] ?? []), { note, loggedAt: 'Just now' }] }))
    setNotingId(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Collections</h1>
        <p className="mt-1 text-slate-500">Receivables ageing and follow-up on dispatched invoices.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BUCKETS.map((b) => (
          <div key={b} className={`p-4 ${card}`}>
            <div className={`text-[11px] font-medium ${BUCKET_COLOR[b]}`}>{b}</div>
            <div className="mt-1.5 text-lg font-semibold text-slate-900">{money(bucketTotals[b])}</div>
          </div>
        ))}
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Outstanding invoices</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {outstanding.map((inv) => (
            <div key={inv.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{inv.id}</span>
                    <span className="text-sm text-slate-500">{inv.clientName}</span>
                    <span className={`${pill} ${inv.daysOverdue > 60 ? 'bg-rose-50 text-rose-600' : inv.daysOverdue > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ageingBucket(inv.daysOverdue)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {money(inv.amount)} · dispatched {inv.dispatchedAt}
                    {inv.daysOverdue > 0 && <> · {inv.daysOverdue} days overdue</>}
                  </div>
                  {(followUps[inv.id] ?? []).map((f, i) => (
                    <div key={i} className="mt-1 text-xs text-slate-500">— {f.note} <span className="text-slate-400">({f.loggedAt})</span></div>
                  ))}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setNotingId(notingId === inv.id ? null : inv.id)} className={btnSecondary}>Record follow-up</button>
                  <button type="button" onClick={() => handleMarkPaid(inv.id)} className={btnPrimary}>Mark Paid</button>
                </div>
              </div>
              {notingId === inv.id && (
                <FollowUpForm onSubmit={(note) => handleNote(inv.id, note)} onCancel={() => setNotingId(null)} />
              )}
            </div>
          ))}
          {outstanding.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-slate-400">Nothing outstanding right now.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function FollowUpForm({ onSubmit, onCancel }) {
  const [note, setNote] = useState('')
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Called finance POC, promised payment by Friday"
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      <button
        type="button"
        onClick={() => note.trim() && onSubmit(note.trim())}
        disabled={!note.trim()}
        className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Save
      </button>
    </div>
  )
}

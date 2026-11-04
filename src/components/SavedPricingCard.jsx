import { useState } from 'react'
import Icon from './Icon.jsx'

// One saved pricing on the client's Pricing step: a header that says what it
// is at a glance (name, source, version, discount, edits, price range) and an
// expandable read-only grid. Edited cells are highlighted so negotiated
// changes stand out from the card's standard prices.
const SOURCE_LABEL = { 'rate-card': 'From Standard Rate Card', 'standard-regions': 'From Standard Regions', scratch: 'From Scratch', template: 'From Templates' }
const fmt = (n) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

export default function SavedPricingCard({ p, index, defaultOpen = false, onEdit, onRemove }) {
  const [open, setOpen] = useState(defaultOpen)
  const [confirming, setConfirming] = useState(false)
  const flat = p.grid.flat().filter((v) => v !== null)
  const lowest = flat.length ? Math.min(...flat) : null
  const highest = flat.length ? Math.max(...flat) : null
  const edited = new Set(p.editedKeys ?? [])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Collapse' : 'Expand'} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <Icon name="chevron" className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-baseline gap-x-5 gap-y-0.5 text-xs text-slate-500">
            <span className="text-sm font-semibold text-slate-900">Pricing {index}</span>
            <span>
              <span className="font-semibold text-slate-700">{p.regionNames.length}</span> regions
            </span>
            <span>
              <span className="font-semibold text-slate-700">
                ₹{fmt(lowest)}
                {lowest !== highest && `–${fmt(highest)}`}
              </span>{' '}
              per kg
            </span>
          </span>
          <span className="mt-0.5 block text-[10px] leading-tight text-slate-400">{SOURCE_LABEL[p.source ?? (p.kind === 'rate-card' ? 'rate-card' : 'standard-regions')]}</span>
        </button>
        {confirming ? (
          <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
            <span className="text-slate-500">Remove this pricing?</span>
            <button type="button" onClick={onRemove} className="text-rose-600 hover:underline">
              Yes
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-slate-500 hover:underline">
              No
            </button>
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Icon name="edit" className="h-3.5 w-3.5" />
                Edit rates
              </button>
            )}
            <button type="button" onClick={() => setConfirming(true)} title="Remove" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </span>
        )}
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-[11px]">
              <colgroup>
                <col style={{ width: 92 }} />
                {p.regionNames.map((n) => (
                  <col key={n} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-slate-400">From ↓ To →</th>
                  {p.regionNames.map((n) => (
                    <th key={n} className="px-0.5 py-1.5 text-center text-[10px] font-semibold leading-tight text-slate-500" title={n}>
                      {n.replace(/ (\d)$/, '\n$1').split('\n').map((t, i) => (
                        <span key={i} className="block">
                          {t}
                        </span>
                      ))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.regionNames.map((from, o) => (
                  <tr key={from} className="border-t border-slate-100">
                    <th className="whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold text-slate-700">{from}</th>
                    {p.regionNames.map((to, c) => {
                      const e = edited.has(`${o}|${c}`)
                      return (
                        <td key={to} className="p-[2px] text-center">
                          <span className={`block rounded-md py-1.5 tabular-nums ${e ? 'border border-brand-orange bg-brand-orange/10 font-semibold text-brand-orange-dark' : o === c ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'}`}>{fmt(p.grid[o][c])}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            ₹ per kg · rows are origin, columns are destination
            {edited.size > 0 && <span className="ml-2 text-brand-orange-dark">Highlighted cells were changed from the card price.</span>}
          </p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import Icon from './Icon.jsx'
import { Shell } from './ClientRegionFlow.jsx'
import { REGION_TEMPLATES } from '../data/regionMapping.js'

// "Saved Templates": pick a region set saved earlier (built in Client Pricing >
// Client Mapping). The client gets its own copy, then goes on to Set rates.
export default function ClientTemplateFlow({ open, onBack, onClose, onPick }) {
  const [id, setId] = useState(REGION_TEMPLATES.length === 1 ? REGION_TEMPLATES[0].id : '')
  const [q, setQ] = useState('')
  if (!open) return null
  const query = q.trim().toLowerCase()
  const list = REGION_TEMPLATES.filter((t) => !query || t.name.toLowerCase().includes(query))
  return (
    <Shell wide="max-w-md" title="Choose a saved template" onClose={onClose}>
      <div className="px-5 pt-4">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40" />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {query ? `${list.length} of ${REGION_TEMPLATES.length} templates` : `${REGION_TEMPLATES.length} template${REGION_TEMPLATES.length === 1 ? '' : 's'}`} · you get your own copy to price and edit
        </p>
      </div>
      <div className="max-h-[300px] min-h-[96px] space-y-2 overflow-y-auto px-5 py-3">
        {list.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">{REGION_TEMPLATES.length === 0 ? 'No saved templates yet. Build one in Client Pricing → Client Mapping.' : `No template matches “${q.trim()}”.`}</p>}
        {list.map((t) => {
          const on = t.id === id
          const cityCount = t.regions.reduce((n, r) => n + r.cities.length, 0)
          const stateCount = new Set(t.regions.flatMap((r) => r.cities.map((c) => c.state))).size
          return (
            <button key={t.id} type="button" onClick={() => setId(t.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange/40' : 'border-slate-200 hover:border-brand-orange/40'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-brand-orange' : 'border-slate-300'}`}>{on && <span className="h-2 w-2 rounded-full bg-brand-orange" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{t.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {t.regions.length} regions · {stateCount} {stateCount === 1 ? 'state' : 'states'} · {cityCount.toLocaleString('en-IN')} cities
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <span className="truncate text-xs text-slate-400">{id ? `Selected: ${REGION_TEMPLATES.find((t) => t.id === id)?.name}` : 'Pick a template to continue'}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Back
          </button>
          <button type="button" disabled={!id} onClick={() => onPick(id)} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark disabled:opacity-50">
            Continue
          </button>
        </div>
      </div>
    </Shell>
  )
}

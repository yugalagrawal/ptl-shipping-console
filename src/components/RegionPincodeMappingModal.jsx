import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { ZONES, ZONE_CLASSIFICATIONS } from '../data/pricing.js'
import { ZONE_COVERAGE, zoneGroup, ZONE_GROUP_STYLES, zoneLocationCount, zoneMatchesQuery } from '../data/regionCoverage.js'

function highlightMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-inherit">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// Master-detail: a color-coded region rail on the left (search narrows it,
// but never hides the browsable list entirely — unlike the old version this
// replaces, which swapped the whole list out for a flat pincode result once
// you typed anything) and the selected region's real state/city coverage on
// the right, matched terms highlighted in place. "Region" is the UI label —
// the underlying data still keys off pricing.js's ZONES/ZONE_* exports,
// same UI-label-only rename already applied to Region access in
// permissions.js (pricing.js's own internal "zone" vocabulary stays as-is).
export default function RegionPincodeMappingModal({ onClose }) {
  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState(ZONES[0])
  const q = search.trim().toLowerCase()

  const filteredZones = useMemo(() => ZONES.filter((zone) => zoneMatchesQuery(zone, q)), [q])

  useEffect(() => {
    if (q && !filteredZones.includes(selectedZone)) {
      setSelectedZone(filteredZones[0] ?? null)
    }
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const coverage = selectedZone ? ZONE_COVERAGE[selectedZone] : null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Region &amp; Pincode Mapping</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-64 shrink-0 flex-col border-r border-slate-100">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search state or city…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto py-1">
              {filteredZones.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">No region matches "{search.trim()}".</p>
              ) : (
                filteredZones.map((zone) => {
                  const group = zoneGroup(zone)
                  const active = zone === selectedZone
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => setSelectedZone(zone)}
                      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm ${
                        active ? 'bg-brand-orange/10 text-brand-navy' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${ZONE_GROUP_STYLES[group]?.dot ?? 'bg-slate-300'}`} />
                      <span className="flex-1 truncate font-medium">{highlightMatch(zone, q)}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{zoneLocationCount(zone)}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {!coverage ? (
              <p className="text-sm text-slate-400">Select a region to see its coverage.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${ZONE_GROUP_STYLES[zoneGroup(selectedZone)]?.dot ?? 'bg-slate-300'}`} />
                    <h4 className="text-base font-semibold text-slate-900">{selectedZone}</h4>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{ZONE_CLASSIFICATIONS[selectedZone]}</p>
                </div>

                {coverage.notes.map((note) => (
                  <div key={note} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                    <Icon name="flag" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}

                {coverage.states.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">States covered</div>
                    <div className="space-y-1.5">
                      {coverage.states.map((s) => (
                        <div key={s.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2">
                          <span className="text-sm font-medium text-slate-700">{highlightMatch(s.name, q)}</span>
                          <span className="text-[11px] text-slate-400">
                            {s.scope === 'full' ? 'All cities' : `Rest of state — excl. ${s.excludes.join(', ')}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {coverage.cities.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Named cities</div>
                    <div className="flex flex-wrap gap-1.5">
                      {coverage.cities.map((c) => (
                        <span key={c.name} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                          {highlightMatch(c.name, q)} <span className="text-slate-400">· {c.state}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {coverage.states.length === 0 && coverage.cities.length === 0 && (
                  <p className="text-sm text-slate-400">No coverage recorded for this region yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          State/city coverage only — a real pincode master isn't built yet, so search resolves to the state or city level shown here.
        </p>
      </div>
    </div>
  )
}

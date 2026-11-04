import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { RATE_CARDS } from '../data/standardRateCards.js'
import indiaShape from '../data/indiaStatePaths.json'
import { STATE_NAMES, citiesOfState, groupRegionByState, regionSummary, pincodeCount, buildStandardRegionsFromSheet } from '../data/geoMaster.js'
import { freshRegionId } from '../data/regionMapping.js'

// "Start from Standard Regions" flow, mirroring production FLOW:
//   Review region mapping  ->  Region Mapping editor  ->  Set rates
// The client's regions start as a copy of the 13 standard regions built from
// the Geography sheet (see data/geoMaster.js) and are edited per client.

const PAGE = 12
const codeOf = (r) => r.code ?? r.name.toUpperCase().replace(/\s+/g, '')

export function Shell({ children, wide, onClose, title }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft ${wide}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function StateMap({ groups }) {
  const full = new Set(groups.filter((g) => g.entire).map((g) => g.state))
  const part = new Set(groups.filter((g) => !g.entire).map((g) => g.state))
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <svg viewBox={indiaShape.viewBox} className="h-auto w-full" role="img" aria-label="India map">
        {indiaShape.paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            strokeWidth="0.6"
            className={full.has(p.name) ? 'fill-brand-orange stroke-white' : part.has(p.name) ? 'fill-orange-200 stroke-white' : 'fill-slate-100 stroke-slate-200'}
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-orange" />
          Entire state
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-200" />
          Partly
        </span>
      </div>
    </div>
  )
}

function NoEditDialog({ onEditRegions, onUseRateCard, onClose }) {
  const card = RATE_CARDS.find((c) => c.code === 'LTS001') ?? RATE_CARDS[0]
  const all = card.grid.flat()
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
          <Icon name="close" className="h-4 w-4" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600">
          <Icon name="info" className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">You haven't changed any regions</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">These are still the 13 standard regions. For these, a ready-made rate card is the quickest way to price them.</p>

        <div className="mt-4 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-brand-orange-dark">Recommended</span>
          <span className="mt-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{card.name}</span>
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 ring-1 ring-slate-200">{card.code}</span>
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {card.note} · 13 regions · ₹{Math.min(...all)}–₹{Math.max(...all)}/kg
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onEditRegions} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Edit regions
          </button>
          <button type="button" onClick={onUseRateCard} className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark">
            Choose a rate card
          </button>
        </div>
      </div>
    </div>
  )
}

// Same regions as the standard 13? (names + every state/city), ignoring ids.
const regionSignature = (regs) => regs.map((r) => `${r.name}::${r.cities.map((c) => `${c.state}|${c.city}`).sort().join(',')}`).sort().join(';')
let STANDARD_SIGNATURE = null
const matchesStandard = (regs) => {
  if (!STANDARD_SIGNATURE) STANDARD_SIGNATURE = regionSignature(buildStandardRegionsFromSheet(() => 'x'))
  return regionSignature(regs) === STANDARD_SIGNATURE
}

// Edit (or add) one state's coverage in a region, production style: pick the
// State/UT, then City = All / Only / All Except with a search and checklist.
// Changes apply to the region live. A city lives in one region only, so
// including a city here moves it out of whichever region held it.
function StateEditor({ region, regions, setRegions, existingState, onDone }) {
  const isNew = !existingState
  const [stateName, setStateName] = useState(existingState ?? '')
  const names = (st) => citiesOfState(st).map((c) => c.name)
  const [mode, setMode] = useState(() => {
    if (!existingState) return 'only'
    const mine = region.cities.filter((c) => c.state === existingState).length
    return mine >= citiesOfState(existingState).length ? 'all' : 'only'
  })
  const [picked, setPicked] = useState(() => (existingState && mode !== 'all' ? new Set(region.cities.filter((c) => c.state === existingState).map((c) => c.city)) : new Set()))
  const [q, setQ] = useState('')

  const covered = (st, m, set) => (m === 'all' ? names(st) : m === 'only' ? [...set] : names(st).filter((n) => !set.has(n)))
  function apply(st, list) {
    const cov = new Set(list)
    setRegions((rows) =>
      rows.map((r) => {
        const rest = r.cities.filter((c) => c.state !== st)
        if (r.id === region.id) return { ...r, cities: [...rest, ...list.map((city) => ({ state: st, city }))] }
        return { ...r, cities: r.cities.filter((c) => !(c.state === st && cov.has(c.city))) }
      }),
    )
  }
  function changeState(next) {
    if (stateName) apply(stateName, [])
    setStateName(next)
    setMode('only')
    setPicked(new Set())
    setQ('')
  }
  function changeMode(next) {
    if (next === mode || !stateName) return
    const all = names(stateName)
    let nextPicked = new Set()
    if (mode === 'all') nextPicked = next === 'only' ? new Set(all) : new Set()
    else if (next === 'all') nextPicked = new Set()
    else nextPicked = new Set(all.filter((n) => !picked.has(n))) // only <-> except keeps the same coverage
    setMode(next)
    setPicked(nextPicked)
    apply(stateName, covered(stateName, next, nextPicked))
  }
  function toggle(city) {
    const next = new Set(picked)
    if (next.has(city)) next.delete(city)
    else next.add(city)
    setPicked(next)
    apply(stateName, covered(stateName, mode, next))
  }
  function clearPicks() {
    setPicked(new Set())
    apply(stateName, covered(stateName, mode, new Set()))
  }

  const usedStates = new Set(region.cities.map((c) => c.state))
  const states = STATE_NAMES.filter((st) => st === stateName || !usedStates.has(st))
  const owner = new Map()
  regions.forEach((r) => {
    if (r.id !== region.id) r.cities.forEach((c) => owner.set(`${c.state}|${c.city}`, r.name))
  })
  const query = q.trim().toLowerCase()
  const list = stateName ? names(stateName).filter((n) => !query || n.toLowerCase().includes(query)) : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500">State/UT</span>
      <select
        value={stateName}
        disabled={!isNew}
        onChange={(e) => changeState(e.target.value)}
        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:bg-slate-50"
      >
        {isNew && <option value="">Select a state…</option>}
        {states.map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </select>

      {stateName && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">City</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              {[
                ['all', 'All'],
                ['only', 'Only'],
                ['except', 'All Except'],
              ].map(([k, label]) => (
                <button key={k} type="button" onClick={() => changeMode(k)} className={`rounded-md px-3 py-1 transition-colors ${mode === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'all' ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Every city in {stateName} is part of this region.</p>
          ) : (
            <>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 py-1">
                {list.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">No city matches.</p>}
                {list.map((n) => {
                  const other = owner.get(`${stateName}|${n}`)
                  return (
                    <label key={n} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50">
                      <input type="checkbox" checked={picked.has(n)} onChange={() => toggle(n)} className="h-4 w-4 rounded accent-brand-orange" />
                      <span className="flex-1 truncate">{n}</span>
                      {other && mode === 'only' && !picked.has(n) && <span className="shrink-0 text-[11px] text-slate-400">in {other}</span>}
                    </label>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{mode === 'only' ? 'Ticked cities are in this region.' : 'Ticked cities are left out.'}</span>
                {picked.size > 0 && (
                  <button type="button" onClick={clearPicks} className="text-xs font-semibold text-brand-orange-dark hover:underline">
                    Clear ({picked.size})
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onDone} className="rounded-lg bg-brand-orange px-3.5 py-1.5 text-xs font-medium text-white hover:bg-brand-orange-dark">
          Done
        </button>
      </div>
    </div>
  )
}

export function RegionMappingModal({ name, regions, setRegions, onCancel, onSave, readOnly = false, error = '' }) {
  const [selectedId, setSelectedId] = useState(regions[0]?.id ?? null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null) // state name being edited, or '__new__'
  const [pickState, setPickState] = useState('')

  const owner = useMemo(() => {
    const m = new Map()
    regions.forEach((r) => r.cities.forEach((c) => m.set(`${c.state}|${c.city}`, r.id)))
    return m
  }, [regions])

  const query = q.trim().toLowerCase()
  const filtered = regions.filter((r) => !query || r.name.toLowerCase().includes(query) || r.cities.some((c) => c.state.toLowerCase().includes(query) || c.city.toLowerCase().includes(query)))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const region = regions.find((r) => r.id === selectedId) ?? regions[0]
  const groups = region ? groupRegionByState(region.cities) : []

  function patch(id, fn) {
    setRegions((rows) => rows.map((r) => (r.id === id ? fn(r) : r)))
  }
  function rename(v) {
    patch(region.id, (r) => ({ ...r, name: v }))
  }
  function removeState(state) {
    patch(region.id, (r) => ({ ...r, cities: r.cities.filter((c) => c.state !== state) }))
  }
  // A city sits in one region only — ticking it here pulls it out of any other.
  function toggleCity(state, city) {
    setRegions((rows) =>
      rows.map((r) => {
        const has = r.cities.some((c) => c.state === state && c.city === city)
        if (r.id === region.id) return has ? { ...r, cities: r.cities.filter((c) => !(c.state === state && c.city === city)) } : { ...r, cities: [...r.cities, { state, city }] }
        return has ? { ...r, cities: r.cities.filter((c) => !(c.state === state && c.city === city)) } : r
      }),
    )
  }
  function setAllCities(state, on) {
    setRegions((rows) =>
      rows.map((r) => {
        const rest = r.cities.filter((c) => c.state !== state)
        if (r.id === region.id) return { ...r, cities: on ? [...rest, ...citiesOfState(state).map((c) => ({ state, city: c.name }))] : rest }
        return on ? { ...r, cities: rest } : r
      }),
    )
  }
  function createRegion() {
    const id = freshRegionId()
    setRegions((rows) => [...rows, { id, name: `Region ${rows.length + 1}`, code: undefined, cities: [] }])
    setSelectedId(id)
    setQ('')
    setPage(Math.floor(regions.length / PAGE))
  }
  function deleteRegion() {
    setRegions((rows) => rows.filter((r) => r.id !== region.id))
    setSelectedId(null)
  }

  const editingState = editing && editing !== '__new__' ? editing : editing === '__new__' ? pickState : ''
  const editCities = editingState ? citiesOfState(editingState) : []

  return (
    <Shell wide="max-w-6xl" title={`Region Mapping · ${name}`} onClose={onCancel}>
      {readOnly && (
        <p className="border-b border-amber-100 bg-amber-50 px-6 py-2.5 text-xs text-amber-800">
          {name} uses the Location Master region mapping, so it can't be edited here. Edit it in Master Module → Region Mapping.
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        {/* left: region list */}
        <div className="flex w-72 shrink-0 flex-col border-r border-slate-100 p-4">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(0)
              }}
              placeholder="Search state or city…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {shown.map((r) => {
              const active = r.id === region?.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id)
                    setEditing(null)
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left ${active ? 'bg-brand-orange/10' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${active ? 'text-brand-orange-dark' : 'text-slate-800'}`}>{r.name || 'Untitled'}</span>
                    <span className="text-[11px] tabular-nums text-slate-400">{groupRegionByState(r.cities).length}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {codeOf(r)} · {r.cities.length} cities
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>
              {filtered.length === 0 ? 0 : page * PAGE + 1}-{Math.min(filtered.length, page * PAGE + PAGE)} of {filtered.length}
            </span>
            <span className="flex items-center gap-3">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">
                Prev
              </button>
              <span>
                {page + 1}/{pages}
              </span>
              <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="font-medium text-slate-600 disabled:opacity-40">
                Next
              </button>
            </span>
          </div>
          {!readOnly && <button type="button" onClick={createRegion} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark">
            <Icon name="plus" className="h-4 w-4" />
            Create New Region
          </button>}
        </div>

        {/* middle: region detail */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {!region ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon name="plus" className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-800">No regions yet</p>
              <p className="mt-1 max-w-xs text-xs text-slate-500">Create your first region, then add the states and cities it covers.</p>
              {!readOnly && (
                <button type="button" onClick={createRegion} className="mt-4 rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark">
                  Create first region
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-orange" />
                {readOnly ? <span className="text-base font-semibold text-slate-900">{region.name}</span> : <input value={region.name} onChange={(e) => rename(e.target.value)} className="w-56 rounded-lg border border-slate-200 px-3 py-1.5 text-base font-medium text-slate-900 focus:outline focus:outline-2 focus:outline-brand-orange/40" />}
                {!readOnly && <button type="button" onClick={deleteRegion} title="Delete region" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                  <Icon name="trash" className="h-4 w-4" />
                </button>}
              </div>
              <p className="mt-2 text-xs font-medium text-violet-600">{regionSummary(region.cities) || 'No states or cities yet'}</p>
              <p className="mt-1 text-[11px] text-slate-400">{pincodeCount(region.cities).toLocaleString('en-IN')} pincodes</p>

              <div className="mt-4 space-y-3">
                {groups.map((g) =>
                  editing === g.state ? null : (
                    <div key={g.state} className="rounded-xl border border-slate-200 border-l-[3px] border-l-brand-orange px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{g.state}</p>
                        {!readOnly && <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setEditing(g.state)} title="Edit cities" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => removeState(g.state)} title="Remove state" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {g.entire ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Entire state</span>
                        ) : (
                          <>
                            <span className="text-xs text-slate-400">Only</span>
                            {g.cities.slice(0, 12).map((c) => (
                              <span key={c} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                {c}
                              </span>
                            ))}
                            {g.cities.length > 12 && <span className="text-xs text-slate-400">+{g.cities.length - 12} more</span>}
                          </>
                        )}
                      </div>
                    </div>
                  ),
                )}

                {editing && (
                  <StateEditor key={`${region.id}-${editing}`} region={region} regions={regions} setRegions={setRegions} existingState={editing === '__new__' ? null : editing} onDone={() => setEditing(null)} />
                )}

                {!editing && !readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing('__new__')
                      setPickState('')
                    }}
                    className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Add State
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* right: map */}
        <div className="hidden w-80 shrink-0 p-5 lg:block">
          <StateMap groups={groups} />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5">
        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : <p className="text-xs text-slate-400">State/city coverage — pincodes resolve from mapped cities.</p>}
        <div className="flex items-center gap-2">
          {readOnly ? (
            <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Close
            </button>
          ) : (
            <>
              <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={onSave} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark">
                Save
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}

function RatesModal({ regions, overrides, setOverrides, defaultRate, setDefaultRate, onViewMapping, onCancel, onSave }) {
  const [hover, setHover] = useState(null) // [oi, di]
  const key = (o, d) => `${o}|${d}`
  const dflt = Number(defaultRate) > 0 ? Number(defaultRate) : null
  const total = regions.length * regions.length
  const edited = Object.keys(overrides).length
  const priced = dflt !== null ? total : edited
  const canSave = priced > 0

  function setCell(o, d, raw) {
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return
    setOverrides((prev) => {
      const next = { ...prev }
      if (raw === '' || (dflt !== null && raw !== '.' && !raw.endsWith('.') && Number(raw) === dflt)) delete next[key(o, d)]
      else next[key(o, d)] = raw
      return next
    })
  }
  function move(oi, di, e) {
    const el = e.target
    let to = null
    if (e.key === 'ArrowDown' || e.key === 'Enter') to = [oi + 1, di]
    else if (e.key === 'ArrowUp') to = [oi - 1, di]
    else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length) to = [oi, di + 1]
    else if (e.key === 'ArrowLeft' && el.selectionStart === 0) to = [oi, di - 1]
    if (to) {
      const next = document.getElementById(`rt-${to[0]}-${to[1]}`)
      if (next) {
        e.preventDefault()
        next.focus()
      }
    }
  }
  const lane = hover ? { from: regions[hover[0]], to: regions[hover[1]], v: overrides[key(regions[hover[0]].id, regions[hover[1]].id)] } : null

  return (
    <Shell wide="max-w-5xl" title="Set rates" onClose={onCancel}>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Rate for all cells</span>
            <span className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-28 rounded-xl border border-slate-200 py-2 pl-7 pr-10 text-sm tabular-nums focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">/kg</span>
            </span>
          </div>
          <button type="button" onClick={onViewMapping} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Icon name="search" className="h-3.5 w-3.5" />
            View region mapping
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" />
            Same as the rate for all cells
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-brand-orange bg-brand-orange/10" />
            Changed by you
          </span>
        </div>

        <div className="mt-2 flex min-h-[28px] items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
          {lane ? (
            <span className="text-slate-700">
              <span className="font-semibold">{lane.from.name}</span> → <span className="font-semibold">{lane.to.name}</span> ·{' '}
              {lane.v !== undefined && lane.v !== '' ? <>₹{lane.v}/kg <span className="ml-1 text-brand-orange-dark">changed</span></> : dflt !== null ? `₹${dflt}/kg` : <span className="text-slate-400">no price yet</span>}
            </span>
          ) : (
            <span className="text-slate-400">Enter a rate to fill every cell, then change any cell that differs. Rows are origin, columns are destination · ₹/kg.</span>
          )}
          <span className="shrink-0 text-slate-500">
            {priced} of {total} priced
            {edited > 0 && (
              <>
                {' '}
                · {edited} changed ·{' '}
                <button type="button" onClick={() => setOverrides({})} className="font-semibold text-brand-orange-dark hover:underline">
                  Reset
                </button>
              </>
            )}
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed border-collapse text-xs" onMouseLeave={() => setHover(null)}>
            <colgroup>
              <col style={{ width: 100 }} />
              {regions.map((r) => (
                <col key={r.id} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-slate-400">From ↓ To →</th>
                {regions.map((r, di) => (
                  <th key={r.id} title={r.name} className={`overflow-hidden px-0.5 py-1.5 text-center text-[10px] font-semibold leading-tight ${hover?.[1] === di ? 'text-brand-orange-dark' : 'text-slate-500'}`}>
                    {r.name.replace(/ (\d)$/, '\n$1').split('\n').map((t, i) => (
                      <span key={i} className="block truncate">
                        {t}
                      </span>
                    ))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regions.map((o, oi) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <th className={`truncate whitespace-nowrap px-3 py-0 text-left text-xs font-semibold ${hover?.[0] === oi ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-50 text-slate-700'}`} title={o.name}>
                    {o.name}
                  </th>
                  {regions.map((d, di) => {
                    const v = overrides[key(o.id, d.id)]
                    const has = v !== undefined && v !== ''
                    return (
                      <td key={d.id} className="p-[2px]" onMouseEnter={() => setHover([oi, di])}>
                        <input
                          id={`rt-${oi}-${di}`}
                          type="text"
                          inputMode="decimal"
                          value={has ? v : dflt !== null ? String(dflt) : ''}
                          placeholder="—"
                          onFocus={(e) => {
                            e.target.select()
                            setHover([oi, di])
                          }}
                          onChange={(e) => setCell(o.id, d.id, e.target.value)}
                          onKeyDown={(e) => move(oi, di, e)}
                          className={`h-8 w-full rounded-md text-center text-xs tabular-nums placeholder:text-slate-300 focus:outline focus:outline-2 focus:outline-brand-orange ${
                            has ? 'border border-brand-orange bg-brand-orange/10 font-semibold text-brand-orange-dark' : dflt !== null ? 'border border-slate-300 bg-white text-slate-800' : 'border border-dashed border-slate-200 bg-slate-50/60 text-slate-700'
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-3">
        <span className="text-xs text-slate-400">{canSave ? '' : 'Enter a rate for all cells or at least one price to save.'}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={!canSave} onClick={onSave} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50">
            Save pricing
          </button>
        </div>
      </div>
    </Shell>
  )
}

// step: '' | 'map' | 'noedit' | 'rates'
// Start with Standard Regions lands straight on the Region Mapping editor.
// Saving blocks empty regions; unchanged standard regions are pointed to the
// LT standard rate card instead; anything edited goes on to Set rates.
export default function ClientRegionFlow({ step, setStep, name, regions, setRegions, overrides, setOverrides, defaultRate, setDefaultRate, onSavePricing, onUseRateCard }) {
  const [snapshot, setSnapshot] = useState(null)
  const [from, setFrom] = useState('first')
  const [attempted, setAttempted] = useState(false)
  useEffect(() => {
    if (!step) {
      setFrom('first')
      setSnapshot(null)
      setAttempted(false)
    }
  }, [step])
  if (!step) return null
  const close = () => setStep('')
  const emptyNames = regions.filter((r) => r.cities.length === 0).map((r) => r.name || 'Untitled region')
  const blankName = regions.some((r) => !r.name.trim())
  const dupNames = regions.map((r) => r.name.trim().toLowerCase()).filter((n, i, a) => n && a.indexOf(n) !== i)
  const mapError = !attempted
    ? ''
    : regions.length === 0
      ? 'Create at least one region.'
      : blankName
        ? 'Every region needs a name.'
        : dupNames.length > 0
          ? 'Two regions share the same name. Give each region its own name.'
          : emptyNames.length > 0
            ? `${emptyNames.join(', ')} ${emptyNames.length > 1 ? 'have' : 'has'} no states or cities. Add coverage or delete ${emptyNames.length > 1 ? 'them' : 'it'}.`
            : ''

  if (step === 'map')
    return (
      <RegionMappingModal
        name={name}
        regions={regions}
        setRegions={setRegions}
        error={mapError}
        onCancel={() => {
          if (from === 'rates' && snapshot) {
            setRegions(snapshot)
            setAttempted(false)
            setStep('rates')
          } else close()
        }}
        onSave={() => {
          setAttempted(true)
          if (regions.length === 0 || blankName || dupNames.length > 0 || emptyNames.length > 0) return
          setAttempted(false)
          setStep(matchesStandard(regions) ? 'noedit' : 'rates')
        }}
      />
    )
  if (step === 'noedit')
    return <NoEditDialog onClose={close} onEditRegions={() => setStep('map')} onUseRateCard={onUseRateCard} />
  return (
    <RatesModal
      regions={regions}
      overrides={overrides}
      setOverrides={setOverrides}
      defaultRate={defaultRate}
      setDefaultRate={setDefaultRate}
      onViewMapping={() => {
        setSnapshot(JSON.parse(JSON.stringify(regions)))
        setFrom('rates')
        setStep('map')
      }}
      onCancel={close}
      onSave={() => {
        onSavePricing()
        close()
      }}
    />
  )
}

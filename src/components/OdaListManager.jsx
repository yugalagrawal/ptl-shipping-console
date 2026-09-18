import { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { ODA_PINCODE_DIRECTORY } from '../data/odaPincodes.js'
import { INDIAN_STATES, lookupPincode } from '../data/geo.js'

let odaRowSeq = 1

function odaGroupKey(city, state) {
  return `${city}|${state}`
}

function cityStateForPincode(pincode) {
  for (const [state, cities] of Object.entries(ODA_PINCODE_DIRECTORY)) {
    for (const [city, pins] of Object.entries(cities)) {
      if (pins.includes(pincode)) return { city, state }
    }
  }
  return { city: '', state: '' }
}

// Self-contained ODA (Out of Delivery Area) list widget — a compact summary
// card plus two modals (view/edit the list, and a picker to add more
// pincodes). Used two ways: per-client in the New Client wizard's Pricing
// step (`entries`/`onEntriesChange` etc. wired to that client's own local
// state), and as the shared "Default ODA List" in Client Pricing
// Configuration > Additional Charges (wired to the module-level default in
// data/odaPincodes.js — see that file's getDefaultOdaEntries/setters).
// Either way this component only ever reads/writes through the callbacks;
// it has no opinion on where the data actually lives.
export default function OdaListManager({ title = 'Client ODA List', entries, onEntriesChange, rate, onRateChange, overrides, onOverridesChange }) {
  const [showListModal, setShowListModal] = useState(false)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [listExpandedStates, setListExpandedStates] = useState(() => new Set())
  const [openPincodeGroup, setOpenPincodeGroup] = useState(null)
  const [overrideEditingKey, setOverrideEditingKey] = useState(null)
  const [overrideDraft, setOverrideDraft] = useState({ perKg: '', perAwb: '' })

  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerSelected, setPickerSelected] = useState(() => new Set())
  const [pickerExpandedStates, setPickerExpandedStates] = useState(() => new Set())
  const [pickerExpandedCities, setPickerExpandedCities] = useState(() => new Set())
  const [quickPincode, setQuickPincode] = useState('')
  const [quickLookup, setQuickLookup] = useState(null) // null | 'loading' | 'not-found' | { city, state }
  const [quickManualCity, setQuickManualCity] = useState('')
  const [quickManualState, setQuickManualState] = useState('')

  function setEntries(updater) {
    onEntriesChange(updater)
  }
  function setRate(field, value) {
    onRateChange((prev) => ({ ...prev, [field]: Math.max(0, Number(value) || 0) }))
  }

  // Grouped by city/state for display — one row per city, collapsed into a
  // single "All pincodes" chip once every pincode in that city is picked.
  const groups = useMemo(() => {
    const byCity = new Map()
    entries.forEach((row) => {
      const key = odaGroupKey(row.city, row.state)
      if (!byCity.has(key)) byCity.set(key, { city: row.city, state: row.state, rows: [] })
      byCity.get(key).rows.push(row)
    })
    return [...byCity.values()].map((group) => {
      const cityTotal = ODA_PINCODE_DIRECTORY[group.state]?.[group.city]?.length ?? 0
      const override = overrides[odaGroupKey(group.city, group.state)]
      return { ...group, allSelected: cityTotal > 0 && group.rows.length === cityTotal, pricing: override ?? rate, hasOverride: Boolean(override) }
    })
  }, [entries, overrides, rate])

  const listQuery = listSearch.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!listQuery) return groups
    return groups.filter((g) => g.city.toLowerCase().includes(listQuery) || g.state.toLowerCase().includes(listQuery))
  }, [groups, listQuery])

  // State/UT > City hierarchy — a flat list of 100+ areas is hard to
  // navigate, so it's grouped and collapsed by state.
  const groupsByState = useMemo(() => {
    const byState = new Map()
    filteredGroups.forEach((g) => {
      if (!byState.has(g.state)) byState.set(g.state, [])
      byState.get(g.state).push(g)
    })
    return [...byState.entries()]
      .map(([state, stateGroups]) => ({ state, groups: stateGroups, pincodeCount: stateGroups.reduce((n, g) => n + g.rows.length, 0) }))
      .sort((a, b) => a.state.localeCompare(b.state))
  }, [filteredGroups])

  function toggleListExpandedState(state) {
    setListExpandedStates((prev) => {
      const next = new Set(prev)
      next.has(state) ? next.delete(state) : next.add(state)
      return next
    })
  }

  function removeEntry(id) {
    setEntries((rows) => rows.filter((r) => r.id !== id))
  }
  function removeGroup(group) {
    setEntries((rows) => rows.filter((r) => !group.rows.some((gr) => gr.id === r.id)))
  }

  function startOverride(group) {
    setOverrideEditingKey(odaGroupKey(group.city, group.state))
    setOverrideDraft({ perKg: group.pricing.perKg, perAwb: group.pricing.perAwb })
  }
  function cancelOverride() {
    setOverrideEditingKey(null)
  }
  function saveOverride(city, state) {
    const key = odaGroupKey(city, state)
    onOverridesChange((prev) => ({
      ...prev,
      [key]: { perKg: Math.max(0, Number(overrideDraft.perKg) || 0), perAwb: Math.max(0, Number(overrideDraft.perAwb) || 0) },
    }))
    setOverrideEditingKey(null)
  }
  function clearOverride(city, state) {
    const key = odaGroupKey(city, state)
    onOverridesChange((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function openListModal() {
    if (entries.length === 0) {
      openPicker()
      return
    }
    setListSearch('')
    setListExpandedStates(new Set())
    setOverrideEditingKey(null)
    setShowListModal(true)
  }

  function openPicker() {
    setPickerSelected(new Set(entries.map((r) => r.pincode).filter(Boolean)))
    setPickerQuery('')
    setPickerExpandedStates(new Set())
    setPickerExpandedCities(new Set())
    setQuickPincode('')
    setQuickLookup(null)
    setQuickManualCity('')
    setQuickManualState('')
    setShowListModal(false)
    setShowPickerModal(true)
  }
  function closePicker() {
    setShowPickerModal(false)
    if (entries.length > 0) setShowListModal(true)
  }

  const pickerQueryLower = pickerQuery.trim().toLowerCase()
  const filteredDirectory = useMemo(() => {
    if (!pickerQueryLower) return ODA_PINCODE_DIRECTORY
    const result = {}
    for (const [state, cities] of Object.entries(ODA_PINCODE_DIRECTORY)) {
      const stateMatches = state.toLowerCase().includes(pickerQueryLower)
      const filteredCities = {}
      for (const [city, pins] of Object.entries(cities)) {
        const cityMatches = stateMatches || city.toLowerCase().includes(pickerQueryLower)
        const matchingPins = cityMatches ? pins : pins.filter((p) => p.includes(pickerQueryLower))
        if (matchingPins.length > 0) filteredCities[city] = matchingPins
      }
      if (Object.keys(filteredCities).length > 0) result[state] = filteredCities
    }
    return result
  }, [pickerQueryLower])

  function togglePickerExpandedState(state) {
    setPickerExpandedStates((prev) => {
      const next = new Set(prev)
      next.has(state) ? next.delete(state) : next.add(state)
      return next
    })
  }
  function togglePickerExpandedCity(key) {
    setPickerExpandedCities((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  function togglePickerState(state, checked) {
    const pins = Object.values(ODA_PINCODE_DIRECTORY[state]).flat()
    setPickerSelected((prev) => {
      const next = new Set(prev)
      pins.forEach((p) => (checked ? next.add(p) : next.delete(p)))
      return next
    })
  }
  function togglePickerCity(state, city, checked) {
    const pins = ODA_PINCODE_DIRECTORY[state][city]
    setPickerSelected((prev) => {
      const next = new Set(prev)
      pins.forEach((p) => (checked ? next.add(p) : next.delete(p)))
      return next
    })
  }
  function togglePickerPincode(pincode, checked) {
    setPickerSelected((prev) => {
      const next = new Set(prev)
      checked ? next.add(pincode) : next.delete(pincode)
      return next
    })
  }

  function handleQuickPincodeChange(value) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setQuickPincode(digits)
    setQuickLookup(null)
    setQuickManualCity('')
    setQuickManualState('')
    if (digits.length !== 6) return
    const fromDirectory = cityStateForPincode(digits)
    if (fromDirectory.city) {
      setQuickLookup(fromDirectory)
      return
    }
    setQuickLookup('loading')
    lookupPincode(digits).then((result) => {
      setQuickPincode((current) => {
        if (current === digits) setQuickLookup(result ?? 'not-found')
        return current
      })
    })
  }

  function addQuickPincode() {
    const digits = quickPincode
    if (digits.length !== 6) return
    const resolved = quickLookup && quickLookup !== 'loading' && quickLookup !== 'not-found' ? quickLookup : null
    const city = resolved ? resolved.city : quickManualCity.trim()
    const state = resolved ? resolved.state : quickManualState
    if (!city || !state) return
    setEntries((rows) => (rows.some((r) => r.pincode === digits) ? rows : [...rows, { id: odaRowSeq++, pincode: digits, city, state }]))
    setQuickPincode('')
    setQuickLookup(null)
    setQuickManualCity('')
    setQuickManualState('')
  }

  function applyPickerSelection() {
    setEntries((rows) => {
      const existingByPincode = new Map(rows.map((r) => [r.pincode, r]))
      return [...pickerSelected]
        .sort()
        .map((pincode) => existingByPincode.get(pincode) ?? { id: odaRowSeq++, pincode, ...cityStateForPincode(pincode) })
    })
    setShowPickerModal(false)
    setShowListModal(true)
  }

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange-dark">
            <Icon name="route" className="h-4.5 w-4.5" />
          </span>
          <div>
            <span className="text-xs font-medium text-slate-500">{title}</span>
            {entries.length === 0 ? (
              <p className="mt-0.5 text-sm text-slate-400">No ODA pincodes added yet.</p>
            ) : (
              <>
                <p className="mt-0.5 text-sm font-medium text-slate-800">Default ODA List ({entries.length} Pincodes)</p>
                <p className="text-xs text-slate-500">
                  Default rate ₹{rate.perKg}/kg or ₹{rate.perAwb}/AWB, whichever higher
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openListModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Icon name={entries.length > 0 ? 'edit' : 'plus'} className="h-3.5 w-3.5" />
          {entries.length > 0 ? 'View / Edit' : 'Add pincodes'}
        </button>
      </div>

      {showListModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {entries.length} pincode{entries.length === 1 ? '' : 's'} across {groups.length} area{groups.length === 1 ? '' : 's'}.
                </p>
              </div>
              <button type="button" onClick={() => setShowListModal(false)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Default rate for this list</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  value={rate.perKg}
                  onChange={(e) => setRate('perKg', e.target.value)}
                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
                <span>/kg or ₹</span>
                <input
                  type="number"
                  min="0"
                  value={rate.perAwb}
                  onChange={(e) => setRate('perAwb', e.target.value)}
                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
                <span>/AWB, whichever higher</span>
                <span className="text-[10px] text-slate-400">— applies to every area below unless it has its own custom rate</span>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-2.5">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search area or state…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {groupsByState.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-slate-400">No areas match "{listSearch}".</p>
              ) : (
                groupsByState.map(({ state, groups: stateGroups, pincodeCount }) => {
                  const stateExpanded = listExpandedStates.has(state) || !!listQuery
                  return (
                    <div key={state} className="border-b border-slate-100 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleListExpandedState(state)}
                        className="flex w-full items-center justify-between gap-2 px-5 py-2.5 text-left hover:bg-slate-50/70"
                      >
                        <span className="text-sm font-semibold text-slate-800">{state}</span>
                        <span className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                          {stateGroups.length} area{stateGroups.length === 1 ? '' : 's'} · {pincodeCount} pincode{pincodeCount === 1 ? '' : 's'}
                          <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 transition-transform ${stateExpanded ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {stateExpanded && (
                        <div className="divide-y divide-slate-100 bg-slate-50/40">
                          {stateGroups.map((group) => {
                            const key = odaGroupKey(group.city, group.state)
                            const dropdownOpen = openPincodeGroup === key
                            const isEditing = overrideEditingKey === key
                            return (
                              <div key={key} className="py-2.5 pl-8 pr-5">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold text-slate-700">{group.city || 'Unspecified'}</div>
                                  </div>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setOpenPincodeGroup((prev) => (prev === key ? null : key))}
                                      className={`inline-flex w-32 items-center justify-between gap-1 rounded-lg border py-1 pl-2.5 pr-1.5 text-[11px] font-medium transition-colors ${
                                        group.allSelected
                                          ? 'border-brand-orange/40 bg-brand-orange/5 text-brand-orange-dark'
                                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-brand-orange/40'
                                      }`}
                                    >
                                      {group.allSelected ? 'All pincodes' : `${group.rows.length} pincode${group.rows.length === 1 ? '' : 's'}`}
                                      <Icon
                                        name="chevron"
                                        className={`h-3 w-3 shrink-0 transition-transform ${group.allSelected ? 'text-brand-orange-dark/70' : 'text-slate-400'} ${dropdownOpen ? 'rotate-180' : ''}`}
                                      />
                                    </button>
                                    {dropdownOpen && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenPincodeGroup(null)} />
                                        <div className="absolute right-0 top-full z-20 mt-1 flex w-56 flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-soft">
                                          {group.rows.map((row) => (
                                            <span
                                              key={row.id}
                                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 py-1 pl-2.5 pr-1.5 text-[11px] font-medium tabular-nums text-slate-600"
                                            >
                                              {row.pincode}
                                              <button
                                                type="button"
                                                onClick={() => removeEntry(row.id)}
                                                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                              >
                                                <Icon name="close" className="h-3 w-3" />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {!isEditing ? (
                                    <div className="flex shrink-0 items-center gap-2 text-[11px]">
                                      {group.hasOverride ? (
                                        <span className="whitespace-nowrap rounded-full bg-brand-orange/10 px-2 py-1 font-medium text-brand-orange-dark">
                                          ₹{group.pricing.perKg}/kg or ₹{group.pricing.perAwb}/AWB
                                        </span>
                                      ) : (
                                        <span className="whitespace-nowrap text-slate-400">Default rate</span>
                                      )}
                                      <button type="button" onClick={() => startOverride(group)} className="whitespace-nowrap font-medium text-slate-500 hover:text-slate-700">
                                        {group.hasOverride ? 'Edit' : 'Set custom rate'}
                                      </button>
                                      {group.hasOverride && (
                                        <button
                                          type="button"
                                          onClick={() => clearOverride(group.city, group.state)}
                                          className="whitespace-nowrap font-medium text-rose-600 hover:underline"
                                        >
                                          Reset
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                                      <span>₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={overrideDraft.perKg}
                                        onChange={(e) => setOverrideDraft((d) => ({ ...d, perKg: e.target.value }))}
                                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                                      />
                                      <span>/kg or ₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={overrideDraft.perAwb}
                                        onChange={(e) => setOverrideDraft((d) => ({ ...d, perAwb: e.target.value }))}
                                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                                      />
                                      <span>/AWB</span>
                                      <button
                                        type="button"
                                        onClick={() => saveOverride(group.city, group.state)}
                                        className="rounded-lg bg-brand-orange px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-orange-dark"
                                      >
                                        Save
                                      </button>
                                      <button type="button" onClick={cancelOverride} className="text-[11px] font-medium text-slate-500 hover:text-slate-700">
                                        Cancel
                                      </button>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => removeGroup(group)}
                                    title="Remove this area"
                                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                                  >
                                    <Icon name="close" className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
              <button type="button" onClick={openPicker} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-orange-dark hover:underline">
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add more pincodes
              </button>
              <button
                type="button"
                onClick={() => setShowListModal(false)}
                className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showPickerModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Select ODA Pincodes</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">Pick by State/UT, City, or pincode — checking a State or City selects everything under it.</p>
              </div>
              <button type="button" onClick={closePicker} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Add by pincode</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={quickPincode}
                  onChange={(e) => handleQuickPincodeChange(e.target.value)}
                  placeholder="6-digit pincode"
                  className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs tabular-nums text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
                {quickPincode.length === 6 && quickLookup === 'loading' && <span className="text-xs text-slate-400">Looking up…</span>}
                {quickPincode.length === 6 && quickLookup && quickLookup !== 'loading' && quickLookup !== 'not-found' && (
                  <span className="text-xs text-slate-500">
                    → {quickLookup.city}, {quickLookup.state}
                  </span>
                )}
                {quickPincode.length === 6 && quickLookup === 'not-found' && (
                  <>
                    <span className="text-xs text-rose-500">Not found —</span>
                    <input
                      type="text"
                      value={quickManualCity}
                      onChange={(e) => setQuickManualCity(e.target.value)}
                      placeholder="City"
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                    <select
                      value={quickManualState}
                      onChange={(e) => setQuickManualState(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                    >
                      <option value="">State…</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <button
                  type="button"
                  onClick={addQuickPincode}
                  disabled={
                    quickPincode.length !== 6 ||
                    !quickLookup ||
                    quickLookup === 'loading' ||
                    (quickLookup === 'not-found' && (!quickManualCity.trim() || !quickManualState))
                  }
                  className="rounded-lg bg-brand-orange px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Or browse by State/UT · City</p>
              <div className="relative w-full">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search state, city or pincode…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {Object.keys(filteredDirectory).length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">No state, city or pincode matching "{pickerQuery}".</p>
              ) : (
                Object.entries(filteredDirectory).map(([state, cities]) => {
                  const statePins = Object.values(cities).flat()
                  const stateChecked = statePins.length > 0 && statePins.every((p) => pickerSelected.has(p))
                  const stateIndeterminate = !stateChecked && statePins.some((p) => pickerSelected.has(p))
                  const stateExpanded = pickerExpandedStates.has(state) || !!pickerQueryLower
                  return (
                    <div key={state} className="border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={stateChecked}
                          ref={(el) => el && (el.indeterminate = stateIndeterminate)}
                          onChange={(e) => togglePickerState(state, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                        />
                        <button
                          type="button"
                          onClick={() => togglePickerExpandedState(state)}
                          className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-semibold text-slate-800"
                        >
                          {state}
                          <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${stateExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {stateExpanded && (
                        <div className="space-y-0.5 pb-2">
                          {Object.entries(cities).map(([city, pins]) => {
                            const cityKey = `${state}|${city}`
                            const cityChecked = pins.every((p) => pickerSelected.has(p))
                            const cityIndeterminate = !cityChecked && pins.some((p) => pickerSelected.has(p))
                            const cityExpanded = pickerExpandedCities.has(cityKey) || !!pickerQueryLower
                            return (
                              <div key={city} className="pl-6">
                                <div className="flex items-center gap-2 py-1.5 pr-4">
                                  <input
                                    type="checkbox"
                                    checked={cityChecked}
                                    ref={(el) => el && (el.indeterminate = cityIndeterminate)}
                                    onChange={(e) => togglePickerCity(state, city, e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => togglePickerExpandedCity(cityKey)}
                                    className="flex flex-1 items-center justify-between gap-2 text-left text-xs font-medium text-slate-600"
                                  >
                                    <span>
                                      {city} <span className="text-slate-400">({pins.length})</span>
                                    </span>
                                    <Icon name="chevron" className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${cityExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                                {cityExpanded && (
                                  <div className="flex flex-wrap gap-1.5 py-1 pl-6 pr-4 pb-2.5">
                                    {pins.map((pin) => (
                                      <label
                                        key={pin}
                                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium tabular-nums transition-colors ${
                                          pickerSelected.has(pin)
                                            ? 'border-brand-orange/40 bg-brand-orange/5 text-brand-orange-dark'
                                            : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-brand-orange/40'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={pickerSelected.has(pin)}
                                          onChange={(e) => togglePickerPincode(pin, e.target.checked)}
                                          className="sr-only"
                                        />
                                        {pin}
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
              <span className="text-xs text-slate-500">
                {pickerSelected.size} pincode{pickerSelected.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closePicker} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyPickerSelection}
                  className="rounded-xl bg-brand-orange px-3.5 py-2 text-xs font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

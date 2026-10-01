import { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import MultiSelect from './MultiSelect.jsx'
import { PINCODES } from '../data/geography.js'
import { coverageStats, emptyCoverageRow, emptyServiceability, summarizeRow } from '../data/hubServiceability.js'

function uniqSorted(values) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))
}

export function Stat({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2">
      <span className="text-lg font-semibold text-slate-900">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  )
}

// One State/UT's row, expanded for editing — City / Pincode / Locality are
// each a multi-select dropdown (search + Select all) scoped to whatever the
// step before it resolved to. Picking every option stores the level as
// "all"; anything less is stored as an Include list. (A seeded "Exclude"
// row shows as its complement here and becomes an Include once edited.)
// `stateOptions` already excludes every OTHER row's State, so the same
// State can't be mapped twice. `cityOnly` hides Pincode/Locality.
const resolveSel = (mode, list, options) => (mode === 'all' ? options : mode === 'include' ? list : options.filter((o) => !list.includes(o)))
const toLevel = (picked, options) => (options.length > 0 && options.every((o) => picked.includes(o)) && picked.length === options.length ? ['all', []] : ['include', picked])

export function RowEditor({ row, onChange, stateOptions, cityOnly }) {
  const cityOptions = row.state ? uniqSorted(PINCODES.filter((r) => r.state === row.state).map((r) => r.city)) : []
  const cityScope = resolveSel(row.cityMode, row.cities, cityOptions)
  const pincodeOptions = row.state ? uniqSorted(PINCODES.filter((r) => r.state === row.state && cityScope.includes(r.city)).map((r) => r.pincode)) : []
  const pincodeScope = resolveSel(row.pincodeMode, row.pincodes, pincodeOptions)
  const localityOptions = row.state ? uniqSorted(PINCODES.filter((r) => r.state === row.state && cityScope.includes(r.city) && pincodeScope.includes(r.pincode)).map((r) => r.locality)) : []
  const localityScope = resolveSel(row.localityMode, row.localities, localityOptions)

  const allDown = { pincodeMode: 'all', pincodes: [], localityMode: 'all', localities: [] }
  const localityDown = { localityMode: 'all', localities: [] }

  const setCities = (picked) => { const [m, l] = toLevel(picked, cityOptions); onChange({ ...row, cityMode: m, cities: l, ...allDown }) }
  const setPincodes = (picked) => { const [m, l] = toLevel(picked, pincodeOptions); onChange({ ...row, pincodeMode: m, pincodes: l, ...localityDown }) }
  const setLocalities = (picked) => { const [m, l] = toLevel(picked, localityOptions); onChange({ ...row, localityMode: m, localities: l }) }

  const lbl = 'mb-1 block text-[11px] font-medium text-slate-500'
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-dashed border-slate-200 p-3.5 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className={lbl}>State/UT</span>
        <select
          value={row.state}
          onChange={(e) => onChange({ ...row, state: e.target.value, cityMode: 'all', cities: [], ...allDown })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          <option value="">Select state…</option>
          {stateOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <div className={cityOnly ? 'sm:col-span-2' : ''}>
        <span className={lbl}>City</span>
        <MultiSelect options={cityOptions} selected={cityScope} onChange={setCities} disabled={!row.state} placeholder="Select cities…" noun="city" />
      </div>

      {!cityOnly && (
        <>
          <div>
            <span className={lbl}>Pincode</span>
            <MultiSelect options={pincodeOptions} selected={pincodeScope} onChange={setPincodes} disabled={!row.state} placeholder="Select pincodes…" noun="pincode" />
          </div>
          <div className="sm:col-span-2">
            <span className={lbl}>Locality</span>
            <MultiSelect options={localityOptions} selected={localityScope} onChange={setLocalities} disabled={!row.state} placeholder="Select localities…" noun="locality" />
          </div>
        </>
      )}
    </div>
  )
}

// Collapsed one-line reading of a row: State, then City/Pincode/Locality
// each as a short "All ___" / "Only N ___" / "Exclude N ___" phrase — the
// same wording an Excel filter uses, so it reads as a plain sentence
// rather than a coded summary.
export function RowSummary({ row }) {
  const { cityPart, pincodePart, localityPart } = summarizeRow(row)
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-slate-800">{row.state || 'Untitled'}</div>
      <div className="truncate text-xs text-slate-500">{cityPart} · {pincodePart} · {localityPart}</div>
    </div>
  )
}

// Where a Hub or Mini Hub actually operates — one row per State/UT (see
// hubServiceability.js), each with its own City/Pincode/Locality
// All/Include/Exclude scope. `+ Add State` appends a row already open for
// editing; an existing row collapses to RowSummary until its pencil is
// clicked. Reused as-is from both Location Master's own Add/Edit row and
// Logistics Ladder's Edit Location row modal (see `codeForRow` in
// LogisticsMaster.jsx, the shared key both pages open this by). `readOnly`
// just hides every editing control, leaving the plain summary + stats.
export default function HubServiceabilityModal({ label, coverage, onSave, onClose, readOnly }) {
  const [rows, setRows] = useState((coverage ?? emptyServiceability()).rows)
  const [editingId, setEditingId] = useState(null)

  const usedStates = new Set(rows.filter((r) => r.id !== editingId).map((r) => r.state).filter(Boolean))
  const stateOptions = uniqSorted(PINCODES.map((r) => r.state)).filter((s) => !usedStates.has(s))
  const stats = useMemo(() => coverageStats({ rows }, PINCODES), [rows])

  function addRow() {
    const row = emptyCoverageRow()
    setRows((prev) => [...prev, row])
    setEditingId(row.id)
  }
  function updateRow(id, next) {
    setRows((prev) => prev.map((r) => (r.id === id ? next : r)))
  }
  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    if (editingId === id) setEditingId(null)
  }
  function done() {
    onSave({ rows: rows.filter((r) => r.state) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Serviceability</h3>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
          <button type="button" onClick={readOnly ? onClose : done} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
          <Stat label="States" value={stats.states} />
          <Stat label="Cities" value={stats.cities} />
          <Stat label="Pincodes" value={stats.pincodes} />
        </div>

        <div className="space-y-2.5 overflow-y-auto p-5">
          {rows.length === 0 && (
            <p className="text-sm text-slate-400">{readOnly ? 'No coverage mapped yet.' : 'No coverage mapped yet — add a State below.'}</p>
          )}
          {rows.map((row) =>
            editingId === row.id ? (
              <RowEditor key={row.id} row={row} onChange={(next) => updateRow(row.id, next)} stateOptions={row.state ? uniqSorted([row.state, ...stateOptions]) : stateOptions} />
            ) : (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                <RowSummary row={row} />
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-3">
                    <button type="button" onClick={() => setEditingId(row.id)} className="text-slate-400 hover:text-slate-700">
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeRow(row.id)} className="text-slate-400 hover:text-red-500">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="plus" className="h-3.5 w-3.5" /> Add State
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          {readOnly ? (
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Close</button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={done} className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

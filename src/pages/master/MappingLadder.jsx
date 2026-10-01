import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import HubServiceabilityModal from '../../components/HubServiceabilityModal.jsx'
import { card, thCls } from '../../components/ui.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { PINCODES, rangeKey } from '../../data/geography.js'
import { LOGISTICS_ROWS, REGION_COLORS } from '../../data/logistics.js'
import { exportCSV, exportPDF } from '../../utils/exportTable.js'
// Reuse Geography Master's / Location Master's own column definitions —
// same cascading dropdowns, same search-or-create comboboxes, same
// disabled/locked-field rules — instead of a second, plainer edit form.
// `findConflict` is Location Master's Zone/Hub/Mini Hub contradiction
// check, `codeForRow`/`labelForRow` its Serviceability key (see
// LogisticsMaster.jsx) — all reused as-is.
import { COLUMN_DEFS as GEO_COLUMN_DEFS } from './GeographyMaster.jsx'
import { COLUMN_DEFS as LOG_COLUMN_DEFS, codeForRow, findConflict, isServiceable, labelForRow } from './LogisticsMaster.jsx'
import { defaultServiceability, hasCoverage as coverageIsSet } from '../../data/hubServiceability.js'

// Logistics Ladder — a single search box over BOTH Masters (Geography:
// State/UT > District > City > Pincode > Locality, cross-linked to
// Territory/Circle — and Location: Region > Zone(Hub) > Branch > Mini
// Hub), showing the full ladder either side resolves to. The two Masters
// have no explicit foreign key between them in this data model — the only
// real link is a City name also being a Hub or Mini Hub name (see
// `linkedLogRows`/`linkedGeoRows` below) — so a search on one side
// cross-links to the other via that shared City name wherever it exists.
//
// Editable via `mapping-ladder.manage` (Super Admin only, same gating as
// Geography/Location Master's own `.manage`): a pencil next to any
// resolved row opens a small form to fix that one row in place. Like
// every other Master in this prototype there's no backend — edits here
// live in this page's own local copies of PINCODES/LOGISTICS_ROWS for the
// session, they don't write back into Geography Master's or Location
// Master's own separate copies (each holds its own local state — see
// their files). Good enough to demo "edit from the ladder" without a
// shared store wiring project of its own.

const GEO_TYPES = ['State/UT', 'District', 'City', 'Pincode', 'Locality', 'Territory', 'Circle']
const LOG_TYPES = ['Region', 'Zone', 'Branch', 'Mini Hub']

// A handful of real, stable sample values (see geography.js/logistics.js)
// — quick-start chips on the empty-state landing so it's obvious what a
// search here actually looks like, without a wall of instruction text.
const EXAMPLE_NODES = [
  { type: 'City', value: 'Lucknow' },
  { type: 'Region', value: 'North 2' },
  { type: 'Pincode', value: '226001' },
  { type: 'State/UT', value: 'Assam' },
]

function uniqSorted(values) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))
}

function buildNodes(geoRows, logRows) {
  const nodes = []
  uniqSorted(geoRows.map((r) => r.state)).forEach((v) => nodes.push({ type: 'State/UT', value: v }))
  uniqSorted(geoRows.map((r) => r.district)).forEach((v) => nodes.push({ type: 'District', value: v }))
  uniqSorted(geoRows.map((r) => r.city)).forEach((v) => nodes.push({ type: 'City', value: v }))
  uniqSorted(geoRows.map((r) => r.pincode)).forEach((v) => nodes.push({ type: 'Pincode', value: v }))
  uniqSorted(geoRows.map((r) => r.locality)).forEach((v) => nodes.push({ type: 'Locality', value: v }))
  uniqSorted(geoRows.map((r) => r.territory)).forEach((v) => nodes.push({ type: 'Territory', value: v }))
  uniqSorted(geoRows.map((r) => r.circle)).forEach((v) => nodes.push({ type: 'Circle', value: v }))
  uniqSorted(logRows.map((r) => r.region)).forEach((v) => nodes.push({ type: 'Region', value: v }))
  uniqSorted(logRows.map((r) => r.zone)).forEach((v) => nodes.push({ type: 'Zone', value: v }))
  uniqSorted(logRows.map((r) => r.branch)).forEach((v) => nodes.push({ type: 'Branch', value: v }))
  uniqSorted(logRows.map((r) => r.miniHub)).forEach((v) => nodes.push({ type: 'Mini Hub', value: v }))
  return nodes
}

function linkedLogRows(logRows, cities) {
  const set = new Set(cities)
  return logRows.filter((r) => set.has(r.hubName) || (r.miniHub && set.has(r.miniHub)))
}
function linkedGeoRows(geoRows, cities) {
  const set = new Set(cities)
  return geoRows.filter((r) => set.has(r.city))
}

function resolveNode(node, geoRows, logRows) {
  if (!node) return { geoMatches: [], logMatches: [] }
  const { type, value } = node
  let geoMatches = []
  let logMatches = []
  if (GEO_TYPES.includes(type)) {
    const key = { 'State/UT': 'state', District: 'district', City: 'city', Pincode: 'pincode', Locality: 'locality', Territory: 'territory', Circle: 'circle' }[type]
    geoMatches = geoRows.filter((r) => r[key] === value)
    logMatches = linkedLogRows(logRows, geoMatches.map((r) => r.city))
  } else {
    const key = { Region: 'region', Zone: 'zone', Branch: 'branch', 'Mini Hub': 'miniHub' }[type]
    logMatches = logRows.filter((r) => r[key] === value)
    geoMatches = linkedGeoRows(geoRows, logMatches.flatMap((r) => [r.hubName, r.miniHub]))
  }
  return { geoMatches, logMatches }
}

// Portaled search-select, deliberately WITHOUT a "create new" fallback
// (unlike Combobox.jsx) — Logistics Ladder only ever looks up something
// that already exists on the sheet, it never creates a node.
function NodeSearch({ nodes, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const q = query.trim().toLowerCase()
  const filtered = q ? nodes.filter((n) => n.value.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)).slice(0, 40) : nodes.slice(0, 40)

  useEffect(() => {
    if (!open) return
    function place() {
      const r = inputRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 6, left: r.left, width: r.width })
    }
    place()
    function onDocPointerDown(e) {
      if (panelRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  return (
    <div className="relative w-full max-w-2xl">
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search a State, City, Pincode, Region, Zone or Hub…"
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          className="fixed z-50 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {filtered.length === 0 && <div className="px-4 py-3 text-slate-400">No matches.</div>}
          {filtered.map((n) => (
            <button
              key={`${n.type}|${n.value}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(n); setQuery(''); setOpen(false) }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
            >
              <span className="truncate">{n.value}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${GEO_TYPES.includes(n.type) ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-violet-100 text-violet-700'}`}>{n.type}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2">
      <span className="text-lg font-semibold text-slate-900">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  )
}

function Ladder({ steps }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <Icon name="chevron" className="h-3.5 w-3.5 shrink-0 -rotate-90 text-slate-300" />}
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{s}</span>
        </span>
      ))}
    </div>
  )
}

// Same field-by-field form Geography Master / Location Master use inline
// in their own sheet (`col.formField(value, onChange, rows)` per column —
// see COLUMN_DEFS in those files), just stacked vertically in a modal
// instead of laid out as a table row. `rows` is passed through so the
// cascading dropdowns (District needs a State, City needs a District,
// Zone/Hub needs a Region…) and the search-or-create comboboxes see the
// same options they would inline. The `[&_select]:w-full [&_input]:w-full`
// wrapper stretches those originally table-cell-sized inputs to fill the
// modal instead of sitting at their narrow inline width.
// `onServiceability`, when passed (only from the Location edit — Geography
// rows have no Hub/Mini Hub to attach Serviceability to), adds a building
// icon in the footer that opens Serviceability for the row being edited,
// same modal Location Master's own Add/Edit row opens (see `codeForRow` in
// LogisticsMaster.jsx, the shared key both pages use).
function EditModal({ title, columns, value, onChange, onSave, onCancel, rows, saveDisabled, conflict, onServiceability, needsCoverage }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
          {columns.map((col) => (
            <label key={col.key} className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">{col.label}</span>
              <div className="[&_input]:w-full [&_select]:w-full">{col.formField(value, onChange, rows)}</div>
            </label>
          ))}
        </div>
        {conflict && (
          <p className="border-t border-red-100 bg-red-50/60 px-5 py-2.5 text-xs font-medium text-red-600">{conflict}</p>
        )}
        {!conflict && needsCoverage && (
          <p className="border-t border-red-100 bg-red-50/60 px-5 py-2.5 text-xs font-medium text-red-600">
            Add at least one Serviceability area (the building icon below) before saving.
          </p>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          {onServiceability && (
            <button
              type="button"
              onClick={() => onServiceability(value)}
              disabled={!codeForRow(value) || !isServiceable(value, rows)}
              title={!isServiceable(value, rows) ? 'Serviceability is set on this Hub\'s Mini Hubs' : codeForRow(value) ? 'Serviceability' : 'Fill in the Hub/Mini Hub code first'}
              className={`mr-auto rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 ${needsCoverage ? 'border-red-200 text-red-500' : 'border-slate-200 text-slate-500'}`}
            >
              <Icon name="building" className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={onCancel} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

const GEO_SHEET_COLUMNS = [
  { label: 'State/UT', value: (r) => r.state }, { label: 'District', value: (r) => r.district }, { label: 'City', value: (r) => r.city },
  { label: 'Pincode', value: (r) => r.pincode }, { label: 'Locality', value: (r) => r.locality }, { label: 'Range (Pincode-Locality)', value: (r) => rangeKey(r) },
  { label: 'Territory', value: (r) => r.territory }, { label: 'Circle', value: (r) => r.circle },
]
const LOG_SHEET_COLUMNS = [
  { label: 'Region', value: (r) => r.region }, { label: 'Zone', value: (r) => r.zone },
  { label: 'Hub', value: (r) => (r.hubCode ? `${r.hubName} (${r.hubCode})` : r.hubName) },
  { label: 'Branch', value: (r) => r.branch || '—' },
  { label: 'Mini Hub', value: (r) => (r.miniHub ? (r.miniHubCode ? `${r.miniHub} (${r.miniHubCode})` : r.miniHub) : '—') },
]

// Sheet + export view over whatever rows are currently resolved — same
// CSV / print-to-PDF export every other Master's sheet uses (see
// utils/exportTable.js), just scoped to this one search result instead of
// the whole directory. `onEdit` (only passed when `mapping-ladder.manage`
// is held) adds a trailing edit column, same pencil as the row list below
// — opens EditModal on top of this sheet, which stays open underneath so
// the table reflects the change the moment it's saved. `onServiceability`
// (Location sheet only) adds a second leading column, open to everyone.
function SheetModal({ title, columns, rows, onClose, onEdit, onServiceability }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{title} ({rows.length})</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCSV(title.toLowerCase().replace(/\s+/g, '-'), columns, rows)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="download" className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => exportPDF(title, columns, rows)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="file" className="h-3.5 w-3.5" /> PDF
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {onServiceability && <th className={`${thCls} sticky left-0 z-10 bg-white`}></th>}
                {onEdit && <th className={`${thCls} sticky ${onServiceability ? 'left-16' : 'left-0'} z-10 bg-white`}></th>}
                {columns.map((c) => (
                  <th key={c.label} className={thCls}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (onEdit ? 1 : 0) + (onServiceability ? 1 : 0)} className="px-6 py-10 text-center text-sm text-slate-400">No rows.</td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {onServiceability && (
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-6 py-2.5 text-sm">
                      <button type="button" onClick={() => onServiceability(r)} title="Serviceability" className="text-slate-400 hover:text-slate-700">
                        <Icon name="building" className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                  {onEdit && (
                    <td className={`sticky ${onServiceability ? 'left-16' : 'left-0'} z-10 whitespace-nowrap bg-white px-6 py-2.5 text-sm`}>
                      <button type="button" onClick={() => onEdit(r)} className="text-slate-400 hover:text-slate-700">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.label} className="whitespace-nowrap px-6 py-2.5 text-sm text-slate-600">{c.value(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function MappingLadder() {
  const { hasFunction } = useAuth()
  const canManage = hasFunction('mapping-ladder.manage')

  // Session-local working copies — see the file-header comment on why
  // these don't sync with Geography Master's / Location Master's own
  // separate local state.
  const [geoRows, setGeoRows] = useState(PINCODES)
  const [logRows, setLogRows] = useState(LOGISTICS_ROWS)
  const [selected, setSelected] = useState(null)
  const [editingGeoIdx, setEditingGeoIdx] = useState(null)
  const [editGeoDraft, setEditGeoDraft] = useState(null)
  const [editingLogIdx, setEditingLogIdx] = useState(null)
  const [editLogDraft, setEditLogDraft] = useState(null)
  const [showGeoSheet, setShowGeoSheet] = useState(false)
  const [showLogSheet, setShowLogSheet] = useState(false)

  // Own session-local Serviceability copy, same reasoning as geoRows/
  // logRows above — keyed identically to Location Master's own (Hub/Mini
  // Hub code, via codeForRow) so the two would agree if this page ever did
  // share a store, they just don't share the value yet.
  const [serviceability, setServiceability] = useState(defaultServiceability)
  const [servicing, setServicing] = useState(null) // { code, label }
  function openServiceability(row) {
    const code = codeForRow(row)
    if (!code) return
    setServicing({ code, label: labelForRow(row) })
  }

  const nodes = useMemo(() => buildNodes(geoRows, logRows), [geoRows, logRows])
  const { geoMatches, logMatches } = useMemo(() => resolveNode(selected, geoRows, logRows), [selected, geoRows, logRows])

  const stats = useMemo(() => {
    const states = new Set(geoMatches.map((r) => r.state))
    const districts = new Set(geoMatches.map((r) => `${r.state}|${r.district}`))
    const cities = new Set(geoMatches.map((r) => `${r.state}|${r.district}|${r.city}`))
    const regions = new Set(logMatches.map((r) => r.region))
    const zones = new Set(logMatches.map((r) => r.zone))
    const branches = new Set(logMatches.filter((r) => r.branch).map((r) => `${r.zone}|${r.branch}`))
    const miniHubs = logMatches.filter((r) => r.miniHub).length
    return { states: states.size, districts: districts.size, cities: cities.size, pincodes: geoMatches.length, regions: regions.size, zones: zones.size, branches: branches.size, miniHubs }
  }, [geoMatches, logMatches])

  function startEditGeo(row) {
    setEditingGeoIdx(geoRows.indexOf(row))
    setEditGeoDraft(row)
  }
  function saveEditGeo() {
    setGeoRows((prev) => prev.map((r, i) => (i === editingGeoIdx ? editGeoDraft : r)))
    setEditingGeoIdx(null)
  }
  function startEditLog(row) {
    setEditingLogIdx(logRows.indexOf(row))
    setEditLogDraft(row)
  }
  // Same Zone/Hub/Mini Hub contradiction check Location Master's own Add/
  // Edit row runs (see findConflict in LogisticsMaster.jsx) — blocks Save
  // here too, not just there.
  const logEditConflict = useMemo(
    () => (editingLogIdx !== null ? findConflict(editLogDraft, logRows, editingLogIdx) : null),
    [editingLogIdx, editLogDraft, logRows]
  )
  function saveEditLog() {
    setLogRows((prev) => prev.map((r, i) => (i === editingLogIdx ? editLogDraft : r)))
    setEditingLogIdx(null)
  }

  const geoLadderSteps = useMemo(() => {
    if (!selected || geoMatches.length === 0) return null
    const states = uniqSorted(geoMatches.map((r) => r.state))
    const districts = uniqSorted(geoMatches.map((r) => r.district))
    const cities = uniqSorted(geoMatches.map((r) => r.city))
    const steps = [states.length === 1 ? states[0] : `${states.length} States/UT`]
    steps.push(districts.length === 1 ? districts[0] : `${districts.length} Districts`)
    steps.push(cities.length === 1 ? cities[0] : `${cities.length} Cities`)
    steps.push(`${geoMatches.length} Pincode${geoMatches.length !== 1 ? 's' : ''}`)
    return steps
  }, [selected, geoMatches])

  const logLadderSteps = useMemo(() => {
    if (!selected || logMatches.length === 0) return null
    const regions = uniqSorted(logMatches.map((r) => r.region))
    const zones = uniqSorted(logMatches.map((r) => r.zone))
    const branches = uniqSorted(logMatches.filter((r) => r.branch).map((r) => r.branch))
    const miniHubs = logMatches.filter((r) => r.miniHub).length
    const steps = [regions.length === 1 ? regions[0] : `${regions.length} Regions`]
    steps.push(zones.length === 1 ? `${zones[0]} (${logMatches[0]?.hubName})` : `${zones.length} Zones / Hubs`)
    steps.push(branches.length ? (branches.length === 1 ? branches[0] : `${branches.length} Branches`) : 'No branches')
    steps.push(`${miniHubs} Mini Hub${miniHubs !== 1 ? 's' : ''}`)
    return steps
  }, [selected, logMatches])

  if (!selected) {
    // Google-style landing: nothing to show yet, so the search box IS the
    // page — centered, generous whitespace, a few real example chips for
    // discoverability instead of a wall of instruction text. Switches to
    // the ordinary top-anchored layout below the moment something's
    // selected, since a results page needs the full width/height.
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10">
          <Icon name="search" className="h-7 w-7 text-brand-orange" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Logistics Ladder</h1>
        <p className="mt-2 text-sm text-slate-500 whitespace-nowrap">Search any State, City, Region or Hub and see its full mapping.{!canManage && ' Read-only.'}</p>
        <div className="mt-7 flex w-full flex-col items-center">
          <NodeSearch nodes={nodes} onSelect={setSelected} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-400">Try:</span>
          {EXAMPLE_NODES.map((n) => (
            <button
              key={`${n.type}|${n.value}`}
              type="button"
              onClick={() => setSelected(n)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:border-brand-orange/40 hover:text-brand-orange-dark"
            >
              {n.value}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Logistics Ladder</h1>
          <p className="mt-1 text-sm text-slate-500 whitespace-nowrap">Search any State, City, Region or Hub and see its full mapping.{!canManage && ' Read-only.'}</p>
        </div>
      </div>

      <NodeSearch nodes={nodes} onSelect={setSelected} />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${GEO_TYPES.includes(selected.type) ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-violet-100 text-violet-700'}`}>{selected.type}</span>
            <span className="text-lg font-semibold text-slate-900">{selected.value}</span>
          </div>

          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            <Stat label="States/UT" value={stats.states} />
            <Stat label="Districts" value={stats.districts} />
            <Stat label="Cities" value={stats.cities} />
            <Stat label="Pincodes" value={stats.pincodes} />
            <Stat label="Regions" value={stats.regions} />
            <Stat label="Zones / Hubs" value={stats.zones} />
            <Stat label="Branches" value={stats.branches} />
            <Stat label="Mini Hubs" value={stats.miniHubs} />
          </div>

          <div className={`space-y-4 p-4 ${card}`}>
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Geography — State/UT → District → City → Pincode</div>
              {geoLadderSteps ? <Ladder steps={geoLadderSteps} /> : <p className="text-sm text-slate-400">No Geography rows found for this selection.</p>}
            </div>
            <div className="h-px bg-slate-100" />
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Location — Region → Zone (Hub) → Branch → Mini Hub</div>
              {logLadderSteps ? <Ladder steps={logLadderSteps} /> : <p className="text-sm text-slate-400">No Location rows found — no Hub/Mini Hub shares a City name with this selection.</p>}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`overflow-hidden ${card}`}>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">Geography rows ({geoMatches.length})</span>
                <button type="button" onClick={() => setShowGeoSheet(true)} title="Open as sheet" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Icon name="grid" className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {geoMatches.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">None.</p>}
                {geoMatches.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-sm first:border-t-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">{r.city}, {r.district}, {r.state}</div>
                      <div className="truncate text-xs text-slate-500">{rangeKey(r)} · {r.territory} · {r.circle}</div>
                    </div>
                    {canManage && (
                      <button type="button" onClick={() => startEditGeo(r)} className="shrink-0 text-slate-400 hover:text-slate-700">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`overflow-hidden ${card}`}>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">Location rows ({logMatches.length})</span>
                <button type="button" onClick={() => setShowLogSheet(true)} title="Open as sheet" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Icon name="grid" className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {logMatches.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">None.</p>}
                {logMatches.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-sm first:border-t-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: REGION_COLORS[r.region] }} />
                        {r.zone} · {r.hubName} ({r.hubCode})
                      </div>
                      <div className="truncate text-xs text-slate-500">{r.region}{r.branch ? ` · ${r.branch}` : ''}{r.miniHub ? ` · ${r.miniHub} (${r.miniHubCode})` : ''}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button type="button" onClick={() => openServiceability(r)} title="Serviceability" className="text-slate-400 hover:text-slate-700">
                        <Icon name="building" className="h-4 w-4" />
                      </button>
                      {canManage && (
                        <button type="button" onClick={() => startEditLog(r)} className="text-slate-400 hover:text-slate-700">
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      {/* Rendered before the Edit modals below so, when both are open at
          once (edit triggered from inside a sheet), the Edit modal — later
          in the DOM — paints on top at the same z-index. */}
      {showGeoSheet && (
        <SheetModal title="Geography rows" columns={GEO_SHEET_COLUMNS} rows={geoMatches} onClose={() => setShowGeoSheet(false)} onEdit={canManage ? startEditGeo : undefined} />
      )}
      {showLogSheet && (
        <SheetModal title="Location rows" columns={LOG_SHEET_COLUMNS} rows={logMatches} onClose={() => setShowLogSheet(false)} onEdit={canManage ? startEditLog : undefined} onServiceability={openServiceability} />
      )}

      {editingGeoIdx !== null && (
        <EditModal
          title="Edit Geography row"
          columns={GEO_COLUMN_DEFS}
          rows={geoRows}
          value={editGeoDraft}
          onChange={setEditGeoDraft}
          onSave={saveEditGeo}
          onCancel={() => setEditingGeoIdx(null)}
          saveDisabled={!editGeoDraft.state || !editGeoDraft.district || !editGeoDraft.city || !editGeoDraft.pincode}
        />
      )}
      {editingLogIdx !== null && (
        <EditModal
          title="Edit Location row"
          columns={LOG_COLUMN_DEFS}
          rows={logRows}
          value={editLogDraft}
          onChange={setEditLogDraft}
          onSave={saveEditLog}
          onCancel={() => setEditingLogIdx(null)}
          saveDisabled={!editLogDraft.region || !editLogDraft.zone || !editLogDraft.hubName || !editLogDraft.hubCode || !!logEditConflict || (isServiceable(editLogDraft, logRows) && !coverageIsSet(serviceability[codeForRow(editLogDraft)]))}
          conflict={logEditConflict}
          onServiceability={openServiceability}
          needsCoverage={!!codeForRow(editLogDraft) && isServiceable(editLogDraft, logRows) && !coverageIsSet(serviceability[codeForRow(editLogDraft)])}
        />
      )}

      {servicing && (
        <HubServiceabilityModal
          label={servicing.label}
          coverage={serviceability[servicing.code]}
          onSave={(coverage) => setServiceability((prev) => ({ ...prev, [servicing.code]: coverage }))}
          onClose={() => setServicing(null)}
          readOnly={!canManage}
        />
      )}
    </div>
  )
}

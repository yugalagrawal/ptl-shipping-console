import { cloneElement, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import IndiaMap from '../../components/IndiaMap.jsx'
import Combobox from '../../components/Combobox.jsx'
import HubServiceabilityModal from '../../components/HubServiceabilityModal.jsx'
import RegionMappingModal from '../../components/RegionMappingModal.jsx'
import { defaultRegionMapping } from '../../data/locationRegionMapping.js'
import { CheckboxFilter, ColumnFilterButton, TextFilter } from '../../components/ColumnFilter.jsx'
import Pagination, { usePagination } from '../../components/Pagination.jsx'
import { card, thCls } from '../../components/ui.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { LOGISTICS_ROWS, REGIONS, REGION_COLORS, ZONES, regroupZones, zonesInRegion } from '../../data/logistics.js'
import { defaultServiceability, hasCoverage as coverageIsSet } from '../../data/hubServiceability.js'
import { exportCSV, exportPDF } from '../../utils/exportTable.js'

export const BLANK_ROW = { region: '', zone: '', hubName: '', hubCode: '', branch: '', miniHub: '', miniHubCode: '' }

// A row's Serviceability lives on whichever real, geocoded entity it
// actually is: its own Mini Hub if it has one, otherwise the Hub itself —
// never the Zone name, since a Zone's several Mini Hubs (see Haridwar/
// Lucknow in logistics.js) can each cover a different area under the same
// Hub. Exported so Logistics Ladder's own Edit Location modal opens
// Serviceability for the exact same key instead of a second scheme.
export function codeForRow(row) {
  return row.miniHub ? row.miniHubCode : row.hubCode
}
export function labelForRow(row) {
  return row.miniHub ? `${row.miniHub} (${row.miniHubCode}) · Mini Hub of ${row.hubName}` : `${row.hubName} (${row.hubCode}) · Mini Hub (same as Hub)`
}

// Serviceability is defined at Mini Hub level only. A Hub that has no Mini
// Hubs under it is itself a Mini Hub — same name, same code — so it gets
// the serviceability; a Hub that DOES have Mini Hubs doesn't (its Mini Hubs
// carry it). These two helpers are the single source of that rule.
export function hubCodesWithMiniHubs(rows) {
  return new Set(rows.filter((r) => r.miniHub).map((r) => r.hubCode))
}
export function isServiceable(row, rows) {
  return !!row.miniHub || !hubCodesWithMiniHubs(rows).has(row.hubCode)
}

const inputCls = 'rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40'

// Whether `zone` is already a real Zone somewhere (the canonical ZONES
// table, or a live row) — drives whether picking it should lock Hub
// Name/Code (an existing Zone's Hub is fixed) or leave them open to fill
// in (a brand-new Zone needs a Hub too).
function zoneExists(rows, zone) {
  return ZONES.some((z) => z.zone === zone) || rows.some((r) => r.zone === zone)
}

// Only Region is a strict, closed dropdown — the fixed 13-item
// Confluence-defined list, never free-typed (same role State plays in
// Geography Master). Zone, Hub, Branch and Mini Hub are all
// search-or-create comboboxes (see Combobox.jsx): pick something already
// on the sheet, or type a new one — nothing here blocks on a value that
// doesn't exist yet. What DOES block Save is a real contradiction in the
// hierarchy — see `findConflict` below: a Zone claimed by two Regions, a
// Hub code reused under a different Zone, or a Mini Hub reused under a
// different Branch. Hub Name/Code lock (read-only) once an EXISTING Zone
// is picked, since a Zone maps to exactly one Hub — they only open up for
// a brand-new Zone, which needs a Hub of its own.
// Exported (with `findConflict` below) so Logistics Ladder's edit form
// reuses the exact same dropdown/combobox renderers and contradiction
// checks instead of a second, plainer copy.
export const COLUMN_DEFS = [
  {
    key: 'region', label: 'Region', filterType: 'set',
    cell: (r) => (
      <td className="whitespace-nowrap px-6 py-2.5 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: REGION_COLORS[r.region] }} />
          {r.region}
        </span>
      </td>
    ),
    formField: (value, onChange) => (
      <select
        value={value.region}
        onChange={(e) => onChange({ ...value, region: e.target.value, zone: '' })}
        className={`w-32 ${inputCls}`}
      >
        <option value="">Select region…</option>
        {REGIONS.map((r) => (
          <option key={r.name} value={r.name}>{r.name}</option>
        ))}
      </select>
    ),
  },
  {
    key: 'zone', label: 'Zone', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm font-medium text-slate-800">{r.zone}</td>,
    formField: (value, onChange, rows) => {
      if (!value.region) {
        return <select disabled className={`w-40 ${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}><option>Select a region first</option></select>
      }
      const options = [...new Set([...zonesInRegion(value.region), ...rows.filter((r) => r.region === value.region).map((r) => r.zone)])].sort((a, b) => a.localeCompare(b))
      return (
        <Combobox
          value={value.zone}
          options={options}
          onChange={(zone) => {
            const canonical = ZONES.find((z) => z.zone === zone) || rows.find((r) => r.zone === zone)
            onChange({ ...value, zone, hubName: canonical?.hubName ?? value.hubName, hubCode: canonical?.hubCode ?? value.hubCode })
          }}
          placeholder="Search or create zone…"
          width="w-40"
        />
      )
    },
  },
  {
    // Hub Code isn't a separate column — it's shown alongside the Hub Name
    // itself ("Hyderabad (HYDT1)"), same for Mini Hub below. The two values
    // still live on the row and are still independently editable in the
    // Add/Edit form, just not given their own sheet column.
    key: 'hubName', label: 'Hub', filterType: 'text',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-600">{r.hubName}{r.hubCode ? <span className="text-slate-400"> ({r.hubCode})</span> : null}</td>,
    formField: (value, onChange, rows) => {
      const isNewZone = value.zone && !zoneExists(rows, value.zone)
      if (!isNewZone) {
        return (
          <div className="flex gap-1">
            <input value={value.hubName} disabled placeholder="Hub name" className={`w-28 ${inputCls} disabled:bg-slate-50 disabled:text-slate-400`} />
            <input value={value.hubCode} disabled placeholder="Code" className={`w-20 ${inputCls} disabled:bg-slate-50 disabled:text-slate-400`} />
          </div>
        )
      }
      const hubNames = [...new Set(rows.map((r) => r.hubName).filter(Boolean))]
      const hubCodes = [...new Set(rows.map((r) => r.hubCode).filter(Boolean))]
      return (
        <div className="flex gap-1">
          <Combobox value={value.hubName} options={hubNames} onChange={(v) => onChange({ ...value, hubName: v })} placeholder="Hub name" width="w-28" />
          <Combobox value={value.hubCode} options={hubCodes} onChange={(v) => onChange({ ...value, hubCode: v })} placeholder="Code" width="w-20" />
        </div>
      )
    },
  },
  {
    key: 'branch', label: 'Branch', filterType: 'text',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-500">{r.branch || '—'}</td>,
    formField: (value, onChange, rows) => {
      const options = value.zone ? [...new Set(rows.filter((r) => r.zone === value.zone && r.branch).map((r) => r.branch))] : []
      return <Combobox value={value.branch} options={options} onChange={(v) => onChange({ ...value, branch: v })} placeholder="Branch (optional)" />
    },
  },
  {
    key: 'miniHub', label: 'Mini Hub', filterType: 'text',
    cell: (r) => (
      <td className="px-6 py-2.5 text-sm text-slate-600">
        {r.miniHub ? <>{r.miniHub}{r.miniHubCode ? <span className="text-slate-400"> ({r.miniHubCode})</span> : null}</> : '—'}
      </td>
    ),
    formField: (value, onChange, rows) => {
      const miniHubNames = [...new Set(rows.map((r) => r.miniHub).filter(Boolean))]
      const miniHubCodes = [...new Set(rows.map((r) => r.miniHubCode).filter(Boolean))]
      return (
        <div className="flex gap-1">
          <Combobox value={value.miniHub} options={miniHubNames} onChange={(v) => onChange({ ...value, miniHub: v })} placeholder="Mini hub (optional)" width="w-28" />
          <Combobox value={value.miniHubCode} options={miniHubCodes} onChange={(v) => onChange({ ...value, miniHubCode: v })} placeholder="Code" width="w-20" />
        </div>
      )
    },
  },
]

// Two ready-made "which columns matter" presets, replacing a free-form
// Select-columns checklist — each mirrors a real mapping ops actually
// reads this sheet for: Profit Centre cares about Region > Zone > Branch
// (the cost-allocation hierarchy); Location Master cares about
// Region > Hub > Mini Hub (the physical network) — plus a plain "All"
// that shows every column at once. Location Master is the default.
const COLUMN_VIEWS = {
  'location-master': { label: 'Location Master', keys: ['region', 'hubName', 'miniHub'] },
  'profit-centre': { label: 'Profit Centre', keys: ['region', 'zone', 'branch'] },
  all: { label: 'All', keys: COLUMN_DEFS.map((c) => c.key) },
}

// Map-view filter dropdowns, same "Filters" toolbar pattern as Geography
// Master's map (see MAP_FILTER_FIELDS there) — one funnel-icon dropdown
// per field that means something spatially: Region > Hub > Mini Hub.
// Zone and Branch aren't map filters — Zone is the same underlying record
// as Hub (a Zone maps to exactly one Hub), and Branch has no spatial
// encoding of its own on this map.
const MAP_FILTER_FIELDS = COLUMN_DEFS.filter((c) => ['region', 'hubName', 'miniHub'].includes(c.key))

// Contradictions the hierarchy can't allow, checked against every OTHER
// row (excludeIdx skips the row being edited so it doesn't conflict with
// its own previous values):
//  - a Zone claimed by two different Regions
//  - a Hub code reused under a different Zone
//  - a Mini Hub code reused under a different Branch/Zone (no shared
//    custody — one Mini Hub, one parent)
// Returns a human-readable message, or null when the draft is consistent.
export function findConflict(value, rows, excludeIdx) {
  const others = rows.filter((_, i) => i !== excludeIdx)
  if (value.zone) {
    const canonical = ZONES.find((z) => z.zone === value.zone)
    if (canonical && value.region && canonical.region !== value.region) {
      return `Zone "${value.zone}" already belongs to ${canonical.region} — a Zone can only belong to one Region.`
    }
    const rowConflict = others.find((r) => r.zone === value.zone && value.region && r.region !== value.region)
    if (rowConflict) return `Zone "${value.zone}" already belongs to ${rowConflict.region} — a Zone can only belong to one Region.`
  }
  if (value.hubCode) {
    const rowConflict = others.find((r) => r.hubCode === value.hubCode && r.zone !== value.zone)
    if (rowConflict) return `Hub code "${value.hubCode}" is already used by ${rowConflict.zone} — a Hub can only belong to one Zone.`
  }
  if (value.miniHubCode) {
    const rowConflict = others.find((r) => r.miniHubCode === value.miniHubCode && (r.zone !== value.zone || r.branch !== value.branch))
    if (rowConflict) return `Mini Hub "${value.miniHubCode}" already belongs to ${rowConflict.branch || rowConflict.zone} — a Mini Hub can only belong to one Branch.`
  }
  return null
}

const EMPTY_COLUMN_FILTERS = {
  region: new Set(), zone: new Set(),
  hubName: '', branch: '', miniHub: '',
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3.5 py-2">
      <span className="text-lg font-semibold text-slate-900">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  )
}

// Small trigger + dropdown shell shared by Export and Select columns —
// both live in the toolbar (never inside the scrolling table), so plain
// `absolute` positioning is fine here, unlike the per-column filters.
// Only Priya Sharma can edit Region Mapping; everyone else sees it read-only.
const REGION_MAPPING_EDITOR = 'priya.sharma@letstransport.team'

function ToolbarMenu({ icon, label, align = 'left', children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    return () => document.removeEventListener('mousedown', onDocPointerDown)
  }, [open])

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <Icon name={icon} className="h-4 w-4" /> {label}
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </span>
  )
}

// Add/Edit always works against every field, regardless of which columns
// "Select columns" currently has hidden — the sheet temporarily shows every
// column for as long as a row is being added or edited (see
// `effectiveColumns` below) so this form is just an ordinary row, one input
// per header, in the same grid as everything else. `conflict` (from
// `findConflict`) blocks Save and renders as a second row right below the
// form when the draft would contradict an existing Zone/Hub/Mini Hub.
// `onServiceability` opens that Serviceability modal for the draft's own
// Hub/Mini Hub code — greyed out until Hub Code (or Mini Hub Code) is
// actually filled in, since Serviceability is keyed off that code.
// `hasCoverage` blocks Save until at least one Serviceability rule has
// been added — a Hub/Mini Hub with nowhere it delivers to isn't a valid
// row, same spirit as `conflict` blocking a contradictory one.
function RowForm({ columns, value, onChange, onSave, onCancel, rows, conflict, onServiceability, hasCoverage }) {
  const code = codeForRow(value)
  const serviceable = isServiceable(value, rows)
  const needsCoverage = code && serviceable && !hasCoverage
  return (
    <>
      <tr className="border-t border-brand-orange/30 bg-brand-orange/5">
        {columns.map((col) => (
          <td key={col.key} className="px-3 py-1.5 align-top">{col.formField(value, onChange, rows)}</td>
        ))}
        <td className="whitespace-nowrap px-3 py-1.5 align-top">
          <button
            type="button"
            onClick={() => onServiceability(value)}
            disabled={!code || !serviceable}
            title={!serviceable ? 'Serviceability is set on this Hub\'s Mini Hubs' : code ? 'Serviceability' : 'Fill in the Hub/Mini Hub code first'}
            className={`mr-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 ${needsCoverage ? 'border-red-200 text-red-500' : 'border-slate-200 text-slate-500'}`}
          >
            <Icon name="building" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!value.region || !value.zone || !value.hubName || !value.hubCode || !!conflict || (serviceable && !hasCoverage)}
            className="mr-1.5 rounded-lg bg-brand-orange px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-orange-dark disabled:opacity-40"
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
        </td>
      </tr>
      {conflict && (
        <tr className="bg-red-50/60">
          <td colSpan={columns.length + 1} className="px-4 py-1.5 text-xs font-medium text-red-600">{conflict}</td>
        </tr>
      )}
      {!conflict && needsCoverage && (
        <tr className="bg-red-50/60">
          <td colSpan={columns.length + 1} className="px-4 py-1.5 text-xs font-medium text-red-600">
            Add at least one Serviceability area (the building icon above) before saving.
          </td>
        </tr>
      )}
    </>
  )
}

export default function LogisticsMaster() {
  const { hasFunction, user } = useAuth()
  const canManage = hasFunction('logistics-master.manage')

  const [rows, setRows] = useState(LOGISTICS_ROWS)
  const [query, setQuery] = useState('')
  const [view, setView] = useState('sheet')
  const [selectedZone, setSelectedZone] = useState(null)
  const [columnFilters, setColumnFilters] = useState(EMPTY_COLUMN_FILTERS)
  const [columnView, setColumnView] = useState('location-master')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(BLANK_ROW)
  const [editingKey, setEditingKey] = useState(null)
  const [editDraft, setEditDraft] = useState(BLANK_ROW)
  const [pendingAction, setPendingAction] = useState(null) // { type: 'delete' | 'edit', idx }

  // Serviceability coverage, keyed by Hub/Mini Hub code (see codeForRow) —
  // session-local, same "no shared store" pattern every other Master's own
  // rows/state uses. `servicing` holds whichever row's modal is currently
  // open (or null); its `code`/`label` are snapshotted at open time so
  // editing the underlying draft afterward doesn't retarget an open modal.
  const [serviceability, setServiceability] = useState(defaultServiceability)
  const [regionMapping, setRegionMapping] = useState(defaultRegionMapping)
  const [showRegionMapping, setShowRegionMapping] = useState(false)
  const [servicing, setServicing] = useState(null) // { code, label }

  function openServiceability(row) {
    const code = codeForRow(row)
    if (!code) return
    setServicing({ code, label: labelForRow(row) })
  }
  function saveServiceability(coverage) {
    setServiceability((prev) => ({ ...prev, [servicing.code]: coverage }))
  }

  const visibleColumns = useMemo(
    () => COLUMN_DEFS.filter((c) => COLUMN_VIEWS[columnView].keys.includes(c.key)),
    [columnView]
  )

  // While a row is being added or edited, the sheet temporarily shows every
  // column (not just whichever of Profit Centre / Location Master / All is
  // currently picked) so the inline form lines up under real headers
  // instead of a separate, differently-shaped mini-layout.
  const isEditingRow = adding || editingKey !== null
  const effectiveColumns = isEditingRow ? COLUMN_DEFS : visibleColumns

  const addConflict = useMemo(() => (adding ? findConflict(draft, rows, -1) : null), [adding, draft, rows])
  const editConflict = useMemo(() => (editingKey !== null ? findConflict(editDraft, rows, editingKey) : null), [editingKey, editDraft, rows])

  function toggleSetFilter(key, value) {
    setColumnFilters((prev) => {
      const next = new Set(prev[key])
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...prev, [key]: next }
    })
  }
  function clearSetFilter(key) {
    setColumnFilters((prev) => ({ ...prev, [key]: new Set() }))
  }
  function setTextFilter(key, value) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  const activeColumnFilterCount = useMemo(
    () => Object.values(columnFilters).filter((v) => (v instanceof Set ? v.size > 0 : v.trim().length > 0)).length,
    [columnFilters]
  )

  function clearAllFilters() {
    setColumnFilters(EMPTY_COLUMN_FILTERS)
    setQuery('')
  }

  // Options for each categorical filter reflect every OTHER active filter
  // (Excel-style cascading), so narrowing Region first trims what shows up
  // under Zone.
  function optionsFor(key) {
    // Region is the fixed 13-item network list from the Confluence spec —
    // shown in full even for a Region with no Zone yet (East 2, North
    // East 1, North 3, South 3, South 4 are real, deliberately zone-less
    // regions), same as Geography Master lists all 36 States regardless of
    // sample data. Zone still cascades from whatever's actually on the
    // sheet, since it has no fixed list of its own.
    if (key === 'region') return REGIONS.map((r) => r.name)
    const rest = rows.filter((r) => rowMatchesColumnFilters(r, key))
    return [...new Set(rest.map((r) => r[key]))].sort((a, b) => a.localeCompare(b))
  }

  function rowMatchesColumnFilters(r, skip) {
    if (skip !== 'region' && columnFilters.region.size && !columnFilters.region.has(r.region)) return false
    if (skip !== 'zone' && columnFilters.zone.size && !columnFilters.zone.has(r.zone)) return false
    if (skip !== 'hubName' && columnFilters.hubName && !`${r.hubName} ${r.hubCode}`.toLowerCase().includes(columnFilters.hubName.toLowerCase())) return false
    if (skip !== 'branch' && columnFilters.branch && !r.branch.toLowerCase().includes(columnFilters.branch.toLowerCase())) return false
    if (skip !== 'miniHub' && columnFilters.miniHub && !`${r.miniHub} ${r.miniHubCode}`.toLowerCase().includes(columnFilters.miniHub.toLowerCase())) return false
    return true
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => rowMatchesColumnFilters(r))
      .filter((r) => !q || [r.region, r.zone, r.hubName, r.hubCode, r.branch, r.miniHub, r.miniHubCode].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => a.region.localeCompare(b.region) || a.zone.localeCompare(b.zone) || a.branch.localeCompare(b.branch) || a.miniHub.localeCompare(b.miniHub))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columnFilters])
  const hubsWithMini = useMemo(() => hubCodesWithMiniHubs(rows), [rows])
  // A Hub with no Mini Hubs under it is its own Mini Hub (same name + code):
  // shown that way in the Mini Hub column, counts and exports.
  const showRow = (r) => (r.miniHub || hubsWithMini.has(r.hubCode) ? r : { ...r, miniHub: r.hubName, miniHubCode: r.hubCode })
  const pg = usePagination(filtered)
  useEffect(() => { pg.setPage(1) }, [query, columnFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reflects whatever the search box + column filters + region legend
  // currently narrow the sheet down to, same spirit as Geography Master.
  const stats = useMemo(() => {
    const regionsSeen = new Set(filtered.map((r) => r.region))
    const zonesSeen = new Set(filtered.map((r) => r.zone))
    const miniHubs = filtered.filter((r) => showRow(r).miniHub).length
    return { regions: regionsSeen.size, zones: zonesSeen.size, miniHubs }
  }, [filtered])

  const mapZones = useMemo(() => regroupZones(filtered), [filtered])

  function startAdd() {
    setDraft(BLANK_ROW)
    setAdding(true)
  }

  function saveAdd() {
    setRows((prev) => [...prev, draft])
    setAdding(false)
  }

  function startEdit(row, key) {
    setEditingKey(key)
    setEditDraft(row)
  }

  function requestSaveEdit(idx) {
    setPendingAction({ type: 'edit', idx })
  }

  function requestDelete(idx) {
    setPendingAction({ type: 'delete', idx })
  }

  function confirmPendingAction() {
    const { type, idx } = pendingAction
    if (type === 'edit') {
      setRows((prev) => prev.map((r, i) => (i === idx ? editDraft : r)))
      setEditingKey(null)
    } else if (type === 'delete') {
      setRows((prev) => prev.filter((_, i) => i !== idx))
    }
    setPendingAction(null)
  }

  const exportColumns = visibleColumns.map((c) => ({
    label: c.label,
    value: (r) => {
      if (c.key === 'hubName') return r.hubCode ? `${r.hubName} (${r.hubCode})` : r.hubName
      if (c.key === 'miniHub') { const d = showRow(r); return d.miniHub ? (d.miniHubCode ? `${d.miniHub} (${d.miniHubCode})` : d.miniHub) : '' }
      return r[c.key]
    },
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Location Master</h1>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Stat label="Region" value={stats.regions} />
            <Stat label="Hub" value={stats.zones} />
            <Stat label="Mini Hub" value={stats.miniHubs} />
          </div>
          <span className="text-[11px] text-slate-400">Current stats based on the search &amp; filters you've selected</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-2xl flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search region, zone, hub, branch, mini hub…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
        </div>
        {(activeColumnFilterCount > 0 || query.trim()) && (
          <button type="button" onClick={clearAllFilters} className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600">
            Clear {activeColumnFilterCount > 0 ? `${activeColumnFilterCount} filter${activeColumnFilterCount > 1 ? 's' : ''}` : 'search'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">View</span>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            <button type="button" onClick={() => setView('sheet')} className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${view === 'sheet' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon name="grid" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" /> Sheet
            </button>
            <button type="button" onClick={() => setView('map')} className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${view === 'map' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon name="route" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" /> Map
            </button>
          </div>
        </div>

        <span className="hidden h-6 w-px bg-slate-200 sm:block" />

        {view === 'sheet' && (
          <ToolbarMenu icon="columns" label={`Select columns: ${COLUMN_VIEWS[columnView].label}`}>
            {(close) => (
              <div className="p-1">
                {Object.entries(COLUMN_VIEWS).map(([key, v]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setColumnView(key); close() }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${columnView === key ? 'bg-brand-orange/10 font-medium text-brand-orange-dark' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {v.label}
                    {columnView === key && <Icon name="approve" className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </ToolbarMenu>
        )}
        {view === 'map' && MAP_FILTER_FIELDS.map((col) => {
          const label = col.filterType === 'set' && columnFilters[col.key].size ? `${col.label} (${columnFilters[col.key].size})` : col.label
          return (
            <ToolbarMenu key={col.key} icon="filter" label={label}>
              {() => (
                <div className="p-1">
                  {col.filterType === 'set' ? (
                    <CheckboxFilter options={optionsFor(col.key)} selected={columnFilters[col.key]} onToggle={(v) => toggleSetFilter(col.key, v)} onClear={() => clearSetFilter(col.key)} />
                  ) : (
                    <TextFilter value={columnFilters[col.key]} onChange={(v) => setTextFilter(col.key, v)} placeholder="Contains…" />
                  )}
                </div>
              )}
            </ToolbarMenu>
          )
        })}
        <ToolbarMenu icon="download" label="Export">
          {(close) => (
            <>
              <button
                type="button"
                onClick={() => { exportCSV('location-master', exportColumns, filtered); close() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
              >
                <Icon name="grid" className="h-4 w-4 text-slate-400" /> Export as CSV
              </button>
              <button
                type="button"
                onClick={() => { exportPDF('Location Master', exportColumns, filtered); close() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
              >
                <Icon name="file" className="h-4 w-4 text-slate-400" /> Export as PDF
              </button>
            </>
          )}
        </ToolbarMenu>
        <button type="button" onClick={() => setShowRegionMapping(true)} className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ml-auto`}>
          <Icon name="route" className="h-4 w-4 text-slate-400" /> Region Mapping
        </button>
        {canManage && view === 'sheet' && (
          <button type="button" onClick={startAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark">
            <Icon name="plus" className="h-4 w-4" /> Create New Row
          </button>
        )}
      </div>

      {view === 'map' ? (
        <div className={`p-4 ${card}`}>
          <IndiaMap zones={mapZones} selectedZone={selectedZone} onSelectZone={setSelectedZone} selectedRegions={columnFilters.region} />
          <p className="mt-2 text-xs text-slate-400">
            {query.trim() || activeColumnFilterCount > 0
              ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} plotted below.`
              : `${filtered.length} Zone${filtered.length !== 1 ? 's' : ''} — search above, or filter by Region, Zone, Branch or Mini Hub, to narrow the map down.`}
          </p>
        </div>
      ) : (
        <div className={`overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {effectiveColumns.map((col) => (
                    <th key={col.key} className={thCls}>
                      {col.label}
                      {!isEditingRow && (
                        <ColumnFilterButton active={col.filterType === 'set' ? columnFilters[col.key].size > 0 : !!columnFilters[col.key]} label={col.label}>
                          {col.filterType === 'set' ? (
                            <CheckboxFilter options={optionsFor(col.key)} selected={columnFilters[col.key]} onToggle={(v) => toggleSetFilter(col.key, v)} onClear={() => clearSetFilter(col.key)} />
                          ) : (
                            <TextFilter value={columnFilters[col.key]} onChange={(v) => setTextFilter(col.key, v)} placeholder="Contains…" />
                          )}
                        </ColumnFilterButton>
                      )}
                    </th>
                  ))}
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {adding && canManage && (
                  <RowForm columns={effectiveColumns} value={draft} onChange={setDraft} onSave={saveAdd} onCancel={() => setAdding(false)} rows={rows} conflict={addConflict} onServiceability={openServiceability} hasCoverage={coverageIsSet(serviceability[codeForRow(draft)])} />
                )}
                {filtered.length === 0 && !adding && (
                  <tr>
                    <td colSpan={effectiveColumns.length + 1} className="px-6 py-10 text-center text-sm text-slate-400">No rows match the current search / filters.</td>
                  </tr>
                )}
                {pg.pageItems.map((r) => {
                  const idx = rows.indexOf(r)
                  const key = idx
                  if (editingKey === key) {
                    return <RowForm key={key} columns={effectiveColumns} value={editDraft} onChange={setEditDraft} onSave={() => requestSaveEdit(idx)} onCancel={() => setEditingKey(null)} rows={rows} conflict={editConflict} onServiceability={openServiceability} hasCoverage={coverageIsSet(serviceability[codeForRow(editDraft)])} />
                  }
                  return (
                    <tr key={key} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                      {effectiveColumns.map((col) => cloneElement(col.cell(showRow(r)), { key: col.key }))}
                      <td className="whitespace-nowrap px-6 py-2.5 text-sm">
                        {(r.miniHub || !hubsWithMini.has(r.hubCode)) && (
                          <button type="button" onClick={() => openServiceability(r)} title="Serviceability" className="mr-3 text-slate-400 hover:text-slate-700">
                            <Icon name="building" className="h-4 w-4" />
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button type="button" onClick={() => startEdit(r, key)} className="mr-3 text-slate-400 hover:text-slate-700">
                              <Icon name="edit" className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => requestDelete(idx)} className="text-slate-400 hover:text-red-500">
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} noun="rows" />
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Delete this row permanently?' : 'Save these changes?'}
        message={
          pendingAction?.type === 'delete'
            ? 'This removes the Zone/Mini Hub mapping for good — it can\'t be undone.'
            : 'This overwrites the existing row with your edits.'
        }
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      {showRegionMapping && (
        <RegionMappingModal mapping={regionMapping} onSave={setRegionMapping} onClose={() => setShowRegionMapping(false)} readOnly={!canManage || user?.email !== REGION_MAPPING_EDITOR} />
      )}

      {servicing && (
        <HubServiceabilityModal
          label={servicing.label}
          coverage={serviceability[servicing.code]}
          onSave={saveServiceability}
          onClose={() => setServicing(null)}
          readOnly={!canManage}
        />
      )}
    </div>
  )
}

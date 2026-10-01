import { cloneElement, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import GeographyMap from '../../components/GeographyMap.jsx'
import Combobox from '../../components/Combobox.jsx'
import TerritoryCircleModal from '../../components/TerritoryCircleModal.jsx'
import { defaultTerritoryCircleMapping } from '../../data/territoryCircleMapping.js'
import { CheckboxFilter, ColumnFilterButton, TextFilter } from '../../components/ColumnFilter.jsx'
import Pagination, { usePagination } from '../../components/Pagination.jsx'
import { card, thCls } from '../../components/ui.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { STATES, PINCODES, rangeKey } from '../../data/geography.js'
import { exportCSV, exportPDF } from '../../utils/exportTable.js'

export const BLANK_ROW = { state: '', district: '', city: '', pincode: '', locality: '', territory: '', circle: '' }

const inputCls = 'rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40'

// State and District are Government-of-India administrative units — picked
// from a fixed list, never free-typed, so a row can't end up with a
// misspelled or made-up district. DISTRICTS_BY_STATE is a curated (not
// exhaustive — India has 700+ districts) list per state, covering every
// district already used in PINCODES plus a few other well-known ones, same
// spirit as PINCODES itself being a sample rather than the full directory.
// City has no fixed government list the way State/District do (India has
// tens of thousands of towns), so its dropdown is built from whatever
// cities are already on the sheet for that District — same cascading
// pattern as the column filters. Pincode follows the same City-scoped
// cascading-dropdown-with-text-fallback shape as City itself. Locality,
// Territory and Circle are our own India-Post-derived naming, not
// administrative boundaries, so they use a search-or-create combobox
// instead (see Combobox.jsx) — existing values from the sheet show up as
// suggestions (scoped to City/State/District below for relevance) but
// typing anything new is always allowed, never locked to the list.
const DISTRICTS_BY_STATE = {
  'West Bengal': ['Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Darjeeling', 'Murshidabad'],
  'Jharkhand': ['Hazaribagh', 'Ranchi', 'Dhanbad', 'East Singhbhum', 'Bokaro'],
  'Assam': ['Kamrup Metropolitan', 'Dibrugarh', 'Cachar', 'Nagaon'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  'Haryana': ['Gurugram', 'Sonipat', 'Faridabad', 'Panchkula', 'Karnal'],
  'Uttar Pradesh': ['Lucknow', 'Agra', 'Kanpur Nagar', 'Varanasi', 'Ghaziabad', 'Prayagraj', 'Gorakhpur', 'Meerut'],
  'Uttarakhand': ['Haridwar', 'Dehradun', 'Udham Singh Nagar', 'Nainital', 'Pauri Garhwal'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Punjab': ['SAS Nagar (Mohali)', 'Ludhiana', 'Amritsar', 'Patiala', 'Jalandhar'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Dakshina Kannada', 'Belagavi'],
  'Telangana': ['Hyderabad', 'Rangareddy', 'Warangal Urban', 'Medchal-Malkajgiri'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'],
  'Maharashtra': ['Thane', 'Pune', 'Nagpur', 'Mumbai City', 'Mumbai Suburban', 'Nashik'],
  'Gujarat': ['Ahmedabad', 'Valsad', 'Surat', 'Vadodara', 'Rajkot'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur'],
}
function districtsInState(state) {
  return DISTRICTS_BY_STATE[state] || []
}
function citiesInDistrict(rows, state, district) {
  return [...new Set(rows.filter((r) => r.state === state && r.district === district).map((r) => r.city))].sort((a, b) => a.localeCompare(b))
}
function pincodesInCity(rows, state, district, city) {
  return [...new Set(rows.filter((r) => r.state === state && r.district === district && r.city === city).map((r) => r.pincode))].sort((a, b) => a.localeCompare(b))
}
// Combobox suggestion lists — narrowed by whatever's already picked so the
// options stay relevant, but never the only way in: Combobox always lets a
// new value be typed and created on the go.
function localitiesFor(rows, city) {
  const scoped = city ? rows.filter((r) => r.city === city) : rows
  return [...new Set(scoped.map((r) => r.locality))].sort((a, b) => a.localeCompare(b))
}
function territoriesFor(rows, state) {
  const scoped = state ? rows.filter((r) => r.state === state) : rows
  return [...new Set(scoped.map((r) => r.territory))].sort((a, b) => a.localeCompare(b))
}
function circlesFor(rows, district) {
  const scoped = district ? rows.filter((r) => r.district === district) : rows
  return [...new Set(scoped.map((r) => r.circle))].sort((a, b) => a.localeCompare(b))
}

// One definition per column drives the header (label + filter), the body
// cell, the export columns, and the Add/Edit row's input — so "Show
// columns" only has to toggle which of these are rendered, everything
// else (filters, export, the inline form) stays in sync automatically.
// Exported so Logistics Ladder's edit form can reuse the exact same
// dropdown/combobox `formField` renderers instead of a second, plainer
// copy — same logic, same look, one place to fix if it changes.
export const COLUMN_DEFS = [
  {
    key: 'state', label: 'State / UT', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-600">{r.state}</td>,
    formField: (value, onChange) => (
      <select
        value={value.state}
        onChange={(e) => onChange({ ...value, state: e.target.value, district: '', city: '' })}
        className={`w-40 ${inputCls}`}
      >
        <option value="">Select state…</option>
        {STATES.map((s) => (
          <option key={s.code} value={s.name}>{s.name}</option>
        ))}
      </select>
    ),
  },
  {
    key: 'district', label: 'District', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-600">{r.district}</td>,
    formField: (value, onChange) => {
      const options = value.state ? districtsInState(value.state) : []
      return (
        <select
          value={value.district}
          disabled={!value.state}
          onChange={(e) => onChange({ ...value, district: e.target.value, city: '' })}
          className={`w-36 ${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}
        >
          <option value="">{value.state ? 'Select district…' : 'Select a state first'}</option>
          {options.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      )
    },
  },
  {
    key: 'city', label: 'City', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-600">{r.city}</td>,
    // No fixed government list for cities/towns exists to hardcode, so once
    // a District has at least one known City it's a locked dropdown same as
    // District — it only falls back to a one-off text box for the very
    // first city ever entered under a brand-new District.
    formField: (value, onChange, rows) => {
      const options = value.district ? citiesInDistrict(rows, value.state, value.district) : []
      if (!value.district) {
        return (
          <select disabled className={`w-32 ${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}>
            <option>Select a district first</option>
          </select>
        )
      }
      if (options.length === 0) {
        return (
          <input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder={`New city in ${value.district}…`}
            className={`w-32 ${inputCls}`}
          />
        )
      }
      return (
        <select value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} className={`w-32 ${inputCls}`}>
          <option value="">Select city…</option>
          {options.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )
    },
  },
  {
    key: 'pincode', label: 'Pincode', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm font-medium text-slate-800">{r.pincode}</td>,
    // Same cascading shape as City: a locked dropdown of pincodes already
    // on the sheet for this City, falling back to a text box only the
    // first time a brand-new pincode is entered under that City.
    formField: (value, onChange, rows) => {
      const options = value.city ? pincodesInCity(rows, value.state, value.district, value.city) : []
      if (!value.city) {
        return (
          <select disabled className={`w-24 ${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}>
            <option>Select a city first</option>
          </select>
        )
      }
      if (options.length === 0) {
        return (
          <input
            value={value.pincode}
            onChange={(e) => onChange({ ...value, pincode: e.target.value })}
            placeholder={`New pincode in ${value.city}…`}
            className={`w-24 ${inputCls}`}
          />
        )
      }
      return (
        <select value={value.pincode} onChange={(e) => onChange({ ...value, pincode: e.target.value })} className={`w-24 ${inputCls}`}>
          <option value="">Select pincode…</option>
          {options.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )
    },
  },
  {
    key: 'locality', label: 'Locality', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-600">{r.locality}</td>,
    formField: (value, onChange, rows) => (
      <Combobox
        value={value.locality}
        options={localitiesFor(rows, value.city)}
        onChange={(v) => onChange({ ...value, locality: v })}
        placeholder="Search or create locality…"
      />
    ),
  },
  {
    key: 'range', label: 'Range (Pincode-Locality)', filterType: 'text',
    cell: (r) => <td className="whitespace-nowrap px-6 py-2.5 text-xs text-slate-400">{rangeKey(r)}</td>,
    formField: (value) => (
      <span className="whitespace-nowrap text-xs text-slate-400">
        {value.pincode && value.locality ? rangeKey(value) : '— pincode + locality —'}
      </span>
    ),
  },
  {
    key: 'territory', label: 'Territory', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-500">{r.territory}</td>,
    formField: (value, onChange, rows) => (
      <Combobox
        value={value.territory}
        options={territoriesFor(rows, value.state)}
        onChange={(v) => onChange({ ...value, territory: v })}
        placeholder="Search or create territory…"
      />
    ),
  },
  {
    key: 'circle', label: 'Circle', filterType: 'set',
    cell: (r) => <td className="px-6 py-2.5 text-sm text-slate-500">{r.circle}</td>,
    formField: (value, onChange, rows) => (
      <Combobox
        value={value.circle}
        options={circlesFor(rows, value.district)}
        onChange={(v) => onChange({ ...value, circle: v })}
        placeholder="Search or create circle…"
      />
    ),
  },
]

const EMPTY_COLUMN_FILTERS = {
  state: new Set(), district: new Set(), city: new Set(),
  pincode: new Set(), locality: new Set(), range: '',
  territory: new Set(), circle: new Set(),
}

// The 7 real geography fields, in hierarchy order — driven off COLUMN_DEFS
// so the Sheet view's header filters always cover the full set (Range is
// derived, not a real field, so it's excluded).
const FILTERABLE_FIELDS = COLUMN_DEFS.filter((c) => c.key !== 'range')

// The Map view only surfaces the 4 filters that mean something spatially
// (State/City shade or place a marker; Territory/Circle change its shape —
// see GeographyMap's legend). District and Pincode stayed as two rows of
// dropdowns that didn't add much over what the search bar already covers,
// so they're search-only in Map view (still full dropdowns in Sheet view).
const MAP_FILTER_FIELDS = FILTERABLE_FIELDS.filter((c) => ['state', 'city', 'territory', 'circle'].includes(c.key))

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3.5 py-2">
      <span className="text-lg font-semibold text-slate-900">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  )
}

// Small trigger + dropdown shell shared by Export and Show columns —
// both live in the toolbar (never inside the scrolling table), so plain
// `absolute` positioning is fine here, unlike the per-column filters.
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
// "Select columns" currently has hidden — hiding a column is a display
// preference, not a reason to stop capturing that data. Rather than
// popping the form out into its own separate mini-layout (which broke
// alignment with the header), the table itself switches to showing every
// column for as long as a row is being added or edited — see
// `effectiveColumns` below — so this form is just an ordinary row, one
// input per header, in the same grid as everything else.
function RowForm({ columns, value, onChange, onSave, onCancel, rows }) {
  return (
    <tr className="border-t border-brand-orange/30 bg-brand-orange/5">
      {columns.map((col) => (
        <td key={col.key} className="px-3 py-1.5 align-top">{col.formField(value, onChange, rows)}</td>
      ))}
      <td className="whitespace-nowrap px-3 py-1.5 align-top">
        <button
          type="button"
          onClick={onSave}
          disabled={!value.state || !value.district || !value.city || !value.pincode}
          className="mr-1.5 rounded-lg bg-brand-orange px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-orange-dark disabled:opacity-40"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
          Cancel
        </button>
      </td>
    </tr>
  )
}

export default function GeographyMaster() {
  const { hasFunction } = useAuth()
  const canManage = hasFunction('geography-master.manage')

  const [rows, setRows] = useState(PINCODES)
  const [query, setQuery] = useState('')
  const [view, setView] = useState('sheet')
  const [columnFilters, setColumnFilters] = useState(EMPTY_COLUMN_FILTERS)
  const [visibleKeys, setVisibleKeys] = useState(() => new Set(COLUMN_DEFS.map((c) => c.key)))
  const [tcMapping, setTcMapping] = useState(defaultTerritoryCircleMapping)
  const [showTcMapping, setShowTcMapping] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(BLANK_ROW)
  const [editingKey, setEditingKey] = useState(null)
  const [editDraft, setEditDraft] = useState(BLANK_ROW)
  const [pendingAction, setPendingAction] = useState(null) // { type: 'delete' | 'edit', idx }

  const visibleColumns = useMemo(() => COLUMN_DEFS.filter((c) => visibleKeys.has(c.key)), [visibleKeys])

  // While a row is being added or edited, the sheet temporarily shows every
  // column (not just the ones "Select columns" currently has checked) so
  // the inline form lines up under real headers instead of a separate,
  // differently-shaped mini-layout.
  const isEditingRow = adding || editingKey !== null
  const effectiveColumns = isEditingRow ? COLUMN_DEFS : visibleColumns

  function toggleColumn(key) {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size === 1) return prev // keep at least one column visible
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

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
  // (Excel-style cascading), so narrowing State first trims what shows up
  // under District, City, Territory, Circle.
  function optionsFor(key) {
    const rest = rows.filter((r) => rowMatchesColumnFilters(r, key))
    return [...new Set(rest.map((r) => r[key]))].sort((a, b) => a.localeCompare(b))
  }

  function rowMatchesColumnFilters(r, skip) {
    if (skip !== 'state' && columnFilters.state.size && !columnFilters.state.has(r.state)) return false
    if (skip !== 'district' && columnFilters.district.size && !columnFilters.district.has(r.district)) return false
    if (skip !== 'city' && columnFilters.city.size && !columnFilters.city.has(r.city)) return false
    if (skip !== 'pincode' && columnFilters.pincode.size && !columnFilters.pincode.has(r.pincode)) return false
    if (skip !== 'locality' && columnFilters.locality.size && !columnFilters.locality.has(r.locality)) return false
    if (skip !== 'range' && columnFilters.range && !rangeKey(r).toLowerCase().includes(columnFilters.range.toLowerCase())) return false
    if (skip !== 'territory' && columnFilters.territory.size && !columnFilters.territory.has(r.territory)) return false
    if (skip !== 'circle' && columnFilters.circle.size && !columnFilters.circle.has(r.circle)) return false
    return true
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => rowMatchesColumnFilters(r))
      .filter((r) => !q || [r.state, r.district, r.city, r.pincode, r.locality, rangeKey(r), r.territory, r.circle].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district) || a.city.localeCompare(b.city) || a.pincode.localeCompare(b.pincode))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columnFilters])
  const pg = usePagination(filtered)
  useEffect(() => { pg.setPage(1) }, [query, columnFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reflects whatever the search box + column filters currently narrow the
  // sheet down to — not the fixed totals — so these read as "what am I
  // looking at right now", same data the Map view and Export use.
  const stats = useMemo(() => {
    const states = new Set(filtered.map((r) => r.state))
    const districts = new Set(filtered.map((r) => `${r.state}|${r.district}`))
    const cities = new Set(filtered.map((r) => `${r.state}|${r.district}|${r.city}`))
    return { states: states.size, districts: districts.size, cities: cities.size, pincodes: filtered.length }
  }, [filtered])

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

  const exportColumns = visibleColumns.map((c) => ({ label: c.label, value: (r) => (c.key === 'range' ? rangeKey(r) : r[c.key]) }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Geography Master</h1>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Stat label="States/UT" value={stats.states} />
            <Stat label="Districts" value={stats.districts} />
            <Stat label="Cities" value={stats.cities} />
            <Stat label="Pincodes" value={stats.pincodes} />
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
            placeholder="Search state, district, city, pincode, locality, territory, circle…"
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
          <ToolbarMenu icon="columns" label="Select columns">
            {() => (
              <div className="max-h-64 overflow-y-auto p-1">
                {COLUMN_DEFS.map((col) => (
                  <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={visibleKeys.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </ToolbarMenu>
        )}
        {view === 'map' && MAP_FILTER_FIELDS.map((col) => {
          const selected = columnFilters[col.key]
          return (
            <ToolbarMenu key={col.key} icon="filter" label={selected.size ? `${col.label} (${selected.size})` : col.label}>
              {() => <div className="p-1"><CheckboxFilter options={optionsFor(col.key)} selected={selected} onToggle={(v) => toggleSetFilter(col.key, v)} onClear={() => clearSetFilter(col.key)} /></div>}
            </ToolbarMenu>
          )
        })}
        <ToolbarMenu icon="download" label="Export">
          {(close) => (
            <>
              <button
                type="button"
                onClick={() => { exportCSV('geography-master', exportColumns, filtered); close() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
              >
                <Icon name="grid" className="h-4 w-4 text-slate-400" /> Export as CSV
              </button>
              <button
                type="button"
                onClick={() => { exportPDF('Geography Master', exportColumns, filtered); close() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
              >
                <Icon name="file" className="h-4 w-4 text-slate-400" /> Export as PDF
              </button>
            </>
          )}
        </ToolbarMenu>
        <button type="button" onClick={() => setShowTcMapping(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <Icon name="route" className="h-4 w-4 text-slate-400" /> Territory/Circle Mapping
        </button>
        {canManage && view === 'sheet' && (
          <button type="button" onClick={startAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark">
            <Icon name="plus" className="h-4 w-4" /> Create New Row
          </button>
        )}
      </div>

      {view === 'map' ? (
        <div className={`p-4 ${card}`}>
          <GeographyMap
            allRows={rows}
            matchedRows={filtered}
            hasQuery={!!query.trim() || activeColumnFilterCount > 0}
            query={query}
            stateFilter={columnFilters.state}
            territoryFilter={columnFilters.territory}
            circleFilter={columnFilters.circle}
          />
          <p className="mt-2 text-xs text-slate-400">
            {query.trim() || activeColumnFilterCount > 0
              ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} plotted below.`
              : 'Nothing plotted yet — search above, or filter by State/UT, City, Territory or Circle, to place cities on the map.'}
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
                  {canManage && <th className={thCls}></th>}
                </tr>
              </thead>
              <tbody>
                {adding && canManage && (
                  <RowForm columns={effectiveColumns} value={draft} onChange={setDraft} onSave={saveAdd} onCancel={() => setAdding(false)} rows={rows} />
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
                    return <RowForm key={key} columns={effectiveColumns} value={editDraft} onChange={setEditDraft} onSave={() => requestSaveEdit(idx)} onCancel={() => setEditingKey(null)} rows={rows} />
                  }
                  return (
                    <tr key={key} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                      {effectiveColumns.map((col) => cloneElement(col.cell(r), { key: col.key }))}
                      {canManage && (
                        <td className="whitespace-nowrap px-6 py-2.5 text-sm">
                          <button type="button" onClick={() => startEdit(r, key)} className="mr-3 text-slate-400 hover:text-slate-700">
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => requestDelete(idx)} className="text-slate-400 hover:text-red-500">
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} noun="pincode rows" />
        </div>
      )}

      {showTcMapping && (
        <TerritoryCircleModal mapping={tcMapping} onSave={setTcMapping} onClose={() => setShowTcMapping(false)} readOnly={!canManage} />
      )}

      <ConfirmDialog
        open={!!pendingAction}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Delete this row permanently?' : 'Save these changes?'}
        message={
          pendingAction?.type === 'delete'
            ? 'This removes the pincode mapping for good — it can\'t be undone.'
            : 'This overwrites the existing row with your edits.'
        }
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}

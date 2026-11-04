import BackButton from '../../components/BackButton.jsx'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'
import {
  PICKUPS_SEED, PICKUP_STATUS, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE, PICKUP_TYPE, refreshPickupLocks, markPickupArrived, markReachedAtMiniHub,
} from '../../data/pickups.js'
import MultiSelect from './MultiSelect.jsx'
import PickupDrawer from './PickupDrawer.jsx'
import PickupCharts, { STAGE_DOT } from './PickupCharts.jsx'
import PickupPerformance from './PickupPerformance.jsx'
import {
  EMPTY_FILTERS, FLAG_OPTIONS, enrich, applyFilters, countActiveFilters, datePreset,
  sortRows, formatSlot,
} from './pickupDashboardLib.js'


const COLUMNS = [
  { key: 'id', label: 'Pickup ID', sort: 'id' },
  { key: 'client', label: 'Client', sort: 'client' },
  { key: 'city', label: 'Pickup from', sort: 'city' },
  { key: 'hub', label: 'Drop Mini Hub', sort: 'hub' },
  { key: 'weight', label: 'Wt · Pkgs', sort: 'weight' },
  { key: 'slot', label: 'Scheduled', sort: 'slot' },
  { key: 'prs', label: 'Run sheet', sort: 'prs' },
  { key: 'status', label: 'Status', sort: 'status' },
  { key: 'remarks', label: 'Remarks' },
]

// Operational tabs — each groups the lifecycle statuses an ops person works on
// together. Counts respect the date range and every filter.
const TABS = [
  { key: 'all', label: 'All pickups', statuses: null },
  { key: 'await', label: 'Awaiting assignment', statuses: [PICKUP_STATUS.CREATED] },
  { key: 'assigned', label: 'Assigned', statuses: [PICKUP_STATUS.ASSIGNED] },
  { key: 'ongoing', label: 'Ongoing pickups', statuses: [PICKUP_STATUS.ARRIVED, PICKUP_STATUS.STARTED, PICKUP_STATUS.IN_PROGRESS] },
  { key: 'tohub', label: 'Heading to hub', statuses: [PICKUP_STATUS.COMPLETED, PICKUP_STATUS.AT_HUB] },
  { key: 'dropped', label: 'Dropped at hub', statuses: [PICKUP_STATUS.DROPPED] },
  { key: 'failed', label: 'Failed', statuses: [PICKUP_STATUS.FAILED] },
]

const DATE_RANGES = [['last7', 'Last 7 days'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['next7', 'Next 7 days'], ['last30', 'Last 30 days'], ['any', 'All time']]

const count = (rows, get) => {
  const m = new Map()
  rows.forEach((r) => { const k = get(r); if (k != null) m.set(k, (m.get(k) ?? 0) + 1) })
  return m
}
const opts = (m, labelOf = (v) => v) => [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([value, c]) => ({ value, label: labelOf(value), count: c }))

function Popover({ button, children, align = 'right', width = 'w-72' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{button(open)}</div>
      {open && <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-1.5 ${width} rounded-xl border border-slate-200 bg-white shadow-xl`}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

const toolBtn = 'flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50'

export default function MyOrders() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...datePreset('last7') })
  const [customRange, setCustomRange] = useState(false)
  const [tab, setTab] = useState('all')
  const [subTab, setSubTab] = useState('all')
  const [sort, setSort] = useState({ key: 'slot', dir: 'asc' })
  const [hiddenCols, setHiddenCols] = useState([])
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [checked, setChecked] = useState(() => new Set())
  const [view, setView] = useState(null) // null | 'charts' | 'performance'

  refreshPickupLocks()
  const now = new Date()
  const all = PICKUPS_SEED.map((p) => enrich(p, now))

  const setF = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(0) }
  const toggleIn = (key, v) => setF({ [key]: filters[key].includes(v) ? filters[key].filter((x) => x !== v) : [...filters[key], v] })

  // Option lists + tab counts reflect everything except the facet itself so
  // counts stay meaningful while that facet is being changed.
  const without = (key) => applyFilters(all, { ...filters, [key]: Array.isArray(filters[key]) ? [] : '' }, query)
  const forStages = without('status')
  const scoped = applyFilters(all, filters, query)
  const tabDef = TABS.find((t) => t.key === tab)
  const inTab = (r) => !tabDef.statuses || tabDef.statuses.includes(r.status)
  const hasSub = tab === 'all' || tab === 'await'
  const inSub = (r) => !hasSub || subTab === 'all' || r.overdue
  const filtered = useMemo(() => applyFilters(all, filters, query).filter(inTab).filter(inSub), [all, filters, query, tab, subTab]) // eslint-disable-line react-hooks/exhaustive-deps
  const subRows = forStages.filter(inTab)
  const tabCount = (t) => forStages.filter((r) => !t.statuses || t.statuses.includes(r.status)).length

  const attention = {
    overdue: filtered.filter((r) => r.overdue).length,
    unassigned: filtered.filter((r) => r.unassigned).length,
    urgent: filtered.filter((r) => r.urgent).length,
    hazardous: filtered.filter((r) => r.hazardous).length,
  }

  const rows = sortRows(filtered, sort.key, sort.dir)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pages - 1)
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const active = countActiveFilters(filters)
  const clearAll = () => { setFilters((f) => ({ ...EMPTY_FILTERS, dateFrom: f.dateFrom, dateTo: f.dateTo })); setQuery(''); setTab('all'); setPage(0) }
  const sortBy = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const showCol = (k) => !hiddenCols.includes(k)
  const visibleCols = COLUMNS.filter((c) => showCol(c.key))
  const totalCols = visibleCols.length + 2
  const selected = selectedId ? all.find((r) => r.id === selectedId) : null

  const toggleCheck = (id) => setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const pageAllChecked = pageRows.length > 0 && pageRows.every((r) => checked.has(r.id))
  const toggleAllOnPage = () => setChecked((prev) => {
    const n = new Set(prev)
    pageRows.forEach((r) => (pageAllChecked ? n.delete(r.id) : n.add(r.id)))
    return n
  })
  const checkedRows = all.filter((r) => checked.has(r.id))
  const bulkAssigned = checkedRows.filter((r) => r.status === PICKUP_STATUS.ASSIGNED)
  const bulkAwaiting = checkedRows.filter((r) => r.status === PICKUP_STATUS.CREATED)

  const chips = [
    ...filters.status.map((v) => ({ k: `s${v}`, label: `Status: ${PICKUP_STATUS_LABEL[v]}`, off: () => toggleIn('status', v) })),
    ...filters.client.map((v) => ({ k: `c${v}`, label: `Client: ${v}`, off: () => toggleIn('client', v) })),
    ...filters.hub.map((v) => ({ k: `h${v}`, label: `Hub: ${v}`, off: () => toggleIn('hub', v) })),
    ...filters.city.map((v) => ({ k: `y${v}`, label: `City: ${v}`, off: () => toggleIn('city', v) })),
    ...filters.type.map((v) => ({ k: `t${v}`, label: v === PICKUP_TYPE.RECURRING ? 'Recurring' : 'One-time', off: () => toggleIn('type', v) })),
    ...filters.vehicle.map((v) => ({ k: `v${v}`, label: `Vehicle: ${v === '__none' ? 'None' : v}`, off: () => toggleIn('vehicle', v) })),
    ...filters.flags.map((v) => ({ k: `f${v}`, label: FLAG_OPTIONS.find((o) => o.value === v)?.label, off: () => toggleIn('flags', v) })),
    ...(filters.minKg !== '' || filters.maxKg !== '' ? [{ k: 'w', label: `Est. ${filters.minKg || 0}–${filters.maxKg || '∞'} kg`, off: () => setF({ minKg: '', maxKg: '' }) }] : []),
  ]

  const matched = DATE_RANGES.find(([k]) => { const p = datePreset(k); return p.dateFrom === filters.dateFrom && p.dateTo === filters.dateTo })
  const rangeValue = customRange || !matched ? 'custom' : matched[0]
  const dateInput = 'h-8 rounded-md border border-slate-200 px-2 text-[13px] focus:outline focus:outline-2 focus:outline-brand-orange/40'
  const th = 'sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500'

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <BackButton />
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Pickup Dashboard</h1>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[13px] font-medium">
            {[['charts', 'Charts'], ['performance', 'Performance']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setView((v) => (v === k ? null : k))}
                className={`rounded-md px-3 py-1 transition-colors ${view === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
        </div>
        <Link to="/order-module/create-order" className="inline-flex items-center gap-1 rounded-lg bg-brand-orange px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-orange-dark">
          <Icon name="plus" className="h-3.5 w-3.5" />Create pickup
        </Link>
      </div>

      {/* Operational tabs — big counts, one per working queue */}
      <div className={`${card} flex overflow-x-auto`}>
        {TABS.map((t) => {
          const on = tab === t.key
          return (
            <button key={t.key} type="button" onClick={() => { setTab(t.key); setSubTab(t.key === 'await' ? 'breached' : 'all'); setPage(0) }}
              className={`min-w-[130px] flex-1 border-b-[3px] px-4 py-3 text-left transition-colors ${on ? 'border-brand-orange bg-orange-50/40' : 'border-transparent hover:bg-slate-50'}`}>
              <div className={`text-[26px] font-semibold leading-none tabular-nums ${on ? 'text-brand-orange' : t.key === 'failed' && tabCount(t) > 0 ? 'text-red-500' : 'text-slate-500'}`}>{tabCount(t)}</div>
              <div className={`mt-1.5 text-[11px] font-semibold uppercase tracking-wide ${on ? 'text-brand-orange' : 'text-slate-400'}`}>{t.label}</div>
            </button>
          )
        })}
      </div>

      {/* Filter bar — date range scopes the tabs, insights and table */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter by</span>
        <select
          value={rangeValue}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'custom') setCustomRange(true)
            else { setCustomRange(false); setF(datePreset(v)) }
          }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          {DATE_RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          <option value="custom">Custom range</option>
        </select>
        {rangeValue === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={filters.dateFrom} onChange={(e) => setF({ dateFrom: e.target.value })} className={dateInput} />
            <span className="text-slate-300">→</span>
            <input type="date" value={filters.dateTo} onChange={(e) => setF({ dateTo: e.target.value })} className={dateInput} />
          </div>
        )}
        <MultiSelect label="Client" value={filters.client} onChange={(v) => setF({ client: v })} options={opts(count(without('client'), (r) => r.clientName))} />
        <MultiSelect label="Vehicle" value={filters.vehicle} onChange={(v) => setF({ vehicle: v })}
          options={opts(count(without('vehicle'), (r) => r.vehicle ?? '__none'), (v) => (v === '__none' ? 'No vehicle yet' : v))} />
        <MultiSelect label="Mini Hub" value={filters.hub} onChange={(v) => setF({ hub: v })} options={opts(count(without('hub'), (r) => r.dropMiniHubName))} />
        <div className="relative ml-auto min-w-[240px] flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0) }}
            placeholder="Search pickup ID, client, pincode, PRS, vehicle, docket…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
          {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><Icon name="close" className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      {view === 'charts' && <PickupCharts rows={filtered} stageRows={forStages} filters={filters} toggleIn={toggleIn} attention={attention} />}
      {view === 'performance' && <PickupPerformance rows={scoped} />}

      <div className={`${card} overflow-visible`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <span className="text-[13px] text-slate-500"><span className="font-semibold tabular-nums text-slate-900">{rows.length}</span> pickups · <span className="font-semibold tabular-nums text-slate-900">{rows.reduce((a, r) => a + r.estWeightKg, 0).toLocaleString('en-IN')}</span> kg est.</span>
          {attention.overdue > 0 && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">{attention.overdue} overdue</span>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {(active > 0 || query || tab !== 'all') && <button type="button" onClick={clearAll} className="text-[13px] font-medium text-slate-500 hover:text-slate-900">Clear all</button>}

            <Popover width="w-52" button={() => <button type="button" className={toolBtn}><Icon name="columns" className="h-4 w-4" />Columns</button>}>
              {() => (
                <div className="py-1">
                  {COLUMNS.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-orange-500" disabled={c.key === 'id'} checked={showCol(c.key)}
                        onChange={() => setHiddenCols((h) => (h.includes(c.key) ? h.filter((x) => x !== c.key) : [...h, c.key]))} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </Popover>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
            {chips.map((c) => (
              <span key={c.k} className="inline-flex items-center gap-1 rounded-full bg-slate-900 py-1 pl-2.5 pr-1.5 text-xs font-medium text-white">
                {c.label}
                <button type="button" onClick={c.off} className="rounded-full p-0.5 text-slate-300 hover:bg-white/20 hover:text-white" aria-label="Remove filter"><Icon name="close" className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {checked.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-orange-100 bg-orange-50/60 px-4 py-2 text-[13px]">
            <span className="font-semibold text-slate-800">{checked.size} selected</span>
            {bulkAssigned.length > 0 && (
              <button type="button" onClick={() => { bulkAssigned.forEach((r) => markPickupArrived(r.id)); setChecked(new Set()); refresh() }}
                className="rounded-lg bg-brand-orange px-3 py-1 text-xs font-medium text-white hover:bg-brand-orange-dark">Mark {bulkAssigned.length} arrived</button>
            )}
            {bulkAwaiting.length > 0 && (
              <Link to="/order-module/prs" className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Assign {bulkAwaiting.length} in PRS</Link>
            )}
            <button type="button" onClick={() => setChecked(new Set())} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900">Clear selection</button>
          </div>
        )}

        {hasSub && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
            {[
              ['breached', 'Needs attention (Breached pickups)', subRows.filter((r) => r.overdue).length, 'text-red-600'],
              ['all', 'All', subRows.length, ''],
            ].map(([k, label, n, tone]) => (
              <button key={k} type="button" onClick={() => { setSubTab(k); setPage(0) }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${subTab === k ? (k === 'breached' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white') : `bg-slate-100 hover:bg-slate-200 ${tone || 'text-slate-600'}`}`}>
                {label} <span className="tabular-nums opacity-80">{n}</span>
              </button>
            ))}
          </div>
        )}

        {/* Table — dense, sticky header */}
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={`${th} w-9`}>
                  <input type="checkbox" checked={pageAllChecked} onChange={toggleAllOnPage} className="h-3.5 w-3.5 accent-orange-500" aria-label="Select all on page" />
                </th>
                {visibleCols.map((c) => (
                  <th key={c.key} className={`${th} ${c.sort ? 'cursor-pointer select-none hover:text-slate-700' : ''}`} onClick={c.sort ? () => sortBy(c.sort) : undefined}>
                    {c.label}
                    {c.sort && sort.key === c.sort && <span className="ml-1 text-brand-orange">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className={`${th} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const isChecked = checked.has(r.id)
                return (
                  <Fragment key={r.id}>
                    <tr className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50 ${isChecked ? 'bg-orange-50/50' : selectedId === r.id ? 'bg-orange-50/30' : ''}`} onClick={() => setSelectedId(r.id)}>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(r.id)} className="h-3.5 w-3.5 accent-orange-500" aria-label={`Select ${r.id}`} />
                      </td>
                      {visibleCols.map((c) => <Cell key={c.key} col={c.key} r={r} now={now} onChanged={refresh} />)}
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <ActionButton r={r} onOpen={() => setSelectedId(r.id)} onChanged={refresh} />
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={totalCols} className="px-6 py-14 text-center text-sm text-slate-400">
                  No pickups match these filters. <button type="button" onClick={clearAll} className="font-medium text-brand-orange hover:underline">Clear all</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-[13px] text-slate-500">
          <div>
            {rows.length === 0 ? '0 results' : `${safePage * pageSize + 1}–${Math.min(rows.length, (safePage + 1) * pageSize)} of ${rows.length}`}
          </div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[13px]">
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="h-8 rounded-md border border-slate-200 px-3 hover:bg-slate-50 disabled:opacity-30">Prev</button>
            <span className="tabular-nums">{safePage + 1} / {pages}</span>
            <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="h-8 rounded-md border border-slate-200 px-3 hover:bg-slate-50 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>

      {selected && <PickupDrawer pickup={selected} onClose={() => setSelectedId(null)} onChanged={refresh} />}
    </div>
  )
}

// Quick per-row action — the next thing ops usually does for this status.
// Arrived / Reached fire immediately; everything else opens the drawer where
// the details form, scans and failure reason live.
function ActionButton({ r, onOpen, onChanged }) {
  const base = 'rounded-md px-2.5 py-1 text-xs font-medium transition-colors'
  const primary = `${base} bg-brand-orange text-white hover:bg-brand-orange-dark`
  const ghost = `${base} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`
  switch (r.status) {
    case PICKUP_STATUS.CREATED: return <Link to="/order-module/prs" className={ghost}>Assign</Link>
    case PICKUP_STATUS.ASSIGNED: return <button type="button" className={primary} onClick={() => { markPickupArrived(r.id); onChanged() }}>Arrived</button>
    case PICKUP_STATUS.ARRIVED: return <button type="button" className={primary} onClick={onOpen}>Start</button>
    case PICKUP_STATUS.STARTED:
    case PICKUP_STATUS.IN_PROGRESS: return <button type="button" className={primary} onClick={onOpen}>Scan</button>
    case PICKUP_STATUS.COMPLETED: return <button type="button" className={primary} onClick={() => { markReachedAtMiniHub(r.id); onChanged() }}>Reached hub</button>
    case PICKUP_STATUS.AT_HUB: return <button type="button" className={primary} onClick={onOpen}>Drop scan</button>
    default: return <button type="button" className={ghost} onClick={onOpen}>View</button>
  }
}

// Free-text ops note per pickup (stored on the seed row), plus auto tags.
function RemarkCell({ r, now, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(r.remarks ?? '')
  const save = () => {
    const row = PICKUPS_SEED.find((p) => p.id === r.id)
    if (row) row.remarks = val.trim()
    setEditing(false)
    onChanged()
  }
  const overdueH = r.overdue ? Math.floor((now - r.slot) / 3600000) : 0
  const overdueText = overdueH >= 24 ? `${Math.floor(overdueH / 24)}d` : `${overdueH}h`
  return (
    <td className="px-3 py-2 text-[13px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex max-w-[260px] items-center gap-1.5">
        {editing ? (
          <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(r.remarks ?? ''); setEditing(false) } }}
            placeholder="Add remark…" className="h-7 w-full rounded-md border border-slate-300 px-2 text-[13px] focus:outline focus:outline-2 focus:outline-brand-orange/40" />
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit remark" title="Add / edit remark">
              <Icon name="edit" className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 leading-tight">
              {r.failure && <div className="truncate font-medium text-red-600" title={r.failure.reason}>{r.failure.reason}</div>}
              {r.overdue && <div className="text-red-500">Overdue by {overdueText}</div>}
              {r.remarks ? <div className="truncate text-slate-700" title={r.remarks}>{r.remarks}</div> : !r.failure && !r.overdue && <span className="text-slate-300">--</span>}
            </div>
          </>
        )}
      </div>
    </td>
  )
}

function Cell({ col, r, now, onChanged }) {
  const td = 'whitespace-nowrap px-3 py-2 text-[13px] text-slate-600'
  switch (col) {
    case 'id':
      return (
        <td className={td}>
          <span className="font-medium text-brand-orange">{r.id}</span>
          <div className="mt-0.5 flex gap-1">
            {r.type === PICKUP_TYPE.RECURRING && <span className="rounded bg-sky-50 px-1.5 py-px text-[10px] font-semibold text-sky-600">REPEAT</span>}
            {r.urgent && <span className="rounded bg-orange-50 px-1.5 py-px text-[10px] font-semibold text-orange-600">URGENT</span>}
            {r.hazardous && <span className="rounded bg-red-50 px-1.5 py-px text-[10px] font-semibold text-red-600">HAZ</span>}
            {r.fragile && <span className="rounded bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">FRAGILE</span>}
          </div>
        </td>
      )
    case 'client': return <td className={`${td} font-medium text-slate-800`}>{r.clientName}</td>
    case 'city': return <td className={td}>{r.city}<div className="text-xs text-slate-400">{r.consignor.pincode}</div></td>
    case 'hub': return <td className={td}>{r.dropMiniHubName ?? <span className="text-slate-300">Not set</span>}</td>
    case 'weight':
      return (
        <td className={`${td} tabular-nums`}>
          {r.actualWeightKg ? <>{r.actualWeightKg} kg <span className="text-xs text-slate-400">(est. {r.estWeightKg})</span></> : `${r.estWeightKg} kg`}
          <div className="text-xs text-slate-400">{r.packagesLabel ? `${r.packagesLabel} pkgs` : '-- pkgs'}{r.consigneeCount > 1 && ` · ${r.consigneeCount} consignees`}</div>
        </td>
      )
    case 'slot':
      return (
        <td className={`${td} ${r.overdue ? 'text-red-600' : ''}`}>
          {r.slot ? <>{r.slot.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}<div className="text-xs">{r.scheduledTime}</div></> : <span className="text-slate-300">--</span>}
        </td>
      )
    case 'prs':
      return <td className={td}>{r.prsId ? <>{r.prsId}<div className="text-xs text-slate-400">{r.vehicle}</div></> : <span className="text-slate-300">--</span>}</td>
    case 'status':
      return (
        <td className={td}>
          <span className={`inline-flex items-center gap-1.5 whitespace-normal rounded-full px-2.5 py-1 text-xs font-medium ${PICKUP_STATUS_BADGE[r.status]}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STAGE_DOT[r.status]}`} />{PICKUP_STATUS_LABEL[r.status]}
          </span>
        </td>
      )
    case 'remarks': return <RemarkCell r={r} now={now} onChanged={onChanged} />
    default: return null
  }
}

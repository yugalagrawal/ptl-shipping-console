import { Fragment, useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { card, pill, thCls, tdCls, rowCls, btnPrimary, btnSecondary } from '../../components/ui.js'
import { PICKUPS_SEED, PICKUP_STATUS, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE, MINI_HUBS, refreshPickupLocks, refreshRecurringWindows } from '../../data/pickups.js'
import { PRS_SEED, suggestPrsGroups, generatePrs, MIN_PICKUPS_TO_SUGGEST } from '../../data/prs.js'
import { FLEET_SEED, VEHICLE_STATUS } from '../../data/fleet.js'

function findPickup(id) {
  return PICKUPS_SEED.find((p) => p.id === id)
}
function weightOf(ids) {
  return ids.reduce((sum, id) => sum + (findPickup(id)?.estWeightKg ?? 0), 0)
}

// Local (not UTC) date string — matches the same convention Create Pickup's
// own toLocalDateStr uses, so "today" here can't drift a day off in IST.
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}
// Exhaustive-ish search — one text box matches against every identifier a
// supervisor might actually be handed (a PRS no., a pickup ID, a client
// name, a vehicle reg no.) rather than requiring a specific field to search.
function matchesQuery(haystackParts, query) {
  if (!query.trim()) return true
  const haystack = haystackParts.filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}
function pickupMatches(p, query) {
  return matchesQuery([p.id, p.clientName, p.consignor?.city, p.dropMiniHubName], query)
}
function draftMatches(draft, query) {
  const vehicle = FLEET_SEED.find((v) => v.id === draft.vehicleId)
  const pickups = draft.pickupIds.map(findPickup).filter(Boolean)
  return matchesQuery(
    [draft.hubName, draft.hubCity, vehicle?.regNo, vehicle?.driverName, ...pickups.flatMap((p) => [p.id, p.clientName])],
    query,
  )
}
function prsMatches(prs, query) {
  const pickups = prs.pickupIds.map(findPickup).filter(Boolean)
  return matchesQuery(
    [prs.id, prs.hubName, prs.vehicleLabel, prs.driverName, ...pickups.flatMap((p) => [p.id, p.clientName])],
    query,
  )
}

function utilizationBarColor(pct) {
  if (pct > 100) return 'bg-rose-500'
  if (pct >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}
function utilizationTextColor(pct) {
  if (pct > 100) return 'text-rose-500'
  if (pct >= 80) return 'text-amber-600'
  return 'text-emerald-600'
}

function Kpi({ label, value, dot }) {
  return (
    <div className={`p-4 ${card}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
    </div>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-10 text-center ${card}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-orange/10">
        <Icon name={icon} className="h-5 w-5 text-brand-orange-dark" />
      </div>
      <p className="font-medium text-slate-700">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-slate-400">{subtitle}</p>}
    </div>
  )
}

// Search-and-select filter popover that lives inside a column header — pick
// any number of values (e.g. Pickup City → "Mumbai") to narrow the table.
// Closes on outside click (a plain full-page overlay gets clipped by any
// overflow-hidden ancestor in this app, so this uses the more robust
// mousedown-outside-the-ref pattern instead).
function ColumnFilter({ label, options, selected, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const q = query.trim().toLowerCase()
  const filteredOptions = options.filter((o) => !q || o.toLowerCase().includes(q))
  const active = selected.size > 0

  function toggleOption(opt) {
    const next = new Set(selected)
    if (next.has(opt)) next.delete(opt)
    else next.add(opt)
    onChange(next)
  }

  return (
    <span ref={ref} className="relative inline-block normal-case">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 align-middle text-[10px] font-bold ${active ? 'bg-brand-orange/15 text-brand-orange-dark' : 'text-slate-300 hover:text-slate-500'}`}
        title={`Filter by ${label}`}
      >
        <Icon name="chevron" className="h-3 w-3" />
        {active && selected.size}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label}…`}
              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length === 0 && <div className="px-3 py-2 text-xs font-normal text-slate-400">No matches</div>}
            {filteredOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 text-xs font-normal text-slate-600 hover:bg-slate-50">
                <input type="checkbox" checked={selected.has(opt)} onChange={() => toggleOption(opt)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-brand-orange" />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => { onChange(new Set()); setQuery('') }}
              className="block w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-50"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </span>
  )
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Weeks-of-cells matrix for one calendar month — leading/trailing cells
// (days from the neighboring months needed to fill whole weeks) are null.
function monthMatrix(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array(daysInMonth).fill(0).map((_, i) => localDateStr(new Date(year, month, i + 1)))]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// Single-trigger date-range picker: one calendar-icon button that opens a
// popover holding ONE calendar grid — click a day to start the range, click
// another to set the end (earlier click wins as start automatically),
// instead of two separate date fields sitting in the toolbar.
function DateRangeControl({ start, end, onChange, label = 'Date range', minDate }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => new Date((start || end || minDate || localDateStr(new Date())) + 'T00:00:00'))
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const active = Boolean(start || end)
  const summary = start && end ? (start === end ? start : `${start} → ${end}`) : start ? `From ${start}` : end ? `Until ${end}` : label

  function pickDay(dateStr) {
    if (minDate && dateStr < minDate) return
    if (!start || (start && end)) {
      onChange(dateStr, '')
    } else if (dateStr < start) {
      onChange(dateStr, start)
    } else {
      onChange(start, dateStr)
    }
  }

  const weeks = monthMatrix(viewDate.getFullYear(), viewDate.getMonth())

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${active ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        {summary}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
            </button>
            <span className="text-xs font-semibold text-slate-700">{viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i} className="text-[10px] font-medium text-slate-400">{w}</span>
            ))}
            {weeks.map((week, wi) => week.map((dateStr, di) => {
              if (!dateStr) return <span key={`${wi}-${di}`} />
              const inRange = start && end && dateStr >= start && dateStr <= end
              const isEdge = dateStr === start || dateStr === end
              const disabled = minDate && dateStr < minDate
              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(dateStr)}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                    disabled ? 'cursor-not-allowed text-slate-300' : isEdge ? 'bg-brand-orange text-white font-semibold' : inRange ? 'bg-brand-orange/15 text-brand-orange-dark' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {Number(dateStr.slice(-2))}
                </button>
              )
            }))}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => { onChange('', ''); setOpen(false) }}
              className="mt-2 block w-full border-t border-slate-100 pt-2 text-left text-xs font-medium text-rose-500 hover:text-rose-600"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </span>
  )
}

// Type-to-filter "Move to" picker for the bulk-select bar below — "Unassigned
// Pickups" always stays pinned at the top (in its own rose color, since it's
// a different kind of destination than a sibling PRS) regardless of what's
// typed; only the PRS/vehicle options below it get filtered by the query.
function MoveToDropdown({ siblingDrafts, movingWeightKg, onUnassign, onMove }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const q = query.trim().toLowerCase()
  const filteredSiblings = siblingDrafts.filter((d) => {
    if (!q) return true
    const v = FLEET_SEED.find((row) => row.id === d.vehicleId)
    return `${d.hubName} ${v?.regNo ?? ''} ${v?.type ?? ''} ${v?.driverName ?? ''}`.toLowerCase().includes(q)
  })

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Move to…"
        className="w-36 rounded-md border-0 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-soft focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-64 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onUnassign(); setQuery(''); setOpen(false) }}
            className="block w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            Unassigned Pickups
          </button>
          {filteredSiblings.length > 0 && <div className="my-1 border-t border-slate-100" />}
          {filteredSiblings.map((d) => {
            const v = FLEET_SEED.find((row) => row.id === d.vehicleId)
            const projectedWeight = d.totalEstWeightKg + movingWeightKg
            const pct = v ? Math.round((projectedWeight / v.capacityKg) * 100) : null
            const wontFit = v && projectedWeight > v.capacityKg
            return (
              <button
                key={d.tempId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onMove(d.tempId); setQuery(''); setOpen(false) }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                title={wontFit ? "Selected pickups' weight exceeds this vehicle's remaining capacity" : undefined}
              >
                <span className="min-w-0 truncate text-slate-600">
                  {v ? `${v.regNo} · ${v.driverName}` : 'No vehicle'}
                  <span className="text-slate-400"> · {d.hubName}</span>
                </span>
                {v && (
                  <span className={`shrink-0 font-semibold ${wontFit ? 'text-rose-600' : utilizationTextColor(pct)}`}>
                    {pct}%
                  </span>
                )}
              </button>
            )
          })}
          {q && filteredSiblings.length === 0 && <div className="px-3 py-1.5 text-xs text-slate-400">No matching PRS</div>}
        </div>
      )}
    </div>
  )
}

// Button-triggered version of the same type-to-filter picker — used from
// Unassigned Pickups, where there's no "current draft" to move out of, just
// one or more ungrouped pickups to assign straight into a PRS/vehicle.
function AssignDropdown({ drafts, movingWeightKg, onAssign, label = 'Assign', disabled = false }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const q = query.trim().toLowerCase()
  const filtered = drafts.filter((d) => {
    if (!q) return true
    const v = FLEET_SEED.find((row) => row.id === d.vehicleId)
    return `${d.hubName} ${v?.regNo ?? ''} ${v?.type ?? ''} ${v?.driverName ?? ''}`.toLowerCase().includes(q)
  })

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`${btnPrimary} px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search PRS / vehicle…"
            className="w-full border-b border-slate-100 px-3 py-2 text-xs text-slate-700 focus:outline-none"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">{drafts.length === 0 ? 'No run sheets suggested yet' : 'No matching PRS'}</div>
            )}
            {filtered.map((d) => {
              const v = FLEET_SEED.find((row) => row.id === d.vehicleId)
              const projectedWeight = d.totalEstWeightKg + movingWeightKg
              const pct = v ? Math.round((projectedWeight / v.capacityKg) * 100) : null
              const wontFit = v && projectedWeight > v.capacityKg
              return (
                <button
                  key={d.tempId}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onAssign(d.tempId); setQuery(''); setOpen(false) }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                  title={wontFit ? "Selected pickups' weight exceeds this vehicle's remaining capacity" : undefined}
                >
                  <span className="min-w-0 truncate text-slate-600">
                    {v ? `${v.regNo} · ${v.driverName}` : 'No vehicle'}
                    <span className="text-slate-400"> · {d.hubName}</span>
                  </span>
                  {v && (
                    <span className={`shrink-0 font-semibold ${wontFit ? 'text-rose-600' : utilizationTextColor(pct)}`}>
                      {pct}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Generating locks the draft in — Pending PRS's local add/remove/swap-vehicle
// edits stop being possible once it becomes an Active PRS row — and it's the
// moment the vehicle/driver actually gets assigned to the run, so this asks
// for a final confirmation rather than generating on a single click.
function GenerateConfirmModal({ draft, vehicle, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <h3 className="text-base font-semibold text-slate-900">Generate this run sheet?</h3>
        <p className="mt-2 text-sm text-slate-500">
          Once generated, this PRS can't be edited further{vehicle ? <> and <span className="font-medium text-slate-700">{vehicle.driverName} ({vehicle.regNo})</span> will be assigned to this PRS</> : ''}. Are you sure?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(draft)} className={btnPrimary}>
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}

// Manual alternative to the auto-suggestion — pick any unassigned pickups
// (even across hubs, e.g. for a milk-run) and a vehicle, straight into a new
// Pending PRS draft. Always available above the tabs, not gated by
// suggestPrsGroups' MIN_PICKUPS_TO_SUGGEST threshold.
function CreatePrsModal({ poolPickups, availableVehicles, onClose, onCreate }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const filtered = poolPickups.filter((p) => pickupMatches(p, query))
  const selectedWeightKg = weightOf([...selected])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))))
  }

  // AssignDropdown just needs {tempId, totalEstWeightKg, vehicleId, hubName}
  // per option — a vehicle with 0kg already loaded fits that shape exactly,
  // so the same searchable/color-coded picker works here unchanged.
  const vehicleOptions = availableVehicles.map((v) => ({ tempId: v.id, totalEstWeightKg: 0, vehicleId: v.id, hubName: v.city }))

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Create New PRS</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search unassigned pickups…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No unassigned pickups match.</p>
          ) : (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 px-1 pb-1 text-xs font-medium text-slate-500">
                <input type="checkbox" checked={selected.size === filtered.length} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange" />
                Select all ({filtered.length})
              </label>
              {filtered.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50/60 px-3 py-2 text-sm">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-brand-orange" />
                  <span className="min-w-0">
                    <span className="font-medium text-slate-700">{p.id}</span>
                    <span className="ml-2 text-xs text-slate-400">{p.clientName} · {p.dropMiniHubName} · {p.estWeightKg} kg</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 px-5 py-3.5">
          <span className="text-xs text-slate-500">{selected.size} pickup{selected.size === 1 ? '' : 's'} selected · {selectedWeightKg.toLocaleString('en-IN')} kg</span>
          <AssignDropdown
            drafts={vehicleOptions}
            movingWeightKg={selectedWeightKg}
            label="Select vehicle & create"
            disabled={selected.size === 0}
            onAssign={(vehicleId) => onCreate(vehicleId, [...selected])}
          />
        </div>
      </div>
    </div>
  )
}

// A supervisor's editable draft-batching row — suggestPrsGroups() (data/
// prs.js) proposes runs (group by drop Mini Hub, chunk by vehicle capacity);
// collapsed it reads like the Active PRS table (same columns, a "Draft"
// status instead of "Generated") so both tabs feel like one continuous flow.
// "Modify" expands the actual edit surface — swap vehicle, multi-select
// pickups to move to Unassigned or a sibling draft, add pickups back in from
// Unassigned — everything stays local until "Generate PRS" persists it for
// real. "Delete" drops the whole draft — its pickups simply stop being
// placed in any draft, so they reappear in Unassigned Pickups automatically.
function DraftRow({ draft, isOpen, siblingDrafts, onToggle, onRemovePickup, onAddPickup, onDelete, onGenerate, onBulkUnassign, onBulkMove, poolPickups }) {
  const vehicle = FLEET_SEED.find((v) => v.id === draft.vehicleId)
  const pct = vehicle ? Math.round((draft.totalEstWeightKg / vehicle.capacityKg) * 100) : 0
  const overCapacity = vehicle && draft.totalEstWeightKg > vehicle.capacityKg
  const addablePool = poolPickups.filter((p) => p.dropMiniHubId === draft.hubId)
  const pickups = draft.pickupIds.map(findPickup).filter(Boolean)
  const canGenerate = !!draft.vehicleId && draft.pickupIds.length > 0 && !overCapacity

  const [selected, setSelected] = useState(() => new Set())
  const selectedCount = selected.size
  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    setSelected((prev) => (prev.size === pickups.length ? new Set() : new Set(pickups.map((p) => p.id))))
  }
  function clearSelection() {
    setSelected(new Set())
  }

  return (
    <Fragment>
      <tr className={`${rowCls} cursor-pointer`} onClick={onToggle}>
        <td className={`${tdCls} font-medium text-slate-800`}>
          {draft.hubName}
          <span className="ml-1.5 text-xs font-normal text-slate-400">{draft.hubCity} · {draft.pickupIds.length} pickup{draft.pickupIds.length === 1 ? '' : 's'}</span>
        </td>
        <td className={tdCls}>
          {vehicle ? (
            <>
              <div className="font-medium text-slate-700">{vehicle.driverName}</div>
              <div className="text-xs text-slate-400">{vehicle.regNo} · {vehicle.type}</div>
            </>
          ) : (
            <span className="text-xs font-medium text-rose-500">No vehicle available</span>
          )}
        </td>
        <td className={`${tdCls} min-w-[140px]`}>
          {vehicle ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${utilizationBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className={`text-xs font-semibold ${utilizationTextColor(pct)}`}>{pct}%</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{draft.totalEstWeightKg.toLocaleString('en-IN')} / {vehicle.capacityKg.toLocaleString('en-IN')} kg</div>
              {overCapacity && <div className="text-xs font-medium text-rose-500">Over capacity</div>}
            </>
          ) : (
            <span className="text-xs text-slate-400">{draft.totalEstWeightKg.toLocaleString('en-IN')} kg</span>
          )}
        </td>
        <td className={`${tdCls} text-right`}>
          <div className="flex items-center justify-end gap-2.5">
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggle() }} className="text-xs font-medium text-slate-500 hover:text-brand-orange-dark">
              Modify
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-xs font-medium text-slate-400 hover:text-rose-500">
              Delete
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onGenerate(draft) }}
              disabled={!canGenerate}
              className={`${btnPrimary} px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Generate
            </button>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={4} className="space-y-3 px-5 py-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                {pickups.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <input type="checkbox" checked={selectedCount === pickups.length} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange" />
                    Select all
                  </label>
                )}
                {selectedCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-orange/10 px-2.5 py-1">
                    <span className="text-xs font-semibold text-brand-orange-dark">{selectedCount} selected</span>
                    <MoveToDropdown
                      siblingDrafts={siblingDrafts}
                      movingWeightKg={weightOf([...selected])}
                      onUnassign={() => { onBulkUnassign(draft.tempId, [...selected]); clearSelection() }}
                      onMove={(targetTempId) => { onBulkMove(draft.tempId, targetTempId, [...selected]); clearSelection() }}
                    />
                  </div>
                )}
              </div>

              {pickups.map((p) => (
                <label key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm shadow-soft">
                  <span className="flex min-w-0 items-center gap-2">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-brand-orange" />
                    <span className="min-w-0">
                      <span className="font-medium text-slate-700">{p.id}</span>
                      <span className="ml-2 text-xs text-slate-400">{p.clientName} · {p.consignor.city} · {p.estWeightKg} kg</span>
                    </span>
                  </span>
                  <button type="button" onClick={() => onRemovePickup(draft.tempId, p.id)} className="shrink-0 text-slate-400 hover:text-rose-500">
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </label>
              ))}
              {pickups.length === 0 && <p className="text-xs text-slate-400">No pickups left in this draft.</p>}
            </div>

            {addablePool.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && onAddPickup(draft.tempId, e.target.value)}
                className="w-full max-w-md appearance-none rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              >
                <option value="">+ Add a pickup from {draft.hubName}…</option>
                {addablePool.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} — {p.clientName} · {p.estWeightKg} kg</option>
                ))}
              </select>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  )
}

// One row per generated PRS, styled as a compact table (PRS No. / Pickups /
// Client / Captain & Vehicle / Weight / Status) so a long list of run sheets
// scans at a glance — row expands to the individual pickups. No edit action:
// once generated a PRS is locked (see GenerateConfirmModal's copy).
function ActivePrsRow({ prs, isOpen, onToggle }) {
  const pickups = prs.pickupIds.map(findPickup).filter(Boolean)
  const totalWeight = weightOf(prs.pickupIds)
  const clientNames = [...new Set(pickups.map((p) => p.clientName))]
  const clientLabel = clientNames.length === 0 ? '—' : clientNames.length === 1 ? clientNames[0] : `${clientNames[0]} +${clientNames.length - 1} more`

  return (
    <Fragment>
      <tr className={`${rowCls} cursor-pointer`} onClick={onToggle}>
        <td className={`${tdCls} font-medium text-slate-800`}>{prs.id}</td>
        <td className={tdCls}>
          <span className="text-slate-700">{prs.hubName}</span>
          <span className="ml-1.5 text-xs text-slate-400">{prs.pickupIds.length} pickup{prs.pickupIds.length === 1 ? '' : 's'}</span>
        </td>
        <td className={tdCls}>{clientLabel}</td>
        <td className={tdCls}>
          <div className="font-medium text-slate-700">{prs.driverName ?? 'Unassigned'}</div>
          <div className="text-xs text-slate-400">{prs.vehicleLabel}</div>
        </td>
        <td className={tdCls}>{totalWeight.toLocaleString('en-IN')} kg</td>
        <td className={tdCls}>
          <span className={`${pill} bg-sky-50 text-sky-700`}>Generated</span>
        </td>
        <td className={`${tdCls} text-right`}>
          <div className="flex items-center justify-end gap-3">
            <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={7} className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              {pickups.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3.5 py-2.5 text-sm shadow-soft">
                  <div>
                    <span className="font-medium text-slate-700">{p.id}</span>
                    <span className="ml-2 text-xs text-slate-400">{p.clientName} · {p.consignor.city} · {p.estWeightKg} kg</span>
                  </div>
                  <span className={`${pill} ${PICKUP_STATUS_BADGE[p.status]}`}>{PICKUP_STATUS_LABEL[p.status]}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export default function PRS() {
  // Runs before the drafts state below is seeded — standing in for a
  // scheduled job in this no-backend prototype: promotes any Draft pickup
  // past its edit-lock window to CREATED (making it visible to the pool)
  // and tops up every recurring series' rolling window. Both are idempotent.
  refreshPickupLocks()
  refreshRecurringWindows()

  const [tab, setTab] = useState('pending')
  const [drafts, setDrafts] = useState(() => suggestPrsGroups(PICKUPS_SEED))
  const [prsList, setPrsList] = useState(PRS_SEED)
  const [expandedPrsId, setExpandedPrsId] = useState(null)
  const [expandedDraftId, setExpandedDraftId] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedUnassigned, setSelectedUnassigned] = useState(() => new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmingDraft, setConfirmingDraft] = useState(null)
  const todayStr = localDateStr(new Date())
  // Unassigned Pickups' calendar: Breached (scheduled date already passed) is
  // its own toggle since it needs the red-alert treatment; any other date
  // need (today, a single day, a span) is just a from/to range — typing
  // either bound switches into range mode, Breached clears it.
  const [unassignedDateMode, setUnassignedDateMode] = useState('all')
  const [unassignedRangeStart, setUnassignedRangeStart] = useState('')
  const [unassignedRangeEnd, setUnassignedRangeEnd] = useState('')
  // Pending PRS's calendar: same Today-chip + single-calendar-range pattern
  // as Unassigned Pickups, filtering drafts by any pickup's scheduled date
  // falling inside the chosen range.
  const [pendingDateFilter, setPendingDateFilter] = useState('all')
  const [pendingRangeStart, setPendingRangeStart] = useState('')
  const [pendingRangeEnd, setPendingRangeEnd] = useState('')
  const [filters, setFilters] = useState({
    unassigned: { city: new Set(), hub: new Set() },
    pending: { hub: new Set(), vehicle: new Set() },
    active: { hub: new Set(), client: new Set(), vehicle: new Set() },
  })
  function setColumnFilter(tabKey, column, newSet) {
    setFilters((prev) => ({ ...prev, [tabKey]: { ...prev[tabKey], [column]: newSet } }))
  }

  const placedIds = new Set(drafts.flatMap((d) => d.pickupIds))
  const poolPickups = PICKUPS_SEED.filter((p) => p.status === PICKUP_STATUS.CREATED && !placedIds.has(p.id))
  const usedVehicleIds = new Set(drafts.map((d) => d.vehicleId).filter(Boolean))
  const readyDraftsCount = drafts.filter((d) => d.vehicleId && d.pickupIds.length > 0 && d.totalEstWeightKg <= (FLEET_SEED.find((v) => v.id === d.vehicleId)?.capacityKg ?? Infinity)).length
  const activeTotalWeight = prsList.reduce((sum, p) => sum + weightOf(p.pickupIds), 0)
  const activeTotalPickups = prsList.reduce((sum, p) => sum + p.pickupIds.length, 0)

  // Column filter option lists are derived from the full (unfiltered) set for
  // each tab, so picking one value doesn't make the others disappear from
  // the list of choices.
  const unassignedCityOptions = [...new Set(poolPickups.map((p) => p.consignor.city))].sort()
  const unassignedHubOptions = [...new Set(poolPickups.map((p) => p.dropMiniHubName))].sort()

  const pendingHubOptions = [...new Set(drafts.map((d) => d.hubName))].sort()
  const pendingVehicleOptions = [...new Set(drafts.map((d) => FLEET_SEED.find((v) => v.id === d.vehicleId)?.driverName).filter(Boolean))].sort()

  const activeHubOptions = [...new Set(prsList.map((p) => p.hubName))].sort()
  const activeClientOptions = [...new Set(prsList.flatMap((p) => p.pickupIds.map((id) => findPickup(id)?.clientName)).filter(Boolean))].sort()
  const activeVehicleOptions = [...new Set(prsList.map((p) => p.driverName).filter(Boolean))].sort()

  function pickupMatchesDateMode(p) {
    if (unassignedDateMode === 'all') return true
    if (!p.scheduledDate) return false
    if (unassignedDateMode === 'breached') return p.scheduledDate < todayStr
    if (unassignedDateMode === 'range') {
      return (!unassignedRangeStart || p.scheduledDate >= unassignedRangeStart) &&
        (!unassignedRangeEnd || p.scheduledDate <= unassignedRangeEnd)
    }
    return true
  }
  const filteredPool = poolPickups.filter((p) =>
    pickupMatches(p, search) &&
    pickupMatchesDateMode(p) &&
    (filters.unassigned.city.size === 0 || filters.unassigned.city.has(p.consignor.city)) &&
    (filters.unassigned.hub.size === 0 || filters.unassigned.hub.has(p.dropMiniHubName)),
  ).sort((a, b) => {
    if (!a.scheduledDate) return 1
    if (!b.scheduledDate) return -1
    return a.scheduledDate === b.scheduledDate
      ? (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
      : a.scheduledDate.localeCompare(b.scheduledDate)
  })
  const breachedCount = poolPickups.filter((p) => p.scheduledDate && p.scheduledDate < todayStr).length
  const dueTodayCount = poolPickups.filter((p) => p.scheduledDate === todayStr).length

  const dueTodayPendingCount = drafts.flatMap((d) => d.pickupIds).filter((id) => findPickup(id)?.scheduledDate === todayStr).length
  function draftMatchesDateFilter(d) {
    if (pendingDateFilter !== 'range') return true
    const dates = d.pickupIds.map((id) => findPickup(id)?.scheduledDate).filter(Boolean)
    return dates.some((date) => (!pendingRangeStart || date >= pendingRangeStart) && (!pendingRangeEnd || date <= pendingRangeEnd))
  }
  const filteredDrafts = drafts.filter((d) => {
    const v = FLEET_SEED.find((row) => row.id === d.vehicleId)
    return draftMatches(d, search) &&
      draftMatchesDateFilter(d) &&
      (filters.pending.hub.size === 0 || filters.pending.hub.has(d.hubName)) &&
      (filters.pending.vehicle.size === 0 || (v && filters.pending.vehicle.has(v.driverName)))
  })
  const filteredPrsList = prsList.filter((prs) => {
    const prsClients = new Set(prs.pickupIds.map((id) => findPickup(id)?.clientName).filter(Boolean))
    return prsMatches(prs, search) &&
      (filters.active.hub.size === 0 || filters.active.hub.has(prs.hubName)) &&
      (filters.active.vehicle.size === 0 || (prs.driverName && filters.active.vehicle.has(prs.driverName))) &&
      (filters.active.client.size === 0 || [...prsClients].some((c) => filters.active.client.has(c)))
  })
  const isSearching = search.trim().length > 0
  const unassignedFiltering = isSearching || unassignedDateMode !== 'all' || filters.unassigned.city.size > 0 || filters.unassigned.hub.size > 0
  const pendingFiltering = isSearching || pendingDateFilter !== 'all' || filters.pending.hub.size > 0 || filters.pending.vehicle.size > 0
  const activeFiltering = isSearching || filters.active.hub.size > 0 || filters.active.vehicle.size > 0 || filters.active.client.size > 0

  function recomputeWeight(draft, pickupIds) {
    return { ...draft, pickupIds, totalEstWeightKg: weightOf(pickupIds) }
  }
  function updateDraft(tempId, updater) {
    setDrafts((prev) => prev.map((d) => (d.tempId === tempId ? updater(d) : d)))
  }
  function handleRemovePickup(tempId, pickupId) {
    updateDraft(tempId, (d) => recomputeWeight(d, d.pickupIds.filter((id) => id !== pickupId)))
  }
  function handleAddPickup(tempId, pickupId) {
    updateDraft(tempId, (d) => recomputeWeight(d, [...d.pickupIds, pickupId]))
  }
  function handleDelete(tempId) {
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId))
  }
  function handleBulkUnassign(tempId, pickupIds) {
    updateDraft(tempId, (d) => recomputeWeight(d, d.pickupIds.filter((id) => !pickupIds.includes(id))))
  }
  function handleBulkMove(sourceTempId, targetTempId, pickupIds) {
    setDrafts((prev) => prev.map((d) => {
      if (d.tempId === sourceTempId) return recomputeWeight(d, d.pickupIds.filter((id) => !pickupIds.includes(id)))
      if (d.tempId === targetTempId) return recomputeWeight(d, [...d.pickupIds, ...pickupIds])
      return d
    }))
  }
  function handleConfirmGenerate(draft) {
    const prs = generatePrs({ hubName: draft.hubName, vehicleId: draft.vehicleId, pickupIds: draft.pickupIds })
    setDrafts((prev) => prev.filter((d) => d.tempId !== draft.tempId))
    setPrsList([...PRS_SEED])
    setConfirmingDraft(null)
    setTab('active')
    setExpandedPrsId(prs.id)
  }
  function handleAssignFromUnassigned(targetTempId, pickupIds) {
    updateDraft(targetTempId, (d) => recomputeWeight(d, [...d.pickupIds, ...pickupIds]))
    setSelectedUnassigned(new Set())
    setTab('pending')
    setExpandedDraftId(targetTempId)
  }
  function handleCreatePrs(vehicleId, pickupIds) {
    const pickedHubs = [...new Set(pickupIds.map((id) => findPickup(id)?.dropMiniHubId).filter(Boolean))]
    const singleHub = pickedHubs.length === 1 ? MINI_HUBS.find((h) => h.id === pickedHubs[0]) : null
    const tempId = `draft-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newDraft = {
      tempId,
      hubId: singleHub?.id ?? null,
      hubName: singleHub?.name ?? 'Multiple hubs',
      hubCity: singleHub?.city ?? '',
      vehicleId,
      pickupIds,
      totalEstWeightKg: weightOf(pickupIds),
    }
    setDrafts((prev) => [...prev, newDraft])
    setShowCreateModal(false)
    setTab('pending')
    setExpandedDraftId(tempId)
  }
  function toggleUnassignedSelected(id) {
    setSelectedUnassigned((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleUnassignedSelectAll() {
    setSelectedUnassigned((prev) => (prev.size === filteredPool.length ? new Set() : new Set(filteredPool.map((p) => p.id))))
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">PRS (Pickup Run Sheet)</h1>
          <p className="mt-1 text-slate-500">Batch ungrouped pickups into a run sheet, assign a vehicle, and hand it off for dispatch.</p>
        </div>
        <button type="button" onClick={() => setShowCreateModal(true)} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" />
          Create New PRS
        </button>
      </div>

      {showCreateModal && (
        <CreatePrsModal
          poolPickups={poolPickups}
          availableVehicles={FLEET_SEED.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE)}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePrs}
        />
      )}

      {confirmingDraft && (
        <GenerateConfirmModal
          draft={confirmingDraft}
          vehicle={FLEET_SEED.find((v) => v.id === confirmingDraft.vehicleId)}
          onCancel={() => setConfirmingDraft(null)}
          onConfirm={handleConfirmGenerate}
        />
      )}

      {tab === 'pending' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
          Pickups are auto-grouped by their drop Mini Hub once it has {MIN_PICKUPS_TO_SUGGEST}+ waiting, and packed onto the nearest available vehicle up to its capacity. A pickup lands in Unassigned Pickups whenever it can't be auto-placed — not enough volume yet, no vehicle available, or a draft it was in got deleted.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm">
          <button type="button" onClick={() => setTab('unassigned')} className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'unassigned' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
            Unassigned Pickups <span className="text-slate-400">({poolPickups.length})</span>
          </button>
          <button type="button" onClick={() => setTab('pending')} className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'pending' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
            Pending PRS <span className="text-slate-400">({drafts.length})</span>
          </button>
          <button type="button" onClick={() => setTab('active')} className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'active' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
            Active PRS <span className="text-slate-400">({prsList.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PRS no., pickup ID, client, vehicle no…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
          {isSearching && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {tab === 'unassigned' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Unassigned pickups" value={poolPickups.length} dot="bg-amber-500" />
            <Kpi label="Weight waiting" value={`${poolPickups.reduce((sum, p) => sum + p.estWeightKg, 0).toLocaleString('en-IN')} kg`} dot="bg-slate-400" />
            <Kpi label="Drop Mini Hubs involved" value={new Set(poolPickups.map((p) => p.dropMiniHubId)).size} dot="bg-sky-500" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUnassignedDateMode((m) => (m === 'breached' ? 'all' : 'breached'))
                setUnassignedRangeStart('')
                setUnassignedRangeEnd('')
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${unassignedDateMode === 'breached' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${breachedCount > 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
              Breached {breachedCount > 0 && `(${breachedCount})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setUnassignedDateMode('range')
                setUnassignedRangeStart(todayStr)
                setUnassignedRangeEnd(todayStr)
              }}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${unassignedDateMode === 'range' && unassignedRangeStart === todayStr && unassignedRangeEnd === todayStr ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Today {dueTodayCount > 0 && `(${dueTodayCount})`}
            </button>
            <DateRangeControl
              start={unassignedRangeStart}
              end={unassignedRangeEnd}
              minDate={addDays(todayStr, 1)}
              onChange={(start, end) => { setUnassignedDateMode('range'); setUnassignedRangeStart(start); setUnassignedRangeEnd(end) }}
            />
            {unassignedDateMode !== 'all' && (
              <button
                type="button"
                onClick={() => { setUnassignedDateMode('all'); setUnassignedRangeStart(''); setUnassignedRangeEnd('') }}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {poolPickups.length === 0 ? (
            <EmptyState icon="approve" title="Nothing unassigned" subtitle="Every booked pickup is already sitting in a suggested or generated run sheet." />
          ) : filteredPool.length === 0 ? (
            <EmptyState icon="search" title="No matches" subtitle="Nothing in Unassigned Pickups matches your search and filters." />
          ) : (
            <div className={`overflow-hidden ${card}`}>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Waiting to be assigned to a PRS {unassignedFiltering && `(${filteredPool.length} of ${poolPickups.length})`}
                </span>
                {selectedUnassigned.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-orange/10 px-2.5 py-1">
                    <span className="text-xs font-semibold text-brand-orange-dark">{selectedUnassigned.size} selected</span>
                    <AssignDropdown
                      drafts={drafts}
                      movingWeightKg={weightOf([...selectedUnassigned])}
                      onAssign={(targetTempId) => handleAssignFromUnassigned(targetTempId, [...selectedUnassigned])}
                    />
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thCls}>
                        <input
                          type="checkbox"
                          checked={selectedUnassigned.size === filteredPool.length && filteredPool.length > 0}
                          onChange={toggleUnassignedSelectAll}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange"
                        />
                      </th>
                      <th className={thCls}>Pickup ID</th>
                      <th className={thCls}>Pickup date &amp; time</th>
                      <th className={thCls}>
                        Mini Hub
                        <ColumnFilter label="hub" options={unassignedHubOptions} selected={filters.unassigned.hub} onChange={(s) => setColumnFilter('unassigned', 'hub', s)} />
                      </th>
                      <th className={thCls}>
                        Pickup Pincode-City
                        <ColumnFilter label="city" options={unassignedCityOptions} selected={filters.unassigned.city} onChange={(s) => setColumnFilter('unassigned', 'city', s)} />
                      </th>
                      <th className={thCls}>Weight</th>
                      <th className={thCls} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPool.map((p) => (
                      <tr key={p.id} className={rowCls}>
                        <td className={tdCls}>
                          <input
                            type="checkbox"
                            checked={selectedUnassigned.has(p.id)}
                            onChange={() => toggleUnassignedSelected(p.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-orange"
                          />
                        </td>
                        <td className={`${tdCls} font-medium text-slate-800`}>{p.id}</td>
                        <td className={tdCls}>
                          {p.scheduledDate ? (
                            <span className={p.scheduledDate < todayStr ? 'font-medium text-rose-600' : p.scheduledDate === todayStr ? 'font-medium text-brand-orange-dark' : 'text-slate-500'}>
                              {p.scheduledDate}{p.scheduledTime ? ` · ${p.scheduledTime}` : ''}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={tdCls}>{p.dropMiniHubName}</td>
                        <td className={tdCls}>{p.consignor.pincode} - {p.consignor.city}</td>
                        <td className={tdCls}>{p.estWeightKg} kg</td>
                        <td className={`${tdCls} text-right`}>
                          <AssignDropdown
                            drafts={drafts}
                            movingWeightKg={p.estWeightKg}
                            onAssign={(targetTempId) => handleAssignFromUnassigned(targetTempId, [p.id])}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'pending' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Suggested run sheets" value={drafts.length} dot="bg-slate-400" />
            <Kpi label="Ready to generate" value={readyDraftsCount} dot="bg-emerald-500" />
            <Kpi label="Unassigned pickups" value={poolPickups.length} dot="bg-amber-500" />
            <Kpi label="Vehicles suggested" value={usedVehicleIds.size} dot="bg-sky-500" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Planned</span>
            <button
              type="button"
              onClick={() => {
                setPendingDateFilter('range')
                setPendingRangeStart(todayStr)
                setPendingRangeEnd(todayStr)
              }}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${pendingDateFilter === 'range' && pendingRangeStart === todayStr && pendingRangeEnd === todayStr ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Today {dueTodayPendingCount > 0 && `(${dueTodayPendingCount})`}
            </button>
            <DateRangeControl
              start={pendingRangeStart}
              end={pendingRangeEnd}
              minDate={addDays(todayStr, 1)}
              onChange={(start, end) => { setPendingDateFilter('range'); setPendingRangeStart(start); setPendingRangeEnd(end) }}
            />
            {pendingDateFilter !== 'all' && (
              <button
                type="button"
                onClick={() => { setPendingDateFilter('all'); setPendingRangeStart(''); setPendingRangeEnd('') }}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {drafts.length === 0 ? (
            <EmptyState
              icon="approve"
              title={poolPickups.length === 0 ? 'Nothing waiting to be grouped' : 'No suggestions left'}
              subtitle={poolPickups.length === 0 ? 'Every pickup is already in a run sheet.' : 'Add pickups back from the Unassigned Pickups tab.'}
            />
          ) : filteredDrafts.length === 0 ? (
            <EmptyState icon="search" title="No matches" subtitle="Nothing in Pending PRS matches your search and filters." />
          ) : (
            <div className={`overflow-hidden ${card}`}>
              <div className="border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Suggested run sheets {pendingFiltering && `(${filteredDrafts.length} of ${drafts.length})`}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thCls}>
                        Reporting Mini Hub
                        <ColumnFilter label="hub" options={pendingHubOptions} selected={filters.pending.hub} onChange={(s) => setColumnFilter('pending', 'hub', s)} />
                      </th>
                      <th className={thCls}>
                        Suggested Vehicle
                        <ColumnFilter label="driver" options={pendingVehicleOptions} selected={filters.pending.vehicle} onChange={(s) => setColumnFilter('pending', 'vehicle', s)} />
                      </th>
                      <th className={thCls}>Utilization</th>
                      <th className={thCls}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrafts.map((draft) => (
                      <DraftRow
                        key={draft.tempId}
                        draft={draft}
                        isOpen={expandedDraftId === draft.tempId}
                        siblingDrafts={drafts.filter((d) => d.tempId !== draft.tempId)}
                        onToggle={() => setExpandedDraftId(expandedDraftId === draft.tempId ? null : draft.tempId)}
                        onRemovePickup={handleRemovePickup}
                        onAddPickup={handleAddPickup}
                        onDelete={() => handleDelete(draft.tempId)}
                        onGenerate={setConfirmingDraft}
                        onBulkUnassign={handleBulkUnassign}
                        onBulkMove={handleBulkMove}
                        poolPickups={poolPickups}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Active run sheets" value={prsList.length} dot="bg-sky-500" />
            <Kpi label="Pickups in transit" value={activeTotalPickups} dot="bg-slate-400" />
            <Kpi label="Weight moving" value={`${activeTotalWeight.toLocaleString('en-IN')} kg`} dot="bg-emerald-500" />
          </div>

          {prsList.length === 0 ? (
            <EmptyState icon="route" title="No run sheets generated yet" subtitle="Generate one from the Pending PRS tab to see it here." />
          ) : filteredPrsList.length === 0 ? (
            <EmptyState icon="search" title="No matches" subtitle="Nothing in Active PRS matches your search and filters." />
          ) : (
            <div className={`overflow-hidden ${card}`}>
              <div className="border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Run sheets {activeFiltering && `(${filteredPrsList.length} of ${prsList.length})`}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thCls}>PRS No.</th>
                      <th className={thCls}>
                        Hub / Pickups
                        <ColumnFilter label="hub" options={activeHubOptions} selected={filters.active.hub} onChange={(s) => setColumnFilter('active', 'hub', s)} />
                      </th>
                      <th className={thCls}>
                        Client
                        <ColumnFilter label="client" options={activeClientOptions} selected={filters.active.client} onChange={(s) => setColumnFilter('active', 'client', s)} />
                      </th>
                      <th className={thCls}>
                        Captain / Vehicle
                        <ColumnFilter label="captain" options={activeVehicleOptions} selected={filters.active.vehicle} onChange={(s) => setColumnFilter('active', 'vehicle', s)} />
                      </th>
                      <th className={thCls}>Weight</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrsList.map((prs) => (
                      <ActivePrsRow
                        key={prs.id}
                        prs={prs}
                        isOpen={expandedPrsId === prs.id}
                        onToggle={() => setExpandedPrsId(expandedPrsId === prs.id ? null : prs.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

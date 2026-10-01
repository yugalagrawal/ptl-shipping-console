import { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { ODA_PINCODE_DIRECTORY, ODA_CATEGORIES } from '../data/odaPincodes.js'
import { INDIAN_STATES, lookupPincode } from '../data/geo.js'

let odaRowSeq = 1
const PAGE_SIZE = 100

const PINCODE_LOCATION = new Map()
for (const [state, districts] of Object.entries(ODA_PINCODE_DIRECTORY)) {
  for (const [district, pins] of Object.entries(districts)) pins.forEach((pin) => PINCODE_LOCATION.set(pin, { state, district, city: '' }))
}

const ODA_BADGE = {
  1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  2: 'bg-amber-50 text-amber-700 border-amber-200',
  3: 'bg-rose-50 text-rose-700 border-rose-200',
}
const ODA_CARD = {
  1: 'border-emerald-200 hover:border-emerald-400',
  2: 'border-amber-200 hover:border-amber-400',
  3: 'border-rose-200 hover:border-rose-400',
}

const FILTER_COLS = ['state', 'district', 'city', 'pincode']
const FILTER_LIMIT = 200

// Excel-style column filter: a funnel icon in the header that opens a
// searchable checkbox list. An empty selection means "no filter".
function ColumnFilter({ label, options, value, onChange }) {
  const [anchor, setAnchor] = useState(null) // { top, left } while open
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = q ? options.filter((o) => (o.name || '(Blanks)').toLowerCase().includes(q)) : options
  const shown = matches.slice(0, FILTER_LIMIT)
  const allShownTicked = shown.length > 0 && shown.every((o) => value.has(o.name))
  function toggle(name) {
    const next = new Set(value)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange(next)
  }
  function toggleShown() {
    const next = new Set(value)
    shown.forEach((o) => (allShownTicked ? next.delete(o.name) : next.add(o.name)))
    onChange(next)
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <button
        type="button"
        title={`Filter ${label}`}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setQuery('')
          setAnchor(anchor ? null : { top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 270) })
        }}
        className={`rounded p-0.5 hover:bg-slate-100 ${value.size ? 'text-brand-orange-dark' : 'text-slate-400'}`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={value.size ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M2 3h12l-4.5 5.5V13l-3 1.5V8.5L2 3z" />
        </svg>
      </button>
      {anchor && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAnchor(null)} />
          <div style={{ top: anchor.top, left: anchor.left }} className="fixed z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 text-left normal-case tracking-normal shadow-soft">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allShownTicked}
                onChange={toggleShown}
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
              />
              {q ? 'Select all results' : 'Select all'}
            </label>
            <div className="max-h-56 overflow-y-auto">
              {shown.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs font-normal text-slate-400">No match.</p>
              ) : (
                shown.map((o) => (
                  <label key={o.name || '__blank'} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs font-normal text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={value.has(o.name)}
                      onChange={() => toggle(o.name)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                    />
                    <span className="min-w-0 flex-1 truncate">{o.name || '(Blanks)'}</span>
                    <span className="shrink-0 tabular-nums text-[11px] text-slate-400">{fmt(o.count)}</span>
                  </label>
                ))
              )}
              {matches.length > shown.length && <p className="px-2 py-1.5 text-[11px] font-normal text-slate-400">+{fmt(matches.length - shown.length)} more — type to narrow.</p>}
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[11px]">
              <button type="button" onClick={() => onChange(new Set())} disabled={!value.size} className="font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40">
                Clear
              </button>
              <button type="button" onClick={() => setAnchor(null)} className="rounded-md bg-brand-orange px-2.5 py-1 font-medium text-white hover:bg-brand-orange-dark">
                OK
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const fmt = (n) => n.toLocaleString('en-IN')
function emptyFilters() {
  return { state: new Set(), district: new Set(), city: new Set(), pincode: new Set() }
}
function countBy(rows, key) {
  const m = new Map()
  rows.forEach((r) => {
    const k = key(r)
    m.set(k, (m.get(k) ?? 0) + 1)
  })
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => (a.name === '' ? 1 : b.name === '' ? -1 : a.name.localeCompare(b.name)))
}

// ODA (Out of Delivery Area) list widget. Every pincode sits in one of three
// ODA categories (1/2/3), each with its own default rate
// (`rate` = { 1: {perKg, perAwb}, 2: ..., 3: ... }). The modal has a pincode
// search / add bar on top, one card per category, and clicking a card opens
// that category's pincode sheet (State/UT · District · City · Pincode ·
// Action). Used per-client in the New Client wizard and as the shared
// "Default ODA List" in Client Pricing Configuration > Additional Charges;
// it only reads/writes through the callbacks.
export default function OdaListManager({ title = 'Client ODA List', entries, onEntriesChange, rate, onRateChange }) {
  const [open, setOpen] = useState(false)
  const [sheetCat, setSheetCat] = useState(null) // null = overview, else 1|2|3
  const [editingRates, setEditingRates] = useState(false)

  // Pincode search / add bar
  const [pin, setPin] = useState('')
  const [lookup, setLookup] = useState(null) // null | 'loading' | 'not-found' | { state, district, city }
  const [manual, setManual] = useState({ state: '', district: '', city: '' })
  const [notice, setNotice] = useState('')

  // Sheet view
  const [sheetSearch, setSheetSearch] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [filters, setFilters] = useState(() => emptyFilters())

  const setEntries = onEntriesChange
  function setRate(cat, field, value) {
    onRateChange((prev) => ({ ...prev, [cat]: { ...prev[cat], [field]: Math.max(0, Number(value) || 0) } }))
  }

  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0 }
    entries.forEach((r) => (c[r.oda ?? 1] += 1))
    return c
  }, [entries])

  // ---- search / add bar ----
  const existing = pin.length === 6 ? entries.find((r) => r.pincode === pin) : null
  function handlePin(value) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setPin(digits)
    setLookup(null)
    setManual({ state: '', district: '', city: '' })
    setNotice('')
    if (digits.length !== 6) return
    const known = PINCODE_LOCATION.get(digits)
    if (known) return setLookup(known)
    setLookup('loading')
    lookupPincode(digits).then((result) => {
      setPin((current) => {
        if (current === digits) setLookup(result ? { state: result.state, district: '', city: result.city } : 'not-found')
        return current
      })
    })
  }
  const manualReady = lookup === 'not-found' && manual.state && manual.district.trim()
  function addToOda(oda) {
    const loc = lookup === 'not-found' ? { state: manual.state, district: manual.district.trim(), city: manual.city.trim() } : lookup
    setEntries((rows) => [...rows, { id: odaRowSeq++, pincode: pin, state: loc.state, district: loc.district, city: loc.city, oda }])
    setNotice(`Added ${pin} to ODA ${oda}`)
    setPin('')
    setLookup(null)
  }
  function moveExisting(oda) {
    setEntries((rows) => rows.map((r) => (r.pincode === pin ? { ...r, oda } : r)))
    setNotice(`Moved ${pin} to ODA ${oda}`)
    setPin('')
    setLookup(null)
  }
  function removeExisting() {
    setEntries((rows) => rows.filter((r) => r.pincode !== pin))
    setNotice(`Removed ${pin} from the ODA list`)
    setPin('')
    setLookup(null)
  }

  // ---- sheet view ----
  const q = sheetSearch.trim().toLowerCase()
  const catRows = useMemo(() => (sheetCat ? entries.filter((r) => (r.oda ?? 1) === sheetCat) : []), [entries, sheetCat])
  const passes = (r, skip) => FILTER_COLS.every((col) => col === skip || !filters[col].size || filters[col].has(r[col] ?? ''))
  // Each column's list only offers values still reachable under the other columns' filters.
  const colOptions = useMemo(
    () => Object.fromEntries(FILTER_COLS.map((col) => [col, countBy(catRows.filter((r) => passes(r, col)), (r) => r[col] ?? '')])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catRows, filters],
  )
  const sheetRows = useMemo(
    () =>
      catRows.filter(
        (r) =>
          passes(r) &&
          (!q || r.pincode.includes(q) || r.state.toLowerCase().includes(q) || (r.district ?? '').toLowerCase().includes(q) || (r.city ?? '').toLowerCase().includes(q)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catRows, filters, q],
  )
  const isFiltered = Boolean(q || FILTER_COLS.some((c) => filters[c].size))

  function openSheet(cat) {
    setSheetCat(cat)
    setSheetSearch('')
    setLimit(PAGE_SIZE)
    setFilters(emptyFilters())
  }
  function applyAction(ids, action) {
    const idSet = new Set(ids)
    setEntries((rows) => (action === 'remove' ? rows.filter((r) => !idSet.has(r.id)) : rows.map((r) => (idSet.has(r.id) ? { ...r, oda: action } : r))))
  }

  function openModal() {
    setSheetCat(null)
    setPin('')
    setLookup(null)
    setNotice('')
    setEditingRates(false)
    setOpen(true)
  }

  const inputCls = 'rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs tabular-nums text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40'

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {entries.length === 0 ? (
            'No ODA pincodes added yet.'
          ) : (
            <>
              <span className="text-base font-semibold tabular-nums text-slate-900">{fmt(entries.length)}</span> ODA pincodes
            </>
          )}
        </p>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Icon name={entries.length > 0 ? 'edit' : 'plus'} className="h-3.5 w-3.5" />
          {entries.length > 0 ? 'View / Edit' : 'Add pincodes'}
        </button>
      </div>
      {entries.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ODA_CATEGORIES.map((c) => (
            <div key={c} className={`rounded-lg border bg-white px-3 py-2.5 ${ODA_CARD[c].split(' ')[0]}`}>
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ODA_BADGE[c]}`}>ODA {c}</span>
                <span className="text-base font-semibold tabular-nums text-slate-900">{fmt(counts[c])}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                ₹{rate[c].perAwb}/AWB or ₹{rate[c].perKg}/kg
              </p>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft ${sheetCat ? 'h-[88vh] max-w-4xl' : 'max-w-2xl'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              {sheetCat ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSheetCat(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Back">
                    <Icon name="chevron" className="h-4 w-4 rotate-90" />
                  </button>
                  <h3 className="text-sm font-semibold text-slate-900">ODA {sheetCat}</h3>
                  <span className="text-xs text-slate-400">
                    {fmt(counts[sheetCat])} pincodes · ₹{rate[sheetCat].perAwb}/AWB or ₹{rate[sheetCat].perKg}/kg
                  </span>
                </div>
              ) : (
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              )}
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            {!sheetCat ? (
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {/* search / add */}
                <div>
                  <div className="relative">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => handlePin(e.target.value)}
                      placeholder="Search a pincode — see its ODA or add it"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm tabular-nums text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                  </div>

                  {pin.length === 6 && lookup === 'loading' && <p className="mt-2 text-xs text-slate-400">Looking up…</p>}

                  {pin.length === 6 && lookup && lookup !== 'loading' && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                      {lookup === 'not-found' ? (
                        <div className="space-y-2">
                          <p className="text-xs text-rose-500">Pincode not found — enter its location.</p>
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={manual.state}
                              onChange={(e) => setManual((m) => ({ ...m, state: e.target.value }))}
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                            >
                              <option value="">State / UT…</option>
                              {INDIAN_STATES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <input value={manual.district} onChange={(e) => setManual((m) => ({ ...m, district: e.target.value }))} placeholder="District" className={`min-w-0 flex-1 ${inputCls}`} />
                            <input value={manual.city} onChange={(e) => setManual((m) => ({ ...m, city: e.target.value }))} placeholder="City (optional)" className={`min-w-0 flex-1 ${inputCls}`} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-800">
                          <span className="font-semibold tabular-nums">{pin}</span>
                          <span className="text-slate-500"> · {[lookup.city, lookup.district, lookup.state].filter(Boolean).join(', ')}</span>
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {existing ? (
                          <>
                            <span className="text-slate-500">
                              In <span className={`rounded-full border px-2 py-0.5 font-semibold ${ODA_BADGE[existing.oda ?? 1]}`}>ODA {existing.oda ?? 1}</span> — move to
                            </span>
                            {ODA_CATEGORIES.filter((c) => c !== (existing.oda ?? 1)).map((c) => (
                              <button key={c} type="button" onClick={() => moveExisting(c)} className={`rounded-full border px-2.5 py-0.5 font-semibold hover:brightness-95 ${ODA_BADGE[c]}`}>
                                ODA {c}
                              </button>
                            ))}
                            <button type="button" onClick={removeExisting} className="ml-auto font-medium text-rose-600 hover:underline">
                              Remove from ODA
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-500">Not in the ODA list — add to</span>
                            {ODA_CATEGORIES.map((c) => (
                              <button
                                key={c}
                                type="button"
                                disabled={lookup === 'not-found' && !manualReady}
                                onClick={() => addToOda(c)}
                                className={`rounded-full border px-2.5 py-0.5 font-semibold hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${ODA_BADGE[c]}`}
                              >
                                ODA {c}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {notice && <p className="mt-2 text-xs text-emerald-600">✓ {notice}</p>}
                </div>

                {/* category cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ODA_CATEGORIES.map((c) => (
                    <div
                      key={c}
                      role="button"
                      tabIndex={0}
                      onClick={() => openSheet(c)}
                      onKeyDown={(e) => e.key === 'Enter' && openSheet(c)}
                      className={`cursor-pointer rounded-xl border bg-white p-4 text-left transition-colors ${ODA_CARD[c]}`}
                    >
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ODA_BADGE[c]}`}>ODA {c}</span>
                      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{fmt(counts[c])}</p>
                      <p className="text-xs text-slate-400">pincodes</p>
                      {editingRates ? (
                        <div className="mt-3 space-y-1 text-[11px] text-slate-500" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            ₹
                            <input type="number" min="0" value={rate[c].perAwb} onChange={(e) => setRate(c, 'perAwb', e.target.value)} className={`w-full min-w-0 ${inputCls}`} />
                            /AWB
                          </div>
                          <div className="flex items-center gap-1">
                            ₹
                            <input type="number" min="0" value={rate[c].perKg} onChange={(e) => setRate(c, 'perKg', e.target.value)} className={`w-full min-w-0 ${inputCls}`} />
                            /kg
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-slate-600">
                          ₹{rate[c].perAwb}/AWB or ₹{rate[c].perKg}/kg
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Whichever is higher applies. Click a card to see its pincodes.</span>
                  <button type="button" onClick={() => setEditingRates((v) => !v)} className="font-medium text-brand-orange-dark hover:underline">
                    {editingRates ? 'Done' : 'Edit rates'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                  <div className="relative flex-1">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={sheetSearch}
                      onChange={(e) => {
                        setSheetSearch(e.target.value)
                        setLimit(PAGE_SIZE)
                      }}
                      placeholder="Search state, district, city or pincode…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{fmt(sheetRows.length)} shown</span>
                </div>

                {isFiltered && sheetRows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2 text-xs">
                    <span className="text-slate-500">All {fmt(sheetRows.length)} shown →</span>
                    {ODA_CATEGORIES.filter((c) => c !== sheetCat).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => applyAction(sheetRows.map((r) => r.id), c)}
                        className={`rounded-full border px-2.5 py-0.5 font-semibold hover:brightness-95 ${ODA_BADGE[c]}`}
                      >
                        Move to ODA {c}
                      </button>
                    ))}
                    <button type="button" onClick={() => applyAction(sheetRows.map((r) => r.id), 'remove')} className="ml-auto font-medium text-rose-600 hover:underline">
                      Remove from ODA
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-auto">
                  {sheetRows.length === 0 ? (
                    <p className="px-5 py-10 text-center text-xs text-slate-400">No pincodes found.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-400">
                        <tr className="border-b border-slate-100">
                          {[
                            ['state', 'State / UT', 'pl-5'],
                            ['district', 'District', ''],
                            ['city', 'City', ''],
                            ['pincode', 'Pincode', ''],
                          ].map(([col, label, pad]) => (
                            <th key={col} className={`py-2 pr-3 font-medium ${pad}`}>
                              <ColumnFilter
                                label={label}
                                options={colOptions[col]}
                                value={filters[col]}
                                onChange={(v) => {
                                  setFilters((f) => ({ ...f, [col]: v }))
                                  setLimit(PAGE_SIZE)
                                }}
                              />
                            </th>
                          ))}
                          <th className="py-2 pr-5 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheetRows.slice(0, limit).map((r) => (
                          <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                            <td className="py-1.5 pl-5 text-slate-700">{r.state}</td>
                            <td className="py-1.5 text-slate-700">{r.district || '—'}</td>
                            <td className="py-1.5 text-slate-500">{r.city || '—'}</td>
                            <td className="py-1.5 tabular-nums text-slate-800">{r.pincode}</td>
                            <td className="py-1.5 pr-5 text-right">
                              <select
                                value=""
                                onChange={(e) => e.target.value && applyAction([r.id], e.target.value === 'remove' ? 'remove' : Number(e.target.value))}
                                className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600"
                              >
                                <option value="">Action…</option>
                                {ODA_CATEGORIES.filter((c) => c !== sheetCat).map((c) => (
                                  <option key={c} value={c}>
                                    Move to ODA {c}
                                  </option>
                                ))}
                                <option value="remove">Remove from ODA</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {sheetRows.length > limit && (
                    <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE * 4)} className="w-full py-3 text-xs font-medium text-brand-orange-dark hover:bg-slate-50">
                      Show more ({fmt(sheetRows.length - limit)} left)
                    </button>
                  )}
                </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

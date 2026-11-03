import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

// Date-range picker: one-click presets + a two-month calendar. Click a start day,
// then an end day (the range previews while you hover). Values are ISO strings
// ("2026-11-01"), the same shape the form already stores.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const PRESETS = [
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: '3 years', months: 36 },
]

const pad = (n) => String(n).padStart(2, '0')
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime()
const fmt = (d) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
const startOfToday = () => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

function addMonths(date, n) {
  const target = new Date(date.getFullYear(), date.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), last))
  return target
}

// A start day + N months ends the day before the same date N months later
// (1 Nov 2026 + 12 months -> 31 Oct 2027).
function endForMonths(start, months) {
  const e = addMonths(start, months)
  e.setDate(e.getDate() - 1)
  return e
}

// "12 months" / "2 years" when it lines up exactly, otherwise "N days".
export function describeRange(start, end) {
  if (!start || !end) return ''
  const next = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
  if (next.getDate() === start.getDate()) {
    const months = (next.getFullYear() - start.getFullYear()) * 12 + (next.getMonth() - start.getMonth())
    if (months > 0 && months % 12 === 0) return `${months / 12} ${months === 12 ? 'year' : 'years'}`
    if (months > 0) return `${months} ${months === 1 ? 'month' : 'months'}`
  }
  const days = Math.round((next - start) / 86400000)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function monthCells(year, month) {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // Monday first
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array(lead).fill(null)
  for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d))
  return cells
}

function Month({ year, month, start, end, hover, onPick, onHover }) {
  const today = startOfToday()
  const previewEnd = start && !end && hover && hover > start ? hover : null
  const rangeEnd = end ?? previewEnd
  return (
    <div className="w-[17rem]">
      <div className="mb-2 text-center text-sm font-semibold text-slate-800">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" onMouseLeave={() => onHover(null)}>
        {monthCells(year, month).map((d, i) => {
          if (!d) return <div key={`b${i}`} />
          const isStart = sameDay(d, start)
          const isEnd = sameDay(d, end) || (!end && sameDay(d, previewEnd))
          const inRange = start && rangeEnd && d > start && d < rangeEnd
          const edge = isStart || isEnd
          const band = inRange || (isStart && rangeEnd) || (isEnd && start)
          return (
            <div
              key={d.getTime()}
              className={`relative ${band ? 'bg-orange-50' : ''} ${isStart && rangeEnd ? 'rounded-l-full' : ''} ${isEnd && start ? 'rounded-r-full' : ''}`}
            >
              <button
                type="button"
                onClick={() => onPick(d)}
                onMouseEnter={() => onHover(d)}
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${
                  edge
                    ? 'bg-brand-orange font-semibold text-white'
                    : sameDay(d, today)
                      ? 'font-semibold text-brand-orange-dark ring-1 ring-brand-orange/40 hover:bg-orange-100'
                      : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {d.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DateRangePicker({ label, required, start, end, onChange, placeholder = 'Select date range', className = '' }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ start: null, end: null })
  const [hover, setHover] = useState(null)
  const [presetHover, setPresetHover] = useState(null) // months of the shortcut being hovered, for the footer preview
  const [view, setView] = useState(() => {
    const base = parse(start) ?? startOfToday()
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  const committedStart = parse(start)
  const committedEnd = parse(end)

  function openPicker() {
    setDraft({ start: committedStart, end: committedEnd })
    const base = committedStart ?? startOfToday()
    setView({ year: base.getFullYear(), month: base.getMonth() })
    setHover(null)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function pick(d) {
    setDraft((cur) => {
      if (!cur.start || cur.end) return { start: d, end: null }
      return d < cur.start ? { start: d, end: cur.start } : { start: cur.start, end: d }
    })
  }

  // "End after N months" shortcut — only offered once a start date is picked.
  function applyPreset(months) {
    if (!draft.start) return
    onChange({ start: toIso(draft.start), end: toIso(endForMonths(draft.start, months)) })
    setOpen(false)
  }

  function shift(delta) {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  const second = new Date(view.year, view.month + 1, 1)
  const ready = draft.start && draft.end
  const presetEnd = presetHover && draft.start ? endForMonths(draft.start, presetHover) : null
  const length = describeRange(committedStart, committedEnd)

  return (
    <div className={`relative ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
      </span>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm transition-colors focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
        </svg>
        <span className={`flex-1 truncate ${committedStart && committedEnd ? 'text-slate-800' : 'text-slate-400'}`}>
          {committedStart && committedEnd ? `${fmt(committedStart)} – ${fmt(committedEnd)}` : placeholder}
        </span>
        {length && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{length}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
            <div className="p-4">
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[17rem_17rem]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Start date</div>
                  <div className={`mt-0.5 text-sm font-semibold ${draft.start ? 'text-slate-900' : 'text-slate-400'}`}>
                    {draft.start ? fmt(draft.start) : 'Pick a start date'}
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">End date</div>
                    {draft.start && (presetEnd || draft.end) && (
                      <span className="text-[11px] text-slate-400">{describeRange(draft.start, presetEnd ?? draft.end)}</span>
                    )}
                  </div>
                  <div className={`mt-0.5 text-sm font-semibold ${presetEnd ? 'text-brand-orange-dark' : draft.end ? 'text-slate-900' : 'text-slate-400'}`}>
                    {presetEnd ? fmt(presetEnd) : draft.end ? fmt(draft.end) : draft.start ? 'Pick an end date' : '—'}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.months}
                        type="button"
                        disabled={!draft.start}
                        onClick={() => applyPreset(p.months)}
                        onMouseEnter={() => setPresetHover(p.months)}
                        onMouseLeave={() => setPresetHover(null)}
                        title={`End ${p.label} after the start date`}
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand-orange/50 hover:bg-orange-50 hover:text-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-1 flex items-center justify-between">
                  <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                    <Icon name="chevron" className="h-4 w-4 rotate-90" />
                  </button>
                  <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                    <Icon name="chevron" className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
                <div className="-mt-9 flex gap-6">
                  <Month year={view.year} month={view.month} start={draft.start} end={draft.end} hover={hover} onPick={pick} onHover={setHover} />
                  <div className="hidden sm:block">
                    <Month year={second.getFullYear()} month={second.getMonth()} start={draft.start} end={draft.end} hover={hover} onPick={pick} onHover={setHover} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ start: null, end: null })
                    onChange({ start: '', end: '' })
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    onChange({ start: toIso(draft.start), end: toIso(draft.end) })
                    setOpen(false)
                  }}
                  className="rounded-lg bg-brand-orange px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

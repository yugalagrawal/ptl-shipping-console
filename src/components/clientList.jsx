import Icon from './Icon.jsx'
import { useState } from 'react'

export const PAGE_SIZE = 10

// Shared by Client Onboarding and Client Approvals so both list pages look and
// behave the same.
// "5 hours ago" / "2 days ago" / "Just now" -> hours, so rows can be ordered by recency.
export function hoursAgo(text = '') {
  if (/just now/i.test(text)) return 0
  const m = text.match(/(\d+)\s*(minute|hour|day|week|month)/i)
  if (!m) return Infinity
  const n = Number(m[1])
  const unit = { minute: 1 / 60, hour: 1, day: 24, week: 168, month: 720 }[m[2].toLowerCase()]
  return n * unit
}

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Name A → Z' },
  { value: 'za', label: 'Name Z → A' },
]

export function sortRows(list, mode, ageOf) {
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  const sorted = [...list]
  if (mode === 'az') sorted.sort(byName)
  else if (mode === 'za') sorted.sort((a, b) => byName(b, a))
  else if (mode === 'oldest') sorted.sort((a, b) => ageOf(b) - ageOf(a))
  else sorted.sort((a, b) => ageOf(a) - ageOf(b))
  return sorted
}

export const initialsOf = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export function ClientTile({ name }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-semibold text-brand-orange-dark">
      {initialsOf(name)}
    </span>
  )
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
      <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  )
}

export function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = SORT_OPTIONS.find((o) => o.value === value)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400" aria-hidden="true">
            <path d="M5 13V3M2.5 5.5 5 3l2.5 2.5M11 3v10M8.5 10.5 11 13l2.5-2.5" />
          </svg>
          <span className="font-medium text-slate-800">{current?.label}</span>
        </span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-full min-w-[180px] rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${value === o.value ? 'font-medium text-slate-900' : 'text-slate-600'}`}
              >
                {o.label}
                {value === o.value && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Pager({ total, page, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(page * PAGE_SIZE, total)
  const btn = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn} aria-label="Previous page">
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
        </button>
        <span className="min-w-[44px] text-center font-medium text-slate-700">
          {page} / {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={btn} aria-label="Next page">
          <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>
    </div>
  )
}

export function Empty({ title, hint }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="search" className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}


import { useEffect, useState } from 'react'
import InfoTip from './InfoTip.jsx'
import { Calendar, viewOf, parse, toIso, fmt, startOfToday } from './DateRangePicker.jsx'

// Single-date picker built on the same calendar as DateRangePicker: month and
// year selectors, today ringed, one click on a day applies it and closes.
export default function DatePicker({ label, required, labelInfo, value, onChange, placeholder = 'Select date', className = '' }) {
  const [open, setOpen] = useState(false)
  const selected = parse(value)
  const [view, setView] = useState(() => viewOf(selected ?? startOfToday()))

  function openPicker() {
    setView(viewOf(selected ?? startOfToday()))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function pick(d) {
    onChange(toIso(d))
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
        {labelInfo && <InfoTip text={labelInfo} />}
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
        <span className={`flex-1 truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>{selected ? fmt(selected) : placeholder}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
            <div className="p-4">
              <Calendar view={view} onView={setView} start={selected} end={null} rangeEnd={null} onPick={pick} />
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{selected ? <span className="font-medium text-slate-800">{fmt(selected)}</span> : 'Pick a date'}</span>
                <button
                  type="button"
                  onClick={() => pick(startOfToday())}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand-orange/50 hover:bg-orange-50 hover:text-brand-orange-dark"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

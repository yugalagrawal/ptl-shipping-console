import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'

// Filter dropdown with a searchable checkbox list. `options` is
// [{ value, label, count? }]; `value` is the array of selected values.
export default function MultiSelect({ label, options, value, onChange, searchable = true }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const active = value.length > 0
  const summary = active
    ? (value.length === 1 ? options.find((o) => o.value === value[0])?.label ?? value[0] : `${value.length} selected`)
    : 'Any'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ('') }}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors ${active ? 'border-brand-orange/50 bg-orange-50/60 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
      >
        <span className="text-slate-400">{label}</span>
        <span className="max-w-[130px] truncate font-medium">{summary}</span>
        <Icon name="chevron" className={`h-3 w-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {searchable && options.length > 6 && (
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {shown.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} className="h-3.5 w-3.5 accent-orange-500" />
                <span className="flex-1 truncate">{o.label}</span>
                {o.count != null && <span className="text-xs tabular-nums text-slate-400">{o.count}</span>}
              </label>
            ))}
            {shown.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-400">No matches</div>}
          </div>
          {active && (
            <button type="button" onClick={() => onChange([])} className="w-full border-t border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50">
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

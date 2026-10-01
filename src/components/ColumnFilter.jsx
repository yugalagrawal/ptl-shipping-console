import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

// Excel-style "funnel" filter attached to a table header. `active` colours
// the trigger so a person can see at a glance which columns are narrowed.
// Two content shapes: a searchable checkbox list (categorical columns) or a
// single text box (free-text / numeric columns) — see CheckboxFilter and
// TextFilter below.
//
// The panel is portaled to <body> and positioned with `fixed` from the
// trigger's own bounding rect, rather than `absolute` inside the header
// cell — table headers live inside an `overflow-x-auto` scroller, and per
// the CSS overflow spec that silently forces overflow-y to `auto` too,
// which clipped an absolutely-positioned dropdown before it could show.
export function ColumnFilterButton({ active, label, children }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function place() {
      const r = btnRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 6, left: r.left })
    }
    place()
    function onDocPointerDown(e) {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
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
    <span className="relative inline-block normal-case">
      <button
        ref={btnRef}
        type="button"
        aria-label={`Filter ${label}`}
        onClick={() => setOpen((o) => !o)}
        className={`ml-1 rounded p-0.5 align-middle transition-colors ${active ? 'text-brand-orange' : 'text-slate-300 hover:text-slate-500'}`}
      >
        <Icon name="filter" className="h-3.5 w-3.5" />
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 text-left font-normal normal-case tracking-normal text-slate-600 shadow-lg"
        >
          {children}
        </div>,
        document.body
      )}
    </span>
  )
}

export function CheckboxFilter({ options, selected, onToggle, onClear }) {
  const [q, setQ] = useState('')
  const shown = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        className="mb-1.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      <div className="max-h-40 space-y-0.5 overflow-y-auto">
        {shown.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected.has(o)}
              onChange={() => onToggle(o)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
            />
            <span className="truncate">{o}</span>
          </label>
        ))}
        {shown.length === 0 && <div className="px-1 py-2 text-xs text-slate-400">No matches</div>}
      </div>
      {selected.size > 0 && (
        <button type="button" onClick={onClear} className="mt-1.5 text-[11px] font-medium text-brand-orange hover:underline">
          Clear ({selected.size})
        </button>
      )}
    </div>
  )
}

export function TextFilter({ value, onChange, placeholder }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline focus:outline-2 focus:outline-brand-orange/40"
    />
  )
}

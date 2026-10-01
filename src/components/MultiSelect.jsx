import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Multi-select dropdown with search and a "Select all" row. The panel is
// portaled to <body> with fixed positioning so a modal's or table's
// overflow can't clip it (same approach as ColumnFilter / Combobox).
// `options` and `selected` are plain string arrays; `onChange` gets the new
// selected array. Anything selected that isn't in `options` (e.g. a seeded
// value) is still listed, so it can be seen and unticked.
export default function MultiSelect({ options, selected, onChange, disabled, placeholder = 'Select…', noun = 'item' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [coords, setCoords] = useState(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const all = useMemo(() => [...new Set([...options, ...selected])], [options, selected])
  const sel = useMemo(() => new Set(selected), [selected])
  const shown = all.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
  const allShownSelected = shown.length > 0 && shown.every((o) => sel.has(o))

  useEffect(() => {
    if (!open) return
    function place() {
      const r = btnRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    place()
    function onDown(e) {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  function toggle(o) {
    onChange(sel.has(o) ? selected.filter((v) => v !== o) : [...selected, o])
  }
  function toggleAll() {
    if (allShownSelected) onChange(selected.filter((v) => !shown.includes(v)))
    else onChange([...new Set([...selected, ...shown])])
  }

  const plural = noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`
  const everything = all.length > 0 && all.every((o) => sel.has(o))
  const label = selected.length === 0
    ? placeholder
    : everything
      ? `All ${plural} (${all.length})`
      : selected.length <= 2
        ? selected.join(', ')
        : `${selected.length} ${plural} selected`

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((v) => !v); setQ('') }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={`truncate ${selected.length === 0 ? 'text-slate-400' : ''}`}>{label}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-400" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5-1-1L10 10 6.5 6.5z" /></svg>
      </button>
      {open && coords && createPortal(
        <div ref={panelRef} style={{ top: coords.top, left: coords.left, width: Math.max(coords.width, 220) }} className="fixed z-[60] rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline focus:outline-2 focus:outline-brand-orange/40" />
          <label className="flex cursor-pointer items-center gap-2 rounded-md border-b border-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300" />
            Select all{q.trim() ? ' (filtered)' : ''}
          </label>
          <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
            {shown.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={sel.has(o)} onChange={() => toggle(o)} className="h-3.5 w-3.5 rounded border-slate-300" />
                <span className="truncate">{o}</span>
              </label>
            ))}
            {shown.length === 0 && <p className="px-2 py-3 text-xs text-slate-400">No matches</p>}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

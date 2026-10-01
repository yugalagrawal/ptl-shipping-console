import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

// Search-or-create combobox for fields that are usually a pick from what's
// already on the sheet, but must never block on a value that doesn't exist
// yet (e.g. Locality/Territory/Circle in Geography Master — our own
// India-Post-derived naming, not a fixed government list). Typing filters
// `options`; anything that isn't an exact match surfaces a "Create" row,
// same pattern as the rate-card Code combobox in Client Pricing
// Configuration. Portaled to <body> with `fixed` positioning for the same
// reason as ColumnFilterButton — this sits inside a table's
// `overflow-x-auto` scroller, which silently clips an ordinary `absolute`
// dropdown's vertical overflow too.
export default function Combobox({ value, options, onChange, placeholder, width = 'w-32' }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const q = value.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  const exactExists = options.some((o) => o.toLowerCase() === q)

  useEffect(() => {
    if (!open) return
    function place() {
      const r = inputRef.current?.getBoundingClientRect()
      if (r) setCoords({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    place()
    function onDocPointerDown(e) {
      if (panelRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return
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

  function commit(v) {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`${width} rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40`}
      />
      {open && coords && (filtered.length > 0 || (q && !exactExists)) && createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left, width: Math.max(coords.width, 160) }}
          className="fixed z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(o)}
              className="flex w-full items-center px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
            >
              {o}
            </button>
          ))}
          {q && !exactExists && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(value.trim())}
              className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 text-left font-medium text-brand-orange-dark hover:bg-slate-50"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Create "{value.trim()}"
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

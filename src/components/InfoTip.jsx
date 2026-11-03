import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// "i" icon that explains a field. Opens on hover, keyboard focus or click/tap
// (so it works on touch too); closes on mouse-leave, blur, outside click or Esc.
export default function InfoTip({ text, title }) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setPinned(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setPinned(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => !pinned && setOpen(false)}>
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setPinned((p) => !p)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => !pinned && setOpen(false)}
        className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 ${
          open ? 'text-brand-orange-dark' : 'text-slate-300 hover:text-slate-500'
        }`}
      >
        <Icon name="info" className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[15rem] -translate-x-1/2 rounded-xl bg-slate-800 px-3 py-2.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-100 shadow-lg"
        >
          {title && <span className="mb-0.5 block text-xs font-semibold text-white">{title}</span>}
          {text}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-800" />
        </span>
      )}
    </span>
  )
}

import { useState } from 'react'
import Icon from './Icon.jsx'

const inputCls = 'min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40'

// Prominent "Create New …" action: an orange button that opens an inline
// name box (Enter or Create to confirm, Esc or Cancel to back out).
export default function CreateNew({ label, placeholder, onCreate }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  function submit() {
    if (!name.trim()) return
    onCreate(name)
    setName('')
    setOpen(false)
  }
  return (
    <div className="border-t border-slate-100 p-2">
      {open ? (
        <div className="space-y-1.5">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }} placeholder={placeholder} className={`${inputCls} w-full`} />
          <div className="flex gap-1.5">
            <button type="button" onClick={submit} disabled={!name.trim()} className="flex-1 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orange-dark disabled:opacity-40">Create</button>
            <button type="button" onClick={() => { setOpen(false); setName('') }} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark">
          <Icon name="plus" className="h-4 w-4" /> {label}
        </button>
      )}
    </div>
  )
}


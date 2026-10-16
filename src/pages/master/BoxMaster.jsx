import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { card, btnPrimary } from '../../components/ui.js'
import { BOX_MASTER, addBoxToMaster } from '../../data/boxMaster.js'
import { useAuth } from '../../context/AuthContext.jsx'

const vol = (bx) => bx.l * bx.b * bx.h // cm³
const IN3 = 16.387064 // cm³ per in³
const n0 = (v) => Math.round(v).toLocaleString('en-IN')
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums focus:outline focus:outline-2 focus:outline-brand-orange/40'

// The standard cartons ops picks from in Create Pickup / Create Docket.
// Sizes are stored in cm; the cm/in switch only changes how they're shown and typed.
export default function BoxMaster() {
  const { hasFunction } = useAuth()
  const canEdit = hasFunction('box-master.manage')
  const [unit, setUnit] = useState('cm')
  const [, setTick] = useState(0)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', l: '', b: '', h: '' })
  const show = (cm) => (unit === 'in' ? Math.round((cm / 2.54) * 10) / 10 : cm)
  const toCm = (v) => (unit === 'in' ? Math.round(Number(v) * 2.54 * 10) / 10 : Number(v))
  const valid = ['l', 'b', 'h'].every((k) => Number(draft[k]) > 0)
  // Boxes ordered by volume; each covers from the previous box's volume up to its own
  // (the smallest from 0), and the largest takes everything above the previous box's volume.
  const sorted = [...BOX_MASTER].sort((a, b) => vol(a) - vol(b))
  const rangeOf = (bx) => {
    const i = sorted.indexOf(bx)
    const last = i === sorted.length - 1
    const from = i === 0 ? 0 : vol(sorted[i - 1])
    const to = last ? null : vol(bx)
    const f = (cm3, d) => n0(cm3 / d)
    const d = unit === 'in' ? IN3 : 1
    return to === null ? `${f(from, d)}+` : `${f(from, d)} to ${f(to, d)}`
  }
  const gridCls = 'grid grid-cols-[44px_minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_minmax(0,2fr)]'

  function add() {
    addBoxToMaster({ name: draft.name, l: toCm(draft.l), b: toCm(draft.b), h: toCm(draft.h) })
    setDraft({ name: '', l: '', b: '', h: '' })
    setCreating(false)
    setTick((t) => t + 1)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">{BOX_MASTER.length} box sizes</span>
        <span className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs font-semibold">
          {['cm', 'in'].map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)} className={`rounded px-2 py-1 ${unit === u ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{u}</button>
          ))}
        </span>
        {canEdit && (
          <button type="button" onClick={() => setCreating((v) => !v)} className={`ml-auto ${btnPrimary}`}>
            <Icon name="plus" className="h-4 w-4" />
            Create Box
          </button>
        )}
      </div>

      {creating && (
        <div className={`flex flex-wrap items-end gap-3 p-4 ${card}`}>
          <label className="block w-40"><span className="mb-1 block text-xs font-medium text-slate-500">Name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Custom" className={inputCls} /></label>
          {[['l', 'Length'], ['b', 'Breadth'], ['h', 'Height']].map(([k, l]) => (
            <label key={k} className="block w-24"><span className="mb-1 block text-xs font-medium text-slate-500">{l} ({unit})</span><input type="number" min="1" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} className={inputCls} /></label>
          ))}
          <button type="button" disabled={!valid} onClick={add} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>Add box</button>
          <button type="button" onClick={() => setCreating(false)} className="pb-2 text-xs font-medium text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      )}

      <div className={`overflow-hidden ${card}`}>
        <div className={`${gridCls} border-b border-slate-300 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500`}>
          {['#', 'Name', `Length (${unit})`, `Breadth (${unit})`, `Height (${unit})`, `Volume range (${unit === 'in' ? 'in³' : 'cm³'})`].map((h) => <div key={h} className="px-3 py-2">{h}</div>)}
        </div>
        {sorted.map((bx, i) => (
          <div key={bx.id} className={`${gridCls} border-b border-slate-200 text-sm tabular-nums hover:bg-slate-50/70`}>
            <div className="px-3 py-2 text-xs text-slate-400">{i + 1}</div>
            <div className="px-3 py-2 font-medium text-slate-900">{bx.name}</div>
            <div className="px-3 py-2 text-slate-700">{show(bx.l)}</div>
            <div className="px-3 py-2 text-slate-700">{show(bx.b)}</div>
            <div className="px-3 py-2 text-slate-700">{show(bx.h)}</div>
            <div className="px-3 py-2 text-slate-700">{rangeOf(bx)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

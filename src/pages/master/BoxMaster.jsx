import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { card, btnPrimary } from '../../components/ui.js'
import { BOX_MASTER, addBoxToMaster, updateBox } from '../../data/boxMaster.js'
import { useAuth } from '../../context/AuthContext.jsx'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums focus:outline focus:outline-2 focus:outline-brand-orange/40'


const C30 = 0.866
// Isometric carton drawn to scale (all boxes share one scale, so sizes compare at a glance),
// with its three dimensions written on the edges.
function BoxIllustration({ bx, scale, show, compact }) {
  const W = 220, H = 170
  const l = bx.l * scale, b = bx.b * scale, h = bx.h * scale
  const minX = -C30 * b, maxX = C30 * l, topY = -(0.5 * (l + b) + h)
  const ox = W / 2 - (minX + maxX) / 2
  const oy = H / 2 - topY / 2 - 8
  const P = (x, y) => `${(ox + x).toFixed(1)},${(oy + y).toFixed(1)}`
  const F = [0, 0], R = [C30 * l, -0.5 * l], Lf = [-C30 * b, -0.5 * b], K = [C30 * (l - b), -0.5 * (l + b)]
  const up = (pt) => [pt[0], pt[1] - h]
  const poly = (pts) => pts.map((q) => P(q[0], q[1])).join(' ')
  const label = (x, y, text, anchor = 'middle') => (
    <text x={ox + x} y={oy + y} textAnchor={anchor} fontSize="11" fontWeight="600" fill="#475569">{text}</text>
  )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={compact ? 'h-16 w-24' : 'h-40 w-full'} role="img" aria-label={`${bx.name} box ${show(bx.l)} by ${show(bx.b)} by ${show(bx.h)}`}>
      {!compact && <ellipse cx={ox + (minX + maxX) / 2} cy={oy + 4} rx={(maxX - minX) / 2 + 6} ry="7" fill="#0f172a" opacity="0.06" />}
      <polygon points={poly([F, Lf, up(Lf), up(F)])} fill="#D9AE7F" stroke="#8A5F32" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={poly([F, R, up(R), up(F)])} fill="#C4935E" stroke="#8A5F32" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={poly([up(F), up(R), up(K), up(Lf)])} fill="#EBD0AB" stroke="#8A5F32" strokeWidth="1" strokeLinejoin="round" />
      {!compact && label(C30 * l / 2 + 10, -0.25 * l + 16, show(bx.l), 'start')}
      {!compact && label(-C30 * b / 2 - 10, -0.25 * b + 16, show(bx.b), 'end')}
      {!compact && label(-C30 * b - 8, -0.5 * b - h / 2 + 4, show(bx.h), 'end')}
    </svg>
  )
}

// The standard cartons ops picks from in Create Pickup / Create Docket.
// Sizes are stored in cm; the cm/in switch only changes how they're shown and typed.
export default function BoxMaster() {
  const { hasFunction } = useAuth()
  const canEdit = hasFunction('box-master.manage')
  const [unit, setUnit] = useState('cm')
  const [, setTick] = useState(0)
  const [editing, setEditing] = useState(null) // { id, name, l, b, h } — dims in the unit shown
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', l: '', b: '', h: '' })
  const show = (cm) => (unit === 'in' ? Math.round((cm / 2.54) * 10) / 10 : cm)
  const toCm = (v) => (unit === 'in' ? Math.round(Number(v) * 2.54 * 10) / 10 : Number(v))
  const valid = ['l', 'b', 'h'].every((k) => Number(draft[k]) > 0)
  const gridCls = 'grid grid-cols-[44px_112px_minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_minmax(0,1fr)]'
  // one shared scale so the largest carton fits the drawing and the rest stay in proportion
  const scale = 135 / Math.max(...BOX_MASTER.map((x) => Math.max((x.l + x.b) * C30, 0.5 * (x.l + x.b) + x.h)))

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
          {['#', 'Box', 'Name', `Length (${unit})`, `Breadth (${unit})`, `Height (${unit})`, ''].map((h, i) => <div key={i} className="px-3 py-2">{h}</div>)}
        </div>
        {BOX_MASTER.map((bx, i) => {
          const isEditing = editing?.id === bx.id
          const view = isEditing ? { ...bx, l: toCm(editing.l) || 0, b: toCm(editing.b) || 0, h: toCm(editing.h) || 0 } : bx
          const ok = isEditing && ['l', 'b', 'h'].every((k) => Number(editing[k]) > 0)
          return (
            <div key={bx.id} className={`${gridCls} items-center border-b border-slate-200 text-sm tabular-nums ${isEditing ? 'bg-amber-50/60' : 'hover:bg-slate-50/70'}`}>
              <div className="px-3 py-2 text-xs text-slate-400">{i + 1}</div>
              <div className="px-3 py-1"><BoxIllustration bx={view} scale={scale} show={show} compact /></div>
              {isEditing ? (
                <>
                  <div className="px-3 py-2"><input aria-label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} /></div>
                  {['l', 'b', 'h'].map((k) => (
                    <div key={k} className="px-3 py-2"><input aria-label={k} type="number" min="1" value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} className={inputCls} /></div>
                  ))}
                  <div className="flex items-center justify-end gap-2 px-3 py-2">
                    <button type="button" disabled={!ok} onClick={() => setConfirmEdit(true)} className={`${btnPrimary} !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40`}>Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="text-xs font-medium text-slate-400 hover:text-slate-600">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 font-medium text-slate-900">{bx.name}</div>
                  <div className="px-3 py-2 text-slate-700">{show(bx.l)}</div>
                  <div className="px-3 py-2 text-slate-700">{show(bx.b)}</div>
                  <div className="px-3 py-2 text-slate-700">{show(bx.h)}</div>
                  <div className="px-3 py-2 text-right">
                    {canEdit && (
                      <button type="button" onClick={() => setEditing({ id: bx.id, name: bx.name, l: show(bx.l), b: show(bx.b), h: show(bx.h) })} aria-label={`Edit ${bx.name}`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmDialog
        open={confirmEdit && !!editing}
        title="Save changes to this box?"
        message={editing && `Are you sure? "${editing.name}" will be updated to ${editing.l} × ${editing.b} × ${editing.h} ${unit} for every new pickup and docket. Existing ones keep the size they were booked with.`}
        confirmLabel="Yes, save"
        cancelLabel="Cancel"
        onConfirm={() => {
          updateBox(editing.id, { name: editing.name, l: toCm(editing.l), b: toCm(editing.b), h: toCm(editing.h) })
          setConfirmEdit(false)
          setEditing(null)
        }}
        onCancel={() => setConfirmEdit(false)}
      />
    </div>
  )
}

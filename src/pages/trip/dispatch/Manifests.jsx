import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../ops/core.js'
import { useDispatch } from './store.js'
import { BASE, PageHead, Flow, Chip, Chain, Stage, Util, btnPrimary, btnGhost, btn, th, td, dt, city, kg } from './ui.jsx'
import { card } from '../../../components/ui.js'

const tipTone = { amber: 'bg-amber-50 text-amber-800', green: 'bg-emerald-50 text-emerald-800', blue: 'bg-sky-50 text-sky-800', slate: 'bg-slate-50 text-slate-600' }

function TripCard({ t, s, a }) {
  const [open, setOpen] = useState(false)
  const ready = !t.blockers.length
  return (
    <div className={`p-4 ${card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{t.id}</span><Stage s={t.stage} />
            {t.split && <Chip>vehicle {t.split}</Chip>}
          </div>
          <div className="mt-1"><Chain path={t.path} lane={t.name} kind={t.kind} /></div>
          <p className="mt-1 text-[11px] text-slate-500">Departs {dt(t.depart)} · {t.km} km · {t.vehicle ? `${t.vehicle.regNo} (${t.vehicle.type.split(' ')[0]}, ${t.vehicle.own})` : 'no vehicle yet'}</p>
        </div>
        <div className="text-right">
          <Util v={t.util} min={s.settings.minUtil} />
          <p className="mt-0.5 text-[11px] text-slate-500">{kg(t.kg)} of {kg(t.cap.kg)}</p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className={th}>Manifest</th><th className={th}>Unload at</th><th className={`${th} text-right`}>Dockets</th><th className={`${th} text-right`}>Packs</th><th className={`${th} text-right`}>Weight</th><th className={`${th} text-right`}>CFT</th><th className={`${th} text-right`}>E-way bills</th><th /></tr></thead>
          <tbody>
            {t.manifests.map((m) => (
              <tr key={m.key} className="border-b border-slate-100">
                <td className={`${td} font-medium text-slate-800`}>{m.no}</td>
                <td className={td}>{city(m.exit)} <span className="text-[10px] text-slate-400">{dt((t.schedule.find((x) => x.code === m.exit) || {}).arr)}</span></td>
                <td className={`${td} text-right tabular-nums`}>{m.dockets.length}</td><td className={`${td} text-right tabular-nums`}>{m.packs}</td>
                <td className={`${td} text-right tabular-nums`}>{kg(m.kg)}</td><td className={`${td} text-right tabular-nums`}>{Math.round(m.cft)}</td>
                <td className={`${td} text-right tabular-nums`}>{m.ewb} / {m.dockets.length}</td>
                <td className={`${td} text-right`}><button onClick={() => setOpen(open === m.key ? false : m.key)} className="text-[11px] font-medium text-slate-500 hover:text-slate-900">{open === m.key ? 'Hide' : 'Dockets'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {open && <div className="mt-2 flex flex-wrap gap-1.5">{(t.manifests.find((m) => m.key === open) || { dockets: [] }).dockets.map((d) => <Chip key={d.no} tone={d.ewbNo ? 'slate' : 'amber'}>{T.fmtDocket(d.no)} · {kg(d.actWt)}</Chip>)}</div>}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Suggestions</p>
          {t.tips.map((x) => <p key={x.t} className={`rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${tipTone[x.tone]}`}>{x.t}</p>)}
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Checks</p>
          {t.blockers.map((x) => <p key={x} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] leading-snug text-red-700">Blocks locking: {x}</p>)}
          {t.warns.map((x) => <p key={x} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800">{x}</p>)}
          {!t.blockers.length && !t.warns.length && <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">All checks pass</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        {!t.vehicle && <Link to={`${BASE}/vehicles`} className={btnGhost}>Assign a vehicle</Link>}
        {t.locked
          ? <><span className="text-[11px] text-emerald-700">Manifests locked</span>{!t.thc && <button onClick={() => a.unlock(t.key)} className={btnGhost}>Unlock</button>}<Link to={`${BASE}/thc?trip=${encodeURIComponent(t.key)}`} className={btnPrimary}>{t.thc ? 'Open THC →' : 'Issue THC →'}</Link></>
          : <button onClick={() => a.lock(t.key)} disabled={!ready} className={btnPrimary}>{t.warns.length ? 'Lock anyway' : 'Lock manifests'}</button>}
      </div>
    </div>
  )
}

export default function DispatchManifests() {
  const { s, p, a } = useDispatch()
  const [f, setF] = useState('all')
  const isReady = (t) => !t.blockers.length && !t.locked && t.util * 100 >= s.settings.minUtil
  const trips = p.trips.filter((t) => f === 'all' || (f === 'low' ? t.util * 100 < s.settings.minUtil : f === 'ready' ? isReady(t) : t.locked))
  const ready = p.trips.filter(isReady).length
  const pills = [['all', 'All'], ['low', 'Low utilization'], ['ready', 'Ready to lock'], ['locked', 'Locked']]
  return (
    <div className="max-w-6xl space-y-4">
      <PageHead title="Manifest Plan" sub="Each trip carries one manifest per unloading hub. The system suggests by utilization: a smaller vehicle, or holding for the next cutoff, when a trip is below target. Trips at or above target lock together; a low-utilization trip is locked one by one, with Lock anyway."
        right={<button onClick={a.lockAll} disabled={!ready} className={btnPrimary}>Lock {ready} ready</button>} />
      <Flow p={p} s={s} at="manifests" />
      <div className="flex flex-wrap gap-1.5">
        {pills.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${f === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{l}</button>)}
        <span className="ml-2 self-center text-[11px] text-slate-400">Target utilization {s.settings.minUtil}% (change on Overview)</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{trips.map((t) => <TripCard key={t.key} t={t} s={s} a={a} />)}</div>
      {!trips.length && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No trips here.</p>}
    </div>
  )
}

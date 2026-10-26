import { Link } from 'react-router-dom'
import { T } from '../ops/core.js'
import { POOL, vehicleById } from './engine.js'
import { useDispatch } from './store.js'
import { BASE, PageHead, Flow, Chip, Chain, Section, Util, btnPrimary, btnGhost, th, td, dt, kg, inr } from './ui.jsx'

const sel = 'w-56 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-400'

function VehicleSelect({ t, a, taken }) {
  const here = POOL.filter((v) => v.loc === t.entry && (v.id === t.vehicleId || !taken.has(v.id)))
  return (
    <select value={t.vehicleId || ''} onChange={(e) => a.setVehicle(t.key, e.target.value)} className={sel} aria-label={`Vehicle for ${t.id}`}>
      <option value="">Not assigned</option>
      <optgroup label={`Pool at ${T.facShort(t.entry)}`}>
        {here.map((v) => <option key={v.id} value={v.id}>{v.regNo} · {v.type.split(' ')[0]} · {v.own}</option>)}
        {!here.length && <option disabled>No vehicle at this hub</option>}
      </optgroup>
      <optgroup label="Spot hire">
        {T.VTYPES.map((v) => <option key={v.type} value={`MKT:${v.type}:${t.key}`}>{v.type} · Market</option>)}
      </optgroup>
    </select>
  )
}

export default function DispatchVehicles() {
  const { s, p, a } = useDispatch()
  const trips = p.trips
  const taken = new Set(Object.entries(s.assign).filter(([, v]) => v && !String(v).startsWith('MKT:')).map(([, v]) => v))
  const unassigned = trips.filter((t) => !t.vehicle).length
  return (
    <div className="max-w-6xl space-y-4">
      <PageHead title="Vehicle Plan" sub="One vehicle for each leg. Dockets that board the same lane at the same hub share a trip. The vehicle comes from that hub's own pool: Owned first, then Vendor, best fit for the load, with valid documents. If none is free it is a spot hire."
        right={<div className="flex items-center gap-2">
          {!s.routesConfirmed && <Link to={`${BASE}/routes`} className={btnGhost}>Confirm routes first</Link>}
          <button onClick={a.autoAssign} disabled={!unassigned} className={btnPrimary}>Auto-assign {unassigned ? unassigned : ''} remaining</button>
          <Link to={`${BASE}/manifests`} className={btnGhost}>Manifests →</Link>
        </div>} />
      <Flow p={p} s={s} at="vehicles" />
      <Section title={`${trips.length} vehicle trips`} sub="Sorted by departure. Change a vehicle and the load, utilization and checks update. Spot hire is priced with the market premium.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400">
              <th className={th}>Trip</th><th className={th}>Leg</th><th className={th}>Departs</th><th className={th}>Load</th><th className={th}>Vehicle</th><th className={th}>Utilization</th><th className={th}>Hire</th><th className={th}>Checks</th>
            </tr></thead>
            <tbody>
              {trips.map((t) => {
                const sug = t.suggest && t.suggest.id !== t.vehicleId
                return (
                  <tr key={t.key} className="border-b border-slate-100">
                    <td className={`${td} font-medium text-slate-800`}>{t.id}{t.split && <div className="text-[10px] font-normal text-slate-400">vehicle {t.split}</div>}</td>
                    <td className={td}><Chain path={t.path} lane={t.name} kind={t.kind} /><div className="mt-0.5 text-[10px] text-slate-400">{t.km} km</div></td>
                    <td className={`${td} whitespace-nowrap`}>{dt(t.depart)}</td>
                    <td className={`${td} whitespace-nowrap`}>{kg(t.kg)}<div className="text-[10px] text-slate-400">{Math.round(t.cft)} CFT · {t.items.length} dockets</div></td>
                    <td className={td}>
                      <VehicleSelect t={t} a={a} taken={taken} />
                      {t.vehicle ? <div className="mt-0.5 text-[10px] text-slate-400">{t.vehicle.own}{t.vehicle.vendor ? ' · ' + t.vehicle.vendor : ''}{t.driver ? ' · ' + t.driver.name : ''}</div> : null}
                      {t.suggest && <div className="mt-0.5 max-w-[14rem] text-[10px] leading-snug text-slate-400">{sug ? 'Suggested: ' : 'Why: '}{t.suggest.reason}{sug && <button onClick={() => a.setVehicle(t.key, t.suggest.id)} className="ml-1 font-medium text-brand-orange hover:underline">Use it</button>}</div>}
                    </td>
                    <td className={td}><Util v={t.util} min={s.settings.minUtil} /><div className="mt-0.5 text-[10px] text-slate-400">of {t.vehicle ? t.vehicle.type.split(' ')[0] : t.sugType.split(' ')[0]} · {kg(t.cap.kg)}</div></td>
                    <td className={`${td} whitespace-nowrap`}>{t.vehicle ? (t.money.hired ? inr(t.money.freight) : <span className="text-slate-400">Own fleet</span>) : '—'}{t.vehicle && t.money.hired && <div className="text-[10px] text-slate-400">+ toll {inr(t.money.toll)}</div>}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {t.blockers.map((b) => <Chip key={b} tone="red" title={b}>{b.length > 34 ? b.slice(0, 32) + '…' : b}</Chip>)}
                        {t.warns.slice(0, 2).map((b) => <Chip key={b} tone="amber" title={b}>{b.length > 34 ? b.slice(0, 32) + '…' : b}</Chip>)}
                        {!t.blockers.length && !t.warns.length && <Chip tone="green">OK</Chip>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

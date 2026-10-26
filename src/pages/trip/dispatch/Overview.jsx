import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../ops/core.js'
import { card } from '../../../components/ui.js'
import { MINI_HUBS } from './engine.js'
import { useDispatch } from './store.js'
import { BASE, PageHead, Flow, Tile, Chip, Stage, Section, Util, btn, btnPrimary, btnGhost, th, td, dt, city, kg, pc } from './ui.jsx'

const sel = 'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400'

export default function DispatchOverview() {
  const { s, p, a } = useDispatch()
  const [hub, setHub] = useState('All')
  const [recvAt, setRecvAt] = useState(MINI_HUBS[0].code)
  const rows = s.dockets.filter((d) => hub === 'All' || d.loc === hub)
  const trips = p.trips
  const avg = trips.length ? trips.reduce((t, x) => t + x.util, 0) / trips.length : 0
  const cut = new Date(p.cutoff).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
  const ewbState = (d) => (!d.ewbNo ? <Chip>none</Chip> : d.ewbValidTill - T.NOW < 18 * 3600000 ? <Chip tone="amber">short validity</Chip> : <Chip tone="green">valid</Chip>)

  return (
    <div className="max-w-6xl space-y-4">
      <PageHead title="Dispatch Overview" sub="From the moment a docket reaches its source mini hub: route is planned, a vehicle is assigned for each leg, manifests are suggested by utilization, and a THC is issued for each vehicle."
        right={<div className="flex gap-2"><button onClick={a.reset} className={btnGhost}>Reset demo</button><Link to={`${BASE}/routes`} className={btnPrimary}>Plan routes →</Link></div>} />
      <Flow p={p} s={s} at="overview" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Tile dark label="Dockets at mini hubs" value={s.dockets.length} sub={`${new Set(s.dockets.map((d) => d.loc)).size} mini hubs`} />
        <Tile label="Routes" value={p.lanes.length} sub="origin → destination" />
        <Tile label="Vehicle trips" value={trips.length} sub={`${p.groups.length} runs`} />
        <Tile label="Avg utilization" value={pc(avg)} sub={`${trips.filter((t) => t.util * 100 < s.settings.minUtil).length} below target`} />
        <Tile label="THC issued" value={trips.filter((t) => t.thc).length} sub={`of ${trips.length} trips`} />
        <Tile label="Dispatched" value={trips.filter((t) => t.thc && t.thc.dispatchedAt).length} sub="trips on the road" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Dockets at source mini hubs" sub="Each docket enters here once the pickup has reached its mini hub."
            right={<div className="flex flex-wrap items-center gap-2">
              <select value={hub} onChange={(e) => setHub(e.target.value)} className={sel} aria-label="Mini hub"><option value="All">All mini hubs</option>{MINI_HUBS.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select>
            </div>}>
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200 text-[11px] text-slate-400">
                  <th className={th}>Docket</th><th className={th}>Client</th><th className={th}>Mini hub</th><th className={th}>Destination</th><th className={`${th} text-right`}>Packs</th><th className={`${th} text-right`}>Weight</th><th className={th}>E-way bill</th><th className={th}>Arrived</th><th className={th}>Stage</th>
                </tr></thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.no} className="border-b border-slate-100">
                      <td className={`${td} font-medium text-slate-800`}>{T.fmtDocket(d.no)}{d.prio === 'Priority' && <span className="ml-1"><Chip tone="red">P</Chip></span>}</td>
                      <td className={td}>{d.client}</td><td className={td}>{city(d.loc)}</td><td className={td}>{city(d.dest)}</td>
                      <td className={`${td} text-right tabular-nums`}>{d.packs}</td><td className={`${td} text-right tabular-nums`}>{kg(d.actWt)}</td>
                      <td className={td}>{ewbState(d)}</td><td className={td}>{dt(d.arrivedAt)}</td>
                      <td className={td}><Stage s={p.docketStage[d.no] || 'Draft'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-500">Demo: a pickup reaches a mini hub</span>
              <select value={recvAt} onChange={(e) => setRecvAt(e.target.value)} className={sel} aria-label="Receive at">{MINI_HUBS.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select>
              <button onClick={() => a.receive(recvAt, 5)} className={btn}>+ 5 dockets</button>
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Planning rules" sub="Used by the vehicle and manifest suggestions.">
            <div className="space-y-3">
              <label className="block"><span className="mb-0.5 flex justify-between text-[11px] text-slate-500"><span>Minimum utilization to dispatch</span><b className="text-slate-800">{s.settings.minUtil}%</b></span>
                <input type="range" min="30" max="95" step="5" value={s.settings.minUtil} onChange={(e) => a.setting('minUtil', +e.target.value)} className="w-full accent-slate-900" /></label>
              <label className="block"><span className="mb-0.5 flex justify-between text-[11px] text-slate-500"><span>Daily dispatch cutoff</span><b className="text-slate-800">{String(s.settings.cutoffHour).padStart(2, '0')}:00</b></span>
                <input type="range" min="6" max="23" step="1" value={s.settings.cutoffHour} onChange={(e) => a.setting('cutoffHour', +e.target.value)} className="w-full accent-slate-900" /></label>
              <p className="text-[11px] text-slate-500">Next cutoff: <b className="text-slate-700">{cut}</b>. Dockets that reach the mini hub before it leave on the first runs.</p>
            </div>
          </Section>
          <Section title="How this flow works">
            <ol className="space-y-2 text-[11px] leading-relaxed text-slate-600">
              <li><b className="text-slate-800">1 · Route.</b> The system finds the shortest path from the source mini hub to the destination over the trunk lanes, plus feeder legs between a mini hub and its hub. You can switch to the fewest-transfers route.</li>
              <li><b className="text-slate-800">2 · Vehicle per leg.</b> Dockets that board the same lane at the same hub share one trip. A vehicle is picked from the hub's own pool: Owned first, then Vendor, best fit for the load, documents valid. If none is free it is a spot hire.</li>
              <li><b className="text-slate-800">3 · Manifest.</b> On each trip there is one manifest per unloading hub. The system flags low utilization and suggests a smaller vehicle or holding for the next cutoff.</li>
              <li><b className="text-slate-800">4 · THC.</b> The Trip Hire Challan is the vehicle-level document: one per vehicle trip, collecting all its manifests with the hire terms. The CEWB is auto-generated with it when a docket has an e-way bill.</li>
            </ol>
          </Section>
        </div>
      </div>
    </div>
  )
}

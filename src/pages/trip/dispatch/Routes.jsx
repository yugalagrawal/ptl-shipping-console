import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_MODES, MINI_HUBS } from './engine.js'
import { useDispatch } from './store.js'
import { T } from '../ops/core.js'
import { BASE, PageHead, Flow, Chip, Chain, Section, btnPrimary, btnGhost, city, kg } from './ui.jsx'

const sel = 'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400'

function RouteCard({ l, a }) {
  const r = l.route
  const kgs = l.items.reduce((t, d) => t + d.actWt, 0)
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{city(l.from)} → {city(l.to)}</span>
          <Chip>{l.items.length} dockets · {kg(kgs)}</Chip>
        </div>
        {r && (
          <div className="flex items-center gap-1.5">
            {l.same ? <Chip tone="green">Same for both options</Chip> : Object.entries(ROUTE_MODES).map(([k, m]) => (
              <button key={k} onClick={() => a.setRoute(l.key, k)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${l.mode === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {m.label} · {l.opts[k].km} km · {l.opts[k].transfers} transfer{l.opts[k].transfers === 1 ? '' : 's'}
              </button>
            ))}
          </div>
        )}
      </div>
      {!r ? <p className="mt-2 text-xs text-red-600">No route found between these facilities.</p> : (
        <>
          <div className="mt-2 space-y-1.5">
            {r.segs.map((sg, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-14 text-[10px] font-medium uppercase tracking-wider text-slate-400">Leg {i + 1}</span>
                <Chain path={sg.path} lane={sg.name} kind={sg.kind} />
                <span className="text-[11px] tabular-nums text-slate-400">{sg.km} km</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{r.km} km · about {T.fmt.hrs(r.hours)} on the road, with {r.transfers} transfer{r.transfers === 1 ? '' : 's'}. Each leg is its own vehicle.</p>
        </>
      )}
    </div>
  )
}

export default function DispatchRoutes() {
  const { s, p, a } = useDispatch()
  const [hub, setHub] = useState('All')
  const list = p.lanes.filter((l) => hub === 'All' || l.from === hub).sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to))
  const legs = p.lanes.reduce((t, l) => t + (l.route ? l.route.segs.length : 0), 0)
  return (
    <div className="max-w-6xl space-y-4">
      <PageHead title="Route Plan" sub="The system plans a route for every origin and destination. Legs on a trunk lane stay on one vehicle; a feeder leg joins a mini hub to its hub. Switch to the fewest-transfers option where it exists."
        right={s.routesConfirmed
          ? <div className="flex items-center gap-2"><Chip tone="green">Routes confirmed</Chip><Link to={`${BASE}/vehicles`} className={btnPrimary}>Vehicles →</Link></div>
          : <button onClick={a.confirmRoutes} className={btnPrimary}>Confirm routes and auto-assign vehicles</button>} />
      <Flow p={p} s={s} at="routes" />
      <Section title={`${p.lanes.length} routes · ${legs} legs`} sub="Grouped by origin mini hub. A confirmed route can still be changed, then confirm again."
        right={<div className="flex items-center gap-2">
          <select value={hub} onChange={(e) => setHub(e.target.value)} className={sel} aria-label="Mini hub"><option value="All">All mini hubs</option>{MINI_HUBS.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select>
          {s.routesConfirmed && <button onClick={a.confirmRoutes} className={btnGhost}>Confirm again</button>}
        </div>}>
        <div className="grid gap-3 lg:grid-cols-2">{list.map((l) => <RouteCard key={l.key} l={l} a={a} />)}</div>
      </Section>
    </div>
  )
}

import BackButton from '../../../components/BackButton.jsx'
import { Link } from 'react-router-dom'
import { T } from '../ops/core.js'
import { card } from '../../../components/ui.js'

export const BASE = '/trip-management/dispatch'
export const dt = (ts) => T.fmt.dt(ts)
export const city = (c) => T.facShort(c)
export const kg = (n) => Math.round(n).toLocaleString('en-IN') + ' kg'
export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
export const pc = (x) => Math.round(x * 100) + '%'

const TONES = {
  green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', blue: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-600', orange: 'bg-orange-50 text-orange-700', dark: 'bg-slate-900 text-white',
}
export const Chip = ({ tone = 'slate', children, title }) => <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>{children}</span>
export const NewTag = () => <span className="rounded-md bg-brand-orange px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-white">New</span>
export const stageTone = { Draft: 'slate', 'Route planned': 'slate', 'Vehicle assigned': 'blue', 'Manifests locked': 'orange', 'THC issued': 'green', Dispatched: 'dark' }
export const Stage = ({ s }) => <Chip tone={stageTone[s] || 'slate'}>{s}</Chip>

export function PageHead({ title, sub, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <BackButton />
        <h1 className="flex items-center gap-2 text-[26px] font-semibold tracking-tight text-slate-900">{title} <NewTag /></h1>
        {sub && <p className="mt-0.5 text-xs max-w-3xl text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Flow({ p, s, at }) {
  const trips = p.trips
  const steps = [
    ['overview', 'Docket at mini hub', `${s.dockets.length} dockets`],
    ['routes', 'Route planned', s.routesConfirmed ? `${p.lanes.length} routes confirmed` : `${p.lanes.length} routes to confirm`],
    ['vehicles', 'Vehicle per leg', `${trips.filter((t) => t.vehicle).length} / ${trips.length} assigned`],
    ['manifests', 'Manifests', `${trips.filter((t) => t.locked).length} / ${trips.length} locked`],
    ['thc', 'THC', `${trips.filter((t) => t.thc).length} issued · ${trips.filter((t) => t.thc && t.thc.dispatchedAt).length} dispatched`],
  ]
  return (
    <div className={`grid gap-2 p-2 sm:grid-cols-5 ${card}`}>
      {steps.map(([k, l, c], i) => (
        <Link key={k} to={`${BASE}/${k}`} className={`rounded-xl px-3 py-2 transition-colors ${at === k ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider ${at === k ? 'text-slate-300' : 'text-slate-400'}`}>Step {i + 1}</p>
          <p className="text-sm font-semibold">{l}</p>
          <p className={`text-[11px] ${at === k ? 'text-slate-300' : 'text-slate-500'}`}>{c}</p>
        </Link>
      ))}
    </div>
  )
}

export const Tile = ({ label, value, sub, dark }) => (
  <div className={`rounded-2xl border px-4 py-3 ${dark ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200/70 bg-white'}`}>
    <p className={`text-[11px] ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
    <p className="text-xl font-semibold tabular-nums">{value}</p>
    {sub && <p className={`text-[11px] ${dark ? 'text-slate-300' : 'text-slate-400'}`}>{sub}</p>}
  </div>
)

export function Util({ v, min = 60 }) {
  const pct = Math.min(100, v * 100)
  const col = v > 1.0001 ? 'bg-red-500' : v * 100 < min ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} /></div>
      <span className="text-xs tabular-nums text-slate-600">{pc(v)}</span>
    </div>
  )
}

// Facility chain: A ──Lane 1──▶ B ▶ C
export function Chain({ path, lane, kind }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-xs text-slate-700">
      {path.map((c, i) => (
        <span key={c + i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-slate-300">▸</span>}
          <span className={`rounded-md px-1.5 py-0.5 ${T.fac(c) && T.fac(c).tier !== 'Hub' ? 'bg-orange-50 text-orange-800' : 'bg-slate-100 text-slate-800'}`}>{city(c)}</span>
        </span>
      ))}
      {lane && <Chip tone={kind === 'Feeder' ? 'orange' : 'blue'}>{lane}</Chip>}
    </span>
  )
}

export const Section = ({ title, sub, right, children }) => (
  <div className={`p-4 ${card}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-sm font-semibold text-slate-900">{title}</p>{sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}</div>
      {right}
    </div>
    <div className="mt-3">{children}</div>
  </div>
)

export const btn = 'rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40'
export const btnPrimary = 'rounded-xl bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-40'
export const btnGhost = 'rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40'
export const th = 'py-1.5 pr-3 text-left font-medium'
export const td = 'py-2 pr-3 align-top text-slate-600'

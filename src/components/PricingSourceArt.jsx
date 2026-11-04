import Icon from './Icon.jsx'
import indiaShape from '../data/indiaStatePaths.json'
import { CITIES as GEO_CITIES } from '../data/geoMaster.js'

// Mini illustrations for the four ways to set up pricing (Add pricing popup and
// the new-template popup). 'standard-regions' is a real India map coloured by
// region group.
const REGION_GROUP_FILL = { North: '#8b5cf6', West: '#10b981', South: '#f97316', East: '#0ea5e9', 'North East': '#ec4899' }
const STATE_ART_FILL = (() => {
  const tally = {}
  GEO_CITIES.forEach((c) => {
    const g = c.region.startsWith('North East') ? 'North East' : c.region.split(' ')[0]
    tally[c.state] = tally[c.state] ?? {}
    tally[c.state][g] = (tally[c.state][g] ?? 0) + 1
  })
  return Object.fromEntries(Object.entries(tally).map(([st, t]) => [st, REGION_GROUP_FILL[Object.entries(t).sort((x, y) => y[1] - x[1])[0][0]]]))
})()
export default function PricingSourceArt({ kind }) {
  if (kind === 'standard-regions')
    return (
      <div className="flex items-center gap-4">
        <svg viewBox={indiaShape.viewBox} className="h-[60px] w-auto" aria-hidden="true">
          {indiaShape.paths.map((p) => (
            <path key={p.id} d={p.d} fill={STATE_ART_FILL[p.name] ?? '#e2e8f0'} stroke="white" strokeWidth="0.8" />
          ))}
        </svg>
        <div className="leading-tight">
          <div className="text-2xl font-semibold text-slate-800">13</div>
          <div className="text-xs font-medium text-slate-500">Default regions</div>
        </div>
      </div>
    )
  if (kind === 'scratch')
    return (
      <div className="flex h-10 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400">
        <Icon name="plus" className="h-5 w-5" />
      </div>
    )
  if (kind === 'templates')
    return (
      <div className="relative h-10 w-24 scale-90">
        <div className="absolute left-3.5 top-0 h-9 w-[76px] rounded-md border border-slate-300 bg-white" />
        <div className="absolute left-2 top-1.5 h-9 w-[76px] rounded-md border border-slate-300 bg-white" />
        <div className="absolute left-0 top-3 flex h-9 w-[76px] items-center justify-center rounded-md border border-slate-300 bg-white text-[10px] text-slate-500">Saved set</div>
      </div>
    )
  return (
    <div className="grid h-10 w-20 grid-cols-3 grid-rows-3 overflow-hidden rounded-md border border-slate-300 bg-white">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`border-[0.5px] border-slate-200 ${i === 4 ? 'bg-sky-100' : ''}`} />
      ))}
    </div>
  )
}

import { useMemo, useState } from 'react'
import indiaShape from '../data/indiaStatePaths.json'
import { cityAt, rangeKey } from '../data/geography.js'

const TERRITORY_COLOR = '#7c3aed'
const CIRCLE_COLOR = '#0d9488'
const CITY_COLOR = '#ea580c'

// Andrew's monotone-chain convex hull, then each hull point pushed outward
// from the shape's centroid by `pad` px — a cheap "buffer" so a Circle's
// coverage reads as a soft region around its cities rather than a hull
// drawn exactly through their centres.
function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}
function inflate(hull, pad) {
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length
  return hull.map(([x, y]) => {
    const dx = x - cx, dy = y - cy
    const len = Math.hypot(dx, dy) || 1
    return [x + (dx / len) * pad, y + (dy / len) * pad]
  })
}

// Coverage blob for a Circle or a Territory: neither has a boundary of its
// own in the data — a Circle is an attribute of the Pincode rows under it,
// and a Territory is one level up, a group of Circles (per the Confluence
// "Geography & Location" doc: Territory ⊃ Circle, reversed from India
// Post's own Circle ⊃ Division naming) — so the blob is derived from the
// real coordinates of every City that falls under it. 1 city → a soft
// halo; 2 → a rounded "capsule"; 3+ → a padded convex hull, same idea as a
// State's shaded outline just approximated from points instead of a real
// polygon. `pad` is bigger for a Territory so it reads as the wider shape
// wrapping around its (smaller-padded) Circles.
function CoverageBlob({ points, color, pad = 10 }) {
  const uniq = [...new Map(points.map((p) => [`${p[0].toFixed(1)},${p[1].toFixed(1)}`, p])).values()]
  if (uniq.length === 1) {
    return <circle cx={uniq[0][0]} cy={uniq[0][1]} r={pad} fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.5" strokeWidth="0.8" />
  }
  if (uniq.length === 2) {
    return <line x1={uniq[0][0]} y1={uniq[0][1]} x2={uniq[1][0]} y2={uniq[1][1]} stroke={color} strokeOpacity="0.2" strokeWidth={pad * 2} strokeLinecap="round" />
  }
  const d = inflate(convexHull(uniq), pad).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z'
  return <path d={d} fill={color} fillOpacity="0.18" stroke={color} strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />
}

// Geography Master's Map view — same real India outline as Location
// Master's IndiaMap. Nothing is plotted until a search or a filter narrows
// things down. See the legend (top-right, in the blank space beyond the
// outline's northeast border) for what each encoding means:
//   State/UT  — the matched State/UT's whole area is shaded orange.
//   City      — a plain dot at that city's real coordinate.
//   Territory — a wide purple blob around every City under the selected
//               Territory/Territories — a Territory is a group of Circles
//               (not a State — see CoverageBlob above), so its "area
//               covered" is the union of all its Circles' cities.
//   Circle    — a tighter teal blob, same idea one level down: the real
//               coordinates of every City under the selected Circle(s).
// State, Territory and Circle are each computed from the FULL directory,
// filtered by only their OWN filter (plus search, for State) — not from
// `matchedRows`, which is every active filter intersected together. Using
// `matchedRows` for the State/orange shading was the earlier bug: since a
// Territory or Circle sits inside exactly one State, the intersected rows
// always included that State too, so it lit up orange and silently
// buried the Territory's own shading underneath it. Keeping the three
// independent means picking a Territory always shows that Territory's
// whole footprint, even while a Circle or City within it is also picked.
export default function GeographyMap({ allRows, matchedRows, hasQuery, query, stateFilter, territoryFilter, circleFilter }) {
  const [hovered, setHovered] = useState(null)

  const cityGroups = useMemo(() => {
    const byCity = new Map()
    matchedRows.forEach((r) => {
      const at = cityAt(r)
      if (!at) return
      const key = `${r.state}|${r.city}`
      if (!byCity.has(key)) byCity.set(key, { state: r.state, city: r.city, at, rows: [] })
      byCity.get(key).rows.push(r)
    })
    return [...byCity.values()]
  }, [matchedRows])

  // Orange State/UT shading: an explicit State/UT filter pick, or the
  // search box text hitting something under that State — never a
  // District/City/Pincode/Locality/Territory/Circle filter on its own,
  // those get their own distinct encoding instead.
  const stateMatchStates = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = new Set()
    allRows.forEach((r) => {
      const explicit = stateFilter?.size > 0 && stateFilter.has(r.state)
      const searched = q && [r.state, r.district, r.city, r.pincode, r.locality, rangeKey(r), r.territory, r.circle].some((v) => v.toLowerCase().includes(q))
      if (explicit || searched) out.add(r.state)
    })
    return out
  }, [allRows, query, stateFilter])

  const territoryBlobs = useMemo(() => {
    if (!territoryFilter?.size) return []
    const byTerritory = new Map()
    allRows.forEach((r) => {
      if (!territoryFilter.has(r.territory)) return
      const at = cityAt(r)
      if (!at) return
      if (!byTerritory.has(r.territory)) byTerritory.set(r.territory, [])
      byTerritory.get(r.territory).push(at)
    })
    return [...byTerritory.entries()]
  }, [allRows, territoryFilter])

  const circleBlobs = useMemo(() => {
    if (!circleFilter?.size) return []
    const byCircle = new Map()
    allRows.forEach((r) => {
      if (!circleFilter.has(r.circle)) return
      const at = cityAt(r)
      if (!at) return
      if (!byCircle.has(r.circle)) byCircle.set(r.circle, [])
      byCircle.get(r.circle).push(at)
    })
    return [...byCircle.entries()]
  }, [allRows, circleFilter])

  return (
    <div className="relative">
      <svg viewBox={indiaShape.viewBox} className="h-auto w-full" role="img" aria-label="India map of Geography Master cities">
        {indiaShape.paths.map((p) => {
          const isStateMatch = stateMatchStates.has(p.name)
          return (
            <path
              key={p.id}
              d={p.d}
              className={isStateMatch ? 'stroke-brand-orange/50' : 'fill-slate-100 stroke-slate-300'}
              style={isStateMatch ? { fill: 'rgba(234,88,12,0.16)' } : undefined}
              strokeWidth="0.6"
            />
          )
        })}
        {territoryBlobs.map(([territory, pts]) => (
          <CoverageBlob key={territory} points={pts} color={TERRITORY_COLOR} pad={16} />
        ))}
        {circleBlobs.map(([circle, pts]) => (
          <CoverageBlob key={circle} points={pts} color={CIRCLE_COLOR} pad={9} />
        ))}
        {hasQuery && cityGroups.map((g) => {
          const key = `${g.state}|${g.city}`
          const size = 3.2 + Math.min(g.rows.length, 5) * 0.7
          return (
            <circle
              key={key}
              cx={g.at[0]}
              cy={g.at[1]}
              r={size}
              fill={CITY_COLOR}
              stroke="white"
              strokeWidth="0.8"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
            />
          )
        })}
      </svg>

      {/* Sits in the blank space beyond the outline's northeast border (near
          where China/Tibet would be on a real map) — the one part of the
          canvas with no state to cover. */}
      <div className="absolute right-[2%] top-[3%] w-40 space-y-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'rgba(234,88,12,0.3)', border: '1px solid rgba(234,88,12,0.6)' }} />
          State/UT
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CITY_COLOR }} />
          City
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.6)' }} />
          Territory
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'rgba(13,148,136,0.3)', border: '1px solid rgba(13,148,136,0.6)' }} />
          Circle
        </div>
      </div>

      {hovered && (() => {
        const g = cityGroups.find((gg) => `${gg.state}|${gg.city}` === hovered)
        if (!g) return null
        const shown = g.rows.slice(0, 3)
        const leftPct = (g.at[0] / 480) * 100
        const topPct = (g.at[1] / 511) * 100
        return (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            <div className="font-semibold text-slate-800">{g.city}</div>
            <div className="text-slate-500">{g.state} · {g.rows[0]?.district}</div>
            <div className="mt-1 space-y-0.5 text-slate-500">
              {shown.map((r) => (
                <div key={r.pincode}>{rangeKey(r)}</div>
              ))}
              {g.rows.length > 3 && <div className="text-slate-400">+{g.rows.length - 3} more</div>}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

import { useState } from 'react'
import indiaShape from '../data/indiaStatePaths.json'
import { REGION_COLORS, zoneMiniHubCount } from '../data/logistics.js'
import { STATE_REGION } from '../data/regionGeography.js'

// Turns a hex colour into an rgba() string at the given alpha, so a
// state's fill can reuse the exact same per-Region colour as its Hub
// markers instead of a second, hand-picked shading palette.
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Real India state outline matching the Survey of India's official
// political map, authored directly at state granularity (not dissolved up
// from district boundaries, which left visible seam artifacts in an
// earlier pass — see git history) and projected at build time. J&K/Ladakh
// here show the full national claim, not the de-facto Line-of-Control
// boundary some international datasets (e.g. GADM) draw instead. Zone/Hub
// markers are plotted at each hub city's real coordinates, colour-coded by
// Region — not a design placeholder, the shape and every marker position
// are geographically real.
//
// Marker shapes (see the legend under the map): a Hub is a square at its
// real coordinate; a Mini Hub has no coordinate of its own in the data
// model (only the parent Hub is geocoded), so its triangles are arranged
// in a small ring around the parent Hub's square — a visual "belongs to
// this Hub" grouping, not an independent real position. Colour always
// means Region. `zones` is expected to already be whatever the page's own
// Region/Hub/Mini Hub filters and search box narrow the sheet down to (see
// LogisticsMaster's `mapZones`) — every zone this component receives is
// drawn at full opacity, there's no separate dimmed state to render here.
//
// State/UT shading is separate from that: it only lights up for a Region
// the user has explicitly picked in the Region filter (`selectedRegions`),
// not just any Region that happens to have a matching zone — so the map
// stays a plain Hub/Mini Hub picture until someone asks "where does Region
// X actually cover?". Only a Region that owns a State/UT outright in
// REGION_STATES gets shaded — a metro-anchored Region (South 1's
// Bengaluru + Hyderabad, East 1's Kolkata + Aurangabad-Chauparan, etc.)
// has no State-level entry there, since its real coverage is a city's own
// district and this map only has State-granularity polygons; picking one
// of those Regions still narrows the Hub/Mini Hub markers below, it just
// doesn't shade anything (better than shading the wrong area).
export default function IndiaMap({ zones, selectedZone, onSelectZone, selectedRegions }) {
  const [hovered, setHovered] = useState(null)

  const presentRegions = selectedRegions ?? new Set()

  return (
    <div className="relative">
      <svg viewBox={indiaShape.viewBox} className="h-auto w-full" role="img" aria-label="India map of Zones and Hubs">
        {indiaShape.paths.map((p) => {
          const region = STATE_REGION[p.name]
          const isCovered = region && presentRegions.has(region)
          return (
            <path
              key={p.id}
              d={p.d}
              className={isCovered ? 'stroke-slate-300' : 'fill-slate-100 stroke-slate-300'}
              style={isCovered ? { fill: hexToRgba(REGION_COLORS[region] || '#64748b', 0.22) } : undefined}
              strokeWidth="0.6"
            />
          )
        })}
        {zones.map((z) => {
          const isSelected = selectedZone === z.zone
          const color = REGION_COLORS[z.region] || '#64748b'
          const miniHubs = z.branches.flatMap((b) => b.miniHubs)
          const hubSize = 6.5
          const ringRadius = 7.5
          const triSize = 2.4
          return (
            <g
              key={z.zone}
              onMouseEnter={() => setHovered(z.zone)}
              onMouseLeave={() => setHovered((h) => (h === z.zone ? null : h))}
              onClick={() => onSelectZone?.(z.zone)}
              className="cursor-pointer"
            >
              {isSelected && (
                <circle cx={z.at[0]} cy={z.at[1]} r={ringRadius + 5} fill="none" stroke={color} strokeWidth="1.4" opacity="0.55" />
              )}
              {miniHubs.map((m, i) => {
                const angle = (i / miniHubs.length) * Math.PI * 2 - Math.PI / 2
                const mx = z.at[0] + Math.cos(angle) * ringRadius
                const my = z.at[1] + Math.sin(angle) * ringRadius
                const points = `${mx},${my - triSize} ${mx - triSize},${my + triSize} ${mx + triSize},${my + triSize}`
                return (
                  <polygon
                    key={m.code}
                    points={points}
                    fill={color}
                    stroke="white"
                    strokeWidth="0.6"
                    opacity="0.9"
                  />
                )
              })}
              <rect
                x={z.at[0] - hubSize / 2}
                y={z.at[1] - hubSize / 2}
                width={hubSize}
                height={hubSize}
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            </g>
          )
        })}
      </svg>

      {/* Sits in the blank space beyond the outline's northeast border (near
          where China/Tibet would be on a real map) — the one part of the
          canvas with no state to cover. */}
      <div className="absolute right-[2%] top-[3%] w-36 space-y-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0"><rect width="10" height="10" rx="1.5" fill="#64748b" /></svg>
          Hub
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="11" height="10" viewBox="0 0 11 10" aria-hidden="true" className="shrink-0"><polygon points="5.5,0 0,10 11,10" fill="#64748b" /></svg>
          Mini Hub
        </div>
      </div>

      {hovered && (() => {
        const z = zones.find((zz) => zz.zone === hovered)
        if (!z) return null
        const nHubs = zoneMiniHubCount(z)
        const leftPct = (z.at[0] / 480) * 100
        const topPct = (z.at[1] / 511) * 100
        return (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            <div className="font-semibold text-slate-800">{z.zone}</div>
            <div className="text-slate-500">{z.hubName} · {z.hubCode}</div>
            <div className="mt-0.5 flex items-center gap-1 text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: REGION_COLORS[z.region] }} />
              {z.region}{nHubs ? ` · ${nHubs} mini hub${nHubs > 1 ? 's' : ''}` : ''}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

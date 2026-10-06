import { useState } from 'react'
import { fmtInr } from '../../data/costing.js'

const W = 820
const PAD = { l: 52, r: 16, t: 14, b: 26 }

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

// Actual line + dashed forecast with confidence band + optional budget and
// scenario lines. `points` = [{label, actual?, forecast?, lo?, hi?, budget?, scenario?}]
export function TrendChart({ points, height = 260, scenarioLabel = 'Scenario' }) {
  const [hover, setHover] = useState(null)
  const H = height
  const max = niceMax(Math.max(...points.flatMap((p) => [p.actual, p.forecast, p.hi, p.budget, p.scenario].filter((v) => v != null))) * 1.04)
  const min = 0
  const x = (i) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b)
  const path = (key, from = 0) => {
    const pts = points.map((p, i) => [i, p[key]]).filter(([i, v]) => i >= from && v != null)
    return pts.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  }
  const lastActual = points.reduce((a, p, i) => (p.actual != null ? i : a), 0)
  const band = points.filter((p) => p.lo != null)
  const bandPath = band.length
    ? `M${points.map((p, i) => (p.lo != null ? `${x(i)},${y(p.hi)}` : null)).filter(Boolean).join(' L')} L${points.map((p, i) => (p.lo != null ? `${x(i)},${y(p.lo)}` : null)).filter(Boolean).reverse().join(' L')} Z`
    : ''
  // Forecast line connects from the last actual point.
  const fcPath = points.some((p) => p.forecast != null)
    ? `M${x(lastActual)},${y(points[lastActual].actual)} ` + points.map((p, i) => (p.forecast != null ? `L${x(i)},${y(p.forecast)}` : '')).join(' ')
    : ''
  const scPath = points.some((p) => p.scenario != null)
    ? `M${x(lastActual)},${y(points[lastActual].actual)} ` + points.map((p, i) => (p.scenario != null ? `L${x(i)},${y(p.scenario)}` : '')).join(' ')
    : ''
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const h = hover != null ? points[hover] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          setHover(Math.max(0, Math.min(points.length - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1)))))
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t === 0 ? '' : '3 4'} />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{fmtInr(t, 1)}</text>
          </g>
        ))}
        {points.map((p, i) => (i % Math.ceil(points.length / 12) === 0 || i === points.length - 1) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={p.forecast != null || p.scenario != null ? '#D94F1C' : '#94a3b8'}>{p.label}</text>
        ))}
        {lastActual < points.length - 1 && (
          <rect x={x(lastActual)} y={PAD.t} width={W - PAD.r - x(lastActual)} height={H - PAD.t - PAD.b} fill="#D94F1C" opacity="0.04" />
        )}
        {bandPath && <path d={bandPath} fill="#D94F1C" opacity="0.12" />}
        {points.some((p) => p.budget != null) && <path d={path('budget')} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 4" />}
        <path d={path('actual')} fill="none" stroke="#1A2B4A" strokeWidth="2.25" strokeLinejoin="round" />
        {fcPath && <path d={fcPath} fill="none" stroke="#D94F1C" strokeWidth="2.25" strokeDasharray="6 4" />}
        {scPath && <path d={scPath} fill="none" stroke="#7C3AED" strokeWidth="2.5" />}
        {points.map((p, i) => p.actual != null && <circle key={i} cx={x(i)} cy={y(p.actual)} r="2.5" fill="#1A2B4A" />)}
        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#cbd5e1" />
            {[h.actual, h.forecast, h.scenario].map((v, k) => v != null && <circle key={k} cx={x(hover)} cy={y(v)} r="4.5" fill="#fff" stroke={k === 0 ? '#1A2B4A' : k === 1 ? '#D94F1C' : '#7C3AED'} strokeWidth="2" />)}
          </>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 88px), calc(100% - 11rem))` }}
        >
          <p className="font-semibold text-slate-800">{h.label}{h.forecast != null || h.scenario != null ? ' · forecast' : ''}</p>
          {h.actual != null && <Row c="#1A2B4A" l="Actual" v={fmtInr(h.actual)} />}
          {h.forecast != null && <Row c="#D94F1C" l="Forecast" v={fmtInr(h.forecast)} />}
          {h.lo != null && <p className="text-[10px] text-slate-400">80% range {fmtInr(h.lo)} – {fmtInr(h.hi)}</p>}
          {h.scenario != null && <Row c="#7C3AED" l={scenarioLabel} v={fmtInr(h.scenario)} />}
          {h.budget != null && <Row c="#94a3b8" l="Budget" v={fmtInr(h.budget)} />}
        </div>
      )}
    </div>
  )
}

function Row({ c, l, v }) {
  return (
    <p className="mt-1 flex items-center justify-between gap-2 text-slate-600">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
      <span className="font-semibold tabular-nums text-slate-900">{v}</span>
    </p>
  )
}

export function Sparkline({ values, color = '#1A2B4A', w = 84, h = 24 }) {
  const min = Math.min(...values), max = Math.max(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ')
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Horizontal 100% bar with legend entries underneath handled by the caller.
export function CompositionBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
      {parts.map((p) => <div key={p.key} title={`${p.label}: ${fmtInr(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
    </div>
  )
}

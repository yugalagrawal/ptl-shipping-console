import { useState } from 'react'
import { card } from '../../components/ui.js'

// Illustrative network only — concept for how a lane's cost & capacity would
// be simulated once Rate & Tariff (rate-cards/calculate) and Manifest
// utilization data exist. Nothing here is computed live.
//
// Moved here from Trip Management's old "Supply Management" tab — this is
// the hub-and-spoke lever simulator half of Network Simulator (the other
// half, Freight Calculator, lives alongside it and reuses the real pricing
// engine from data/pricing.js instead of illustrative numbers).

const HUBS = ['FM · Chennai', 'Hub · Chennai', 'Hub · Nagpur', 'Hub · Kanpur', 'LM · Delhi']
const VEHICLE_TYPES = ['ICV · up to 3.5T', 'MCV · up to 7.5T', 'HCV · up to 16T', '32ft container']

const ROUTE_CHAIN = [
  { label: 'FM · Chennai', distanceToNext: 30 },
  { label: 'Hub1 · Chennai', distanceToNext: 620 },
  { label: 'Hub2 · Nagpur', distanceToNext: 560 },
  { label: 'Hub3 · Kanpur', distanceToNext: 480 },
  { label: 'LM · Delhi', distanceToNext: null },
]

const STATS = [
  { label: 'Transit time', value: '3d 9h' },
  { label: 'Distance', value: '1,690 km' },
  { label: 'Total cost', value: '₹1,180' },
  { label: 'Cost / kg', value: '₹23.6' },
  { label: 'Hub touches', value: '3' },
]

const LEGS = [
  { leg: 'FM Chennai → Hub1 Chennai', distance: 30, transit: 1.0 },
  { leg: 'Hub1 Chennai → Hub2 Nagpur', distance: 620, transit: 19.4 },
  { leg: 'Hub2 Nagpur → Hub3 Kanpur', distance: 560, transit: 17.5 },
  { leg: 'Hub3 Kanpur → LM Delhi', distance: 480, transit: 15.0 },
]

const COST_BREAKDOWN = [
  { label: 'Linehaul', value: 690, className: 'bg-brand-orange' },
  { label: 'Hub ops', value: 440, className: 'bg-sky-500' },
  { label: 'Misc', value: 50, className: 'bg-slate-300' },
]
const COST_TOTAL = COST_BREAKDOWN.reduce((sum, c) => sum + c.value, 0)

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function RouteCostSimulator() {
  const [origin, setOrigin] = useState(HUBS[0])
  const [destination, setDestination] = useState(HUBS[HUBS.length - 1])
  const [forceVia1, setForceVia1] = useState('None')
  const [forceVia2, setForceVia2] = useState('None')
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0])
  const [serviceType, setServiceType] = useState('standard')
  const [weight, setWeight] = useState(50)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Route & Cost Simulator</h1>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            Illustrative network &amp; rates · concept only
          </span>
        </div>
        <p className="mt-1 text-slate-500">Pull hub, vehicle and service-level levers to see simulated cost & transit time for a lane.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className={`h-fit space-y-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pull the levers</h2>

          <Select label="Origin" value={origin} onChange={setOrigin} options={HUBS} />
          <Select label="Destination" value={destination} onChange={setDestination} options={HUBS} />
          <Select label="Force via hub #1" value={forceVia1} onChange={setForceVia1} options={['None', ...HUBS]} />
          <Select label="Force via hub #2" value={forceVia2} onChange={setForceVia2} options={['None', ...HUBS]} />
          <Select label="Vehicle type" value={vehicleType} onChange={setVehicleType} options={VEHICLE_TYPES} />

          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Service type</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {['standard', 'express'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setServiceType(s)}
                  className={`rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                    serviceType === s ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Shipment weight
              <span className="text-xs font-semibold normal-case tracking-normal text-brand-orange-dark">{weight} kg</span>
            </span>
            <input
              type="range"
              min={5}
              max={500}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full accent-brand-orange"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setOrigin(HUBS[0])
              setDestination(HUBS[HUBS.length - 1])
              setForceVia1('None')
              setForceVia2('None')
              setVehicleType(VEHICLE_TYPES[0])
              setServiceType('standard')
              setWeight(50)
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Reset to defaults
          </button>
        </div>

        <div className="space-y-6">
          <div className={`overflow-hidden ${card}`}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="font-medium text-slate-900">Simulated route</h2>
              <p className="text-xs text-slate-400">Amber chain = current levers, subject to live capacity at booking time.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-6 py-5">
              {ROUTE_CHAIN.map((h, i) => (
                <div key={h.label} className="flex items-center gap-2">
                  <span className="rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1.5 text-xs font-medium text-brand-orange-dark">
                    {h.label}
                  </span>
                  {h.distanceToNext != null && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      {h.distanceToNext} km
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STATS.map((s) => (
              <div key={s.label} className={`p-4 ${card}`}>
                <div className="text-[11px] font-medium text-slate-400">{s.label}</div>
                <div className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className={`overflow-hidden ${card}`}>
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-medium text-slate-900">Leg-by-leg</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-2.5">Leg</th>
                    <th className="px-3 py-2.5 text-right">Distance (km)</th>
                    <th className="px-6 py-2.5 text-right">Transit (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {LEGS.map((l) => (
                    <tr key={l.leg} className="border-t border-slate-100">
                      <td className="px-6 py-3 text-slate-700">{l.leg}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{l.distance}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-600">{l.transit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`space-y-4 p-5 ${card}`}>
              <h2 className="font-medium text-slate-900">Cost breakdown</h2>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                {COST_BREAKDOWN.map((c) => (
                  <div key={c.label} className={c.className} style={{ width: `${(c.value / COST_TOTAL) * 100}%` }} />
                ))}
              </div>
              <div className="space-y-2">
                {COST_BREAKDOWN.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${c.className}`} />
                      {c.label}
                    </span>
                    <span className="tabular-nums font-medium text-slate-800">₹{c.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-900">
                  <span>Total</span>
                  <span className="tabular-nums">₹{COST_TOTAL}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

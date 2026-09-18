import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { card } from '../components/ui.js'

// Read-only reference page — describes how the modules fit together, it
// doesn't do anything itself. Module names link out to the real pages so
// it doubles as a jumping-off point, but nothing on this page is editable.

const FLOW = [
  { key: 'client', label: 'Client Module', to: '/client-module/active-clients', icon: 'building', blurb: 'Client onboarded, KYC done, priced and activated.' },
  { key: 'order', label: 'Pickup Module', to: '/order-module/create-order', icon: 'order', blurb: 'Pickup booked against an activated client — AWB generated.' },
  { key: 'routing', label: 'Trip Module · Routing Simulator', to: '/trip-management/routing-simulator', icon: 'route', blurb: 'Orders past "Inward at Origin Hub" aggregated into a manifest by lane.' },
  { key: 'assignment', label: 'Supply & Fleet Module · Truck Assignment', to: '/supply-fleet-module/truck-assignment', icon: 'swap', blurb: 'Best-fit available truck matched to the manifest.' },
  { key: 'warehouse', label: 'Warehouse & Hub Ops', to: '/warehouse-hub-ops', icon: 'warehouse', blurb: 'Scan, sort and pallet events as the manifest moves through hubs.' },
  { key: 'tracking', label: 'Trip Module · Trip Tracking', to: '/trip-management/tracking', icon: 'tracking', blurb: 'Live location and status until delivery; closes out to Past Trips.' },
  { key: 'finance', label: 'Finance Management', to: '/finance-management/invoicing', icon: 'invoice', blurb: 'Invoice generated from the executed trip against contract rates.' },
]

const SUPPORTING = [
  {
    key: 'logic-engine',
    label: 'Logic Engine',
    to: '/logic-engine',
    icon: 'logic',
    definition: 'The rules that steer every other module — not a step in the flow itself, an input to several of its steps.',
    feeds: ['Client Module (tiering & SLA rules)', 'Trip Module (route planning & prioritization)', 'Supply & Fleet Module (supply-demand matching)'],
  },
  {
    key: 'network-simulator',
    label: 'Network Simulator',
    to: '/network-simulator/route-cost',
    icon: 'route',
    definition: 'Exploratory planning tools — a lane cost/capacity simulator and a standalone freight calculator. Used before or alongside a real booking, not part of the executed pipeline.',
    feeds: ['Nothing automatically — output is read by a person, not consumed by another module'],
  },
]

function FlowArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FlowStage({ stage }) {
  return (
    <Link
      to={stage.to}
      className="flex w-52 shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-brand-orange/40 hover:bg-white"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange-dark">
        <Icon name={stage.icon} className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium text-slate-900">{stage.label}</span>
      <span className="text-xs leading-snug text-slate-500">{stage.blurb}</span>
    </Link>
  )
}

const DEFINITIONS = [
  { module: 'Client Module', definition: 'Client master data, KYC, tiering and contract rate cards.', owns: 'Customer Group → Legal Entity, GSTIN, pricing matrix & tier.', handsOff: 'Pickup Module — only activated clients can be booked against.' },
  { module: 'Pickup Module', definition: 'Pickup intake (AWB booking) and per-pickup tracking up to hub inward.', owns: 'AWB, consignor/consignee, chargeable weight, freight preview.', handsOff: 'Trip Module — once a pickup is Inward at Origin Hub.' },
  { module: 'Trip Module', definition: 'Order aggregation, multi-leg (FM/MM/LM) trip construction and execution tracking.', owns: 'Manifests, trip legs, live trip status, trip history.', handsOff: 'Supply & Fleet Module (needs a truck); Finance Management (once delivered).' },
  { module: 'Supply & Fleet Module', definition: 'Vendor fleet, owned assets, drivers and truck-to-manifest matching.', owns: 'Vehicle & driver roster, compliance status, assignment queue.', handsOff: 'Trip Module (assigned vehicle); Warehouse & Hub Ops (loading events).' },
  { module: 'Warehouse & Hub Ops', definition: 'Pallet allotment, barcode/QR scanning and hub-level sorting logs.', owns: 'Scan events, dwell times, sort-location logs.', handsOff: 'Trip Module — a "loaded on vehicle" scan is what starts a trip leg.' },
  { module: 'Network Simulator', definition: 'Hub-and-spoke lane simulator plus a standalone freight calculator.', owns: 'Illustrative lane cost/capacity; ad-hoc freight quotes.', handsOff: 'Nothing — exploratory only, doesn’t feed real data anywhere.' },
  { module: 'Finance Management', definition: 'Cost allocation, invoicing and collections, LR by LR.', owns: 'Invoices, receivables ageing, margin.', handsOff: '— end of the operational chain.' },
  { module: 'Logic Engine', definition: 'The rules that steer every other module.', owns: 'Client tiering/SLA rules, supply-demand matching, route planning, prioritization.', handsOff: 'Client Module, Trip Module, Supply & Fleet Module — as inputs, not a handoff.' },
  { module: 'User Module', definition: 'Roles, function-level permissions and city/branch access for the LT Team login.', owns: 'Roles, delegated access, city & branch scoping.', handsOff: 'Wraps every module above — governs who can see or do what, everywhere.' },
]

export default function SystemInfo() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">System Info</h1>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">Read-only</span>
        </div>
        <p className="mt-1 text-slate-500">How PTL Console's modules connect and hand off to one another — a reference, not a working screen.</p>
      </div>

      <div className={`space-y-2 p-6 ${card}`}>
        <h2 className="text-sm font-semibold text-slate-900">What PTL Console is</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          PTL Console is LetsTransport's internal operating system for Part Truck Load (PTL) logistics. It replaces spreadsheets and
          third-party TMS tools with one connected system spanning client onboarding, order booking, trip execution, fleet management,
          warehouse operations and billing — every module below reads from or writes to the same underlying client, order and trip
          records, rather than each running its own disconnected copy of the truth.
        </p>
      </div>

      <div className={`space-y-4 p-6 ${card}`}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">The operational flow</h2>
          <p className="mt-0.5 text-xs text-slate-500">What actually happens, in order, from a new client to a paid invoice. Click any stage to open it.</p>
        </div>
        <div className="flex flex-wrap items-stretch gap-2 overflow-x-auto pb-1">
          {FLOW.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2">
              <FlowStage stage={stage} />
              {i < FLOW.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SUPPORTING.map((s) => (
          <div key={s.key} className={`space-y-3 p-6 ${card}`}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              <Link to={s.to} className="text-sm font-semibold text-slate-900 hover:text-brand-orange-dark">{s.label}</Link>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Supporting — not in the flow</span>
            </div>
            <p className="text-sm text-slate-600">{s.definition}</p>
            <ul className="space-y-1">
              {s.feeds.map((f) => (
                <li key={f} className="flex gap-2 text-xs text-slate-500">
                  <span className="text-slate-300">—</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`flex items-start gap-4 p-6 ${card}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Link to="/user-module/access-management" className="text-sm font-semibold text-slate-900 hover:text-brand-orange-dark">User Module</Link>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Access layer — wraps every module above</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Not a step in the business flow — a cross-cutting layer over all of it. Every module above is gated by role, function-level
            permission, and city/branch scope, all defined here. This is who can <em>see</em> or <em>do</em> something in a module, not
            what that module itself does.
          </p>
        </div>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Module definitions</h2>
          <p className="mt-0.5 text-xs text-slate-500">One row per module — what it is, what it owns, and where its output goes next.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                <th className="px-6 py-2.5">Module</th>
                <th className="px-4 py-2.5">Definition</th>
                <th className="px-4 py-2.5">Owns</th>
                <th className="px-6 py-2.5">Hands off to</th>
              </tr>
            </thead>
            <tbody>
              {DEFINITIONS.map((d) => (
                <tr key={d.module} className="border-t border-slate-100 align-top">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{d.module}</td>
                  <td className="px-4 py-3.5 text-slate-600">{d.definition}</td>
                  <td className="px-4 py-3.5 text-slate-500">{d.owns}</td>
                  <td className="px-6 py-3.5 text-slate-500">{d.handsOff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

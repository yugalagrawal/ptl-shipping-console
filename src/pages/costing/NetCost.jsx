import BackButton from '../../components/BackButton.jsx'
import { card } from '../../components/ui.js'

// Level 3 Cost — fully loaded cost of a docket: Level 1 (transport) + Level 2 (hub) + everything else that could not be attributed in Level 1 or Level 2.
// Sample numbers, not wired yet. How the indirect cost is allocated to dockets is still to be decided.
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const DOCKETS = [
  { id: 'DKT-1', kg: 400, revenue: 9800, cm1: 4300, cm2: 770, cm3: 310 },
  { id: 'DKT-2', kg: 200, revenue: 5200, cm1: 2320, cm2: 1025, cm3: 155 },
  { id: 'DKT-3', kg: 300, revenue: 5600, cm1: 2450, cm2: 578, cm3: 232 },
]

const LADDER = [
  [[['Gross revenue', 'Revenue booked, plus incidentals if any'], ['Net revenue', 'Gross revenue minus client deductions = what the client actually paid']], '', 'border-slate-900 bg-slate-900 text-white'],
  ['− Level 1 cost', 'Direct transportation cost: PRS, DRS and manifest', 'border-orange-200 bg-orange-50/60 text-slate-900'],
  ['− Level 2 cost', 'Warehouse cost incl. hub payroll: sortation (by weight) + storage (by kg-hours beyond sortation hours)', 'border-sky-200 bg-sky-50/60 text-slate-900'],
  ['− Level 3 cost', 'Non-warehouse cost not attributed in Level 1 or Level 2. e.g. managers, corporate overheads (head office rent, finance, HR, admin), R&D and technology, sales and marketing, claims, bad debt. Hub-only payroll is in Level 2', 'border-slate-300 bg-slate-100 text-slate-900'],
  ['= Level 3 margin', '', 'border-orange-500 bg-orange-500 text-white'],
]

export default function NetCost() {
  const rows = DOCKETS.map((d) => {
    const net = d.cm1 + d.cm2 + d.cm3
    return { ...d, net, margin: d.revenue - net }
  })
  const tot = (k) => rows.reduce((t, r) => t + r[k], 0)
  const th = 'py-1.5 pr-3 text-right font-medium'
  const td = 'py-2 pr-3 text-right tabular-nums text-slate-600'
  return (
    <div className="max-w-5xl space-y-4">
      <BackButton />
      <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Level 3 Cost</h1>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Level 3 cost = non-warehouse cost that cannot be attributed in Level 1 or Level 2</p>
        <p className="mt-0.5 text-xs text-slate-500">Level 1 covers transportation and Level 2 covers everything a warehouse costs, including payroll of people who work for the hub only. Level 3 picks up only the non-warehouse cost, such as managers, corporate overheads, R&D, sales and marketing and claims, and allocates it across dockets. Total cost of a docket = Level 1 + Level 2 + Level 3.</p>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2">
          {LADDER.map(([t, d, tone]) => Array.isArray(t) ? (
            <div key="rev" className="flex gap-2">
              {t.map(([a, b]) => (
                <div key={a} className={`flex-1 rounded-xl border px-3 py-2 ${tone}`}>
                  <p className="text-sm font-semibold">{a}</p>
                  <p className="text-[11px] opacity-80">{b}</p>
                </div>
              ))}
            </div>
          ) : (
            <div key={t} className={`rounded-xl border px-3 py-2 ${tone}`}>
              <p className="text-sm font-semibold">{t}</p>
              {d && <p className="text-[11px] opacity-80">{d}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-medium text-slate-600">Total cost = Level 1 cost + Level 2 cost + Level 3 cost</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Where does a cost go? Level 2 or Level 3</p>
        <p className="mt-1 text-xs text-slate-500">One test: <b className="text-slate-800">does the person or bill exist only for running a hub?</b> If yes, it is Level 2. If it also serves the wider company, it is Level 3.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">Level 2 · Warehouse cost</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Hub payroll: people who work for the hub only</p>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
              <li>· Loaders, unloaders and sorters</li>
              <li>· Hub supervisors and hub staff</li>
              <li>· Hub accountant or data-entry staff posted at the hub</li>
              <li>· Hub rent, electricity, security, housekeeping</li>
              <li>· Extra labour on a peak day</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Level 3 · Non-warehouse cost</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Managers and corporate: people who serve more than the hub</p>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
              <li>· Managers: branch, regional, zonal and city heads</li>
              <li>· Head office rent, finance, HR and admin</li>
              <li>· R&amp;D and technology</li>
              <li>· Sales and marketing</li>
              <li>· Claims and bad debt</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><b className="text-slate-800">Example:</b> a loader at the Kolkata hub is Level 2 for that hub. The regional manager who oversees Kolkata and five other hubs is Level 3.</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Example — three dockets</p>
        <p className="mt-1 text-xs text-slate-500">Sample numbers. How Level 3 cost is split across dockets (for example by weight or by revenue) is yet to be decided.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-400">
                <th className="py-1.5 pr-3 font-medium">Docket</th><th className={th}>Kg</th><th className={th}>Net revenue</th>
                <th className={th}>Level 1 cost</th><th className={th}>Level 2 cost</th><th className={th}>Level 3 cost</th>
                <th className={`${th} text-slate-900`}>Total cost</th><th className="py-1.5 text-right font-medium">Level 3 margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{r.id}</td>
                  <td className={td}>{r.kg}</td><td className={td}>{inr(r.revenue)}</td>
                  <td className={td}>{inr(r.cm1)}</td><td className={td}>{inr(r.cm2)}</td><td className={td}>{inr(r.cm3)}</td>
                  <td className={`${td} font-semibold text-slate-900`}>{inr(r.net)}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${r.margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{inr(r.margin)} <span className="font-normal text-slate-400">· {Math.round((r.margin / r.revenue) * 100)}%</span></td>
                </tr>
              ))}
              <tr className="text-slate-500">
                <td className="py-2 pr-3 font-medium">All dockets</td>
                <td className={td}>{tot('kg')}</td><td className={td}>{inr(tot('revenue'))}</td>
                <td className={td}>{inr(tot('cm1'))}</td><td className={td}>{inr(tot('cm2'))}</td><td className={td}>{inr(tot('cm3'))}</td>
                <td className={`${td} font-semibold text-slate-900`}>{inr(tot('net'))}</td>
                <td className="py-2 text-right font-semibold tabular-nums text-slate-900">{inr(tot('margin'))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Total cost per kg = total cost ÷ kg.</p>
      </div>
    </div>
  )
}

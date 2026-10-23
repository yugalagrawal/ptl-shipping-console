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
  ['Net revenue', 'What the client pays', 'border-slate-900 bg-slate-900 text-white'],
  ['− Level 1 cost', 'Direct transportation cost: PRS, DRS and manifest', 'border-orange-200 bg-orange-50/60 text-slate-900'],
  ['− Level 2 cost', 'Hub cost: facility, labour and handling', 'border-sky-200 bg-sky-50/60 text-slate-900'],
  ['− Level 3 cost', 'Everything else that could not be attributed in Level 1 or Level 2', 'border-slate-300 bg-slate-100 text-slate-900'],
  ['= Level 3 margin', 'Net revenue minus total cost', 'border-orange-500 bg-orange-500 text-white'],
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
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Level 3 Cost</h1>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Level 3 cost = everything else that cannot be attributed in Level 1 or Level 2</p>
        <p className="mt-1 text-xs text-slate-500">Level 1 covers transportation and Level 2 covers hubs. Level 3 picks up everything else that cannot be attributed to a docket in those two, such as people, corporate overheads and claims, and allocates it across dockets. Total cost of a docket = Level 1 + Level 2 + Level 3.</p>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2">
          {LADDER.map(([t, d, tone]) => (
            <div key={t} className={`rounded-xl border px-3 py-2 ${tone}`}>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-[11px] opacity-80">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-medium text-slate-600">Total cost = Level 1 cost + Level 2 cost + Level 3 cost</p>
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

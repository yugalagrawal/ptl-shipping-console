import { card } from '../../components/ui.js'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

// A docket's mid-mile journey can span several manifests. Each manifest = one truck, one partner, one pricing method.
const MANIFESTS = [
  { id: 'MF-3301', route: 'A → B', partner: 'Raj Transport', method: 'Per Km', calc: '100 km × ₹30', cost: 3000, bar: 'bg-sky-500', soft: 'bg-sky-50 text-sky-800 ring-sky-200', span: [0, 1], dockets: { 'MM-101': 400, 'MM-102': 600 } },
  { id: 'MF-3302', route: 'B → D', partner: 'Sai Logistics', method: 'Per Trip', calc: 'flat trip rate', cost: 9000, bar: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-800 ring-emerald-200', span: [1, 3], dockets: { 'MM-101': 400, 'MM-102': 600, 'MM-103': 300 } },
  { id: 'MF-3303', route: 'D → A', partner: 'Own fleet', method: 'Per Kg', calc: '750 kg × ₹6', cost: 4500, bar: 'bg-amber-500', soft: 'bg-amber-50 text-amber-800 ring-amber-200', span: [3, 4], dockets: { 'MM-201': 500, 'MM-202': 250 } },
]
const DOCKETS = [
  ['MM-101', 'Sharma Textiles', 'A → C'], ['MM-102', 'Delhi Auto Parts', 'A → D'], ['MM-103', 'Kapoor Electricals', 'B → D'], ['MM-201', 'Rao Pharma', 'D → A'], ['MM-202', 'Gupta Traders', 'D → A'],
]
const STOPS = ['A', 'B', 'C', 'D', 'A']

export default function MidMile() {
  const mfKg = (m) => Object.values(m.dockets).reduce((a, b) => a + b, 0)
  const pieces = (id) => MANIFESTS.filter((m) => m.dockets[id]).map((m) => ({ m, v: (m.cost * m.dockets[id]) / mfKg(m) }))
  const rows = DOCKETS.map(([id, who, route]) => { const p = pieces(id); return { id, who, route, p, total: p.reduce((t, x) => t + x.v, 0) } })
  const grand = rows.reduce((t, r) => t + r.total, 0)
  return (
    <div className="space-y-4">
      <div className={`p-4 ${card}`}>
        <p className="text-sm text-slate-700"><b>Mid mile is costed per manifest, then manifest → docket.</b> A manifest is one truck, one partner, one pricing method. A docket’s journey can cross several manifests, and each can be paid differently.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white">1 · Price each manifest</span><span className="text-slate-300">→</span>
          <span className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white">2 · Spread it to its dockets</span><span className="text-slate-300">→</span>
          <span className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white">3 · Docket adds its pieces</span>
        </div>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">The route and its manifests</p>
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="relative mx-4 h-7">
              <span className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-300" />
              {STOPS.map((n, i) => (
                <span key={i} className="absolute top-0 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white" style={{ left: `${i * 25}%` }}>{n}</span>
              ))}
            </div>
            <div className="mx-4 mt-3 space-y-2">
              {MANIFESTS.map((m) => (
                <div key={m.id} className="grid grid-cols-4 gap-0">
                  <div className={`${m.bar} flex items-center justify-between rounded-md px-3 py-2 text-xs text-white`} style={{ gridColumn: `${m.span[0] + 1} / ${m.span[1] + 1}` }}>
                    <span className="font-semibold">{m.id} · {m.route}</span><span className="opacity-90">{m.partner} · {m.method}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Same journey, three trucks: the first manifest is paid per km, the second per trip, the return on own fleet per kg.</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Step 1 + 2 · Each manifest’s cost goes to its dockets by % charged weight</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {MANIFESTS.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-3">
                <p className="text-xs text-slate-500">{m.id} · {m.route} · {m.partner}</p>
                <p className="mt-1"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${m.soft}`}>{m.method}</span> <span className="text-xs text-slate-500">{m.calc}</span></p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{inr(m.cost)}</p>
                <p className="text-[11px] text-slate-500">{mfKg(m)} kg on the manifest</p>
              </div>
              <div className="flex h-2 overflow-hidden">
                {Object.entries(m.dockets).map(([id, kg], k) => <div key={id} className={m.bar} style={{ width: `${(kg / mfKg(m)) * 100}%`, opacity: 1 - k * 0.22 }} />)}
              </div>
              <div className="space-y-1 p-2.5">
                {Object.entries(m.dockets).map(([id, kg]) => (
                  <div key={id} className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ring-1 ${m.soft}`}>
                    <span className="font-medium">{id} · {kg} kg</span>
                    <span className="tabular-nums">{((kg / mfKg(m)) * 100).toFixed(0)}% · <b>{inr((m.cost * kg) / mfKg(m))}</b></span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">How a manifest’s own cost is worked out depends on its method — the Per Kg, Per Trip, Per Km… rows on the First Mile tab apply here too (Per Km, for example, splits by segment inside the manifest).</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">Step 3 · Each docket adds up its pieces</p>
        <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="w-52 shrink-0"><b className="text-slate-900">{r.id}</b> <span className="text-xs text-slate-400">{r.who} · {r.route}</span></span>
              <span className="flex flex-1 flex-wrap items-center gap-1 text-xs tabular-nums">
                {r.p.map(({ m, v }, k) => <span key={m.id} className="flex items-center gap-1">{k > 0 && <span className="text-slate-300">+</span>}<span className={`rounded px-1.5 py-0.5 ring-1 ${m.soft}`}>{m.id} {inr(v)}</span></span>)}
              </span>
              <span className="w-24 text-right text-base font-semibold tabular-nums text-slate-900">{inr(r.total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"><span>All three manifests</span><span className="tabular-nums">{inr(grand)}</span></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Every manifest cost lands fully on its dockets — {inr(grand)} in = {inr(MANIFESTS.reduce((t, m) => t + m.cost, 0))} of manifest cost.</p>
      </div>

      <div className={`p-4 ${card}`}>
        <p className="text-sm font-semibold text-slate-900">To confirm with you</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>The manifest, not the trip, is the costing unit — so the To / Return halving applies only when one trip’s To and Return legs are the same truck and the same per-trip deal. OK?</li>
          <li>Additional charges (toll, parking) are booked against a manifest and spread by % weight inside it. OK?</li>
          <li>A manifest that is re-loaded or transferred mid-way to another truck: the first truck’s manifest closes there, the next truck opens a new one?</li>
        </ul>
      </div>
    </div>
  )
}

import Icon from '../components/Icon.jsx'
import { card } from '../components/ui.js'
import { MODULES } from '../data/modules.js'

const logicEngine = MODULES.find((m) => m.key === 'logic-engine')

export default function LogicEngine() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Logic Engine</h1>
        <p className="mt-1 text-slate-500">
          The rules that steer every other module — not a page you visit to move an LR, a page you visit to change
          how every LR moves.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {logicEngine.children.map((c) => (
          <div key={c.key} className={`p-5 ${card}`}>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy">
                <Icon name={c.icon} className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                Coming soon
              </span>
            </div>
            <div className="mt-3 font-medium text-slate-900">{c.label}</div>
            <p className="mt-1 text-sm text-slate-500">{c.tagline}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'

// Placeholder page — Docket Module nav entry exists so the flow can be
// planned against. Not yet built.
export default function DocketDashboard() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Docket Dashboard</h1>
      </div>

      <div className={`flex flex-col items-center gap-3 p-14 text-center ${card}`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange-dark">
          <Icon name="grid" className="h-6 w-6" />
        </span>
        <div className="text-base font-semibold text-slate-800">Coming soon</div>
      </div>
    </div>
  )
}

import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'

export default function PartnerConfiguration() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Partner Configuration</h1>
        <p className="mt-1 text-slate-500">Standard terms and configuration for every partner.</p>
      </div>

      <div className={`p-6 ${card}`}>
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy">
            <Icon name="grid" className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Coming soon — in ideation</span>
        </div>
        <div className="mt-3 font-medium text-slate-900">Configuration screen not built yet</div>
        <p className="mt-1 text-sm text-slate-500">
          Still being scoped — what commercial/operational terms need standardizing per partner. Placeholder for now.
        </p>
      </div>
    </div>
  )
}

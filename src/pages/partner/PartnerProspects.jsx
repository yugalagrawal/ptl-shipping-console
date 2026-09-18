import { useMemo, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { card, thCls, tdCls, rowCls, pill } from '../../components/ui.js'
import { PARTNER_PROSPECTS_SEED, PARTNER_PROSPECT_STAGES, PARTNER_PROSPECT_STAGE_BADGE } from '../../data/partnerProspects.js'

const BAR_COLORS = ['bg-slate-400', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-400']

// Concept UI only — mirrors Client Prospects (ClientProspects.jsx) for the
// Partner Module: a sample look at what a Supply Exec's partner-lead
// pipeline could look like. Registering a lead and updating its stage
// aren't wired up yet; this just shows the shape of the screen against
// static sample data.
export default function PartnerProspects() {
  const [stageFilter, setStageFilter] = useState('All')

  const stageCounts = useMemo(() => {
    const counts = new Map(PARTNER_PROSPECT_STAGES.map((s) => [s, 0]))
    PARTNER_PROSPECTS_SEED.forEach((p) => counts.set(p.stage, (counts.get(p.stage) ?? 0) + 1))
    return counts
  }, [])

  const totalLeads = PARTNER_PROSPECTS_SEED.length
  const converted = stageCounts.get('Converted') ?? 0
  const lost = stageCounts.get('Lost') ?? 0
  const openLeads = totalLeads - converted - lost
  const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 100) : 0
  const maxStageCount = Math.max(...stageCounts.values(), 1)

  const filtered = stageFilter === 'All' ? PARTNER_PROSPECTS_SEED : PARTNER_PROSPECTS_SEED.filter((p) => p.stage === stageFilter)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Partner Prospects</h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Sample UI · concept only</span>
          </div>
          <p className="mt-1 text-slate-500">Where Supply Execs register partner leads and track them through to conversion.</p>
        </div>
        <button type="button" disabled className={`${pill} cursor-not-allowed bg-slate-100 text-slate-400`}>
          <Icon name="plus" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
          Register Lead — coming soon
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Total Leads</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{totalLeads}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Open</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{openLeads}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Converted</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{converted}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Conversion Rate</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{conversionRate}%</div>
        </div>
      </div>

      <div className={`space-y-4 p-6 ${card}`}>
        <h2 className="text-sm font-semibold text-slate-900">Pipeline by stage</h2>
        <div className="space-y-3">
          {PARTNER_PROSPECT_STAGES.map((stage, i) => (
            <div key={stage}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>{stage}</span>
                <span className="font-medium text-slate-700">{stageCounts.get(stage) ?? 0}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${((stageCounts.get(stage) ?? 0) / maxStageCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => setStageFilter('All')}
            className={`${pill} ${stageFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All ({totalLeads})
          </button>
          {PARTNER_PROSPECT_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={`${pill} ${stageFilter === stage ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {stage} ({stageCounts.get(stage) ?? 0})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Lead</th>
                <th className={thCls}>City</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Source</th>
                <th className={thCls}>Supply Exec</th>
                <th className={thCls}>Est. Monthly Volume (Kg)</th>
                <th className={thCls}>Stage</th>
                <th className={thCls}>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={rowCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.organisationName} size="sm" />
                      <div>
                        <div className="font-medium text-slate-800">{p.organisationName}</div>
                        <div className="text-xs text-slate-400">{p.contact}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>{p.city}</td>
                  <td className={tdCls}>{p.type}</td>
                  <td className={tdCls}>{p.source}</td>
                  <td className={tdCls}>{p.supplyExec}</td>
                  <td className={tdCls}>{p.estMonthlyVolume.toLocaleString('en-IN')}</td>
                  <td className={tdCls}>
                    <span className={`${pill} ${PARTNER_PROSPECT_STAGE_BADGE[p.stage]}`}>{p.stage}</span>
                  </td>
                  <td className={tdCls}>{p.lastActivityAt}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                    No leads in this stage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

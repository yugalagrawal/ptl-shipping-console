import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'
import { ACTIVATIONS_SEED, ACTIVATION_STATUS_LABEL, ACTIVATION_STATUS_BADGE, ACTIVATION_RESUME_STEP } from '../../data/activations.js'
import { PENDING_CLIENTS_SEED, APPROVAL_STAGE_LABEL, APPROVAL_STAGE_BADGE } from '../../data/clients.js'

// Once submitted, a client leaves ACTIVATIONS_SEED (see removeActivation)
// and lives in PENDING_CLIENTS_SEED instead while Sales Admin/Finance Admin
// review it — but the submitter still needs to see it under "Client
// activation in progress" rather than it just vanishing, so it's reshaped
// into an activation-row shape here and merged in. No resume step: it's out
// of the submitter's hands until either a correction comes back or it activates.
function pendingApprovalsAsActivationRows(pendingClients) {
  return pendingClients.map((c) => ({
    id: c.id,
    name: c.name,
    owner: c.submittedBy,
    createdAt: c.submittedAt,
    status: c.approvalStage,
  }))
}
const IN_PROGRESS_STATUS_LABEL = { ...ACTIVATION_STATUS_LABEL, ...APPROVAL_STAGE_LABEL }
const IN_PROGRESS_STATUS_BADGE = { ...ACTIVATION_STATUS_BADGE, ...APPROVAL_STAGE_BADGE }

// Latest-updated first, matching how a real "sort by updatedAt desc" query
// would return drafts.
const DRAFTS = [
  { name: 'Bewakoof Clothing', step: 'Commercial terms', updatedAt: '5 hours ago' },
  { name: 'Zepto Instant Commerce', step: 'Company details', updatedAt: '2 days ago' },
]

export default function Onboarding() {
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab ?? 'drafts')
  const [draftsQuery, setDraftsQuery] = useState('')
  const [progressQuery, setProgressQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // A client lands here (and leaves Drafts) the moment Billing Info is
  // confirmed in the wizard — read straight off the shared seed so a status
  // set from inside the wizard (see data/activations.js) shows up here too.
  const [activations] = useState(ACTIVATIONS_SEED)
  // Once submitted for approval, the client moves to PENDING_CLIENTS_SEED
  // (data/clients.js) instead — merged in here so it doesn't just disappear
  // from the submitter's view (see pendingApprovalsAsActivationRows above).
  const [pendingApprovals] = useState(PENDING_CLIENTS_SEED)
  const inProgress = [...activations, ...pendingApprovalsAsActivationRows(pendingApprovals)]

  const filteredDrafts = DRAFTS.filter((d) => d.name.toLowerCase().includes(draftsQuery.trim().toLowerCase()))
  const filteredInProgress = inProgress.filter(
    (p) =>
      (statusFilter === 'all' || p.status === statusFilter) &&
      (p.name.toLowerCase().includes(progressQuery.trim().toLowerCase()) || p.owner.toLowerCase().includes(progressQuery.trim().toLowerCase())),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Client Onboarding</h1>
          <p className="mt-1 text-slate-500">Create, draft and activate new clients before they can be booked against.</p>
        </div>
        <Link
          to="/client-module/onboarding/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
        >
          <Icon name="plus" className="h-4 w-4" />
          Create new client
        </Link>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        <button
          type="button"
          onClick={() => setTab('drafts')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'drafts' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Drafts <span className="text-slate-400">({DRAFTS.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('in-progress')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'in-progress' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Client activation in progress
          {inProgress.length > 0 && (
            <span className="ml-1.5 rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-orange-dark">{inProgress.length}</span>
          )}
        </button>
      </div>

      {tab === 'drafts' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={draftsQuery}
              onChange={(e) => setDraftsQuery(e.target.value)}
              placeholder="Search drafts by client name…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </div>
          <div className={`overflow-hidden ${card}`}>
          {DRAFTS.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">No drafts in progress.</div>
          ) : filteredDrafts.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">No drafts match "{draftsQuery}".</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDrafts.map((d) => (
                <div key={d.name} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{d.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      Last edited {d.updatedAt} · stopped at <span className="text-slate-500">{d.step}</span>
                    </div>
                  </div>
                  <Link to="/client-module/onboarding/new" className="text-sm font-medium text-brand-orange-dark hover:underline">
                    Resume
                  </Link>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {tab === 'in-progress' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={progressQuery}
                onChange={(e) => setProgressQuery(e.target.value)}
                placeholder="Search by client or owner…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
            >
              <option value="all">All statuses</option>
              {Object.entries(IN_PROGRESS_STATUS_LABEL).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={`overflow-hidden ${card}`}>
          {inProgress.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">Nothing awaiting activation.</div>
          ) : filteredInProgress.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              {progressQuery ? `No matches for "${progressQuery}".` : 'No clients match this status.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredInProgress.map((p) => {
                const resumeStep = ACTIVATION_RESUME_STEP[p.status]
                const rowContent = (
                  <>
                    <Avatar name={p.owner} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800">{p.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Created {p.createdAt} · {p.owner}
                      </div>
                      {p.correctionComment && <div className="mt-0.5 truncate text-xs text-rose-600">"{p.correctionComment}"</div>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${IN_PROGRESS_STATUS_BADGE[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {IN_PROGRESS_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                    {resumeStep && <Icon name="chevron" className="h-4 w-4 shrink-0 -rotate-90 text-slate-300" />}
                  </>
                )
                return resumeStep ? (
                  <Link
                    key={p.id}
                    to={`/client-module/onboarding/new?step=${resumeStep}&id=${p.id}`}
                    className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50"
                  >
                    {rowContent}
                  </Link>
                ) : (
                  <div key={p.id} className="flex items-center gap-3 px-6 py-3.5">
                    {rowContent}
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

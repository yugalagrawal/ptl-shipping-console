import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BackButton from '../../components/BackButton.jsx'
import Icon from '../../components/Icon.jsx'
import { btnPrimary } from '../../components/ui.js'
import { ACTIVATIONS_SEED, ACTIVATION_STATUS_LABEL, ACTIVATION_STATUS_BADGE, ACTIVATION_RESUME_STEP } from '../../data/activations.js'
import { PENDING_CLIENTS_SEED, APPROVAL_STAGE_LABEL, APPROVAL_STAGE_BADGE } from '../../data/clients.js'

const PAGE_SIZE = 10

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

// "5 hours ago" / "2 days ago" / "Just now" -> hours, so rows can be ordered by recency.
function hoursAgo(text = '') {
  if (/just now/i.test(text)) return 0
  const m = text.match(/(\d+)\s*(minute|hour|day|week|month)/i)
  if (!m) return Infinity
  const n = Number(m[1])
  const unit = { minute: 1 / 60, hour: 1, day: 24, week: 168, month: 720 }[m[2].toLowerCase()]
  return n * unit
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Name A → Z' },
  { value: 'za', label: 'Name Z → A' },
]

function sortRows(list, mode, ageOf) {
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  const sorted = [...list]
  if (mode === 'az') sorted.sort(byName)
  else if (mode === 'za') sorted.sort((a, b) => byName(b, a))
  else if (mode === 'oldest') sorted.sort((a, b) => ageOf(b) - ageOf(a))
  else sorted.sort((a, b) => ageOf(a) - ageOf(b))
  return sorted
}

const initialsOf = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

function ClientTile({ name }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-semibold text-brand-orange-dark">
      {initialsOf(name)}
    </span>
  )
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
      <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  )
}

// Multi-select status filter: checkbox list in a popover. Nothing ticked = all.
function StatusFilter({ values, options, onChange }) {
  const [open, setOpen] = useState(false)
  const active = values.length > 0
  const label = !active ? 'All statuses' : values.length === 1 ? options.find((o) => o.value === values[0])?.label : `${values.length} statuses`
  const toggle = (v) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[190px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        <span className={active ? 'font-medium text-slate-800' : 'text-slate-500'}>{label}</span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-full min-w-[240px] rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={values.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-3.5 w-3.5 rounded accent-brand-orange"
                />
                {o.label}
              </label>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-slate-100 px-3 pb-1 pt-2 text-xs">
              <span className="text-slate-400">{active ? `${values.length} selected` : 'All statuses'}</span>
              <button type="button" onClick={() => onChange([])} disabled={!active} className="font-medium text-brand-orange-dark disabled:opacity-30">
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = SORT_OPTIONS.find((o) => o.value === value)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400" aria-hidden="true">
            <path d="M5 13V3M2.5 5.5 5 3l2.5 2.5M11 3v10M8.5 10.5 11 13l2.5-2.5" />
          </svg>
          <span className="font-medium text-slate-800">{current?.label}</span>
        </span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-full min-w-[180px] rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${value === o.value ? 'font-medium text-slate-900' : 'text-slate-600'}`}
              >
                {o.label}
                {value === o.value && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Pager({ total, page, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(page * PAGE_SIZE, total)
  const btn = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn} aria-label="Previous page">
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
        </button>
        <span className="min-w-[44px] text-center font-medium text-slate-700">
          {page} / {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={btn} aria-label="Next page">
          <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>
    </div>
  )
}

function Empty({ title, hint }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="search" className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export default function Onboarding() {
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab ?? 'drafts')
  const [draftsQuery, setDraftsQuery] = useState('')
  const [progressQuery, setProgressQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [page, setPage] = useState(1)
  const [sortMode, setSortMode] = useState('recent')
  // A client lands here (and leaves Drafts) the moment Billing Info is
  // confirmed in the wizard — read straight off the shared seed so a status
  // set from inside the wizard (see data/activations.js) shows up here too.
  const [activations] = useState(ACTIVATIONS_SEED)
  // Once submitted for approval, the client moves to PENDING_CLIENTS_SEED
  // (data/clients.js) instead — merged in here so it doesn't just disappear
  // from the submitter's view (see pendingApprovalsAsActivationRows above).
  const [pendingApprovals] = useState(PENDING_CLIENTS_SEED)
  const inProgress = [...activations, ...pendingApprovalsAsActivationRows(pendingApprovals)]

  useEffect(() => setPage(1), [tab, draftsQuery, progressQuery, statusFilter, sortMode])

  const dq = draftsQuery.trim().toLowerCase()
  const pq = progressQuery.trim().toLowerCase()
  const filteredDrafts = sortRows(DRAFTS.filter((d) => d.name.toLowerCase().includes(dq)), sortMode, (d) => hoursAgo(d.updatedAt))
  const filteredInProgress = sortRows(
    inProgress.filter(
      (p) => (statusFilter.length === 0 || statusFilter.includes(p.status)) && (p.name.toLowerCase().includes(pq) || p.owner.toLowerCase().includes(pq)),
    ),
    sortMode,
    (p) => hoursAgo(p.createdAt),
  )
  const statusOptions = Object.entries(IN_PROGRESS_STATUS_LABEL).map(([value, label]) => ({ value, label }))

  const rows = tab === 'drafts' ? filteredDrafts : filteredInProgress
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tabBtn = (key, active) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BackButton />
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Client Onboarding</h1>
          <p className="mt-0.5 text-xs text-slate-500">Create, draft and activate new clients before they can be booked against.</p>
        </div>
        <Link to="/client-module/onboarding/new" className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" />
          Create new client
        </Link>
      </div>

      <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setTab('drafts')} className={tabBtn('drafts', tab === 'drafts')}>
          Drafts <span className="ml-1 text-slate-400">{DRAFTS.length}</span>
        </button>
        <button type="button" onClick={() => setTab('in-progress')} className={tabBtn('in-progress', tab === 'in-progress')}>
          Client activation in progress
          {inProgress.length > 0 && (
            <span className="ml-1.5 rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-orange-dark">{inProgress.length}</span>
          )}
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          {tab === 'drafts' ? (
            <>
              <SearchBox value={draftsQuery} onChange={setDraftsQuery} placeholder="Search drafts by client name…" />
              <SortMenu value={sortMode} onChange={setSortMode} />
            </>
          ) : (
            <>
              <SearchBox value={progressQuery} onChange={setProgressQuery} placeholder="Search by client or owner…" />
              <div className="flex flex-wrap items-center gap-2">
                <StatusFilter values={statusFilter} options={statusOptions} onChange={setStatusFilter} />
                <SortMenu value={sortMode} onChange={setSortMode} />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-100">
          {tab === 'drafts' &&
            (DRAFTS.length === 0 ? (
              <Empty title="No drafts in progress" hint="Create a client and it will be saved here until you finish." />
            ) : !pageRows.length ? (
              <Empty title={`No drafts match "${draftsQuery}"`} />
            ) : (
              <div className="divide-y divide-slate-100">
                {pageRows.map((d) => (
                  <div key={d.name} className="flex items-center gap-4 px-5 py-4">
                    <ClientTile name={d.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{d.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Last edited {d.updatedAt} · Draft · stopped at <span className="text-slate-500">{d.step}</span>
                      </div>
                    </div>
                    <Link
                      to="/client-module/onboarding/new"
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-orange-dark transition-colors hover:bg-orange-50"
                    >
                      Resume
                    </Link>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'in-progress' &&
            (inProgress.length === 0 ? (
              <Empty title="Nothing awaiting activation" />
            ) : !pageRows.length ? (
              <Empty title={progressQuery ? `No matches for "${progressQuery}"` : 'No clients match this status'} />
            ) : (
              <div className="divide-y divide-slate-100">
                {pageRows.map((p) => {
                  const resumeStep = ACTIVATION_RESUME_STEP[p.status]
                  const content = (
                    <>
                      <ClientTile name={p.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          Created {p.createdAt} · {p.owner}
                        </div>
                        {p.correctionComment && (
                          <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            <span className="truncate">{p.correctionComment}</span>
                          </div>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${IN_PROGRESS_STATUS_BADGE[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {IN_PROGRESS_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <Icon name="chevron" className={`h-4 w-4 shrink-0 -rotate-90 ${resumeStep ? 'text-slate-400' : 'text-transparent'}`} />
                    </>
                  )
                  return resumeStep ? (
                    <Link key={p.id} to={`/client-module/onboarding/new?step=${resumeStep}&id=${p.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70">
                      {content}
                    </Link>
                  ) : (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                      {content}
                    </div>
                  )
                })}
              </div>
            ))}
        </div>

        <Pager total={rows.length} page={page} onPage={setPage} />
      </div>
    </div>
  )
}

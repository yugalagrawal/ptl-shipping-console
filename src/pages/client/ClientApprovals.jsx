import { useEffect, useState } from 'react'
import BackButton from '../../components/BackButton.jsx'
import Icon from '../../components/Icon.jsx'
import ClientPricingPanel from '../../components/ClientPricingPanel.jsx'
import ClientOnboardingSummary from '../../components/ClientOnboardingSummary.jsx'
import { PAGE_SIZE, hoursAgo, sortRows, ClientTile, SearchBox, SortMenu, Pager, Empty } from '../../components/clientList.jsx'
import {
  PENDING_CLIENTS_SEED,
  APPROVAL_STAGE,
  APPROVAL_STAGE_LABEL,
  APPROVAL_STAGE_BADGE,
  approveOnboarding,
  sendPricingToFinance,
  requestCorrection,
  activateClient,
} from '../../data/clients.js'
import { ACTIVATIONS_SEED, ACTIVATION_STATUS } from '../../data/activations.js'
import { useAuth } from '../../context/AuthContext.jsx'

// Stage 1 — everything except Billing & Pricing: identity, GSTIN, KYC
// completeness, plus every field Company/Contact/Billing/Identification
// captured in the wizard. Read-only for everyone; only a Sales Admin (or
// someone with the same function) gets Approve / Request Correction —
// anyone else just sees that it's still waiting on Sales Admin.
function SalesReviewPanel({ client, canApprove, onApproveOnboarding, onRequestCorrection }) {
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [onboardingConfirmOpen, setOnboardingConfirmOpen] = useState(false)
  const [comment, setComment] = useState('')

  function sendCorrection() {
    if (!comment.trim()) return
    onRequestCorrection(comment.trim())
  }

  return (
    <div className="space-y-5 border-t border-slate-100 p-5">
      <ClientOnboardingSummary client={client} />

      <p className="text-xs text-slate-400">Submitted by {client.submittedBy} · {client.submittedAt}</p>
      <p className="text-[11px] text-slate-400">
        Billing & Pricing (region matrix, additional charges) are shown below for reference — Finance Admin gives the actual approval once this clears.
      </p>

      {canApprove ? (
        correctionOpen ? (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <label className="block text-xs font-medium text-slate-500">What needs to be corrected?</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="e.g. PAN on the GSTIN doesn't match Company Info — please re-check."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setCorrectionOpen(false); setComment('') }}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!comment.trim()}
                onClick={sendCorrection}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
              >
                Send back to Sales Executive
              </button>
            </div>
          </div>
        ) : onboardingConfirmOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm text-slate-600">Approve these onboarding details? You'll review pricing next before it goes to Finance.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOnboardingConfirmOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onApproveOnboarding(); setOnboardingConfirmOpen(false) }}
                className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark"
              >
                Yes, approve onboarding
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {client.onboardingApproved && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <Icon name="approve" className="h-4 w-4 shrink-0" />
                Onboarding details approved — review the pricing below, then approve pricing to send it to Finance Admin.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!client.onboardingApproved && (
                <button
                  type="button"
                  onClick={() => setOnboardingConfirmOpen(true)}
                  className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
                >
                  Approve onboarding details
                </button>
              )}
              <button
                type="button"
                onClick={() => setCorrectionOpen(true)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Request correction
              </button>
            </div>
          </div>
        )
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Awaiting Sales Admin review — Billing & Pricing isn't available until this clears.
        </p>
      )}
    </div>
  )
}

// Rendered after the pricing matrix/additional charges, once onboarding is
// approved — Sales Admin's second, independent sign-off, deliberately placed
// below what it's actually approving rather than up top with the onboarding
// button.
function PricingApprovalAction({ client, canApprove, onApprovePricing }) {
  const [pricingConfirmOpen, setPricingConfirmOpen] = useState(false)

  if (!canApprove || !client.onboardingApproved) return null

  return (
    <div className="border-t border-slate-100 p-5">
      {pricingConfirmOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm text-slate-600">Submit this pricing for Finance Admin approval?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPricingConfirmOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApprovePricing}
              className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark"
            >
              Yes, submit for Finance approval
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPricingConfirmOpen(true)}
          className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
        >
          Approve Pricing details
        </button>
      )}
    </div>
  )
}

// Tells the viewer what their own approval does, with the three stages
// highlighted where they act. Role-aware: Sales stage, Finance stage, or both.
const FLOW_STEPS = ['Sales review', 'Finance review', 'Active']

function RoleNote({ canSales, canFinance }) {
  if (!canSales && !canFinance) return null
  const text =
    canSales && canFinance
      ? 'Your approvals send to Finance, then activate.'
      : canSales
        ? 'Your approval sends it to Finance.'
        : 'Your approval activates the client.'
  const mine = [canSales, canFinance, false]
  return (
    <div className="hidden h-11 flex-col justify-center rounded-xl bg-white px-3.5 shadow-soft ring-1 ring-slate-200/70 md:flex">
      <p className="whitespace-nowrap text-[11px] font-medium leading-tight text-slate-700">{text}</p>
      <div className="mt-1 flex items-center gap-0.5">
        {FLOW_STEPS.map((step, i) => {
          const isActive = i === 2 && canFinance
          return (
            <span key={step} className="flex items-center gap-1">
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  mine[i]
                    ? 'bg-brand-orange/10 text-brand-orange-dark ring-1 ring-brand-orange/30'
                    : isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step}
              </span>
              {i < FLOW_STEPS.length - 1 && <Icon name="chevron" className="h-3 w-3 -rotate-90 text-slate-300" />}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function ClientApprovals() {
  const { hasFunction } = useAuth()
  const canApproveSales = hasFunction('client-approvals.manage-onboarding')
  const canApproveFinance = hasFunction('client-approvals.manage')

  const [pending, setPending] = useState(PENDING_CLIENTS_SEED)
  const [expandedId, setExpandedId] = useState(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('mine')
  const [sortMode, setSortMode] = useState('recent')
  // Prototype-only: 1/2/3 force the role note to show each case (Sales only,
  // Finance only, both) so the copy can be reviewed without switching users.
  const [demoCase, setDemoCase] = useState(null)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [tab, query, sortMode])

  // "Your Pending Approvals" is whichever stage(s) this viewer can actually
  // act on — Sales Admin sees sales_review, Finance Admin sees finance_review,
  // Super Admin (both permissions) sees both. "Approval Status" is everything
  // else this viewer has already touched and can still meaningfully track.
  const myStages = [
    ...(canApproveSales ? [APPROVAL_STAGE.SALES_REVIEW] : []),
    ...(canApproveFinance ? [APPROVAL_STAGE.FINANCE_REVIEW] : []),
  ]
  const myRows = pending.filter((c) => myStages.includes(c.approvalStage))
  // A Finance-only viewer has never seen a client still stuck at Sales
  // Admin's stage, so unlike Sales Admin (whose "Approval Status" showing
  // Finance-stage clients makes sense — those passed through them), showing
  // Sales-stage clients here wouldn't. What Finance Admin actually still
  // wants to track is any correction THEY personally sent back — it's out
  // of the pending queue while Sales Executive fixes it, but it's still
  // theirs to keep an eye on (see raisedAtStage in data/activations.js).
  const financeOnly = canApproveFinance && !canApproveSales
  const otherRows = financeOnly ? [] : pending.filter((c) => !myStages.includes(c.approvalStage))
  const myOpenCorrections = canApproveFinance
    ? ACTIVATIONS_SEED.filter((a) => a.status === ACTIVATION_STATUS.CORRECTION_REQUESTED && a.raisedAtStage === APPROVAL_STAGE.FINANCE_REVIEW)
    : []
  const rows = tab === 'mine' ? myRows : otherRows
  const filteredPending = rows.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
  const filteredCorrections =
    tab === 'status' ? myOpenCorrections.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())) : []
  const statusCount = otherRows.length + myOpenCorrections.length
  const totalRowCount = tab === 'mine' ? rows.length : rows.length + myOpenCorrections.length
  const pendingItems = filteredPending.map((c) => ({ kind: 'pending', key: c.id, name: c.name, age: hoursAgo(c.submittedAt), client: c }))
  const correctionItems = filteredCorrections.map((a) => ({ kind: 'correction', key: a.id, name: a.name, age: hoursAgo(a.createdAt), a }))
  const items = sortRows([...correctionItems, ...pendingItems], sortMode, (i) => i.age)
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function updateClient(updated) {
    setPending((rows) => rows.map((r) => (r.id === updated.id ? updated : r)))
  }

  function approveOnboardingDetails(client) {
    approveOnboarding(client.id)
    setPending((rows) => rows.map((r) => (r.id === client.id ? { ...r, onboardingApproved: true } : r)))
  }

  function approvePricingDetails(client) {
    sendPricingToFinance(client.id)
    setPending((rows) => rows.map((r) => (r.id === client.id ? { ...r, approvalStage: APPROVAL_STAGE.FINANCE_REVIEW } : r)))
  }

  function sendForCorrection(client, comment) {
    requestCorrection(client.id, comment)
    setPending((rows) => rows.filter((r) => r.id !== client.id))
    setExpandedId(null)
  }

  function approveClient(client) {
    activateClient(client)
    setPending((rows) => rows.filter((r) => r.id !== client.id))
    setExpandedId(null)
  }

  const tabBtn = (active) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <BackButton />
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Client Approvals</h1>
        <p className="mt-0.5 text-xs text-slate-500">Review client details and pricing, check approval statuses, and approve clients to make them active.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => { setTab('mine'); setExpandedId(null) }} className={tabBtn(tab === 'mine')}>
          Your Pending Approvals <span className="ml-1 text-slate-400">{myRows.length}</span>
        </button>
        <button type="button" onClick={() => { setTab('status'); setExpandedId(null) }} className={tabBtn(tab === 'status')}>
          Approval Status <span className="ml-1 text-slate-400">{statusCount}</span>
        </button>
      </div>
      <div className="relative">
        <div className="absolute -top-[22px] right-0 hidden items-center gap-1 md:flex">
          <span className="mr-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-300">Preview</span>
          {[
            [1, 'Sales only'],
            [2, 'Finance only'],
            [3, 'Both'],
          ].map(([n, label]) => (
            <button
              key={n}
              type="button"
              title={label}
              onClick={() => setDemoCase((c) => (c === n ? null : n))}
              className={`h-[18px] w-[18px] rounded text-[10px] font-semibold transition-colors ${
                demoCase === n ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <RoleNote
          canSales={demoCase ? demoCase !== 2 : canApproveSales}
          canFinance={demoCase ? demoCase !== 1 : canApproveFinance}
        />
      </div>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search by client name…" />
          <SortMenu value={sortMode} onChange={setSortMode} />
        </div>

        <div className="border-t border-slate-100">
          {totalRowCount === 0 ? (
            <Empty
              title={tab === 'mine' ? 'Nothing waiting on your approval' : financeOnly ? 'Nothing to track' : 'Nothing else to show'}
              hint={
                tab === 'status' && financeOnly
                  ? "You'll see it here if you send a correction back. Recently activated clients are in My Clients."
                  : undefined
              }
            />
          ) : !items.length ? (
            <Empty title={`No matches for "${query}"`} />
          ) : (
            <div className="divide-y divide-slate-100">
              {pageItems.map((item) => {
                if (item.kind === 'correction') {
                  const a = item.a
                  return (
                    <div key={`c-${a.id}`} className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <ClientTile name={a.name} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{a.name}</div>
                          <div className="mt-0.5 text-xs text-slate-400">Correction sent {a.createdAt} · waiting on {a.owner}</div>
                          {a.correctionComment && (
                            <div className="mt-2 inline-flex max-w-full items-center rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                              <span className="truncate">{a.correctionComment}</span>
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Correction Requested</span>
                        <Icon name="chevron" className="h-4 w-4 shrink-0 -rotate-90 text-transparent" />
                      </div>
                    </div>
                  )
                }
                const client = item.client
                const isOpen = expandedId === client.id
                const atFinanceStage = client.approvalStage === APPROVAL_STAGE.FINANCE_REVIEW
                return (
                  <div key={client.id} className={isOpen ? 'bg-slate-50/40' : ''}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : client.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70"
                    >
                      <ClientTile name={client.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{client.name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {client.city}, {client.state} · submitted by {client.submittedBy} · {client.submittedAt}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${APPROVAL_STAGE_BADGE[client.approvalStage]}`}>
                        {APPROVAL_STAGE_LABEL[client.approvalStage]}
                      </span>
                      <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : '-rotate-90'}`} />
                    </button>
                    {isOpen && !atFinanceStage && (
                      <>
                        <SalesReviewPanel
                          client={client}
                          canApprove={canApproveSales}
                          onApproveOnboarding={() => approveOnboardingDetails(client)}
                          onRequestCorrection={(comment) => sendForCorrection(client, comment)}
                        />
                        <ClientPricingPanel client={client} readOnly />
                        <PricingApprovalAction client={client} canApprove={canApproveSales} onApprovePricing={() => approvePricingDetails(client)} />
                      </>
                    )}
                    {isOpen &&
                      atFinanceStage &&
                      (canApproveFinance ? (
                        <>
                          {client.additionalCharges?.length > 0 && (
                            <div className="border-t border-slate-100 p-5">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Additional charges</div>
                              <ul className="space-y-1">
                                {client.additionalCharges.map((c) => (
                                  <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-slate-700">{c.name}</span>
                                    <span className="text-slate-500">{c.value}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <ClientPricingPanel
                            client={client}
                            onUpdate={updateClient}
                            onApprove={() => approveClient(client)}
                            onRequestCorrection={(comment) => sendForCorrection(client, comment)}
                            readOnly
                          />
                        </>
                      ) : (
                        <div className="border-t border-slate-100 p-5">
                          <p className="text-sm text-slate-600">
                            Cleared by Sales Admin — <span className="font-medium text-sky-700">{APPROVAL_STAGE_LABEL[APPROVAL_STAGE.FINANCE_REVIEW]}</span>.
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Region matrix and additional charges are Finance Admin's stage to review.</p>
                        </div>
                      ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Pager total={items.length} page={page} onPage={setPage} />
      </div>
    </div>
  )
}

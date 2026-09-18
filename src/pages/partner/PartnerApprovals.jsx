import { useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import PartnerOnboardingSummary from '../../components/PartnerOnboardingSummary.jsx'
import { card } from '../../components/ui.js'
import {
  PENDING_PARTNERS_SEED,
  PARTNER_APPROVAL_STAGE_LABEL,
  PARTNER_APPROVAL_STAGE_BADGE,
  requestPartnerCorrection,
  activatePartner,
} from '../../data/partners.js'
import { PARTNER_ACTIVATIONS_SEED, PARTNER_ACTIVATION_STATUS } from '../../data/partnerActivations.js'
import { useAuth } from '../../context/AuthContext.jsx'

// Single-stage review — unlike Client Approvals' Sales/Finance split, Supply
// Admin alone reviews everything (identity/GSTIN/billing/KYC) and is the one
// who activates the partner. Read-only for everyone; only someone with
// partner-approvals.manage gets Approve / Request Correction.
function SupplyReviewPanel({ partner, canApprove, onApprove, onRequestCorrection }) {
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [comment, setComment] = useState('')

  function sendCorrection() {
    if (!comment.trim()) return
    onRequestCorrection(comment.trim())
  }

  return (
    <div className="space-y-5 border-t border-slate-100 p-5">
      <PartnerOnboardingSummary partner={partner} />

      <p className="text-xs text-slate-400">Submitted by {partner.submittedBy} · {partner.submittedAt}</p>

      {canApprove ? (
        correctionOpen ? (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <label className="block text-xs font-medium text-slate-500">What needs to be corrected?</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="e.g. IFSC doesn't resolve to a recognized bank — please re-check."
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
                Send back to Supply Executive
              </button>
            </div>
          </div>
        ) : approveConfirmOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm text-slate-600">Activate this partner? It'll show up on My Partners as Active.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setApproveConfirmOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onApprove(); setApproveConfirmOpen(false) }}
                className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark"
              >
                Yes, activate partner
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setApproveConfirmOpen(true)}
              className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
            >
              Approve partner
            </button>
            <button
              type="button"
              onClick={() => setCorrectionOpen(true)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Request correction
            </button>
          </div>
        )
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Awaiting Supply Admin review.</p>
      )}
    </div>
  )
}

export default function PartnerApprovals() {
  const { hasFunction } = useAuth()
  const canApprove = hasFunction('partner-approvals.manage')

  const [pending, setPending] = useState(PENDING_PARTNERS_SEED)
  const [expandedId, setExpandedId] = useState(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('mine')

  // Single stage, so "Your Pending Approvals" is just everything waiting —
  // there's no other-stage split like Client Approvals' Sales/Finance rows.
  // "Approval Status" mirrors Client Approvals' finance-only case: the one
  // thing still worth tracking once a row leaves the pending queue is a
  // correction this viewer personally sent back (see raisedAtStage's absence
  // here — there's only one stage, so every open correction is theirs).
  const myRows = canApprove ? pending : []
  const myOpenCorrections = canApprove
    ? PARTNER_ACTIVATIONS_SEED.filter((a) => a.status === PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED)
    : []
  const rows = tab === 'mine' ? myRows : []
  const filteredPending = rows.filter((p) => p.organisationName.toLowerCase().includes(query.trim().toLowerCase()))
  const filteredCorrections =
    tab === 'status' ? myOpenCorrections.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())) : []
  const statusCount = myOpenCorrections.length
  const totalRowCount = tab === 'mine' ? rows.length : myOpenCorrections.length
  const visibleRowCount = tab === 'mine' ? filteredPending.length : filteredCorrections.length

  function sendForCorrection(partner, comment) {
    requestPartnerCorrection(partner.id, comment)
    setPending((rows) => rows.filter((r) => r.id !== partner.id))
    setExpandedId(null)
  }

  function approvePartnerRow(partner) {
    activatePartner(partner)
    setPending((rows) => rows.filter((r) => r.id !== partner.id))
    setExpandedId(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Partner Approvals</h1>
        <p className="mt-1 text-slate-500">Supply Admin reviews a partner's onboarding details before it goes active.</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        <button
          type="button"
          onClick={() => { setTab('mine'); setExpandedId(null) }}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'mine' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Your Pending Approvals <span className="text-slate-400">({myRows.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setTab('status'); setExpandedId(null) }}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'status' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Approval Status <span className="text-slate-400">({statusCount})</span>
        </button>
      </div>

      <div className="relative max-w-sm">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by partner name…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
        />
      </div>

      <div className="space-y-3">
        {totalRowCount === 0 ? (
          <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>
            {tab === 'mine'
              ? 'Nothing waiting on your approval.'
              : "Nothing to track — you'll see it here if you send a correction back. Recently activated partners are in My Partners."}
          </div>
        ) : visibleRowCount === 0 ? (
          <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>No matches for "{query}".</div>
        ) : null}
        {tab === 'status' &&
          filteredCorrections.map((a) => (
            <div key={a.id} className={`p-5 ${card}`}>
              <div className="flex items-center gap-3">
                <Avatar name={a.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{a.name}</div>
                  <div className="text-xs text-slate-400">Correction sent {a.createdAt} · waiting on {a.owner}</div>
                </div>
                <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700">Correction Requested</span>
              </div>
              {a.correctionComment && <p className="mt-2.5 text-sm text-slate-600">"{a.correctionComment}"</p>}
            </div>
          ))}
        {filteredPending.map((partner) => {
          const isOpen = expandedId === partner.id
          return (
            <div key={partner.id} className={`overflow-hidden ${card}`}>
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : partner.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
              >
                <Avatar name={partner.organisationName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{partner.organisationName}</div>
                  <div className="text-xs text-slate-400">
                    {partner.city} · {partner.type} · submitted by {partner.submittedBy} · {partner.submittedAt}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${PARTNER_APPROVAL_STAGE_BADGE[partner.approvalStage]}`}>
                  {PARTNER_APPROVAL_STAGE_LABEL[partner.approvalStage]}
                </span>
                <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <SupplyReviewPanel
                  partner={partner}
                  canApprove={canApprove}
                  onApprove={() => approvePartnerRow(partner)}
                  onRequestCorrection={(comment) => sendForCorrection(partner, comment)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

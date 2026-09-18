import { useMemo, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'
import { searchPartnersForEmailLogs, getPartnerEmailThread } from '../../data/partnerEmailLogs.js'

function formatDateHeading(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

// Groups a flat, date-sorted list of messages into day buckets so the thread
// reads like a real mail client — one date divider, then every message sent
// that day underneath it, oldest first. Mirrors ClientEmailLogs.jsx.
function groupByDay(messages) {
  const groups = []
  for (const m of messages) {
    const key = m.sentAt.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.messages.push(m)
    else groups.push({ key, messages: [m] })
  }
  return groups
}

function EmailBubble({ message }) {
  const isOutbound = message.direction === 'outbound'
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full max-w-2xl space-y-2 rounded-2xl border p-4 ${isOutbound ? 'border-brand-orange/20 bg-brand-orange/5' : 'border-slate-200 bg-slate-50/70'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-800">{message.subject}</div>
          <span className="text-xs text-slate-400">{formatTime(message.sentAt)}</span>
        </div>
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">{message.from}</span>
          <span className="mx-1 text-slate-300">→</span>
          {message.to}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{message.body}</p>
        {message.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.attachments.map((name) => (
              <span key={name} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
                <Icon name="mail" className="h-3.5 w-3.5 text-slate-400" />
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmailThread({ partner, onBack }) {
  const thread = useMemo(() => getPartnerEmailThread(partner.id), [partner.id])
  const dayGroups = useMemo(() => groupByDay(thread), [thread])

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <Icon name="arrow-left" className="h-4 w-4" />
        Back to search
      </button>

      <div className={`flex items-center gap-3 p-5 ${card}`}>
        <Avatar name={partner.name} />
        <div>
          <div className="font-medium text-slate-800">{partner.name}</div>
          <div className="text-xs text-slate-400">
            {thread.length} email{thread.length === 1 ? '' : 's'} · {partner.city}
          </div>
        </div>
      </div>

      {thread.length === 0 ? (
        <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>No email conversation on file for {partner.name} yet.</div>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{formatDateHeading(group.messages[0].sentAt)}</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="space-y-3">
                {group.messages.map((m) => (
                  <EmailBubble key={m.id} message={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Mirrors Client Email Logs (ClientEmailLogs.jsx) for the Partner Module.
export default function PartnerEmailLogs() {
  const [query, setQuery] = useState('')
  const [selectedPartner, setSelectedPartner] = useState(null)

  const results = useMemo(() => (query.trim() ? searchPartnersForEmailLogs(query) : []), [query])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Partner Email Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Search a partner to see their full email conversation, sorted by date.</p>
      </div>

      {selectedPartner ? (
        <EmailThread partner={selectedPartner} onBack={() => setSelectedPartner(null)} />
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by partner, city or POC email…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </div>

          {query.trim() === '' ? (
            <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>Search for a partner to open their email conversation.</div>
          ) : results.length === 0 ? (
            <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>No partners match "{query}".</div>
          ) : (
            <div className={`divide-y divide-slate-100 overflow-hidden ${card}`}>
              {results.map((p) => {
                const q = query.trim().toLowerCase()
                const matchedEmail = p.emails.find((email) => email.toLowerCase().includes(q))
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPartner(p)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70"
                  >
                    <Avatar name={p.name} size="sm" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{matchedEmail ? `${matchedEmail} · ${p.city}` : p.city}</div>
                    </div>
                    {p.status === 'pending' && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Pending</span>
                    )}
                    <Icon name="chevron" className="h-4 w-4 -rotate-90 text-slate-300" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

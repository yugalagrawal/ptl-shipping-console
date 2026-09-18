import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import SortToggle from '../../components/SortToggle.jsx'
import { card, thCls, tdCls, rowCls } from '../../components/ui.js'
import { TIER_BADGE } from '../../data/pricing.js'
import { CUSTOMER_GROUPS } from '../../data/groups.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED, fetchClientsPage } from '../../data/clients.js'

// Keeps both the Active Client List and Client Groups tables readable once
// the roster grows well past what fits on one screen — same idea as the
// legacy Softpal customer/customer-group screens (row-count footer + prev/next).
const PAGE_SIZE = 10

function Pagination({ page, pageSize, totalItems, onPageChange }) {
  if (totalItems === 0) return null
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span>
        {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
        </button>
        <span className="px-1 tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>
    </div>
  )
}

// A client row's 4 fields, reused by both the Active Client List table and
// each expanded Client Group's roster — same subset either way, since Client
// Groups is meant to look "like Active Client List" per how it was asked for.
function ClientRowFields({ client }) {
  return (
    <>
      <td className={tdCls}>
        <div className="flex items-center gap-2.5">
          <Avatar name={client.name} size="sm" />
          <span className="font-medium text-slate-800">{client.name}</span>
        </div>
      </td>
      <td className={tdCls}>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${TIER_BADGE[client.tier] ?? 'bg-slate-100 text-slate-600'}`}>
          {client.tier}
        </span>
      </td>
      <td className={tdCls}>
        {client.city}, {client.state}
      </td>
      <td className={`${tdCls} tabular-nums`}>{client.creditLimit}</td>
    </>
  )
}

export default function ActiveClients() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [active] = useState(ACTIVE_CLIENTS_SEED)
  const [activePage, setActivePage] = useState(1)
  const [groupsPage, setGroupsPage] = useState(1)
  const [groupQuery, setGroupQuery] = useState('')
  const [expandedGroupId, setExpandedGroupId] = useState(null)

  // Search box only updates `query` on every keystroke — the actual "request"
  // waits for typing to settle, same as a real search-as-you-type API call would.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Any change to what's being asked for should land back on page 1.
  useEffect(() => {
    setActivePage(1)
  }, [debouncedQuery, sortMode])

  const [activeResult, setActiveResult] = useState({ rows: [], total: 0 })
  const [isLoadingActive, setIsLoadingActive] = useState(true)

  // Stands in for "GET /customers?search=&sort=&page=" — see data/clients.js.
  // Pricing is no longer editable from this list (a client's rate card locks
  // once both Sales and Finance approve it), so there's no in-place-edit case
  // to guard against re-fetching here anymore.
  useEffect(() => {
    let cancelled = false
    setIsLoadingActive(true)
    fetchClientsPage(active, { search: debouncedQuery, page: activePage, pageSize: PAGE_SIZE, sortMode }).then((result) => {
      if (!cancelled) {
        setActiveResult(result)
        setIsLoadingActive(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activePage, sortMode])

  // One row per Customer Group, carrying whichever active/pending clients
  // were onboarded under it — a group with no clients yet still shows up
  // (e.g. a group created ahead of time), just with an empty roster. Expanding
  // a group lists its ACTIVE clients only (pending ones live in Client
  // Approvals, not here) — pending is still surfaced as a small count badge.
  const groupRows = useMemo(() => {
    const q = groupQuery.trim().toLowerCase()
    const matchingGroups = q ? CUSTOMER_GROUPS.filter((g) => g.name.toLowerCase().includes(q)) : CUSTOMER_GROUPS
    return matchingGroups.map((g) => {
      const activeClients = active.filter((c) => c.groupId === g.id)
      const pendingCount = PENDING_CLIENTS_SEED.filter((c) => c.groupId === g.id).length
      return { group: g, activeClients, pendingCount }
    })
  }, [active, groupQuery])
  const pagedGroups = groupRows.slice((groupsPage - 1) * PAGE_SIZE, groupsPage * PAGE_SIZE)

  function handleGroupSearchChange(value) {
    setGroupQuery(value)
    setGroupsPage(1)
  }

  function openClient(clientId) {
    navigate(`/client-module/active-clients/${clientId}`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">My Clients</h1>
        <p className="mt-1 text-slate-500">Roster of activated clients ready to book against.</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'active' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Active Client List <span className="text-slate-400">({active.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('groups')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'groups' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Client Groups <span className="text-slate-400">({CUSTOMER_GROUPS.length})</span>
        </button>
      </div>

      {tab === 'active' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client or city…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>
            {isLoadingActive && <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />}
            <SortToggle sortMode={sortMode} onChange={setSortMode} />
          </div>

          <div className={`overflow-hidden ${card}`}>
            <div className={`overflow-x-auto transition-opacity ${isLoadingActive ? 'opacity-50' : ''}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={thCls}>Client</th>
                    <th className={thCls}>Tier</th>
                    <th className={thCls}>Location</th>
                    <th className={thCls}>Credit limit</th>
                    <th className={thCls}>Onboarded</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {activeResult.rows.map((c) => (
                    <tr key={c.id} className={`${rowCls} cursor-pointer`} onClick={() => openClient(c.id)}>
                      <ClientRowFields client={c} />
                      <td className={`${tdCls} text-slate-400`}>{c.onboardedOn}</td>
                      <td className={tdCls}>
                        <Icon name="chevron" className="h-4 w-4 -rotate-90 text-slate-400" />
                      </td>
                    </tr>
                  ))}
                  {!isLoadingActive && activeResult.total === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                        No clients match{query ? ` "${query}"` : ''}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={activePage} pageSize={PAGE_SIZE} totalItems={activeResult.total} onPageChange={setActivePage} />
          </div>
        </>
      )}

      {tab === 'groups' && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={groupQuery}
              onChange={(e) => handleGroupSearchChange(e.target.value)}
              placeholder="Search by group name…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </div>

          {pagedGroups.map(({ group, activeClients, pendingCount }) => {
            const isOpen = expandedGroupId === group.id
            return (
              <div key={group.id} className={`overflow-hidden ${card}`}>
                <button
                  type="button"
                  onClick={() => setExpandedGroupId(isOpen ? null : group.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-4 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{group.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{group.id}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {activeClients.length} active {activeClients.length === 1 ? 'client' : 'clients'}
                      {pendingCount > 0 && ` · ${pendingCount} pending`}
                    </div>
                  </div>
                  <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {activeClients.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-slate-400">No active clients in this group yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className={thCls}>Client</th>
                            <th className={thCls}>Tier</th>
                            <th className={thCls}>Location</th>
                            <th className={thCls}>Credit limit</th>
                            <th className={thCls}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeClients.map((c) => (
                            <tr key={c.id} className={`${rowCls} cursor-pointer`} onClick={() => openClient(c.id)}>
                              <ClientRowFields client={c} />
                              <td className={tdCls}>
                                <Icon name="chevron" className="h-4 w-4 -rotate-90 text-slate-400" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {groupRows.length === 0 && (
            <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>No groups match "{groupQuery}".</div>
          )}
          <div className={card}>
            <Pagination page={groupsPage} pageSize={PAGE_SIZE} totalItems={groupRows.length} onPageChange={setGroupsPage} />
          </div>
        </div>
      )}
    </div>
  )
}

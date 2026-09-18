import { useEffect, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import SortToggle from '../../components/SortToggle.jsx'
import { card, thCls, tdCls, rowCls } from '../../components/ui.js'
import { PARTNERS, fetchPartnersPage } from '../../data/partners.js'

// Mirrors My Clients' own pagination (ActiveClients.jsx) — keeps the roster
// readable once it grows past what fits on one screen.
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

// Mirrors My Clients (ActiveClients.jsx) — same search/sort/pagination
// pattern against a fake paginated-list endpoint (fetchPartnersPage), just
// without a Client Groups-equivalent second tab since partners aren't
// grouped the way clients are.
export default function MyPartners() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [partners] = useState(PARTNERS)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ rows: [], total: 0 })
  const [isLoading, setIsLoading] = useState(true)

  // Search box only updates `query` on every keystroke — the actual "request"
  // waits for typing to settle, same as a real search-as-you-type API call would.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Any change to what's being asked for should land back on page 1.
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, sortMode])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchPartnersPage(partners, { search: debouncedQuery, page, pageSize: PAGE_SIZE, sortMode }).then((res) => {
      if (!cancelled) {
        setResult(res)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, page, sortMode])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">My Partners</h1>
        <p className="mt-1 text-slate-500">Roster of onboarded Agents, Co-loaders, Franchise and 3rd Party partners.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by partner or city…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
        </div>
        {isLoading && <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />}
        <SortToggle sortMode={sortMode} onChange={setSortMode} />
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={thCls}>Organisation</th>
                <th className={thCls}>POC</th>
                <th className={thCls}>Phone</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>City</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((p) => (
                <tr key={p.id} className={rowCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.organisationName} size="sm" />
                      <div>
                        <div className="font-medium text-slate-800">{p.organisationName}</div>
                        <div className="text-xs text-slate-400">{p.orgEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>{p.pocName || '—'}</td>
                  <td className={tdCls}>{p.pocPhone || '—'}</td>
                  <td className={tdCls}>{p.type}</td>
                  <td className={tdCls}>{p.city || '—'}</td>
                  <td className={tdCls}>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className={`${tdCls} text-slate-400`}>{p.onboardedOn ?? '—'}</td>
                </tr>
              ))}
              {!isLoading && result.total === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    No partners match{query ? ` "${query}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={result.total} onPageChange={setPage} />
      </div>

      <p className="text-sm text-slate-400">
        This prototype holds the partner list in memory only — changes here don't persist past the session. Partners
        land here once Supply Admin approves them in Partner Approvals.
      </p>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { LT_USERS } from '../../data/users.js'
import { ORG_CATALOG } from '../../data/orgs.js'
import Avatar from '../../components/Avatar.jsx'
import BackButton from '../../components/BackButton.jsx'
import Icon from '../../components/Icon.jsx'
import { pillActive, pillInactive } from '../../components/ui.js'

const TABS = ['LetsTransport', 'Partners', 'Clients']
const sectionCard = 'rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70'

const isInternal = (u) => !u.parentEmail || u.parentEmail === u.email
const nameOf = (u) => u.name.toLowerCase()
// Match on name or the part of the email before the @ (every LT email shares
// the same domain, so matching the domain would match everyone).
const matches = (u, q) => !q || nameOf(u).includes(q) || u.email.split('@')[0].toLowerCase().includes(q)

// Turn a flat list into a forest: someone is a root when their manager is not
// in this list (or they have none).
function buildForest(users) {
  const emails = new Set(users.map((u) => u.email))
  const kids = new Map()
  users.forEach((u) => {
    if (u.managerEmail && emails.has(u.managerEmail)) {
      kids.set(u.managerEmail, [...(kids.get(u.managerEmail) ?? []), u])
    }
  })
  const sort = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name))
  const make = (u) => ({ user: u, children: sort(kids.get(u.email) ?? []).map(make) })
  const roots = users.filter((u) => !u.managerEmail || !emails.has(u.managerEmail))
  return sort(roots).map(make)
}

// Keep a node if it matches or any descendant does; returns null otherwise.
function pruneForest(nodes, q) {
  if (!q) return nodes
  return nodes
    .map((n) => {
      const children = pruneForest(n.children, q)
      return matches(n.user, q) || children.length ? { ...n, children } : null
    })
    .filter(Boolean)
}

function countNodes(nodes) {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0)
}

function roleOf(u) {
  return (u.roles ?? [])[0] || u.roleLabel || ''
}

function Node({ node, q, collapsed, onToggle, allEmails, byEmail }) {
  const { user, children } = node
  const isCollapsed = !q && collapsed.has(user.email)
  const hit = !!q && matches(user, q)
  const outsideManager = user.managerEmail && !allEmails.has(user.managerEmail) ? byEmail.get(user.managerEmail) : null
  return (
    <li>
      <div className="relative inline-block">
        <div
          className={`w-52 rounded-xl bg-white px-3 py-2.5 text-left shadow-soft ring-1 transition-shadow ${
            hit ? 'ring-2 ring-brand-orange' : 'ring-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800">{user.name}</div>
              <div className="truncate text-[11px] text-slate-400">{roleOf(user) || 'No role'}</div>
            </div>
          </div>
          {outsideManager && <div className="mt-1.5 truncate text-[10px] text-slate-400">Reports to {outsideManager.name}</div>}
        </div>
        {children.length > 0 && (
          <button
            type="button"
            onClick={() => onToggle(user.email)}
            title={isCollapsed ? 'Show reports' : 'Hide reports'}
            className="absolute -bottom-2.5 left-1/2 z-10 flex h-5 min-w-[28px] -translate-x-1/2 items-center justify-center gap-0.5 rounded-full bg-slate-800 px-1.5 text-[10px] font-medium text-white hover:bg-slate-700"
          >
            {isCollapsed ? '+' : '−'}
            {children.length}
          </button>
        )}
      </div>
      {children.length > 0 && !isCollapsed && (
        <ul>
          {children.map((c) => (
            <Node key={c.user.email} node={c} q={q} collapsed={collapsed} onToggle={onToggle} allEmails={allEmails} byEmail={byEmail} />
          ))}
        </ul>
      )}
    </li>
  )
}

function Chart({ users, q, emptyText }) {
  const [collapsed, setCollapsed] = useState(() => new Set())
  const forest = useMemo(() => buildForest(users), [users])
  const shown = useMemo(() => pruneForest(forest, q), [forest, q])
  const trees = useMemo(() => shown.filter((n) => n.children.length).sort((a, b) => countNodes([b]) - countNodes([a])), [shown])
  const singles = useMemo(() => shown.filter((n) => !n.children.length), [shown])
  const allEmails = useMemo(() => new Set(users.map((u) => u.email)), [users])
  const byEmail = useMemo(() => new Map(LT_USERS.map((u) => [u.email, u])), [])
  const withKids = useMemo(() => {
    const out = []
    const walk = (ns) => ns.forEach((n) => { if (n.children.length) out.push(n.user.email); walk(n.children) })
    walk(forest)
    return out
  }, [forest])

  function toggle(email) {
    setCollapsed((s) => {
      const next = new Set(s)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })
  }

  if (!users.length) return <p className="px-6 py-16 text-center text-sm text-slate-400">{emptyText}</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-400">
          {q ? `${countNodes(shown)} shown` : `${users.length} ${users.length === 1 ? 'person' : 'people'}`}
        </span>
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
          <button type="button" onClick={() => setCollapsed(new Set())} className="hover:text-slate-900">Expand all</button>
          <button type="button" onClick={() => setCollapsed(new Set(withKids))} className="hover:text-slate-900">Collapse all</button>
        </div>
      </div>
      {shown.length ? (
        <div className="overflow-auto p-8">
          <div className="flex flex-wrap items-start justify-center gap-x-14 gap-y-12">
            {trees.map((n) => (
              <div key={n.user.email} className="org-tree w-max">
                <ul>
                  <Node node={n} q={q} collapsed={collapsed} onToggle={toggle} allEmails={allEmails} byEmail={byEmail} />
                </ul>
              </div>
            ))}
          </div>
          {singles.length > 0 && (
            <div className={trees.length ? 'mt-10 border-t border-slate-100 pt-6' : ''}>
              {trees.length > 0 && (
                <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">No reporting line</div>
              )}
              <div className="flex flex-wrap items-start justify-center gap-4">
                {singles.map((n) => (
                  <div key={n.user.email} className="org-tree w-max">
                    <ul>
                      <Node node={n} q={q} collapsed={collapsed} onToggle={toggle} allEmails={allEmails} byEmail={byEmail} />
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="px-6 py-16 text-center text-sm text-slate-400">No one matches "{q}".</p>
      )}
    </div>
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

function OrgPanel({ type }) {
  const [query, setQuery] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const q = query.trim().toLowerCase()

  const orgs = useMemo(
    () =>
      ORG_CATALOG.filter((o) => o.type === type).map((o) => ({
        ...o,
        members: LT_USERS.filter((u) => u.parentEmail === o.email && u.email !== o.email),
      })),
    [type],
  )

  const listed = orgs.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.members.some((m) => matches(m, q)),
  )
  const selected = listed.find((o) => o.email === selectedEmail) ?? listed[0] ?? null
  // Searching a person inside an org: the chart highlights them. Searching the
  // org itself shows its whole chart.
  const chartQuery = selected && selected.members.some((m) => matches(m, q)) ? q : ''

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className={`${sectionCard} p-3`}>
        <SearchBox value={query} onChange={setQuery} placeholder={`Search ${type.toLowerCase()} or a person…`} />
        <div className="mt-3 max-h-[480px] space-y-1 overflow-y-auto">
          {listed.map((o) => {
            const active = selected?.email === o.email
            const hits = q ? o.members.filter((m) => matches(m, q)) : []
            return (
              <button
                key={o.email}
                type="button"
                onClick={() => setSelectedEmail(o.email)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-orange-50/70 ring-1 ring-orange-200' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">{o.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{o.members.length}</span>
                </div>
                <div className="truncate text-xs text-slate-400">{o.email}</div>
                {hits.length > 0 && (
                  <div className="mt-1 truncate text-[11px] text-brand-orange">{hits.map((h) => h.name).join(', ')}</div>
                )}
              </button>
            )
          })}
          {!listed.length && <p className="px-3 py-6 text-center text-sm text-slate-400">No match.</p>}
        </div>
      </div>

      <div className={sectionCard}>
        {selected ? (
          <>
            <div className="flex items-center gap-2 px-5 pt-4">
              <h2 className="text-base font-semibold text-slate-900">{selected.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${type === 'Partners' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                {selected.type}
              </span>
            </div>
            <Chart
              key={selected.email}
              users={selected.members}
              q={chartQuery}
              emptyText={`No users under ${selected.name} yet. Add one in User Management and pick this organization.`}
            />
          </>
        ) : (
          <p className="px-6 py-16 text-center text-sm text-slate-400">No {type.toLowerCase()} found.</p>
        )}
      </div>
    </div>
  )
}

export default function UserHierarchy() {
  const [tab, setTab] = useState('LetsTransport')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const internal = useMemo(() => LT_USERS.filter(isInternal), [])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <BackButton />
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">User Relations</h1>
        <p className="mt-0.5 text-xs text-slate-500">See who reports to whom at LetsTransport, and inside each partner and client.</p>
      </div>

      <div className="flex min-h-[42px] flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? pillActive : pillInactive}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'LetsTransport' && <SearchBox value={query} onChange={setQuery} placeholder="Search a team member…" />}
      </div>

      {tab === 'LetsTransport' ? (
        <div className={sectionCard}>
          <Chart users={internal} q={q} emptyText="No team members yet." />
        </div>
      ) : (
        <OrgPanel key={tab} type={tab === 'Partners' ? 'Partner' : 'Client'} />
      )}
    </div>
  )
}

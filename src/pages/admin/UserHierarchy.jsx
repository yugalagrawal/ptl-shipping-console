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

function Node({ node, q, highlight, collapsed, onToggle, allEmails, byEmail }) {
  const { user, children } = node
  const isCollapsed = !q && collapsed.has(user.email)
  const hit = highlight ? highlight === user.email : !!q && matches(user, q)
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
            <Node key={c.user.email} node={c} q={q} highlight={highlight} collapsed={collapsed} onToggle={onToggle} allEmails={allEmails} byEmail={byEmail} />
          ))}
        </ul>
      )}
    </li>
  )
}

function Chart({ users, q, highlight, emptyText }) {
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
                  <Node node={n} q={q} highlight={highlight} collapsed={collapsed} onToggle={toggle} allEmails={allEmails} byEmail={byEmail} />
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
                      <Node node={n} q={q} highlight={highlight} collapsed={collapsed} onToggle={toggle} allEmails={allEmails} byEmail={byEmail} />
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

// LetsTransport tab: nothing is drawn until someone is picked; then the chart
// shows the people above them (their manager chain) and everyone below them.
function PersonFlow({ users, orgs, noun, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(null)
  const [selOrg, setSelOrg] = useState(null)
  const q = query.trim().toLowerCase()
  const orgOf = (u) => (orgs ? orgs.find((o) => o.email === u.parentEmail) : null)
  const membersOf = (o) => users.filter((u) => u.parentEmail === o.email)

  // Partners / Clients: search finds organisations and the people in them.
  const orgResults = orgs && q ? orgs.filter((o) => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)) : []
  const userResults = q ? users.filter((u) => matches(u, q)) : []
  const noResults = !orgResults.length && !userResults.length

  // Picking a person (or an org) shows the whole org; picking a person in the
  // LT team shows their chain above and below instead.
  const activeOrg = orgs ? selOrg ?? (picked ? orgOf(picked) : null) : null

  const chain = useMemo(() => {
    if (orgs) return activeOrg ? users.filter((u) => u.parentEmail === activeOrg.email) : []
    if (!picked) return []
    const byEmail = new Map(users.map((u) => [u.email, u]))
    const above = []
    let cur = byEmail.get(picked.managerEmail)
    while (cur && !above.includes(cur) && above.length < users.length) {
      above.push(cur)
      cur = byEmail.get(cur.managerEmail)
    }
    const below = []
    const queue = [picked.email]
    while (queue.length) {
      const m = queue.shift()
      users.forEach((u) => {
        if (u.managerEmail === m && !below.includes(u) && u !== picked) {
          below.push(u)
          queue.push(u.email)
        }
      })
    }
    return [...above, picked, ...below]
  }, [picked, users, orgs, activeOrg])

  function pickUser(u) {
    setPicked(u)
    setSelOrg(null)
    setQuery(u.name)
    setOpen(false)
  }

  function pickOrg(o) {
    setSelOrg(o)
    setPicked(null)
    setQuery(o.name)
    setOpen(false)
  }

  const showChart = orgs ? !!activeOrg : !!picked

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-soft focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
          <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              if (!e.target.value.trim()) { setPicked(null); setSelOrg(null) }
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder={placeholder}
            className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        {open && q && (
          <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
            {orgResults.map((o) => (
              <button
                key={o.email}
                type="button"
                onMouseDown={() => pickOrg(o)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{o.name}</div>
                  <div className="truncate text-xs text-slate-400">
                    {o.email} · {membersOf(o).length} {membersOf(o).length === 1 ? 'person' : 'people'}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${o.type === 'Partner' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                  {o.type}
                </span>
              </button>
            ))}
            {userResults.map((u) => (
              <button
                key={u.email}
                type="button"
                onMouseDown={() => pickUser(u)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <Avatar name={u.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{u.name}</div>
                  <div className="truncate text-xs text-slate-400">{[roleOf(u), orgOf(u)?.name].filter(Boolean).join(' · ') || u.email}</div>
                </div>
              </button>
            ))}
            {noResults && <p className="px-3 py-4 text-center text-sm text-slate-400">No match.</p>}
          </div>
        )}
      </div>

      <div className={sectionCard}>
        {showChart ? (
          <>
            {activeOrg && (
              <div className="flex items-center gap-2 px-5 pt-4">
                <h2 className="text-base font-semibold text-slate-900">{activeOrg.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activeOrg.type === 'Partner' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                  {activeOrg.type}
                </span>
              </div>
            )}
            <Chart
              key={`${activeOrg?.email ?? ''}|${picked?.email ?? ''}`}
              users={chain}
              highlight={picked?.email}
              emptyText={activeOrg ? `No users under ${activeOrg.name} yet. Add one in User Management and pick this organization.` : ''}
            />
          </>
        ) : (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Icon name="search" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">{orgs ? `Search a ${noun} or a person` : 'Search a team member'}</p>
            <p className="mt-1 text-xs text-slate-400">
              {orgs ? `Pick one to see everyone in the ${noun} and who reports to whom.` : 'See who they report to and who reports to them.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UserHierarchy() {
  const [tab, setTab] = useState('LetsTransport')
  const internal = useMemo(() => LT_USERS.filter(isInternal), [])
  const orgs = useMemo(() => ORG_CATALOG.filter((o) => o.type === (tab === 'Partners' ? 'Partner' : 'Client')), [tab])
  const orgUsers = useMemo(() => {
    const emails = new Set(orgs.map((o) => o.email))
    return LT_USERS.filter((u) => emails.has(u.parentEmail) && u.email !== u.parentEmail)
  }, [orgs])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <BackButton />
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">User Relations</h1>
        <p className="mt-0.5 text-xs text-slate-500">See who reports to whom at LetsTransport, and inside each partner and client.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? pillActive : pillInactive}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'LetsTransport' ? (
        <PersonFlow key={tab} users={internal} placeholder="Search a team member…" />
      ) : (
        <PersonFlow
          key={tab}
          users={orgUsers}
          orgs={orgs}
          noun={tab === 'Partners' ? 'partner' : 'client'}
          placeholder={tab === 'Partners' ? 'Search a partner or a person…' : 'Search a client or a person…'}
        />
      )}
    </div>
  )
}

import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { LT_USERS } from '../../data/users.js'
import { PARTNERS } from '../../data/partners.js'
import { isReportOf } from '../../data/relations.js'
import Avatar from '../../components/Avatar.jsx'
import BackButton from '../../components/BackButton.jsx'
import Icon from '../../components/Icon.jsx'
import { btnPrimary, btnSecondary, pillActive, pillInactive, thCls, tdCls, rowCls } from '../../components/ui.js'

// Which internal apps a login can use — kept local to this page for now
// rather than in data/permissions.js since nothing outside User Management
// reads it yet.
const PRODUCT_TAGS = ['Flow Web', 'Flow App']

// Case-insensitive "add if new" against a catalog array, generalized so both
// the new-user form and the edit panel can grow the same Product Tags list.
function ensureCatalogTag(catalog, setCatalog, raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const existing = catalog.find((t) => t.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  setCatalog((list) => [...list, trimmed])
  return trimmed
}

// Shared multi-select used both when creating a user (picks land on a local
// draft, nothing saved yet) and when editing an existing one (picks write
// straight through) — same dropdown-with-checkboxes-plus-add-new pattern as
// the rest of this app, just decoupled from where `selected` actually lives
// so one component covers both cases.
function TagPicker({ selected, catalog, onToggle, onCreateTag, placeholder = 'No tags' }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function submitNewTag() {
    const canonical = onCreateTag(text)
    if (canonical) setText('')
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setText('') }}
        className="flex min-w-[150px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        <span className="flex flex-wrap items-center gap-1">
          {selected.length ? (
            selected.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {t}
              </span>
            ))
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <div className="max-h-48 overflow-y-auto py-1">
              {catalog.map((tag) => (
                <label key={tag} className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(tag)}
                    onChange={() => onToggle(tag)}
                    className="h-3.5 w-3.5 rounded accent-brand-orange"
                  />
                  {tag}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-1.5 border-t border-slate-100 p-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitNewTag()
                  }
                }}
                placeholder="New tag…"
                className="w-full rounded-lg bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              <button
                type="button"
                onClick={submitNewTag}
                disabled={!text.trim()}
                className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Single-select dropdown over Partner Module's org roster (data/partners.js)
// — picks the Partner Organization this user sits under (name shown, org
// email is the value that actually gets stored as `parentEmail`). Partner
// Organizations are created in the Partner Module now (My Partners /
// Partner Onboarding), not from here, so this picker is select-only.
// `value` is 3-way: `null` = nothing picked yet (blank placeholder), `''` =
// LetsTransport Internal explicitly picked, an org's email = that org —
// keeping "unpicked" and "Internal" distinct (rather than collapsing both to
// blank/null) is what lets the field start empty without silently defaulting
// to Internal.
function PartnerOrgPicker({ value, catalog, onSelect }) {
  const [open, setOpen] = useState(false)

  const selectedOrg = catalog.find((o) => o.email === value) ?? null
  const label = selectedOrg ? selectedOrg.name : value === '' ? 'LetsTransport Internal' : null

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20"
      >
        <span className={`truncate ${label ? 'text-slate-700' : 'text-slate-400'}`}>{label ?? 'Select organization'}</span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <div className="max-h-48 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => { onSelect(''); setOpen(false) }}
                className="flex w-full items-center px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                LetsTransport Internal
              </button>
              {catalog.map((org) => (
                <button
                  key={org.email}
                  type="button"
                  onClick={() => { onSelect(org.email); setOpen(false) }}
                  className="flex w-full flex-col items-start px-3.5 py-2 text-left hover:bg-slate-50"
                >
                  <span className="text-sm text-slate-700">{org.name}</span>
                  <span className="text-xs text-slate-400">{org.email}</span>
                </button>
              ))}
              {!catalog.length && (
                <p className="px-3.5 py-2 text-xs text-slate-400">No partner organizations yet — add one in Partner Module.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const FunnelIcon = ({ className = '' }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M1.5 2.5h13a.5.5 0 0 1 .38.82L10 9v4.2a.5.5 0 0 1-.72.45l-2.5-1.25A.5.5 0 0 1 6.5 12V9L1.12 3.32A.5.5 0 0 1 1.5 2.5Z" />
  </svg>
)

// Two arrows (up + down); the active direction is solid, the other faded.
const SortIcon = ({ dir, className = '' }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <g opacity={dir === 'desc' ? 0.3 : 1}><path d="M5 13V3M2.5 5.5 5 3l2.5 2.5" /></g>
    <g opacity={dir === 'asc' ? 0.3 : 1}><path d="M11 3v10M8.5 10.5 11 13l2.5-2.5" /></g>
  </svg>
)

// Header filter: search + multi-select checkboxes in a popover. Empty
// selection = no filter. `options` is a list of strings.
function ColumnFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const shown = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
  const active = selected.length > 0
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ('') }}
        className={`inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wider ${active ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {label}
        {active && <span className="rounded-full bg-orange-100 px-1.5 text-[10px] normal-case tracking-normal">{selected.length}</span>}
        <FunnelIcon className={`h-3 w-3 ${active ? 'text-brand-orange' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white text-left normal-case tracking-normal shadow-soft">
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full rounded-lg bg-slate-50/60 px-2.5 py-1.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {shown.map((o) => (
                <label key={o} className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(o)}
                    onChange={() => onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o])}
                    className="h-3.5 w-3.5 rounded accent-brand-orange"
                  />
                  <span className="truncate">{o}</span>
                </label>
              ))}
              {!shown.length && <p className="px-3.5 py-2 text-sm font-normal text-slate-400">No matches.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2 text-xs font-normal">
              <span className="text-slate-400">{selected.length} selected</span>
              <button type="button" onClick={() => onChange([])} disabled={!active} className="font-medium text-brand-orange disabled:opacity-30">
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function UserRelations() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [users, setUsers] = useState(LT_USERS)
  const [productCatalog, setProductCatalog] = useState(() => [...PRODUCT_TAGS])
  const partnerOrgCatalog = useMemo(() => PARTNERS.map((p) => ({ name: p.organisationName, email: p.orgEmail })), [])

  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', phone: '', email: '', parentEmail: null, managerEmail: '', products: [],
  })
  const [createError, setCreateError] = useState('')
  const [newTagText, setNewTagText] = useState('')

  const [query, setQuery] = useState('')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc' by name
  const [managerFilter, setManagerFilter] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const [editingEmail, setEditingEmail] = useState(null)
  const [draftManager, setDraftManager] = useState('')
  const [draftProducts, setDraftProducts] = useState([])

  // user-relations.manage is the org-wide "edit who reports to whom" admin
  // capability that gates this whole page now that Delegate Access (the
  // one feature a plain manager without it used to reach) is gone.
  const canManageOrg = can('user-relations')

  function startEdit(u) {
    setEditingEmail(u.email)
    setDraftManager(u.managerEmail ?? '')
    setDraftProducts([...(u.products ?? [])])
  }

  function saveEdit() {
    const target = LT_USERS.find((u) => u.email === editingEmail)
    if (!target) return
    target.managerEmail = draftManager || null
    target.products = [...draftProducts]
    setUsers((list) => list.map((u) => (u.email === editingEmail ? { ...u, managerEmail: target.managerEmail, products: target.products } : u)))
    setEditingEmail(null)
  }

  // Creating a product tag grows the shared catalog (so every other picker
  // offers it from now on); applying it is left to the caller.
  function addProductToCatalog(text) {
    return ensureCatalogTag(productCatalog, setProductCatalog, text)
  }

  const NO_MANAGER = 'No manager'
  const NO_TAGS = 'No tags'
  const managerOptions = useMemo(() => {
    const names = [...new Set(users.map((u) => users.find((m) => m.email === u.managerEmail)?.name).filter(Boolean))].sort()
    return [NO_MANAGER, ...names]
  }, [users])
  const tagOptions = useMemo(() => [...productCatalog, NO_TAGS], [productCatalog])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = users.filter((u) => {
      if (q && !(u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false
      if (managerFilter.length) {
        const mName = users.find((m) => m.email === u.managerEmail)?.name ?? NO_MANAGER
        if (!managerFilter.includes(mName)) return false
      }
      if (tagFilter.length) {
        const tags = u.products?.length ? u.products : [NO_TAGS]
        if (!tags.some((t) => tagFilter.includes(t))) return false
      }
      return true
    })
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * (sortDir === 'asc' ? 1 : -1))
    return list
  }, [users, query, managerFilter, tagFilter, sortDir])

  const editingUser = users.find((u) => u.email === editingEmail) ?? null
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
  const dirty =
    !!editingUser &&
    ((editingUser.managerEmail ?? '') !== draftManager || !sameSet(editingUser.products ?? [], draftProducts))

  function addNewTag() {
    const canonical = addProductToCatalog(newTagText)
    if (!canonical) return
    setNewUser((u) => (u.products.includes(canonical) ? u : { ...u, products: [...u.products, canonical] }))
    setNewTagText('')
  }

  function resetNewUserForm() {
    setNewTagText('')
    setCreating(false)
    setNewUser({ firstName: '', lastName: '', phone: '', email: '', parentEmail: null, managerEmail: '', products: [] })
    setCreateError('')
  }

  // This prototype's whole identity model is an email-keyed array in memory
  // (data/users.js) — creating a user here just means appending a
  // same-shaped record with everything past name/email/manager/products left
  // at its "nothing granted yet" default, same as every other field on this
  // page. A real backend would also need to actually provision the login.
  // Parent email has no "agent / co-loader / external party" kind selector
  // yet to make it conditionally required, so for now it's just an optional
  // field with a hint on when it applies.
  function handleCreateUser() {
    const firstName = newUser.firstName.trim()
    const lastName = newUser.lastName.trim()
    const email = newUser.email.trim().toLowerCase()
    const parentEmail = (newUser.parentEmail ?? '').trim().toLowerCase()
    if (!firstName || !lastName || !email) {
      setCreateError('First name, last name and user email are required.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setCreateError('Enter a valid user email address.')
      return
    }
    if (LT_USERS.some((u) => u.email === email)) {
      setCreateError('A user with this email already exists.')
      return
    }
    const record = {
      email,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      mobile: newUser.phone.trim(),
      parentEmail: parentEmail || email,
      departments: [],
      phoneVerified: false,
      roleLabel: '',
      roles: [],
      functionOverrides: null,
      regions: [],
      zones: [],
      hubs: [],
      miniHubs: [],
      managerEmail: newUser.managerEmail || null,
      delegatedFunctions: [],
      tags: [],
      products: [...newUser.products],
    }
    LT_USERS.push(record)
    // `users` starts as the LT_USERS array itself, so the push above already
    // added the record — re-read it instead of appending a second copy.
    setUsers([...LT_USERS])
    resetNewUserForm()
    navigate(`/user-module/access-management?user=${encodeURIComponent(record.email)}`, { state: { justCreated: true } })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BackButton />
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">User Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">Create team logins, set who they report to and which apps they use.</p>
        </div>
        {canManageOrg && !creating && (
          <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
            + Create New User
          </button>
        )}
      </div>

      {canManageOrg && creating && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-navy-dark via-brand-navy to-brand-navy-light px-5 py-3">
            <div>
              <h2 className="text-base font-semibold text-white">New team member</h2>
              <p className="text-xs text-slate-300">They can sign in with this email once created.</p>
            </div>
            <button
              type="button"
              onClick={resetNewUserForm}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>

                 <div className="space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="flex h-5 items-center gap-1.5 text-xs font-medium text-slate-600">First name</label>
                  <input type="text" value={newUser.firstName} onChange={(e) => setNewUser((u) => ({ ...u, firstName: e.target.value }))} placeholder="First name" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20" />
                </div>
<div>
                  <label className="flex h-5 items-center gap-1.5 text-xs font-medium text-slate-600">Last name</label>
                  <input type="text" value={newUser.lastName} onChange={(e) => setNewUser((u) => ({ ...u, lastName: e.target.value }))} placeholder="Last name" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20" />
                </div>
<div>
                  <label className="flex h-5 items-center gap-1.5 text-xs font-medium text-slate-600">Phone</label>
                  <input type="text" value={newUser.phone} onChange={(e) => setNewUser((u) => ({ ...u, phone: e.target.value }))} placeholder="+91XXXXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20" />
                </div>
<div>
                  <label className="flex h-5 items-center gap-1.5 text-xs font-medium text-slate-600">User email</label>
                  <input type="text" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} placeholder="name@letstransport.team" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20" />
                </div>
<div>
                  <label className="flex h-5 items-center gap-1.5 text-xs font-medium text-slate-600">
                    Organization
                    <span className="group relative inline-flex">
                      <Icon name="info" className="h-3.5 w-3.5 cursor-help text-slate-300" />
                      <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-56 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        Only for external partners — pick their Partner Organization (added in Partner Module).
                      </span>
                    </span>
                  </label>
                  <div className="mt-1">
                    <PartnerOrgPicker
                      value={newUser.parentEmail}
                      catalog={partnerOrgCatalog}
                      onSelect={(email) => setNewUser((u) => ({ ...u, parentEmail: email }))}
                    />
                  </div>
                  {newUser.parentEmail !== null && (
                    <p className="mt-1 text-[11px] text-slate-400">Parent email: {newUser.parentEmail || newUser.email || '—'}</p>
                  )}
                </div>
<div>
                  <label className="flex h-5 items-center gap-1.5 text-xs font-medium text-slate-600">Manager</label>
                  <div className="relative">
                    <select
                      value={newUser.managerEmail}
                      onChange={(e) => setNewUser((u) => ({ ...u, managerEmail: e.target.value }))}
                      className="mt-1 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-9 text-sm text-slate-800 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20"
                    >
                      <option value="">No manager</option>
                      {users.map((m) => (
                        <option key={m.email} value={m.email}>
                          {m.name} · {m.email}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron" className="pointer-events-none absolute right-3.5 top-[calc(50%+2px)] h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-slate-600">Product access</span>
              {productCatalog.map((tag) => {
                const on = newUser.products.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setNewUser((u) => ({ ...u, products: on ? u.products.filter((p) => p !== tag) : [...u.products, tag] }))
                    }
                    className={on ? pillActive : pillInactive}
                  >
                    {tag}
                  </button>
                )
              })}
              <input
                type="text"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addNewTag()
                  }
                }}
                placeholder="+ New tag"
                className="w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-orange focus:outline-none"
              />
            </div>

            {createError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{createError}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <button type="button" onClick={resetNewUserForm} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={handleCreateUser} className={btnPrimary}>
              Create user
            </button>
          </div>
        </section>
      )}

      {canManageOrg && (
        <section className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
              <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              {(managerFilter.length > 0 || tagFilter.length > 0) && (
                <button type="button" onClick={() => { setManagerFilter([]); setTagFilter([]) }} className="ml-2 font-medium text-brand-orange">
                  Clear filters
                </button>
              )}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/50">
                  <th className={`${thCls} !px-3 !pl-5`}>
                    <button
                      type="button"
                      onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider text-brand-orange`}
                      title={sortDir === 'asc' ? 'Sorted A → Z' : 'Sorted Z → A'}
                    >
                      Team member
                      <SortIcon dir={sortDir} className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className={`${thCls} !px-3`}>Phone</th>
                  <th className={`${thCls} !px-3`}>
                    <ColumnFilter label="Manager" options={managerOptions} selected={managerFilter} onChange={setManagerFilter} />
                  </th>
                  <th className={`${thCls} !px-3`}>
                    <ColumnFilter label="Product tags" options={tagOptions} selected={tagFilter} onChange={setTagFilter} />
                  </th>
                  <th className={`${thCls} !px-3 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const manager = users.find((m) => m.email === u.managerEmail) ?? null
                  const editing = editingEmail === u.email
                  return (
                    <Fragment key={u.email}>
                      <tr className={`${rowCls} ${editing ? 'bg-orange-50/40' : ''}`}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} size="sm" />
                            <div>
                              <div className="text-sm font-medium text-slate-800">{u.name}</div>
                              <div className="text-xs text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`${tdCls} !px-3`}>{u.mobile || '—'}</td>
                        <td className={`${tdCls} !px-3`}>{manager ? manager.name : <span className="text-slate-300">No manager</span>}</td>
                        <td className="px-3 py-3">
                          {(u.products ?? []).length ? (
                            <div className="flex gap-1">
                              {u.products.map((p) => (
                                <span key={p} className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-300">No tags</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => (editing ? setEditingEmail(null) : startEdit(u))}
                            className="mr-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            {editing ? 'Close' : 'Manage'}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/user-module/access-management?user=${encodeURIComponent(u.email)}`)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-orange transition-colors hover:bg-orange-50"
                          >
                            Access controls
                          </button>
                        </td>
                      </tr>
                      {editing && (
                        <tr className="bg-orange-50/40">
                          <td colSpan={5} className="px-4 pb-4 pt-1">
                            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
                              <div>
                                <label className="text-xs font-medium text-slate-500">Manager</label>
                                <select
                                  value={draftManager}
                                  onChange={(e) => setDraftManager(e.target.value)}
                                  className="mt-1 block min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                                >
                                  <option value="">No manager</option>
                                  {users
                                    .filter((m) => m.email !== u.email && !isReportOf(users, m.email, u.email))
                                    .map((m) => (
                                      <option key={m.email} value={m.email}>
                                        {m.name} · {m.email}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-500">Product tags</label>
                                <div className="mt-1">
                                  <TagPicker
                                    selected={draftProducts}
                                    catalog={productCatalog}
                                    placeholder="No products"
                                    onToggle={(product) =>
                                      setDraftProducts((l) => (l.includes(product) ? l.filter((x) => x !== product) : [...l, product]))
                                    }
                                    onCreateTag={(text) => {
                                      const canonical = addProductToCatalog(text)
                                      if (canonical) setDraftProducts((l) => (l.includes(canonical) ? l : [...l, canonical]))
                                      return canonical
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <button type="button" onClick={() => setEditingEmail(null)} className={btnSecondary}>
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={!dirty}
                                  className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {!filteredUsers.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">No matching users.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="pb-4 text-center text-xs text-slate-400">Prototype · changes are kept in memory for this session only</p>
    </div>
  )
}

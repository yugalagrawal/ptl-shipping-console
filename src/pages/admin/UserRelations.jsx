import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { LT_USERS } from '../../data/users.js'
import { PARTNERS } from '../../data/partners.js'
import { isReportOf } from '../../data/relations.js'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { card, btnPrimary, btnSecondary, thCls, tdCls, rowCls } from '../../components/ui.js'

// Which internal apps a login can use — kept local to this page for now
// rather than in data/permissions.js since nothing outside User Management
// reads it yet.
const PRODUCT_TAGS = ['FLOW', 'Hub App', 'Scan Tool']

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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
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

export default function UserRelations() {
  const { can } = useAuth()
  const [users, setUsers] = useState(LT_USERS)
  const [productCatalog, setProductCatalog] = useState(() => [...PRODUCT_TAGS])
  const partnerOrgCatalog = useMemo(() => PARTNERS.map((p) => ({ name: p.organisationName, email: p.orgEmail })), [])

  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', phone: '', email: '', parentEmail: null, managerEmail: '', products: [],
  })
  const [createError, setCreateError] = useState('')

  const [editQuery, setEditQuery] = useState('')
  const [editSearchOpen, setEditSearchOpen] = useState(false)
  const [editSelectedEmail, setEditSelectedEmail] = useState(null)

  // user-relations.manage is the org-wide "edit who reports to whom" admin
  // capability that gates this whole page now that Delegate Access (the
  // one feature a plain manager without it used to reach) is gone.
  const canManageOrg = can('user-relations')

  function handleReassignManager(targetEmail, newManagerEmail) {
    const target = LT_USERS.find((u) => u.email === targetEmail)
    if (target) target.managerEmail = newManagerEmail
    setUsers((list) => list.map((u) => (u.email === targetEmail ? { ...u, managerEmail: newManagerEmail } : u)))
  }

  function toggleUserProduct(targetEmail, product) {
    const target = LT_USERS.find((u) => u.email === targetEmail)
    if (!target) return
    const has = (target.products ?? []).includes(product)
    target.products = has ? target.products.filter((p) => p !== product) : [...(target.products ?? []), product]
    setUsers((list) => list.map((u) => (u.email === targetEmail ? { ...u, products: target.products } : u)))
  }

  // Creating a product tag grows the shared catalog (so every other picker
  // offers it from now on); applying it to a specific user is a separate
  // step left to the caller, since the new-user form and the edit panel
  // apply it to different places (a local draft vs. a saved user).
  function addProductToCatalog(text) {
    return ensureCatalogTag(productCatalog, setProductCatalog, text)
  }

  function addProductToUser(targetEmail, product) {
    const target = LT_USERS.find((u) => u.email === targetEmail)
    if (!target) return
    if (!(target.products ?? []).includes(product)) {
      target.products = [...(target.products ?? []), product]
      setUsers((list) => list.map((u) => (u.email === targetEmail ? { ...u, products: target.products } : u)))
    }
  }

  const filteredEditUsers = useMemo(() => {
    const q = editQuery.trim().toLowerCase()
    if (!q) return []
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, editQuery])

  const editSelectedUser = users.find((u) => u.email === editSelectedEmail) ?? null

  function resetNewUserForm() {
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
    setUsers((list) => [...list, record])
    resetNewUserForm()
    setEditSelectedEmail(record.email)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">User Management</h1>
        <p className="mt-1 text-slate-500">
          Create and search LT Team logins, reassign who they report to, and see the full team in one list.
        </p>
      </div>

      {canManageOrg && (
        <section className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-6 pb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reporting structure</h3>
              <p className="mt-1 text-xs text-slate-400">
                Create a new user with their manager and product tags, or search an existing one below to change theirs.
              </p>
            </div>
            {!creating && (
              <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
                + Create New User
              </button>
            )}
          </div>

          <div className="space-y-5 p-6 pt-4">
            {creating && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-800">New user</h4>
                  <button type="button" onClick={resetNewUserForm} className="text-xs text-slate-400 hover:text-slate-600">
                    Cancel
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-500">First name</label>
                    <input
                      type="text"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser((u) => ({ ...u, firstName: e.target.value }))}
                      placeholder="First name"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Last name</label>
                    <input
                      type="text"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser((u) => ({ ...u, lastName: e.target.value }))}
                      placeholder="Last name"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Phone</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser((u) => ({ ...u, phone: e.target.value }))}
                      placeholder="+91XXXXXXXXXX"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">User email</label>
                    <input
                      type="text"
                      value={newUser.email}
                      onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                      placeholder="name@letstransport.team"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      Organization
                      <span className="group relative inline-flex">
                        <Icon name="info" className="h-3.5 w-3.5 cursor-help text-slate-300" />
                        <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-56 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          Fill it only for external partners — pick their Partner Organization (added in Partner Module).
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
                      <p className="mt-1 text-[11px] text-slate-400">Parent email = {newUser.parentEmail || newUser.email || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Manager email</label>
                    <select
                      value={newUser.managerEmail}
                      onChange={(e) => setNewUser((u) => ({ ...u, managerEmail: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                    >
                      <option value="">No manager</option>
                      {users.map((m) => (
                        <option key={m.email} value={m.email}>
                          {m.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Product tags</label>
                    <div className="mt-1">
                      <TagPicker
                        selected={newUser.products}
                        catalog={productCatalog}
                        placeholder="No products"
                        onToggle={(product) =>
                          setNewUser((u) => ({
                            ...u,
                            products: u.products.includes(product) ? u.products.filter((p) => p !== product) : [...u.products, product],
                          }))
                        }
                        onCreateTag={(text) => {
                          const canonical = addProductToCatalog(text)
                          if (canonical) {
                            setNewUser((u) => (u.products.includes(canonical) ? u : { ...u, products: [...u.products, canonical] }))
                          }
                          return canonical
                        }}
                      />
                    </div>
                  </div>
                </div>
                {createError && <p className="text-xs text-rose-500">{createError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={resetNewUserForm} className={btnSecondary}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreateUser} className={btnPrimary}>
                    Create user
                  </button>
                </div>
              </div>
            )}

            <div className="relative max-w-md">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-soft focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
                <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={editQuery}
                  onChange={(e) => setEditQuery(e.target.value)}
                  onFocus={() => setEditSearchOpen(true)}
                  onBlur={() => setTimeout(() => setEditSearchOpen(false), 120)}
                  placeholder="Search a team member by name or email…"
                  className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {editSearchOpen && editQuery.trim() && (
                <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-soft">
                  {filteredEditUsers.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onMouseDown={() => { setEditSelectedEmail(u.email); setEditQuery(''); setEditSearchOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">{u.name}</div>
                        <div className="truncate text-xs text-slate-400">{u.email}</div>
                      </div>
                    </button>
                  ))}
                  {!filteredEditUsers.length && <p className="px-3.5 py-2.5 text-sm text-slate-400">No matching users.</p>}
                </div>
              )}
            </div>

            {!editSelectedUser && (
              <p className="text-sm text-slate-400">Search and pick a user to change their manager or product tags.</p>
            )}

            {editSelectedUser && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={editSelectedUser.name} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{editSelectedUser.name}</div>
                    <div className="text-xs text-slate-400">{editSelectedUser.email}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={editSelectedUser.managerEmail ?? ''}
                    onChange={(e) => handleReassignManager(editSelectedUser.email, e.target.value || null)}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm text-slate-700 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                  >
                    <option value="">No manager</option>
                    {users
                      .filter((m) => m.email !== editSelectedUser.email && !isReportOf(users, m.email, editSelectedUser.email))
                      .map((m) => (
                        <option key={m.email} value={m.email}>
                          {m.email}
                        </option>
                      ))}
                  </select>
                  <TagPicker
                    selected={editSelectedUser.products ?? []}
                    catalog={productCatalog}
                    placeholder="No products"
                    onToggle={(product) => toggleUserProduct(editSelectedUser.email, product)}
                    onCreateTag={(text) => {
                      const canonical = addProductToCatalog(text)
                      if (canonical) addProductToUser(editSelectedUser.email, canonical)
                      return canonical
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {canManageOrg && (
        <section className={card}>
          <div className="border-b border-slate-100 p-6 pb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">User List</h3>
            <p className="mt-1 text-xs text-slate-400">Every LT Team login and their basic details, in one sheet.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={thCls}>Team member</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Manager</th>
                  <th className={thCls}>Function</th>
                  <th className={thCls}>Role</th>
                  <th className={thCls}>Product tags</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const manager = users.find((m) => m.email === u.managerEmail) ?? null
                  return (
                    <tr key={u.email} className={rowCls}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" />
                          <div>
                            <div className="text-sm font-medium text-slate-800">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>{u.mobile || '—'}</td>
                      <td className={tdCls}>{manager ? manager.name : '—'}</td>
                      <td className={tdCls}>{(u.departments ?? []).join(', ') || '—'}</td>
                      <td className={tdCls}>{(u.roles ?? []).join(', ') || u.roleLabel || '—'}</td>
                      <td className="px-6 py-3.5">
                        {(u.products ?? []).length ? (
                          <div className="flex flex-wrap gap-1">
                            {u.products.map((p) => (
                              <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-sm text-slate-400">
        This prototype holds the reporting structure and user list in memory only — changes here don't persist past the
        session. In the real system this would write through to a backend user/role service.
      </p>
    </div>
  )
}

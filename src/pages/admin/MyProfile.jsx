import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { LT_USERS } from '../../data/users.js'
import { TASKS_BY_MODULE, ROLE_DEPARTMENT, effectiveFunctions } from '../../data/permissions.js'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'

// Column order matches production: Read Only · Create · Edit · Approve.
const LEVEL_COLUMNS = ['Read Only', 'Create', 'Edit', 'Approve']

const label = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const sectionCard = 'rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70'

// Read-only checkbox in the production orange: a tick when anything is granted
// (module / column rows too — no partial dash), empty when nothing is.
function Tick({ state }) {
  if (state === 'none') {
    return <span aria-label="Not granted" className="inline-block h-4 w-4 cursor-default rounded-[5px] border border-slate-300 bg-white" />
  }
  return (
    <span aria-label="Granted" className="inline-flex h-4 w-4 cursor-default items-center justify-center rounded-[5px] bg-brand-orange text-white">
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.2l2.4 2.4 4.6-5" />
      </svg>
    </span>
  )
}

// A module / column / task-row box is ticked only when everything under it is
// granted — ticking a module means all of its tasks, so there is no in-between.
function stateOf(granted, total) {
  return total > 0 && granted === total ? 'all' : 'none'
}

// "All X" when the user has no restriction at that tier — same
// "empty = unrestricted" convention as Access Management, rendered inert.
function ScopeTile({ title, unitPlural, values }) {
  const [all, setAll] = useState(false)
  const shown = all ? values : values.slice(0, 8)
  return (
    <div className="rounded-xl bg-slate-50/70 p-4 ring-1 ring-slate-200/60">
      <div className="flex items-center justify-between">
        <div className={label}>{title}</div>
        {values.length > 0 && <span className="text-xs text-slate-400">{values.length}</span>}
      </div>
      {values.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {shown.map((v) => (
            <span key={v} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {v}
            </span>
          ))}
          {values.length > 8 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="px-1.5 text-xs font-medium text-brand-orange">
              {all ? 'Show less' : `+${values.length - 8} more`}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 text-sm text-slate-500">All {unitPlural}</div>
      )}
    </div>
  )
}

function Fact({ title, children, wrap }) {
  return (
    <div className="min-w-0">
      <div className={label}>{title}</div>
      <div className={`mt-1 text-sm font-medium text-slate-800 ${wrap ? 'break-words' : 'truncate'}`}>{children}</div>
    </div>
  )
}

// Long lists (a Super Admin can hold dozens of roles) fold to `limit` chips with
// a "+N more" toggle so the card never grows unbounded.
function Chips({ items, tone, empty, limit = 10 }) {
  const [all, setAll] = useState(false)
  if (!items.length) return <span className="text-sm text-slate-400">{empty}</span>
  const cls = tone === 'dark' ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
  const shown = all ? items : items.slice(0, limit)
  const hidden = items.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shown.map((i) => (
        <span key={i} className={`rounded-full px-3 py-1.5 text-xs font-medium ${cls}`}>
          {i}
        </span>
      ))}
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="rounded-full px-2.5 py-1.5 text-xs font-medium text-brand-orange hover:bg-brand-orange/10"
        >
          {all ? 'Show less' : `+${hidden} more`}
        </button>
      )}
    </div>
  )
}

// Role presets grouped by the Function (department) they belong to, flowing
// inline ("Tech [Super Admin] [Tech Admin]  Finance […]") so a long list
// stays a few lines tall; folds to the first few roles with a "+N more" toggle.
const ROLE_LIMIT = 8

function RoleGroups({ roles }) {
  const [all, setAll] = useState(false)
  if (!roles.length) return <span className="text-sm text-slate-400">No role preset applied.</span>
  const order = []
  const groups = {}
  roles.forEach((r) => {
    const d = ROLE_DEPARTMENT[r] || 'Other'
    if (!groups[d]) {
      groups[d] = []
      order.push(d)
    }
    groups[d].push(r)
  })
  const flat = order.flatMap((d) => groups[d].map((r) => [d, r]))
  const shown = all ? flat : flat.slice(0, ROLE_LIMIT)
  const shownBy = {}
  shown.forEach(([d, r]) => (shownBy[d] ||= []).push(r))
  const multi = true // the function label is the only place Function is shown
  return (
    <div className="flex flex-col items-start gap-2.5">
      {order
        .filter((d) => shownBy[d])
        .map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-1.5">
            {multi && <span className="w-32 shrink-0 text-xs font-medium text-slate-400">{d}</span>}
            {shownBy[d].map((r) => (
              <span key={r} className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-medium text-white">
                {r}
              </span>
            ))}
          </div>
        ))}
      {flat.length > ROLE_LIMIT && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className={`rounded-full px-2.5 py-1.5 text-xs font-medium text-brand-orange hover:bg-brand-orange/10 ${multi ? 'ml-32' : ''}`}
        >
          {all ? 'Show less' : `+${flat.length - ROLE_LIMIT} more`}
        </button>
      )}
    </div>
  )
}

// Click the avatar → small "Set profile picture" menu (no always-on button).
function ProfilePicture({ name }) {
  const { user, setPhoto } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Choose an image file.')
    if (file.size > 5 * 1024 * 1024) return setError('Image must be under 5 MB.')
    const reader = new FileReader()
    reader.onload = () => {
      setPhoto(reader.result)
      setError('')
      setOpen(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile picture"
        className="group relative block rounded-full bg-white p-1 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
      >
        <Avatar name={name} size="lg" src={user?.photo} />
        <span className="absolute inset-1 flex items-center justify-center rounded-full bg-brand-navy/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Icon name="upload" className="h-5 w-5" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Profile picture</div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Icon name="upload" className="h-4 w-4 text-slate-400" />
            {user?.photo ? 'Change picture' : 'Set profile picture'}
          </button>
          {user?.photo && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Icon name="trash" className="h-4 w-4 text-slate-400" />
              Remove picture
            </button>
          )}
          {error && <p className="px-2.5 pb-1.5 pt-1 text-xs text-rose-600">{error}</p>}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  )
}

function Hero({ name, subtitle, children }) {
  return (
    <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
      <div className="h-20 rounded-t-2xl bg-gradient-to-r from-brand-navy-dark via-brand-navy to-brand-navy-light" />
      <div className="px-6 pb-6">
        <div className="-mt-9 flex items-end gap-4">
          <ProfilePicture name={name} />
          <div className="mt-[42px] self-start">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{name}</h2>
            <div className="text-sm text-slate-500">{subtitle}</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-[1.8fr_1.5fr_1fr_1fr]">{children}</div>
      </div>
    </div>
  )
}

function TasksTable({ functionIds }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const q = query.trim().toLowerCase()

  const groups = useMemo(
    () =>
      TASKS_BY_MODULE.map((g) => {
        const matchModule = g.module.toLowerCase().includes(q)
        const tasks = g.tasks.filter((t) => !q || matchModule || t.label.toLowerCase().includes(q))
        return { module: g.module, tasks, all: g.tasks }
      }).filter((g) => g.tasks.length),
    [q],
  )

  const has = (t, level) => !!t.levels[level] && functionIds.includes(t.levels[level])
  const defined = (t, level) => !!t.levels[level]

  const allTasks = TASKS_BY_MODULE.flatMap((g) => g.tasks)
  const colState = (tasks, level) =>
    stateOf(tasks.filter((t) => has(t, level)).length, tasks.filter((t) => defined(t, level)).length)
  const rowState = (t) => {
    const defs = LEVEL_COLUMNS.filter((l) => defined(t, l))
    return stateOf(defs.filter((l) => has(t, l)).length, defs.length)
  }
  const modState = (tasks) => {
    let g = 0
    let n = 0
    tasks.forEach((t) =>
      LEVEL_COLUMNS.forEach((l) => {
        if (defined(t, l)) {
          n++
          if (has(t, l)) g++
        }
      }),
    )
    return stateOf(g, n)
  }

  const allOpen = groups.length > 0 && groups.every((g) => open.has(g.module) || !!q)
  function toggle(m) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  return (
    <div className={sectionCard}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={label}>Tasks</h3>
          <p className="mt-1 text-sm text-slate-500">What you can do on each page — checked boxes are the access levels you have been granted.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.module)))}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks or modules…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-slate-200/70">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Module / Task</th>
              {LEVEL_COLUMNS.map((l) => (
                <th key={l} className="w-28 px-2 py-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <Tick state={colState(allTasks, l)} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{l}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const isOpen = open.has(g.module) || !!q
              return (
                <ModuleRows
                  key={g.module}
                  group={g}
                  isOpen={isOpen}
                  onToggle={() => toggle(g.module)}
                  modState={modState(g.all)}
                  colState={(l) => colState(g.all, l)}
                  rowState={rowState}
                  has={has}
                  defined={defined}
                />
              )
            })}
            {!groups.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No tasks match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModuleRows({ group, isOpen, onToggle, modState, colState, rowState, has, defined }) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-slate-100 bg-slate-50/50 hover:bg-slate-50">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Icon name="chevron" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            <Tick state={modState} />
            <span className="font-medium text-slate-800">{group.module}</span>
            <span className="text-xs text-slate-400">{group.all.length}</span>
          </div>
        </td>
        {LEVEL_COLUMNS.map((l) => (
          <td key={l} className="px-2 py-2.5 text-center">
            <Tick state={colState(l)} />
          </td>
        ))}
      </tr>
      {isOpen &&
        group.tasks.map((t) => (
          <tr key={t.id} className="border-t border-slate-100">
            <td className="py-2.5 pl-12 pr-4">
              <div className="flex items-center gap-2.5">
                <Tick state={rowState(t)} />
                <span className="text-slate-700">{t.label}</span>
              </div>
            </td>
            {LEVEL_COLUMNS.map((l) => (
              <td key={l} className="px-2 py-2.5 text-center">
                {defined(t, l) ? <Tick state={has(t, l) ? 'all' : 'none'} /> : <span className="text-slate-300">–</span>}
              </td>
            ))}
          </tr>
        ))}
    </>
  )
}

export default function MyProfile() {
  const { user } = useAuth()
  if (!user) return null

  // Client / Partner logins land here too — they get identity + the areas they
  // can open; role, task and location scoping only exist for LT Team.
  if (user.persona !== 'lt') {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageTitle />
        <Hero name={user.name} subtitle={user.persona === 'client' ? 'Client account' : 'Partner account'}>
          <Fact title="Organization">{user.name}</Fact>
          <Fact title="Contact">{user.contact || '—'}</Fact>
          <Fact title="Email">{user.email}</Fact>
          <Fact title="Account type">{user.persona === 'client' ? 'Client' : 'Partner'}</Fact>
        </Hero>
        <div className={sectionCard}>
          <h3 className={label}>Access</h3>
          <div className="mt-3">
            <Chips items={user.permissions ?? []} tone="dark" empty="No access yet." />
          </div>
        </div>
        <Footnote />
      </div>
    )
  }

  const manager = LT_USERS.find((u) => u.email === user.managerEmail) ?? null
  const functionIds = effectiveFunctions(user)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitle />

      <Hero name={user.name} subtitle={user.roleLabel || 'No role preset applied'}>
        <Fact title="Email" wrap>{user.email}</Fact>
        <Fact title="Phone number" wrap>
          <span className="flex items-center gap-2">
            <span>{user.mobile || '—'}</span>
            {user.mobile && (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  user.phoneVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon name="approve" className="h-3 w-3" />
                {user.phoneVerified ? 'Verified' : 'Not verified'}
              </span>
            )}
          </span>
        </Fact>
        <Fact title="Manager">{manager ? manager.name : '—'}</Fact>
        <Fact title="Organization">{user.parentEmail || '—'}</Fact>
      </Hero>

      <div className={sectionCard}>
        <h3 className={label}>Your Roles</h3>
        <div className="mt-4">
          <RoleGroups roles={user.roles ?? []} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {(user.products ?? []).length ? (
            <>
              <span className="mr-1 text-sm text-slate-500">You have access to</span>
              {user.products.map((p) => (
                <span key={p} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {p}
                </span>
              ))}
            </>
          ) : (
            <span className="text-sm text-slate-400">You don't have access to any product yet.</span>
          )}
        </div>
      </div>

      <div className={sectionCard}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className={label}>Location access</h3>
          <span className="text-xs text-slate-400">Region → Zone → Hub → Mini hub</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ScopeTile title="Region access" unitPlural="regions" values={user.regions ?? []} />
          <ScopeTile title="Zone access" unitPlural="zones" values={user.zones ?? []} />
          <ScopeTile title="Hub access" unitPlural="hubs" values={user.hubs ?? []} />
          <ScopeTile title="Mini hub access" unitPlural="mini hubs" values={user.miniHubs ?? []} />
        </div>
      </div>

      <div className={sectionCard}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className={label}>Geography access</h3>
          <span className="text-xs text-slate-400">State/UT → City → Pincode, and Territory → Circle</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ScopeTile title="State/UT access" unitPlural="states/UTs" values={user.states ?? []} />
          <ScopeTile title="City access" unitPlural="cities" values={user.cities ?? []} />
          <ScopeTile title="Pincode access" unitPlural="pincodes" values={user.pincodes ?? []} />
          <ScopeTile title="Territory access" unitPlural="territories" values={user.territories ?? []} />
          <ScopeTile title="Circle access" unitPlural="circles" values={user.circles ?? []} />
        </div>
      </div>

      <TasksTable functionIds={functionIds} />

      <Footnote />
    </div>
  )
}

function PageTitle() {
  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">My Profile</h1>
      <p className="mt-0.5 text-xs text-slate-500">Read-only. Ask an admin to change your details or access.</p>
    </div>
  )
}

function Footnote() {
  return <p className="pb-4 text-center text-xs text-slate-400">Read-only view · managed in Access Management and User Management</p>
}

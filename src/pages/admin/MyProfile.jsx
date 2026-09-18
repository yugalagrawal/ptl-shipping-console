import { useAuth } from '../../context/AuthContext.jsx'
import { LT_USERS } from '../../data/users.js'
import { ACCESS_LEVELS, TASKS_BY_MODULE, effectiveFunctions } from '../../data/permissions.js'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'

// Read-only chip list for one access tier — "All X" when the user has no
// restriction at that tier, same "empty = unrestricted" convention as
// Access Management, just rendered inert (no toggling) for a self-view.
function ScopeSummary({ label, unitPlural, values }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      {values.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {v}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-1.5 text-sm text-slate-400">All {unitPlural}</div>
      )}
    </div>
  )
}

function IdentityField({ label, children, span, truncate = true }) {
  return (
    <div className={span ? 'col-span-2' : undefined}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm text-slate-700 ${truncate ? 'truncate' : ''}`}>{children}</div>
    </div>
  )
}

export default function MyProfile() {
  const { user } = useAuth()

  if (!user || user.persona !== 'lt') {
    return <p className="text-sm text-slate-400">My Profile is only available for LT Team logins.</p>
  }

  const manager = LT_USERS.find((u) => u.email === user.managerEmail) ?? null
  const functionIds = effectiveFunctions(user)

  // Same "group by page, show every Access Level as a pill" shape as Access
  // Management's Tasks section — just inert chips instead of toggle buttons,
  // and modules with nothing granted are dropped instead of shown empty.
  const grantedTasksByModule = TASKS_BY_MODULE.map((g) => ({
    module: g.module,
    tasks: g.tasks.filter((t) => Object.values(t.levels).some((id) => functionIds.includes(id))),
  })).filter((g) => g.tasks.length)

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">My Profile</h1>
        <p className="mt-1 text-slate-500">
          Your identity, reporting line and access — read-only here. Reach out to whoever manages Access Management to change any of it.
        </p>
      </div>

      <div className={`space-y-6 p-6 ${card}`}>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div>
            <div className="font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-400">{user.roleLabel || 'No role preset applied'}</div>
          </div>
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identity</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3.5 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3.5 sm:grid-cols-4">
            <IdentityField label="First name">{user.firstName || '—'}</IdentityField>
            <IdentityField label="Last name">{user.lastName || '—'}</IdentityField>
            <IdentityField label="User email" span>{user.email}</IdentityField>
            <IdentityField label="Phone number" span truncate={false}>
              <span className="flex flex-wrap items-center gap-1.5">
                <span>{user.mobile || '—'}</span>
                {user.mobile && (
                  <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    user.phoneVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon name="approve" className="h-3 w-3" />
                    {user.phoneVerified ? 'Verified' : 'Not verified'}
                  </span>
                )}
              </span>
            </IdentityField>
            <IdentityField label="Manager">{manager ? manager.name : '—'}</IdentityField>
            <IdentityField label="Parent email" span>{user.parentEmail || '—'}</IdentityField>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Function</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(user.departments ?? []).length ? (
              user.departments.map((d) => (
                <span key={d} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {d}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No department set.</span>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role presets</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(user.roles ?? []).length ? (
              user.roles.map((r) => (
                <span key={r} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                  {r}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No role preset applied.</span>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasks</h3>
          <p className="mt-1 text-xs text-slate-400">What you can do on each page — highlighted pills are the Access Levels you've been granted.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grantedTasksByModule.map((g) => (
              <div key={g.module} className="rounded-xl border border-slate-200/70 p-3.5">
                <div className="border-b border-slate-100 pb-2 text-sm font-medium text-slate-700">{g.module}</div>
                <div className="mt-2.5 space-y-2.5">
                  {g.tasks.map((t) => (
                    <div key={t.id}>
                      <div className="text-sm text-slate-600">{t.label}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ACCESS_LEVELS.filter((level) => t.levels[level]).map((level) => {
                          const granted = functionIds.includes(t.levels[level])
                          return (
                            <span
                              key={level}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                granted ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'
                              }`}
                            >
                              {level}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!grantedTasksByModule.length && <p className="text-sm text-slate-400">No tasks granted yet.</p>}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Location access</h3>
          <p className="mt-1 text-xs text-slate-400">Region → Zone → Hub → Branch → Mini Hub, broadest to narrowest.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScopeSummary label="Region access" unitPlural="regions" values={user.regions ?? []} />
            <ScopeSummary label="Zone access" unitPlural="zones" values={user.zones ?? []} />
            <ScopeSummary label="Hub access" unitPlural="hubs" values={user.hubs ?? []} />
            <ScopeSummary label="Branch (Mini-Hub) access" unitPlural="mini hubs" values={user.miniHubs ?? []} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Geography Access</h3>
          <p className="mt-1 text-xs text-slate-400">State/UT → City → Pincode, plus Territory → Circle as a separate grouping.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ScopeSummary label="State/UT access" unitPlural="states/UTs" values={user.states ?? []} />
            <ScopeSummary label="City access" unitPlural="cities" values={user.cities ?? []} />
            <ScopeSummary label="Pincode access" unitPlural="pincodes" values={user.pincodes ?? []} />
            <ScopeSummary label="Territory access" unitPlural="territories" values={user.territories ?? []} />
            <ScopeSummary label="Circle access" unitPlural="circles" values={user.circles ?? []} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product tags</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(user.products ?? []).length ? (
              user.products.map((p) => (
                <span key={p} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  {p}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No products assigned yet.</span>
            )}
          </div>
        </section>
      </div>

      <p className="text-sm text-slate-400">
        Everything on this page — including your phone number — is set by whoever manages Access Management and User Management. This is a read-only view.
      </p>
    </div>
  )
}

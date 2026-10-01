import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MODULES, ADMIN_MODULE, SYSTEM_INFO_MODULE } from '../data/modules.js'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from './Icon.jsx'
import flowLogo from '../assets/flow-logo.svg'

function itemActiveClass(isActive) {
  return `group flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
  }`
}

export default function Sidebar() {
  const { can } = useAuth()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState({})

  useEffect(() => {
    const allGroups = [...MODULES, ADMIN_MODULE]
    const openKey = allGroups.find((m) => m.children?.some((c) => c.to && location.pathname.startsWith(c.to)))?.key
    if (openKey) setOpenGroups((g) => ({ ...g, [openKey]: true }))
  }, [location.pathname])

  const visibleModules = MODULES.map((m) => {
    const isExpandableGroup = m.children && !m.to
    if (isExpandableGroup) {
      const children = m.children.filter((c) => can(c.key))
      return children.length ? { ...m, children } : null
    }
    return can(m.key) ? m : null
  }).filter(Boolean)

  // My Profile is self-service and has no gating function at all — every LT
  // Team login sees their own. User Management (create/search users, the
  // full User List) is org-wide admin territory, gated normally by
  // user-relations.manage — no manager bypass anymore now that Delegate
  // Access (the one thing a plain manager used it for) is gone.
  const adminChildren = ADMIN_MODULE.children.filter((c) => c.key === 'my-profile' || can(c.key))
  const visibleAdminModule = adminChildren.length ? { ...ADMIN_MODULE, children: adminChildren } : null

  const visibleSystemInfo = can(SYSTEM_INFO_MODULE.key) ? SYSTEM_INFO_MODULE : null

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col bg-brand-navy text-slate-300">
      <div className="px-5 pt-4 pb-3">
        <img src={flowLogo} alt="FLOW by LetsTransport" className="h-auto w-[104px]" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {[...visibleModules, ...(visibleAdminModule ? [visibleAdminModule] : []), ...(visibleSystemInfo ? [visibleSystemInfo] : [])].map((m) => {
          if (!m.children || m.to) {
            return (
              <NavLink key={m.key} to={m.to} end={m.end} className={({ isActive }) => itemActiveClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-brand-orange-light' : 'text-slate-400 group-hover:text-slate-200'}>
                      <Icon name={m.icon} />
                    </span>
                    {m.label}
                  </>
                )}
              </NavLink>
            )
          }

          const isOpen = !!openGroups[m.key]
          const groupHasActive = m.children.some((c) => c.to && location.pathname.startsWith(c.to))

          return (
            <div key={m.key}>
              <button
                type="button"
                onClick={() => setOpenGroups((g) => ({ ...g, [m.key]: !g[m.key] }))}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  groupHasActive ? 'text-white' : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={groupHasActive ? 'text-brand-orange-light' : 'text-slate-400'}>
                  <Icon name={m.icon} />
                </span>
                <span className="flex-1 text-left font-medium">{m.label}</span>
                <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <Icon name="chevron" className="h-3.5 w-3.5 text-slate-500" />
                </span>
              </button>
              {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {m.children.map((c) => (
                    <NavLink key={c.key} to={c.to} className={({ isActive }) => itemActiveClass(isActive)}>
                      {({ isActive }) => (
                        <>
                          <span className={isActive ? 'text-brand-orange-light' : 'text-slate-500 group-hover:text-slate-300'}>
                            <Icon name={c.icon} className="h-4 w-4" />
                          </span>
                          <span className="text-[13px]">{c.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

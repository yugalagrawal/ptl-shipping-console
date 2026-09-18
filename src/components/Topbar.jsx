import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from './Icon.jsx'
import Avatar from './Avatar.jsx'
import MasterSearch from './MasterSearch.jsx'

export default function Topbar() {
  const { user, logout } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="flex h-16 items-center border-b border-slate-200/70 bg-white">
      <div className="flex h-full w-full items-center gap-2 bg-brand-navy p-1.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2.5 bg-white/10 px-3.5 py-2 text-left transition-colors hover:bg-white/15"
        >
          <Icon name="search" className="h-4 w-4 shrink-0 text-slate-300" />
          <span className="min-w-0 flex-1 truncate text-sm text-slate-300">Search anything — pages, modules, rules, actions…</span>
          <kbd className="shrink-0 border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
            ⌘K
          </kbd>
        </button>

        <div className="h-7 w-px shrink-0 bg-white/10" />

        <button
          type="button"
          className="relative shrink-0 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon name="bell" className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-orange" />
        </button>

        <div className="h-7 w-px shrink-0 bg-white/10" />

        <div className="flex shrink-0 items-center gap-2.5 px-2">
          <Avatar name={user?.name ?? '?'} size="sm" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-medium text-white">{user?.name}</div>
            <div className="truncate text-[11px] text-slate-400">
              {user?.roleLabel ?? (user?.persona === 'partner' ? 'Partner' : 'Client')}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          title="Log out"
          className="shrink-0 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" className="h-4 w-4" />
        </button>
      </div>

      <MasterSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}

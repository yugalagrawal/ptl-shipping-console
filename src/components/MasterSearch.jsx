import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { SEARCH_REGISTRY, KIND_ORDER, KIND_LABELS, KIND_BADGE, canAccess, matchItem } from '../data/searchRegistry.js'
import Icon from './Icon.jsx'

export default function MasterSearch({ open, onClose }) {
  const { can, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [restricted, setRestricted] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setRestricted(null)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const groups = useMemo(() => {
    const q = query.trim()
    const pool = q ? SEARCH_REGISTRY : SEARCH_REGISTRY.filter((i) => i.kind === 'nav')
    const matched = pool.filter((item) => matchItem(item, q))
    return KIND_ORDER.map((kind) => ({
      kind,
      items: matched.filter((i) => i.kind === kind),
    })).filter((g) => g.items.length > 0)
  }, [query])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  function handleSelect(item) {
    if (!canAccess(item, can)) {
      setRestricted(item)
      return
    }
    if (item.run === 'logout') {
      logout()
      onClose()
      return
    }
    navigate(item.path)
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (restricted) setRestricted(null)
      else onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[activeIndex]
      if (item) handleSelect(item)
    }
  }

  if (!open) return null

  let runningIndex = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 px-4 pt-24 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
              setRestricted(null)
            }}
            placeholder="Search anything — pages, modules, rules, actions…"
            className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
          <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        {restricted && (
          <div className="flex items-start gap-2.5 border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="mt-0.5">🔒</span>
            <div className="flex-1">
              <span className="font-medium">"{restricted.title}"</span> isn't available for your current role. Switch
              users on the login screen, or ask an admin to grant <code className="text-xs">{restricted.permissionKey}</code>.
            </div>
            <button type="button" onClick={() => setRestricted(null)} className="text-rose-400 hover:text-rose-600">
              ✕
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {groups.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-400">No results for "{query}"</div>
          )}
          {groups.map((group) => (
            <div key={group.kind} className="px-2 py-1.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {KIND_LABELS[group.kind]}
              </div>
              {group.items.map((item) => {
                runningIndex += 1
                const idx = runningIndex
                const accessible = canAccess(item, can)
                const badge = KIND_BADGE[item.kind]
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                      idx === activeIndex ? 'bg-slate-50' : ''
                    } ${!accessible ? 'opacity-50' : ''}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{item.title}</span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-slate-400">{item.subtitle}</span>
                      )}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {!accessible && (
                      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-500">
                        🔒 No access
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}

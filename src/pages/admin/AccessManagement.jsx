import { Fragment, useMemo, useState } from 'react'
import { LT_USERS } from '../../data/users.js'
import {
  TASKS, TASKS_BY_MODULE, ROLE_NAMES, ZONES, BRANCH_MINI_HUBS,
  zonesForRegions, hubsForZones, branchesForHubs,
  zonesUnderRegions, hubsUnderZones, miniHubsUnderHubs,
  functionsForRoles, effectiveFunctions,
  DEPARTMENTS, rolesForDepartments, ACCESS_LEVELS,
  STATES, citiesForStates, pincodesForCities, citiesUnderStates, pincodesUnderCities,
  TERRITORIES, circlesForTerritories, circlesUnderTerritories,
} from '../../data/permissions.js'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { card, thCls, tdCls, rowCls, btnPrimary, btnSecondary, pillActive, pillInactive } from '../../components/ui.js'

// Icon for each Tasks-table module header row — same icon each module uses
// in the sidebar (data/modules.js), keyed by the module name string used in
// FUNCTIONS/TASKS_BY_MODULE (permissions.js), which doesn't otherwise carry
// an icon of its own.
const MODULE_ICON = {
  Birdview: 'dashboard',
  'Client Module': 'building',
  'Partner Module': 'partner',
  'Pickup Module': 'order',
  'Docket Module': 'invoice',
  'Trip Module': 'trip',
  'Supply & Fleet Module': 'supply',
  'Warehouse & Hub Ops': 'warehouse',
  'Network Simulator': 'route',
  'Finance Management': 'finance',
  'Costing Module': 'costing',
  'Logic Engine': 'logic',
  Admin: 'shield',
  'System Info': 'info',
}

// A task starts "unlocked" (its Read Only/Edit/Approve/Create checkboxes are
// live/editable) if it already has at least one level granted — a task with
// nothing granted starts locked/greyed out, same as a brand-new task would
// be. This is a derived starting point only; unlockedTasks then tracks its
// own state independent of functions once the admin starts toggling locks.
function unlockedTasksFromFunctions(functions) {
  return TASKS.filter((t) => Object.values(t.levels).some((id) => functions.includes(id))).map((t) => t.id)
}

function draftFromUser(user) {
  const functions = effectiveFunctions(user)
  return {
    departments: [...(user.departments ?? [])],
    roles: [...(user.roles ?? [])],
    functions,
    unlockedTasks: unlockedTasksFromFunctions(functions),
    regions: [...(user.regions ?? [])],
    zones: [...(user.zones ?? [])],
    hubs: [...(user.hubs ?? [])],
    miniHubs: [...(user.miniHubs ?? [])],
    states: [...(user.states ?? [])],
    cities: [...(user.cities ?? [])],
    pincodes: [...(user.pincodes ?? [])],
    territories: [...(user.territories ?? [])],
    circles: [...(user.circles ?? [])],
  }
}

function isCustomDraft(draft) {
  const derived = functionsForRoles(draft.roles).sort().join(',')
  return derived !== [...draft.functions].sort().join(',')
}

// Shared widget for one tier of the Zone > Hub > City > Mini Hub access
// chain — same absolute-panel-with-checkboxes pattern used everywhere else
// in this app, generalized so the 4 tiers don't each need their own ~50-line
// copy. `items` is a flat list of `{ group, value }`; consecutive items with
// the same `group` collapse under one header (pass `group: null` when a
// tier has no parent to group by, e.g. Zone). Includes its own type-to-search
// box (Yugal's ask) that filters by value or group text — the panel opens
// with the box empty and full list showing every time, not the last search.
function ScopeDropdown({ label, hint, unit, unitPlural, items, selected, onToggle, onReset, open, onOpenChange }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter(({ group, value }) => value.toLowerCase().includes(q) || group?.toLowerCase().includes(q)) : items
  let lastGroup = undefined
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h3>
      <p className="mt-1 min-h-[2rem] text-xs text-slate-400">{hint}</p>
      <div className="relative mt-3">
        <button
          type="button"
          onClick={() => { onOpenChange(!open); setQuery('') }}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>
            {selected.length ? `${selected.length} ${selected.length === 1 ? unit : unitPlural} selected` : `Default: All ${unitPlural}`}
          </span>
          <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
            <div className="absolute bottom-full z-20 mb-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-soft">
              <div className="sticky top-0 z-10 bg-white px-2 pb-1.5 pt-1">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${unitPlural}…`}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
              </div>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="block w-full border-b border-slate-100 px-3.5 py-2 text-left text-xs font-medium text-brand-orange-dark hover:bg-slate-50"
                >
                  Reset to default (all {unitPlural})
                </button>
              )}
              {filtered.map(({ group, value }) => {
                const showGroupHeader = group != null && group !== lastGroup
                lastGroup = group
                return (
                  <div key={value}>
                    {showGroupHeader && (
                      <div className="bg-slate-50 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group}</div>
                    )}
                    <label className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(value)}
                        onChange={() => onToggle(value)}
                        className="h-3.5 w-3.5 rounded accent-brand-orange"
                      />
                      {value}
                    </label>
                  </div>
                )
              })}
              {!filtered.length && <p className="px-3.5 py-2.5 text-xs text-slate-400">{q ? 'No matches.' : 'Nothing here yet.'}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Branch Access's own widget — three visual levels in one dropdown: Hub is a
// plain-text group header (like Region/Zone/City groupings elsewhere in this
// file), Branch is its own row with a master checkbox (checked/indeterminate
// computed from its own Mini Hubs, same pattern as the module-group
// checkboxes in the Tasks section) plus an expand/collapse chevron, and Mini
// Hub is the real leaf checkbox — only shown once its Branch is expanded, so
// a Hub with many branches doesn't dump every leaf checkbox on screen at
// once.
function BranchMiniHubDropdown({ items, selectedMiniHubs, onToggleBranchGroup, onToggleMiniHub, onReset, open, onOpenChange }) {
  const [expandedBranches, setExpandedBranches] = useState([])
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  function toggleExpanded(branch) {
    setExpandedBranches((list) => (list.includes(branch) ? list.filter((b) => b !== branch) : [...list, branch]))
  }

  // Search matches Hub, Branch, or any of its Mini Hubs (Yugal's ask — the
  // filter should reach all 3 levels shown in this one dropdown). A branch
  // survives the filter if it or its Hub matches directly, or if at least
  // one of its own Mini Hubs matches; while a query is active, every
  // surviving branch force-expands so a Mini-Hub-only match is actually
  // visible without an extra click, overriding manual expand/collapse.
  const filtered = !q
    ? items
    : items.filter(({ hub, branch }) => {
        if (hub.toLowerCase().includes(q) || branch.toLowerCase().includes(q)) return true
        return (BRANCH_MINI_HUBS[branch] ?? []).some((m) => m.toLowerCase().includes(q))
      })

  let lastHub = undefined
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Branch (Mini-Hub) access</h3>
      <p className="mt-1 min-h-[2rem] text-xs text-slate-400">Default is every branch.</p>
      <div className="relative mt-3">
        <button
          type="button"
          onClick={() => { onOpenChange(!open); setQuery('') }}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          <span className={selectedMiniHubs.length ? 'text-slate-800' : 'text-slate-400'}>
            {selectedMiniHubs.length ? `${selectedMiniHubs.length} mini hub${selectedMiniHubs.length === 1 ? '' : 's'} selected` : 'Default: All mini hubs'}
          </span>
          <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
            <div className="absolute bottom-full z-20 mb-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-soft">
              <div className="sticky top-0 z-10 bg-white px-2 pb-1.5 pt-1">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search hub, branch or mini hub…"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
              </div>
              {selectedMiniHubs.length > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="block w-full border-b border-slate-100 px-3.5 py-2 text-left text-xs font-medium text-brand-orange-dark hover:bg-slate-50"
                >
                  Reset to default (all mini hubs)
                </button>
              )}
              {filtered.map(({ hub, branch }) => {
                const showHubHeader = hub !== lastHub
                lastHub = hub
                const miniHubs = BRANCH_MINI_HUBS[branch] ?? []
                const checkedCount = miniHubs.filter((m) => selectedMiniHubs.includes(m)).length
                const allChecked = miniHubs.length > 0 && checkedCount === miniHubs.length
                const someChecked = checkedCount > 0 && !allChecked
                const expanded = q ? true : expandedBranches.includes(branch)
                return (
                  <div key={branch}>
                    {showHubHeader && (
                      <div className="bg-slate-50 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{hub}</div>
                    )}
                    <div className="flex items-center gap-1 pl-3.5 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(branch)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                      >
                        <Icon name="chevron" className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      <label className="flex flex-1 items-center gap-2 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => el && (el.indeterminate = someChecked)}
                          onChange={(e) => onToggleBranchGroup(branch, e.target.checked)}
                          className="h-3.5 w-3.5 rounded accent-brand-orange"
                        />
                        {branch}
                      </label>
                    </div>
                    {expanded && miniHubs
                      .filter((miniHub) => !q || hub.toLowerCase().includes(q) || branch.toLowerCase().includes(q) || miniHub.toLowerCase().includes(q))
                      .map((miniHub) => (
                        <label key={miniHub} className="flex items-center gap-2 px-3.5 py-2 pl-12 text-sm text-slate-700 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={selectedMiniHubs.includes(miniHub)}
                            onChange={() => onToggleMiniHub(miniHub)}
                            className="h-3.5 w-3.5 rounded accent-brand-orange"
                          />
                          {miniHub}
                        </label>
                      ))}
                  </div>
                )
              })}
              {!filtered.length && <p className="px-3.5 py-2.5 text-xs text-slate-400">{q ? 'No matches.' : 'Nothing here yet.'}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AccessManagement() {
  const [users, setUsers] = useState(LT_USERS)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [draft, setDraft] = useState(null)
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false)
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false)
  const [hubDropdownOpen, setHubDropdownOpen] = useState(false)
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false)
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [pincodeDropdownOpen, setPincodeDropdownOpen] = useState(false)
  const [territoryDropdownOpen, setTerritoryDropdownOpen] = useState(false)
  const [circleDropdownOpen, setCircleDropdownOpen] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [collapsedModules, setCollapsedModules] = useState([])

  function toggleModuleCollapse(moduleName) {
    setCollapsedModules((list) => (list.includes(moduleName) ? list.filter((m) => m !== moduleName) : [...list, moduleName]))
  }

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  const selectedUser = users.find((u) => u.email === selectedEmail) ?? null

  function selectUser(user) {
    setSelectedEmail(user.email)
    setDraft(draftFromUser(user))
    setRegionDropdownOpen(false)
    setZoneDropdownOpen(false)
    setHubDropdownOpen(false)
    setBranchDropdownOpen(false)
    setStateDropdownOpen(false)
    setCityDropdownOpen(false)
    setPincodeDropdownOpen(false)
    setTerritoryDropdownOpen(false)
    setCircleDropdownOpen(false)
    setTaskSearch('')
    setCollapsedModules([])
    setQuery('')
    setSearchOpen(false)
  }

  // Function/department is multi-select (a person can sit in more than one).
  // Removing one prunes any picked roles that no longer belong to any
  // selected department — same "clearing a broader pick drops narrower picks
  // that no longer make sense" convention as the Zone > Hub > City > Mini Hub
  // cascade below.
  // Whenever `functions` changes through a path other than the Tasks table
  // itself (role/department presets), any task that ends up with a grant
  // must show as unlocked — otherwise its now-checked levels would render
  // disabled/locked, which would look broken. Only ever grows the unlocked
  // set here; it never re-locks a task just because a role change dropped
  // its grants (that's still a real, if now-empty, unlocked row).
  function withFunctions(d, functions) {
    return { ...d, functions, unlockedTasks: [...new Set([...d.unlockedTasks, ...unlockedTasksFromFunctions(functions)])] }
  }

  function toggleDepartment(department) {
    setDraft((d) => {
      const has = d.departments.includes(department)
      const departments = has ? d.departments.filter((x) => x !== department) : [...d.departments, department]
      const allowedRoles = departments.length ? rolesForDepartments(departments) : ROLE_NAMES
      const roles = d.roles.filter((r) => allowedRoles.includes(r))
      return withFunctions({ ...d, departments, roles }, functionsForRoles(roles))
    })
  }

  function toggleRole(roleName) {
    setDraft((d) => {
      const hasRole = d.roles.includes(roleName)
      if (hasRole) {
        const roles = d.roles.filter((r) => r !== roleName)
        return withFunctions({ ...d, roles }, functionsForRoles(roles))
      }
      const roles = [...d.roles, roleName]
      const merged = new Set([...d.functions, ...functionsForRoles([roleName])])
      return withFunctions({ ...d, roles }, [...merged])
    })
  }

  function toggleFunction(id) {
    setDraft((d) => {
      const has = d.functions.includes(id)
      return { ...d, functions: has ? d.functions.filter((f) => f !== id) : [...d.functions, id] }
    })
  }

  // A task's own checkbox — the master lock for that row. Unlocking just
  // opens up its Read Only/Edit/Approve/Create cells for editing (starts
  // empty); locking clears whatever levels were granted and greys the row
  // out again, per Yugal's ask ("if a task is unchecked its ... line won't
  // get filled").
  function toggleTaskLock(task) {
    setDraft((d) => {
      const isUnlocked = d.unlockedTasks.includes(task.id)
      if (isUnlocked) {
        const ids = Object.values(task.levels)
        return {
          ...d,
          unlockedTasks: d.unlockedTasks.filter((id) => id !== task.id),
          functions: d.functions.filter((f) => !ids.includes(f)),
        }
      }
      return { ...d, unlockedTasks: [...d.unlockedTasks, task.id] }
    })
  }

  // Module header's own checkbox — unlocks/locks every task in that module
  // at once; each task's own checkbox still overrides it individually
  // afterward.
  function toggleModuleUnlock(group, unlockAll) {
    setDraft((d) => {
      const taskIds = group.tasks.map((t) => t.id)
      if (unlockAll) {
        return { ...d, unlockedTasks: [...new Set([...d.unlockedTasks, ...taskIds])] }
      }
      const levelIds = group.tasks.flatMap((t) => Object.values(t.levels))
      return {
        ...d,
        unlockedTasks: d.unlockedTasks.filter((id) => !taskIds.includes(id)),
        functions: d.functions.filter((f) => !levelIds.includes(f)),
      }
    })
  }

  // One column's header checkbox (Read Only / Edit / Approve / Create) —
  // grants or revokes that single level across every currently-unlocked,
  // currently-visible (search-filtered) task at once. Replaces the old
  // separate "Bulk apply" toolbar; locked tasks are skipped since their
  // cells aren't editable regardless.
  function toggleColumnLevel(level, checkAll, visibleGroups) {
    setDraft((d) => {
      const ids = visibleGroups
        .flatMap((g) => g.tasks)
        .filter((t) => d.unlockedTasks.includes(t.id))
        .map((t) => t.levels[level])
        .filter(Boolean)
      const functions = checkAll
        ? [...new Set([...d.functions, ...ids])]
        : d.functions.filter((f) => !ids.includes(f))
      return { ...d, functions }
    })
  }

  // Turning a broader tier ON now auto-checks everything under it, all the
  // way down to Mini Hub (Yugal's ask: picking a Region should visibly
  // check its Zones, which checks their Hub + every Mini Hub) instead of
  // just leaving narrower tiers unrestricted — still fully overridable by
  // unchecking individual narrower items after. Turning a broader tier OFF
  // still prunes whatever narrower picks only made sense under it, same
  // convention as before. Branch itself isn't stored (see
  // `BranchMiniHubDropdown`) — cascades skip straight from Hub to Mini Hub.
  function toggleRegion(region) {
    setDraft((d) => {
      const has = d.regions.includes(region)
      if (has) {
        const regions = d.regions.filter((r) => r !== region)
        const droppedZones = zonesUnderRegions([region])
        const zones = d.zones.filter((z) => !droppedZones.includes(z))
        const droppedHubs = hubsUnderZones(droppedZones)
        const hubs = d.hubs.filter((h) => !droppedHubs.includes(h))
        const droppedMiniHubs = miniHubsUnderHubs(droppedHubs)
        const miniHubs = d.miniHubs.filter((m) => !droppedMiniHubs.includes(m))
        return { ...d, regions, zones, hubs, miniHubs }
      }
      const regions = [...d.regions, region]
      const newZones = zonesUnderRegions([region])
      const zones = [...new Set([...d.zones, ...newZones])]
      const newHubs = hubsUnderZones(newZones)
      const hubs = [...new Set([...d.hubs, ...newHubs])]
      const newMiniHubs = miniHubsUnderHubs(newHubs)
      const miniHubs = [...new Set([...d.miniHubs, ...newMiniHubs])]
      return { ...d, regions, zones, hubs, miniHubs }
    })
  }

  function toggleZone(zone) {
    setDraft((d) => {
      const has = d.zones.includes(zone)
      if (has) {
        const zones = d.zones.filter((z) => z !== zone)
        const droppedHubs = hubsUnderZones([zone])
        const hubs = d.hubs.filter((h) => !droppedHubs.includes(h))
        const droppedMiniHubs = miniHubsUnderHubs(droppedHubs)
        const miniHubs = d.miniHubs.filter((m) => !droppedMiniHubs.includes(m))
        return { ...d, zones, hubs, miniHubs }
      }
      const zones = [...d.zones, zone]
      const newHubs = hubsUnderZones([zone])
      const hubs = [...new Set([...d.hubs, ...newHubs])]
      const newMiniHubs = miniHubsUnderHubs(newHubs)
      const miniHubs = [...new Set([...d.miniHubs, ...newMiniHubs])]
      return { ...d, zones, hubs, miniHubs }
    })
  }

  function toggleHub(hub) {
    setDraft((d) => {
      const has = d.hubs.includes(hub)
      if (has) {
        const hubs = d.hubs.filter((h) => h !== hub)
        const droppedMiniHubs = miniHubsUnderHubs([hub])
        const miniHubs = d.miniHubs.filter((m) => !droppedMiniHubs.includes(m))
        return { ...d, hubs, miniHubs }
      }
      const hubs = [...d.hubs, hub]
      const newMiniHubs = miniHubsUnderHubs([hub])
      const miniHubs = [...new Set([...d.miniHubs, ...newMiniHubs])]
      return { ...d, hubs, miniHubs }
    })
  }

  // Branch header's own master checkbox — checks/unchecks every Mini Hub
  // under that one Branch at once.
  function toggleBranchGroup(branch, checkAll) {
    setDraft((d) => {
      const ids = BRANCH_MINI_HUBS[branch] ?? []
      const miniHubs = checkAll
        ? [...new Set([...d.miniHubs, ...ids])]
        : d.miniHubs.filter((m) => !ids.includes(m))
      return { ...d, miniHubs }
    })
  }

  function toggleMiniHub(miniHub) {
    setDraft((d) => {
      const has = d.miniHubs.includes(miniHub)
      return { ...d, miniHubs: has ? d.miniHubs.filter((m) => m !== miniHub) : [...d.miniHubs, miniHub] }
    })
  }

  // Geography Access's State > City > Pincode cascade — same auto-check-down
  // / prune-on-clear convention as Region > Zone > Hub > Mini Hub above, just
  // one tier shallower on its narrow end (Pincode is the leaf, no tier below
  // it).
  function toggleState(state) {
    setDraft((d) => {
      const has = d.states.includes(state)
      if (has) {
        const states = d.states.filter((s) => s !== state)
        const droppedCities = citiesUnderStates([state])
        const cities = d.cities.filter((c) => !droppedCities.includes(c))
        const droppedPincodes = pincodesUnderCities(droppedCities)
        const pincodes = d.pincodes.filter((p) => !droppedPincodes.includes(p))
        return { ...d, states, cities, pincodes }
      }
      const states = [...d.states, state]
      const newCities = citiesUnderStates([state])
      const cities = [...new Set([...d.cities, ...newCities])]
      const newPincodes = pincodesUnderCities(newCities)
      const pincodes = [...new Set([...d.pincodes, ...newPincodes])]
      return { ...d, states, cities, pincodes }
    })
  }

  function toggleCity(city) {
    setDraft((d) => {
      const has = d.cities.includes(city)
      if (has) {
        const cities = d.cities.filter((c) => c !== city)
        const droppedPincodes = pincodesUnderCities([city])
        const pincodes = d.pincodes.filter((p) => !droppedPincodes.includes(p))
        return { ...d, cities, pincodes }
      }
      const cities = [...d.cities, city]
      const newPincodes = pincodesUnderCities([city])
      const pincodes = [...new Set([...d.pincodes, ...newPincodes])]
      return { ...d, cities, pincodes }
    })
  }

  function togglePincode(pincode) {
    setDraft((d) => {
      const has = d.pincodes.includes(pincode)
      return { ...d, pincodes: has ? d.pincodes.filter((p) => p !== pincode) : [...d.pincodes, pincode] }
    })
  }

  // Territory > Circle — its own, independent cascade (doesn't touch
  // State/City/Pincode and vice versa).
  function toggleTerritory(territory) {
    setDraft((d) => {
      const has = d.territories.includes(territory)
      if (has) {
        const territories = d.territories.filter((t) => t !== territory)
        const droppedCircles = circlesUnderTerritories([territory])
        const circles = d.circles.filter((c) => !droppedCircles.includes(c))
        return { ...d, territories, circles }
      }
      const territories = [...d.territories, territory]
      const newCircles = circlesUnderTerritories([territory])
      const circles = [...new Set([...d.circles, ...newCircles])]
      return { ...d, territories, circles }
    })
  }

  function toggleCircle(circle) {
    setDraft((d) => {
      const has = d.circles.includes(circle)
      return { ...d, circles: has ? d.circles.filter((c) => c !== circle) : [...d.circles, circle] }
    })
  }

  function handleSave() {
    if (!selectedUser || !draft) return
    const custom = isCustomDraft(draft)
    const patch = {
      departments: draft.departments,
      roles: draft.roles,
      regions: draft.regions,
      zones: draft.zones,
      hubs: draft.hubs,
      miniHubs: draft.miniHubs,
      states: draft.states,
      cities: draft.cities,
      pincodes: draft.pincodes,
      territories: draft.territories,
      circles: draft.circles,
      functionOverrides: custom ? draft.functions : null,
    }
    // Mutate the shared LT_USERS record in place (not just local state) so a
    // later login as this person — e.g. after switching identities to check
    // the result — picks up the change. Every other mock-data edit in this
    // prototype is local-only, but this page's whole point is "change
    // someone's access, then see their session reflect it."
    const target = LT_USERS.find((u) => u.email === selectedUser.email)
    if (target) Object.assign(target, patch)
    setUsers((list) => list.map((u) => (u.email === selectedUser.email ? { ...u, ...patch } : u)))
  }

  function handleRevert() {
    if (!selectedUser) return
    setDraft(draftFromUser(selectedUser))
  }

  const custom = draft ? isCustomDraft(draft) : false
  const isDirty = draft && selectedUser && JSON.stringify(draft) !== JSON.stringify(draftFromUser(selectedUser))

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Access Management</h1>
        <p className="mt-1 text-slate-500">Function, role presets, task-level access, and region/zone/hub/branch access for the LT Team login.</p>
      </div>

      <div className="relative max-w-md">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-soft focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
          <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
            placeholder="Search a team member by name or email…"
            className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        {searchOpen && query.trim() && (
          <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-soft">
            {filteredUsers.map((u) => {
              const fns = effectiveFunctions(u)
              const custom = fns.sort().join(',') !== functionsForRoles(u.roles ?? []).sort().join(',')
              return (
                <button
                  key={u.email}
                  type="button"
                  onMouseDown={() => selectUser(u)}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{u.name}</div>
                    <div className="truncate text-xs text-slate-400">{u.email}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {(u.roles ?? []).map((r) => (
                        <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {r}
                        </span>
                      ))}
                      {custom && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Custom</span>
                      )}
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        {(u.regions ?? []).length ? `${u.regions.length} ${u.regions.length === 1 ? 'region' : 'regions'}` : 'All regions'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
            {!filteredUsers.length && <p className="px-3.5 py-2.5 text-sm text-slate-400">No matching users.</p>}
          </div>
        )}
      </div>

      {!selectedUser && (
        <p className="text-sm text-slate-400">Pick a user to change/edit access permissions.</p>
      )}

      {selectedUser && draft && (
        <div className={`space-y-6 p-6 ${card}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={selectedUser.name} />
              <div>
                <div className="font-medium text-slate-800">{selectedUser.name}</div>
                <div className="text-xs text-slate-400">{selectedUser.email}</div>
              </div>
              {custom && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                  Custom permissions
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleRevert} disabled={!isDirty} className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}>
                Revert
              </button>
              <button type="button" onClick={handleSave} disabled={!isDirty} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
                Save permissions
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3.5 sm:grid-cols-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Name</div>
              <div className="mt-0.5 text-sm text-slate-700">
                {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || '—'}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Phone number</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-700">
                <span>{selectedUser.mobile || '—'}</span>
                {selectedUser.mobile && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    selectedUser.phoneVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon name="approve" className="h-3 w-3" />
                    {selectedUser.phoneVerified ? 'Verified' : 'Not verified'}
                  </span>
                )}
                <span className="group relative inline-flex">
                  <Icon name="info" className="h-3.5 w-3.5 cursor-help text-slate-300" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    A verified tick means this phone number is OTP verified.
                  </span>
                </span>
              </div>
            </div>
          </div>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Function</h3>
            <p className="mt-1 text-xs text-slate-400">Which department(s) this person sits in — narrows the Role Presets below to those departments' roles. Pick more than one if it applies.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDepartment(dept)}
                  className={draft.departments.includes(dept) ? pillActive : pillInactive}
                >
                  {dept}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role presets</h3>
            <p className="mt-1 text-xs text-slate-400">
              {draft.departments.length
                ? `Showing roles for ${draft.departments.join(', ')}. Applying a role adds its tasks on top of what's already assigned; removing one recomputes tasks from the roles that remain.`
                : "Pick a Function above to see its role presets."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(draft.departments.length ? rolesForDepartments(draft.departments) : ROLE_NAMES).map((roleName) => (
                <button
                  key={roleName}
                  type="button"
                  onClick={() => toggleRole(roleName)}
                  className={draft.roles.includes(roleName) ? pillActive : pillInactive}
                >
                  {roleName}
                </button>
              ))}
              {draft.departments.length > 0 && !rolesForDepartments(draft.departments).length && (
                <span className="text-sm text-slate-400">No role presets in these departments yet.</span>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasks</h3>
            <p className="mt-1 text-xs text-slate-400">
              Click a module to expand it. A task's own checkbox unlocks its Read Only/Edit/Approve/Create cells for editing — leave it unchecked
              and the row stays locked/greyed out with nothing granted. The header checkbox above each level column grants (or revokes) that one
              level across every unlocked task at once.
            </p>

            <div className="relative mt-3 max-w-sm">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks or modules…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>

            {(() => {
              const q = taskSearch.trim().toLowerCase()
              const visibleGroups = !q
                ? TASKS_BY_MODULE
                : TASKS_BY_MODULE.map((group) => ({
                    ...group,
                    tasks: group.module.toLowerCase().includes(q) ? group.tasks : group.tasks.filter((t) => t.label.toLowerCase().includes(q)),
                  })).filter((group) => group.tasks.length > 0)

              if (!visibleGroups.length) {
                return <p className={`mt-3 p-6 text-center text-sm text-slate-400 ${card}`}>No tasks or modules match "{taskSearch}".</p>
              }

              return (
                <div className={`mt-3 overflow-hidden ${card}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className={thCls}>Module / Task</th>
                        {ACCESS_LEVELS.map((level) => {
                          const unlockedIds = visibleGroups
                            .flatMap((g) => g.tasks)
                            .filter((t) => draft.unlockedTasks.includes(t.id))
                            .map((t) => t.levels[level])
                            .filter(Boolean)
                          const allChecked = unlockedIds.length > 0 && unlockedIds.every((id) => draft.functions.includes(id))
                          const someChecked = !allChecked && unlockedIds.some((id) => draft.functions.includes(id))
                          return (
                            <th key={level} className={thCls}>
                              <div className="flex flex-col items-center gap-1">
                                <span>{level}</span>
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  disabled={unlockedIds.length === 0}
                                  ref={(el) => el && (el.indeterminate = someChecked)}
                                  onChange={(e) => toggleColumnLevel(level, e.target.checked, visibleGroups)}
                                  className="h-3.5 w-3.5 rounded accent-brand-orange disabled:cursor-not-allowed disabled:opacity-30"
                                />
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleGroups.map((group) => {
                        const taskIds = group.tasks.map((t) => t.id)
                        const unlockedCount = taskIds.filter((id) => draft.unlockedTasks.includes(id)).length
                        const allUnlocked = unlockedCount === taskIds.length
                        const someUnlocked = unlockedCount > 0 && !allUnlocked
                        const collapsed = q ? false : collapsedModules.includes(group.module)
                        return (
                          <Fragment key={group.module}>
                            <tr
                              className="cursor-pointer border-t border-slate-100 bg-indigo-50/50 hover:bg-indigo-50"
                              onClick={() => toggleModuleCollapse(group.module)}
                            >
                              <td colSpan={1 + ACCESS_LEVELS.length} className="px-4 py-2.5">
                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                  <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                                  <input
                                    type="checkbox"
                                    checked={allUnlocked}
                                    ref={(el) => el && (el.indeterminate = someUnlocked)}
                                    onChange={(e) => toggleModuleUnlock(group, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-3.5 w-3.5 shrink-0 rounded accent-brand-orange"
                                  />
                                  <Icon name={MODULE_ICON[group.module] ?? 'grid'} className="h-4 w-4 shrink-0 text-slate-500" />
                                  {group.module}
                                </div>
                              </td>
                            </tr>
                            {!collapsed &&
                              group.tasks.map((task) => {
                                const isUnlocked = draft.unlockedTasks.includes(task.id)
                                return (
                                  <tr key={task.id} className={`${rowCls} ${isUnlocked ? '' : 'bg-slate-50/60'}`}>
                                    <td className={`${tdCls} whitespace-normal pl-9`}>
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isUnlocked}
                                          onChange={() => toggleTaskLock(task)}
                                          className="h-4 w-4 rounded accent-brand-orange"
                                        />
                                        <span className={isUnlocked ? 'text-slate-700' : 'text-slate-400'}>{task.label}</span>
                                      </label>
                                    </td>
                                    {ACCESS_LEVELS.map((level) => {
                                      const fnId = task.levels[level]
                                      const checked = draft.functions.includes(fnId)
                                      return (
                                        <td key={level} className={`${tdCls} text-center`}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!isUnlocked}
                                            onChange={() => toggleFunction(fnId)}
                                            className="h-4 w-4 rounded accent-brand-orange disabled:cursor-not-allowed disabled:opacity-20"
                                          />
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Location access</h3>
            <p className="mt-1 text-xs text-slate-400">
              Region → Zone → Hub → Branch → Mini Hub, broadest to narrowest. Picking a broader tier auto-checks everything under it — uncheck individual items below if you need to narrow further.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ScopeDropdown
                label="Region access"
                hint="Default is every region."
                unit="region"
                unitPlural="regions"
                items={ZONES.map((z) => ({ group: null, value: z }))}
                selected={draft.regions}
                onToggle={toggleRegion}
                onReset={() => setDraft((d) => ({ ...d, regions: [], zones: [], hubs: [], miniHubs: [] }))}
                open={regionDropdownOpen}
                onOpenChange={setRegionDropdownOpen}
              />
              <ScopeDropdown
                label="Zone access"
                hint={`Default is every zone${draft.regions.length ? ' within the regions above' : ''}.`}
                unit="zone"
                unitPlural="zones"
                items={zonesForRegions(draft.regions).map(({ region, zone }) => ({ group: region, value: zone }))}
                selected={draft.zones}
                onToggle={toggleZone}
                onReset={() => setDraft((d) => ({ ...d, zones: [], hubs: [], miniHubs: [] }))}
                open={zoneDropdownOpen}
                onOpenChange={setZoneDropdownOpen}
              />
              <ScopeDropdown
                label="Hub access"
                hint={`Default is every hub${draft.zones.length ? ' within the zones above' : ''}.`}
                unit="hub"
                unitPlural="hubs"
                items={hubsForZones(draft.zones).map(({ zone, hub }) => ({ group: zone, value: hub }))}
                selected={draft.hubs}
                onToggle={toggleHub}
                onReset={() => setDraft((d) => ({ ...d, hubs: [], miniHubs: [] }))}
                open={hubDropdownOpen}
                onOpenChange={setHubDropdownOpen}
              />
              <BranchMiniHubDropdown
                items={branchesForHubs(draft.hubs)}
                selectedMiniHubs={draft.miniHubs}
                onToggleBranchGroup={toggleBranchGroup}
                onToggleMiniHub={toggleMiniHub}
                onReset={() => setDraft((d) => ({ ...d, miniHubs: [] }))}
                open={branchDropdownOpen}
                onOpenChange={setBranchDropdownOpen}
              />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Geography Access</h3>
            <p className="mt-1 text-xs text-slate-400">
              State/UT → City → Pincode is one address chain (a City sits in one State, a Pincode sits in one City); Territory → Circle is a separate grouping of pincode/locality/area ranges. Picking a broader tier auto-checks everything under it in its own chain — uncheck individual items below if you need to narrow further.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ScopeDropdown
                label="State/UT access"
                hint="Default is every state/UT."
                unit="state/UT"
                unitPlural="states/UTs"
                items={STATES.map((s) => ({ group: null, value: s }))}
                selected={draft.states}
                onToggle={toggleState}
                onReset={() => setDraft((d) => ({ ...d, states: [], cities: [], pincodes: [] }))}
                open={stateDropdownOpen}
                onOpenChange={setStateDropdownOpen}
              />
              <ScopeDropdown
                label="City access"
                hint={`Default is every city${draft.states.length ? ' within the states/UTs above' : ''}.`}
                unit="city"
                unitPlural="cities"
                items={citiesForStates(draft.states)}
                selected={draft.cities}
                onToggle={toggleCity}
                onReset={() => setDraft((d) => ({ ...d, cities: [], pincodes: [] }))}
                open={cityDropdownOpen}
                onOpenChange={setCityDropdownOpen}
              />
              <ScopeDropdown
                label="Pincode access"
                hint={`Default is every pincode${draft.cities.length ? ' within the cities above' : ''}.`}
                unit="pincode"
                unitPlural="pincodes"
                items={pincodesForCities(draft.cities)}
                selected={draft.pincodes}
                onToggle={togglePincode}
                onReset={() => setDraft((d) => ({ ...d, pincodes: [] }))}
                open={pincodeDropdownOpen}
                onOpenChange={setPincodeDropdownOpen}
              />
              <ScopeDropdown
                label="Territory access"
                hint="Default is every territory."
                unit="territory"
                unitPlural="territories"
                items={TERRITORIES.map((t) => ({ group: null, value: t }))}
                selected={draft.territories}
                onToggle={toggleTerritory}
                onReset={() => setDraft((d) => ({ ...d, territories: [], circles: [] }))}
                open={territoryDropdownOpen}
                onOpenChange={setTerritoryDropdownOpen}
              />
              <ScopeDropdown
                label="Circle access"
                hint={`Default is every circle${draft.territories.length ? ' within the territories above' : ''}.`}
                unit="circle"
                unitPlural="circles"
                items={circlesForTerritories(draft.territories)}
                selected={draft.circles}
                onToggle={toggleCircle}
                onReset={() => setDraft((d) => ({ ...d, circles: [] }))}
                open={circleDropdownOpen}
                onOpenChange={setCircleDropdownOpen}
              />
            </div>
          </section>
        </div>
      )}

      <p className="text-sm text-slate-400">
        This prototype holds department, role, task, region/zone/hub/branch and geography access in memory only — changes
        here don't persist past the session. In the real system this would write through to a backend user/role service.
      </p>
    </div>
  )
}

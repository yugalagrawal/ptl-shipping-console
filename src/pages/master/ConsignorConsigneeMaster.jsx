import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import MultiSelect from '../../components/MultiSelect.jsx'
import PartyModal from '../../components/PartyModal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import Pagination, { usePagination } from '../../components/Pagination.jsx'
import { card, btnPrimary } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED } from '../../data/clients.js'
import { getAllConsignors, createConsignor, updateConsignor } from '../../data/consignors.js'
import { getAllConsignees, createConsignee, updateConsignee } from '../../data/consignees.js'
import { useAuth } from '../../context/AuthContext.jsx'

const CLIENTS = [...ACTIVE_CLIENTS_SEED, ...PENDING_CLIENTS_SEED].map((c) => ({ id: c.id, name: c.name }))
const nameById = Object.fromEntries(CLIENTS.map((c) => [c.id, c.name]))
const idByName = Object.fromEntries(CLIENTS.map((c) => [c.name, c.id]))

// Central list of every Consignor / Consignee. Clients Mapped is edited
// inline (search + multi-select); Save changes writes it to the shared
// store, so it also shows up in Client Configuration > Consignor & Consignee.
export default function ConsignorConsigneeMaster() {
  const { hasFunction } = useAuth()
  const [tab, setTab] = useState('consignor')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState({}) // partyId -> clientIds not yet saved
  const [creating, setCreating] = useState(false)
  const [tick, setTick] = useState(0)
  const [expanded, setExpanded] = useState({})
  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))
  const [savedMsg, setSavedMsg] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [editing, setEditing] = useState(null)
  const [pendingEdit, setPendingEdit] = useState(null)

  const isConsignor = tab === 'consignor'
  const label = isConsignor ? 'Consignor' : 'Consignee'
  const store = isConsignor
    ? { all: getAllConsignors, create: createConsignor, update: updateConsignor }
    : { all: getAllConsignees, create: createConsignee, update: updateConsignee }
  const canEdit = hasFunction('consignor-consignee-master.manage')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => [...store.all()], [tab, tick])
  const counts = { consignor: getAllConsignors().length, consignee: getAllConsignees().length }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((r) =>
      [r.partyName, r.company, r.pocName, r.pocPhone, ...r.sites.flatMap((x) => [x.label, x.address, x.city, x.state, x.pincode]), ...r.clientIds.map((id) => nameById[id])]
        .some((v) => (v ?? '').toLowerCase().includes(q)),
    )
  }, [all, search])

  const pg = usePagination(rows, 25)

  function switchTab(k) {
    setTab(k)
    setDrafts({})
    setSearch('')
    pg.setPage(1)
  }

  function save() {
    store.update(confirming.id, { clientIds: drafts[confirming.id] })
    setDrafts((d) => { const n = { ...d }; delete n[confirming.id]; return n })
    setConfirming(null)
    setTick((t) => t + 1)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  function setMapped(id, original, names) {
    const ids = names.map((n) => idByName[n])
    const same = ids.length === original.length && ids.every((x) => original.includes(x))
    setDrafts((d) => {
      const next = { ...d }
      if (same) delete next[id]
      else next[id] = ids
      return next
    })
  }

  const gridCls = 'grid lg:grid-cols-[44px_minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.5fr)]'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm">
          {[['consignor', 'Consignor'], ['consignee', 'Consignee']].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => switchTab(k)}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === k ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {l} <span className="text-slate-400">({counts[k]})</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {savedMsg && <span className="text-xs font-medium text-emerald-600">Changes saved</span>}
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); pg.setPage(1) }}
              placeholder={`Search ${label.toLowerCase()}, POC, city, client…`}
              className="w-72 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </div>
          {canEdit && (
            <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
              <Icon name="plus" className="h-4 w-4" />
              Create {label}
            </button>
          )}
        </div>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className={`${gridCls} hidden border-b border-slate-300 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid`}>
          {['#', `${label} name`, 'Site', 'Clients mapped'].map((h, i) => (
            <div key={h} className={`px-3 py-2 ${i < 3 ? 'border-r border-slate-200' : ''}`}>{h}</div>
          ))}
        </div>
        <div>
          {pg.pageItems.map((r, idx) => {
            const current = drafts[r.id] ?? r.clientIds
            const changed = !!drafts[r.id]
            const names = current.map((id) => nameById[id]).filter(Boolean)
            const cell = 'px-3 py-2 lg:border-r lg:border-slate-200'
            return (
              <div key={r.id} className={`border-b border-slate-200 ${changed ? 'bg-amber-50/60' : ''}`}>
                <div className={`${gridCls} text-sm ${changed ? '' : 'hover:bg-slate-50/70'}`}>
                  <div className={`${cell} hidden text-xs text-slate-400 lg:block`}>{(pg.page - 1) * pg.pageSize + idx + 1}</div>
                  <div className={`${cell} flex items-start gap-2`}>
                    <button type="button" onClick={() => toggle(r.id)} aria-expanded={!!expanded[r.id]} className="group flex min-w-0 flex-1 items-start gap-1.5 text-left">
                      <Icon name="chevron" className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-slate-700 ${expanded[r.id] ? '' : '-rotate-90'}`} />
                      <span className="min-w-0 break-words font-medium text-slate-900 group-hover:text-brand-orange-dark">{r.partyName}</span>
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => setEditing(r)} aria-label={`Edit ${r.partyName}`} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className={`${cell} min-w-0`}>
                    {r.sites[0] && (
                      <div className="text-slate-700">
                        {r.sites[0].label && <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{r.sites[0].label}</span>}
                        <span>{r.sites[0].address}</span>
                        <span className="text-xs text-slate-400">, {r.sites[0].city}</span>
                      </div>
                    )}
                    {r.sites.length > 1 && (
                      <button type="button" onClick={() => toggle(r.id)} className="mt-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-100">
                        +{r.sites.length - 1} more
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 px-3 py-2">
                    <MultiSelect
                      noun="client"
                      placeholder="Select clients…"
                      disabled={!canEdit}
                      options={CLIENTS.map((c) => c.name)}
                      selected={names}
                      onChange={(sel) => setMapped(r.id, r.clientIds, sel)}
                    />
                    {names.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {names.map((n) => (
                          <span key={n} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{n}</span>
                        ))}
                      </div>
                    )}
                    {changed && (
                      <div className="mt-2 flex items-center gap-3">
                        <button type="button" onClick={() => setConfirming(r)} className={`${btnPrimary} !px-3 !py-1.5 text-xs`}>Save changes</button>
                        <button type="button" onClick={() => setDrafts((d) => { const n = { ...d }; delete n[r.id]; return n })} className="text-xs font-medium text-slate-400 hover:text-slate-700">Discard</button>
                      </div>
                    )}
                  </div>
                </div>
              {expanded[r.id] && (
                <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 px-6 py-5 text-sm lg:grid-cols-3">
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">{label} details</div>
                    <dl className="space-y-1.5">
                      <div><dt className="text-xs text-slate-400">Name</dt><dd className="text-slate-800">{r.partyName}</dd></div>
                      <div><dt className="text-xs text-slate-400">Company</dt><dd className="text-slate-800">{r.company || '—'}</dd></div>
                      <div><dt className="text-xs text-slate-400">ID</dt><dd className="text-slate-800">{r.id}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Point of contact</div>
                    <dl className="space-y-1.5">
                      <div><dt className="text-xs text-slate-400">Name</dt><dd className="text-slate-800">{r.pocName}</dd></div>
                      <div><dt className="text-xs text-slate-400">Phone</dt><dd className="text-slate-800">{r.pocPhone}</dd></div>
                      <div><dt className="text-xs text-slate-400">Email</dt><dd className="break-all text-slate-800">{r.pocEmail}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Clients mapped ({r.clientIds.length})</div>
                    {r.clientIds.length === 0 ? (
                      <p className="text-slate-400">Not mapped to any client.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.clientIds.map((id) => (
                          <span key={id} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">{nameById[id] ?? id}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-3">
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Sites ({r.sites.length})</div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {r.sites.map((st, i) => (
                        <div key={st.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                          <div className="text-xs font-semibold text-slate-700">{st.label || `Site ${i + 1}`}</div>
                          <div className="mt-1 text-slate-700">{st.address}</div>
                          <div className="text-xs text-slate-400">{st.city}, {st.state} {st.pincode}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              </div>
            )
          })}
          {rows.length === 0 && (
            <div className="px-6 py-14 text-center text-sm text-slate-400">
              No {label.toLowerCase()}s yet{canEdit ? ` — use Create ${label} to add one.` : '.'}
            </div>
          )}
        </div>
        <Pagination pg={pg} noun={`${label.toLowerCase()}s`} />
      </div>

      <ConfirmDialog
        open={!!confirming}
        title="Save client mapping?"
        message={confirming && `Are you sure? "${confirming.partyName}" will be mapped to: ${(drafts[confirming.id] ?? []).map((id) => nameById[id]).join(', ') || 'no clients'}.`}
        confirmLabel="Yes, save"
        cancelLabel="Cancel"
        onConfirm={save}
        onCancel={() => setConfirming(null)}
      />

      {editing && (
        <PartyModal
          kind={tab}
          clientOptions={CLIENTS}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(form) => setPendingEdit(form)}
        />
      )}

      <ConfirmDialog
        open={!!pendingEdit}
        title={`Save changes to this ${label.toLowerCase()}?`}
        message={pendingEdit && `Are you sure? The details of "${pendingEdit.partyName}" will be updated everywhere it's used, including Client Configuration.`}
        confirmLabel="Yes, save"
        cancelLabel="Cancel"
        onConfirm={() => {
          const { id, ...rest } = pendingEdit
          store.update(id, rest)
          setDrafts((d) => { const n = { ...d }; delete n[id]; return n })
          setPendingEdit(null)
          setEditing(null)
          setTick((t) => t + 1)
          setSavedMsg(true)
          setTimeout(() => setSavedMsg(false), 2500)
        }}
        onCancel={() => setPendingEdit(null)}
      />

      {creating && (
        <PartyModal
          kind={tab}
          clientOptions={CLIENTS}
          onClose={() => setCreating(false)}
          onSave={(form) => {
            store.create(form)
            setCreating(false)
            setTick((t) => t + 1)
          }}
        />
      )}
    </div>
  )
}

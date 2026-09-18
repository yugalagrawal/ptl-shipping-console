import { useEffect, useMemo, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import SortToggle from '../../components/SortToggle.jsx'
import { card, thCls, tdCls, rowCls, btnPrimary, btnSecondary } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED, APPROVAL_STAGE_LABEL, APPROVAL_STAGE_BADGE } from '../../data/clients.js'
import { CLIENT_CONFIG_TABS, CLIENT_CONFIG_FIELDS_BY_ID, getClientConfigValues, saveClientConfigValues } from '../../data/clientConfigFields.js'
import { getConsignorsForClient, addConsignorForClient, updateConsignorForClient, removeConsignorForClient } from '../../data/consignors.js'
import { getConsigneesForClient, addConsigneeForClient, updateConsigneeForClient, removeConsigneeForClient } from '../../data/consignees.js'
import { lookupPincode } from '../../data/geo.js'
import { useAuth } from '../../context/AuthContext.jsx'

// One field row — label on the left, its dropdown on the right. Only
// deliberately-changed fields get a callout (an "Overridden" badge) — a
// field still on its "Preferred Ideal" default stays visually quiet, so the
// handful of real overrides actually stand out instead of getting lost among
// 30 identical "Preferred default" captions.
function ConfigField({ field, value, onChange, readOnly }) {
  const isDefault = value === field.default
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {field.label}
        {!isDefault && (
          <span className="rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-orange-dark">
            Overridden
          </span>
        )}
      </span>
      <select
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(field.id, e.target.value)}
        className={`w-full rounded-xl border bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:cursor-not-allowed disabled:text-slate-500 ${
          isDefault ? 'border-slate-200' : 'border-brand-orange/40'
        }`}
      >
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

// One card groups a handful of closely related fields under a titled,
// icon-led header — the 30 fields are too many to scan as one flat grid, so
// they're partitioned first by tab (see CLIENT_CONFIG_TABS), then further
// into these full-width cards. Every field is still a plain dropdown; this
// is layout only. Stacked full-width (not a side-by-side grid of cards) so a
// 3-card tab reads top-to-bottom instead of leaving an odd half-width card.
function ConfigCard({ title, icon, fieldIds, values, onChange, readOnly }) {
  return (
    <div className={`space-y-5 p-6 ${card}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-semibold text-slate-800">
        <Icon name={icon} className="h-5 w-5 shrink-0 text-brand-orange-dark" />
        {title}
      </div>
      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {fieldIds.map((fieldId) => (
          <ConfigField key={fieldId} field={CLIENT_CONFIG_FIELDS_BY_ID[fieldId]} value={values[fieldId]} onChange={onChange} readOnly={readOnly} />
        ))}
      </div>
    </div>
  )
}

function Field({ label, required, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-brand-orange-dark"> *</span>}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </label>
  )
}

const emptyParty = { partyName: '', company: '', pocName: '', pocPhone: '', pocEmail: '', address: '', pincode: '', city: '', state: '' }

// Shared add/edit modal for a client's mapped consignors AND consignees —
// same field set for both, only the labels/copy differ (Consignor vs
// Consignee, "Pickup Location" vs "Delivery Location"). Company defaults to
// the client this party is being mapped under (most ship/receive as the
// client itself) but stays editable — sometimes it's a different party.
// Pincode still does a light auto-fill of city/state (data/geo.js
// lookupPincode, same mock used elsewhere) but nothing fancier than that for
// this prototype.
function PartyModal({ kind, companyDefault, initial, onClose, onSave }) {
  const editMode = !!initial
  const isConsignor = kind === 'consignor'
  const label = isConsignor ? 'Consignor' : 'Consignee'
  const locationLabel = isConsignor ? 'Pickup Location' : 'Delivery Location'
  const [form, setForm] = useState(() => (initial ? { ...initial } : { ...emptyParty, company: companyDefault }))
  const [cityTouched, setCityTouched] = useState(editMode)
  const [stateTouched, setStateTouched] = useState(editMode)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  useEffect(() => {
    if (form.pincode.length !== 6) return
    let cancelled = false
    lookupPincode(form.pincode).then((res) => {
      if (cancelled || !res) return
      setForm((f) => ({ ...f, city: cityTouched ? f.city : res.city, state: stateTouched ? f.state : res.state }))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode])

  const isValid =
    form.partyName.trim() &&
    form.pocName.trim() &&
    form.pocPhone.trim() &&
    form.pocEmail.trim() &&
    form.address.trim() &&
    form.pincode.length === 6 &&
    form.city.trim() &&
    form.state.trim()

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{editMode ? `Edit ${label}` : `Add ${label}`}</h3>
          <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={`${label} Name`} required value={form.partyName} onChange={(e) => set('partyName', e.target.value)} placeholder="Nova Retail — Whitefield Warehouse" />
          <Field
            label="Company Name"
            required
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
            hint="Editable if shipping for another party"
          />
          <Field label="POC Name" required value={form.pocName} onChange={(e) => set('pocName', e.target.value)} placeholder="Arvind Krishnan" />
          <Field label="POC Phone" required value={form.pocPhone} onChange={(e) => set('pocPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9845012211" />
          <Field label="POC Email" required type="email" className="sm:col-span-2" value={form.pocEmail} onChange={(e) => set('pocEmail', e.target.value)} placeholder="arvind.k@novaretail.in" />

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{locationLabel}</span>
          </div>
          <Field
            label="Address"
            required
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Plot 14, ITPL Main Road, Whitefield"
          />
          <Field
            label="Pincode"
            required
            value={form.pincode}
            onChange={(e) => {
              set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
              setCityTouched(false)
              setStateTouched(false)
            }}
            placeholder="560066"
          />
          <Field label="City" required value={form.city} onChange={(e) => { set('city', e.target.value); setCityTouched(true) }} placeholder="Bengaluru" />
          <Field label="State" required value={form.state} onChange={(e) => { set('state', e.target.value); setStateTouched(true) }} placeholder="Karnataka" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(form)} disabled={!isValid} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>
            {editMode ? 'Save Changes' : `Save ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// Small confirm-before-destroy dialog — this app has no existing pattern for
// this (every other delete/remove elsewhere fires immediately), so it's kept
// generic/local here rather than assuming a shared component is warranted
// yet.
function ConfirmRemoveModal({ title, description, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-rose-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// One list card, reused for both Consignor and Consignee sub-tabs — same
// layout, same Edit/Remove actions, only the data source and copy differ.
function PartyListCard({ label, parties, canEdit, onAdd, onEdit, onRemove, emptyHint }) {
  return (
    <div className={`overflow-hidden ${card}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div>
          <div className="text-sm font-semibold text-slate-800">Mapped {label.toLowerCase()}s</div>
          <p className="text-xs text-slate-400">{emptyHint}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add {label}
          </button>
        )}
      </div>
      {parties.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-slate-400">No {label.toLowerCase()}s mapped yet.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {parties.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {p.partyName}
                  {p.company && <span className="font-normal text-slate-400"> · {p.company}</span>}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-400">
                  {p.address}, {p.city}, {p.state} {p.pincode} · {p.pocName} · {p.pocPhone}
                </div>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-3">
                  <button type="button" onClick={() => onEdit(p)} className="text-xs font-medium text-slate-400 hover:text-slate-700">
                    Edit
                  </button>
                  <button type="button" onClick={() => onRemove(p)} className="text-xs font-medium text-slate-400 hover:text-rose-500">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConsignorConsigneeTab({ client, canEdit }) {
  const [subTab, setSubTab] = useState('consignor')
  const [tick, setTick] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingParty, setEditingParty] = useState(null)
  const [removingParty, setRemovingParty] = useState(null)
  const consignors = useMemo(() => getConsignorsForClient(client.id), [client.id, tick])
  const consignees = useMemo(() => getConsigneesForClient(client.id), [client.id, tick])

  function handleSave(form) {
    if (subTab === 'consignor') {
      if (editingParty) updateConsignorForClient(client.id, editingParty.id, form)
      else addConsignorForClient(client.id, form)
    } else if (editingParty) {
      updateConsigneeForClient(client.id, editingParty.id, form)
    } else {
      addConsigneeForClient(client.id, form)
    }
    setShowAddModal(false)
    setEditingParty(null)
    setTick((t) => t + 1)
  }

  function handleConfirmRemove() {
    if (subTab === 'consignor') removeConsignorForClient(client.id, removingParty.id)
    else removeConsigneeForClient(client.id, removingParty.id)
    setRemovingParty(null)
    setTick((t) => t + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        <button
          type="button"
          onClick={() => setSubTab('consignor')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${subTab === 'consignor' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Consignor <span className="text-slate-400">({consignors.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('consignee')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${subTab === 'consignee' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Consignee <span className="text-slate-400">({consignees.length})</span>
        </button>
      </div>

      {subTab === 'consignor' && (
        <PartyListCard
          label="Consignor"
          parties={consignors}
          canEdit={canEdit}
          onAdd={() => setShowAddModal(true)}
          onEdit={setEditingParty}
          onRemove={setRemovingParty}
          emptyHint="Pickup parties available for this client during booking."
        />
      )}

      {subTab === 'consignee' && (
        <div className="space-y-4">
          <div className={`p-6 text-sm text-slate-400 ${card}`}>
            <span className="font-medium text-slate-500">For Devs' understanding: </span>
            once pickups start getting punched into the system for this client, their consignees will start accumulating here automatically — unlike
            Consignor, this list isn't manually mapped.
          </div>
          <PartyListCard
            label="Consignee"
            parties={consignees}
            canEdit={canEdit}
            onAdd={() => setShowAddModal(true)}
            onEdit={setEditingParty}
            onRemove={setRemovingParty}
            emptyHint="Delivery parties recorded for this client, in case one's needed ahead of a booking."
          />
        </div>
      )}

      {(showAddModal || editingParty) && (
        <PartyModal
          kind={subTab}
          companyDefault={client.name}
          initial={editingParty}
          onClose={() => {
            setShowAddModal(false)
            setEditingParty(null)
          }}
          onSave={handleSave}
        />
      )}

      {removingParty && (
        <ConfirmRemoveModal
          title={`Remove this ${subTab}?`}
          description={`Are you sure you want to remove "${removingParty.partyName}"? This can't be undone.`}
          onCancel={() => setRemovingParty(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  )
}

function ClientConfigForm({ client, canEdit, onBack }) {
  const [saved, setSaved] = useState(() => getClientConfigValues(client.id))
  const [values, setValues] = useState(saved)
  const [activeTab, setActiveTab] = useState(CLIENT_CONFIG_TABS[0].id)

  function handleChange(fieldId, value) {
    setValues((v) => ({ ...v, [fieldId]: value }))
  }

  function handleSave() {
    saveClientConfigValues(client.id, values)
    setSaved(values)
  }

  function handleRevert() {
    setValues(saved)
  }

  const isDirty = JSON.stringify(values) !== JSON.stringify(saved)
  const currentTab = CLIENT_CONFIG_TABS.find((t) => t.id === activeTab) ?? CLIENT_CONFIG_TABS[0]

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <Icon name="arrow-left" className="h-4 w-4" />
        Back to client list
      </button>

      <div className={`flex flex-wrap items-center justify-between gap-3 p-5 ${card}`}>
        <div className="flex items-center gap-3">
          <Avatar name={client.name} />
          <div>
            <div className="font-medium text-slate-800">{client.name}</div>
            <div className="text-xs text-slate-400">Operational configuration — booking, handling and pickup behavior for this client.</div>
          </div>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRevert} disabled={!isDirty} className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}>
              Revert
            </button>
            <button type="button" onClick={handleSave} disabled={!isDirty} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
              Save configuration
            </button>
          </div>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            View only — Sales Admin edits this
          </span>
        )}
      </div>

      <div className="flex gap-8 overflow-x-auto border-b border-slate-200">
        {CLIENT_CONFIG_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab.id === currentTab.id ? 'border-brand-orange text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {currentTab.id === 'consignor-consignee' ? (
          <ConsignorConsigneeTab client={client} canEdit={canEdit} />
        ) : currentTab.cards.length === 0 ? (
          <div className={`p-6 text-sm text-slate-400 ${card}`}>Fields for this tab haven't been defined yet.</div>
        ) : (
          currentTab.cards.map((c) => (
            <ConfigCard key={c.title} title={c.title} icon={c.icon} fieldIds={c.fieldIds} values={values} onChange={handleChange} readOnly={!canEdit} />
          ))
        )}
      </div>
    </div>
  )
}

export default function ClientConfiguration() {
  const { hasFunction } = useAuth()
  const canEdit = hasFunction('client-configuration.manage')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [selectedClientId, setSelectedClientId] = useState(null)

  // A client shows up here the moment KYC is submitted — not just once fully
  // Active — so Sales Admin can check/set its configuration while it's still
  // moving through Client Approvals, same "lands here right after KYC"
  // lifecycle point Yugal described. Pending rows sort ahead of Active ones
  // under Recents (they're definitionally the newest lifecycle event),
  // themselves in submission order; Active rows follow by real onboarded date.
  const roster = useMemo(
    () => [
      ...PENDING_CLIENTS_SEED.map((c) => ({ ...c, status: 'pending' })),
      ...ACTIVE_CLIENTS_SEED.map((c) => ({ ...c, status: 'active' })),
    ],
    [],
  )

  const q = query.trim().toLowerCase()
  const filtered = roster.filter((c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'alpha') return a.name.localeCompare(b.name)
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    if (a.status === 'active') return new Date(b.onboardedAt ?? 0) - new Date(a.onboardedAt ?? 0)
    return 0
  })

  const selectedClient = roster.find((c) => c.id === selectedClientId) ?? null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Client Configuration</h1>
      </div>

      {selectedClient ? (
        <ClientConfigForm client={selectedClient} canEdit={canEdit} onBack={() => setSelectedClientId(null)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client or city…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>
            <SortToggle sortMode={sortMode} onChange={setSortMode} />
          </div>

          <div className={`overflow-hidden ${card}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={thCls}>Client</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id} className={rowCls}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <span className="font-medium text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className={tdCls}>
                      {c.status === 'active' ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">Active</span>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${APPROVAL_STAGE_BADGE[c.approvalStage]}`}>
                          {APPROVAL_STAGE_LABEL[c.approvalStage]}
                        </span>
                      )}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        {canEdit ? 'View/Edit Configuration' : 'View Configuration'}
                      </button>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-400">
                      No clients match "{query}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

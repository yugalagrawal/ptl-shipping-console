import { useSearchParams } from 'react-router-dom'
import { Fragment, useEffect, useMemo, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import SortToggle from '../../components/SortToggle.jsx'
import { card, thCls, tdCls, rowCls, btnPrimary, btnSecondary } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED, APPROVAL_STAGE_LABEL, APPROVAL_STAGE_BADGE } from '../../data/clients.js'
import { CLIENT_CONFIG_TABS, CLIENT_CONFIG_FIELDS_BY_ID, DOCKET_SERIES_ASSIGNED, getClientConfigValues, saveClientConfigValues } from '../../data/clientConfigFields.js'
import { fmtDocket } from '../../data/docketNumber.js'
import { validateRanges, rangeUsage, takenRanges, suggestBlock, blockOfNumber, extendTo, SERIES_DIGITS } from '../../data/docketSeries.js'
import { peekNextDocketNumber } from '../../data/dockets.js'
import { getConsignorsForClient, addConsignorForClient, updateConsignorForClient, removeConsignorForClient } from '../../data/consignors.js'
import { getConsigneesForClient, addConsigneeForClient, updateConsigneeForClient, removeConsigneeForClient } from '../../data/consignees.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import PartyModal, { siteLine } from '../../components/PartyModal.jsx'
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
// Assigned Series editor — shown right under the Docket Series dropdown when
// it's set to Assigned Series. One row per From–To range; dockets draw from
// them in order, and the system's auto numbering skips them everywhere else.
const clientName = (id) => [...ACTIVE_CLIENTS_SEED, ...PENDING_CLIENTS_SEED].find((c) => c.id === id)?.name ?? id
const newRange = () => ({ id: `rng-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from: '', to: '' })

function SeriesPanel({ clientId, ranges, onChange, readOnly }) {
  const errors = validateRanges(clientId, ranges, clientName)
  const taken = takenRanges(clientId)
  // A From–To row is always there, prefilled with the next series that's free in
  // the chosen mode; "+ Add series" opens another.
  const [mode, setMode] = useState('Surface')
  const autoNext = peekNextDocketNumber()
  const addSeries = () => {
    const b = suggestBlock(clientId, ranges, 100, mode, autoNext)
    onChange([...ranges, { ...newRange(), ...(b ?? {}) }])
  }
  const untouched = ranges.every((r) => !r.from && !r.to)
  useEffect(() => {
    if (readOnly || !untouched) return
    const b = suggestBlock(clientId, [], 100, mode, autoNext)
    if (b) onChange(ranges.length ? ranges.map((r, j) => (j === 0 ? { ...r, ...b } : r)) : [{ ...newRange(), ...b }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, untouched])
  const setRow = (i, patch) => onChange(ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const digits = (v) => v.replace(/\D/g, '').slice(0, SERIES_DIGITS)
  const input = 'w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:bg-slate-50 disabled:text-slate-500'
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-medium text-slate-700">Series ranges</p>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex rounded-lg bg-slate-100 p-0.5 font-medium">
              {['Surface', 'Air', 'Rail', 'Sea'].map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-2.5 py-0.5 ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{m}</button>
              ))}
            </span>
            <button type="button" onClick={addSeries} className="font-medium text-brand-orange-dark hover:underline">+ Add {mode} series</button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-400">
        Auto numbering is at <span className="font-mono">{fmtDocket(peekNextDocketNumber())}</span> (Surface) and skips every assigned series.
        {taken.length > 0 && (
          <details className="mt-1 inline-block align-top">
            <summary className="ml-1 inline cursor-pointer font-medium text-slate-500">Taken by other clients ({taken.length})</summary>
            <ul className="mt-1 space-y-0.5 text-slate-500">
              {taken.map((t) => <li key={`${t.clientId}-${t.from}`}><span className="text-slate-600">{clientName(t.clientId)}</span> <span className="font-mono">{t.from} – {t.to}</span></li>)}
            </ul>
          </details>
        )}
      </p>
      {ranges.map((r, i) => {
        const usage = rangeUsage(clientId, r)
        const err = errors[i]
        const status = !usage ? null : usage.remaining === 0 ? 'Exhausted' : ranges.slice(0, i).every((p) => (rangeUsage(clientId, p)?.remaining ?? 0) === 0) ? 'Active' : 'Queued'
        return (
          <div key={r.id} className="space-y-1">
            <div className="grid items-center gap-2.5 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
              <input value={r.from} disabled={readOnly} onChange={(e) => setRow(i, { from: digits(e.target.value) })} placeholder="From" inputMode="numeric" aria-label={`Series ${i + 1} from`} className={`${input} ${err ? 'border-red-300' : 'border-slate-200'}`} />
              <input value={r.to} disabled={readOnly} onChange={(e) => setRow(i, { to: digits(e.target.value) })} placeholder="To" inputMode="numeric" aria-label={`Series ${i + 1} to`} className={`${input} ${err ? 'border-red-300' : 'border-slate-200'}`} />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {usage ? (
                  <>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand-orange" style={{ width: `${Math.round((usage.used / usage.total) * 100)}%` }} /></div>
                    <span>{usage.total.toLocaleString('en-IN')} numbers · {usage.used.toLocaleString('en-IN')} used · <span className={usage.remaining === 0 ? 'font-medium text-red-600' : 'font-medium text-slate-700'}>{usage.remaining.toLocaleString('en-IN')} left</span></span>
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">{blockOfNumber(r.from)?.assigned}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${status === 'Active' ? 'bg-emerald-100 text-emerald-700' : status === 'Exhausted' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{status}</span>
                  </>
                ) : null}
              </div>
              {!readOnly && ranges.length > 1 && (
                <button type="button" onClick={() => onChange(ranges.filter((_, j) => j !== i))} disabled={!!usage && usage.used > 0} title={usage && usage.used > 0 ? 'Numbers already used — can\'t remove' : 'Remove series'} className="text-slate-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </div>
            {!readOnly && usage && !err && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                {[100, 500, 1000, 5000].map((n) => (
                  <button key={n} type="button" onClick={() => setRow(i, { to: extendTo(r.to, n) })} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600 hover:border-brand-orange/40 hover:text-brand-orange-dark">
                    +{n.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            )}
            {err && ranges[i].from && ranges[i].to && <p className="text-xs text-red-600">{err}</p>}
          </div>
        )
      })}
    </div>
  )
}

// "Pricing Conditions" — laid out like the docket's Pricing list: a charge per row with when it applies.
// Others is a group: it expands into every other client charge, each with its own condition.
function ConditionRow({ field, value, onChange, readOnly, indent }) {
  const isDefault = value === field.default
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${indent ? 'bg-slate-50/50 pl-11' : ''}`}>
      <span className="flex items-center gap-2 font-medium text-slate-700">
        {field.label}
        {!isDefault && <span className="rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-orange-dark">Overridden</span>}
      </span>
      <select
        aria-label={field.label}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(field.id, e.target.value)}
        className={`w-72 rounded-xl border bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:cursor-not-allowed disabled:opacity-60 ${isDefault ? 'border-slate-200' : 'border-brand-orange/40'}`}
      >
        {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}

function PricingConditionsList({ fieldIds, othersFieldIds, values, onChange, readOnly }) {
  const [open, setOpen] = useState(false)
  const applied = othersFieldIds.filter((id) => values[id] === 'Always').length
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
      {fieldIds.map((id) => <ConditionRow key={id} field={CLIENT_CONFIG_FIELDS_BY_ID[id]} value={values[id]} onChange={onChange} readOnly={readOnly} />)}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-slate-50/70">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <Icon name="chevron" className={`h-4 w-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
          Others <span className="font-normal text-slate-400">— every other client charge</span>
        </span>
        <span className="text-xs font-medium text-slate-500">{applied} of {othersFieldIds.length} applied</span>
      </button>
      {open && othersFieldIds.map((id) => <ConditionRow key={id} indent field={CLIENT_CONFIG_FIELDS_BY_ID[id]} value={values[id]} onChange={onChange} readOnly={readOnly} />)}
    </div>
  )
}

function ConfigCard({ title, icon, fieldIds, othersFieldIds, layout, columns, rows, values, onChange, readOnly, clientId, yetToBuild }) {
  return (
    <div className={`space-y-5 p-6 ${card}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-semibold text-slate-800">
        <Icon name={icon} className="h-5 w-5 shrink-0 text-brand-orange-dark" />
        {title}
        {yetToBuild && <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Yet to be built</span>}
      </div>
      {layout === 'conditions' ? (
        <PricingConditionsList fieldIds={fieldIds} othersFieldIds={othersFieldIds} values={values} onChange={onChange} readOnly={readOnly} />
      ) : rows ? (
        <div className="space-y-6">
          {rows.map((row, i) => (
            <Fragment key={i}>
              <div className={`grid gap-x-6 gap-y-6 sm:grid-cols-2 ${row.length >= 4 ? 'lg:grid-cols-4' : row.length === 3 ? 'lg:grid-cols-3' : ''}`}>
                {row.map((fieldId) => <ConfigField key={fieldId} field={CLIENT_CONFIG_FIELDS_BY_ID[fieldId]} value={values[fieldId]} onChange={onChange} readOnly={readOnly} />)}
              </div>
              {row.includes('docket-series') && values['docket-series'] === DOCKET_SERIES_ASSIGNED && (
                <SeriesPanel clientId={clientId} ranges={values['docket-series-ranges'] ?? []} onChange={(next) => onChange('docket-series-ranges', next)} readOnly={readOnly} />
              )}
            </Fragment>
          ))}
        </div>
      ) : (
      <div className={`grid gap-x-6 gap-y-6 sm:grid-cols-2 ${columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} ${yetToBuild ? 'pointer-events-none opacity-50' : ''}`}>
        {fieldIds.map((fieldId) => (
          <Fragment key={fieldId}>
            <ConfigField field={CLIENT_CONFIG_FIELDS_BY_ID[fieldId]} value={values[fieldId]} onChange={onChange} readOnly={readOnly || yetToBuild} />
          </Fragment>
        ))}
        {fieldIds.includes('docket-series') && values['docket-series'] === DOCKET_SERIES_ASSIGNED && (
          <SeriesPanel clientId={clientId} ranges={values['docket-series-ranges'] ?? []} onChange={(next) => onChange('docket-series-ranges', next)} readOnly={readOnly} />
        )}
      </div>
      )}
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
                  {p.sites[0] ? siteLine(p.sites[0]) : ''}{p.sites.length > 1 ? ` (+${p.sites.length - 1} more site${p.sites.length > 2 ? 's' : ''})` : ''} · {p.pocName} · {p.pocPhone}
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

  const [pendingEdit, setPendingEdit] = useState(null)

  function handleSave(fullForm) {
    if (editingParty && !pendingEdit) {
      setPendingEdit(fullForm)
      return
    }
    const { clientIds: _ignored, ...form } = fullForm
    setPendingEdit(null)
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

      <ConfirmDialog
        open={!!pendingEdit}
        title={`Save changes to this ${subTab}?`}
        message={pendingEdit && `Are you sure? "${pendingEdit.partyName}" will be updated everywhere it's used, including the Consignor/Consignee master.`}
        confirmLabel="Yes, save"
        cancelLabel="Cancel"
        onConfirm={() => handleSave(pendingEdit)}
        onCancel={() => setPendingEdit(null)}
      />

      {removingParty && (
        <ConfirmRemoveModal
          title={`Remove this ${subTab}?`}
          description={`Remove "${removingParty.partyName}" from ${client.name}? It stays in the Consignor/Consignee master and any other clients it's mapped to.`}
          onCancel={() => setRemovingParty(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  )
}

function ClientConfigForm({ client, canEdit, onBack, initialTab }) {
  const [saved, setSaved] = useState(() => getClientConfigValues(client.id))
  const [values, setValues] = useState(saved)
  const [activeTab, setActiveTab] = useState(CLIENT_CONFIG_TABS.some((t) => t.id === initialTab) ? initialTab : CLIENT_CONFIG_TABS[0].id)

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
  // An assigned series with a bad range can't be saved.
  const seriesInvalid = values['docket-series'] === DOCKET_SERIES_ASSIGNED && validateRanges(client.id, values['docket-series-ranges'] ?? [], clientName).some(Boolean)
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
            <button type="button" onClick={handleSave} disabled={!isDirty || seriesInvalid} title={seriesInvalid ? 'Fix the docket series ranges first' : undefined} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
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
            <ConfigCard key={c.title} title={c.title} icon={c.icon} fieldIds={c.fieldIds} othersFieldIds={c.othersFieldIds} layout={c.layout} columns={c.columns} rows={c.rows} values={values} onChange={handleChange} readOnly={!canEdit} clientId={client.id} yetToBuild={c.yetToBuild} />
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
  // Deep link: ?client=<id>&tab=<tab id> opens that client's form on that tab (Docket Series "Assign").
  const [params] = useSearchParams()
  const [selectedClientId, setSelectedClientId] = useState(params.get('client'))

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
        <ClientConfigForm client={selectedClient} canEdit={canEdit} initialTab={params.get('tab')} onBack={() => setSelectedClientId(null)} />
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

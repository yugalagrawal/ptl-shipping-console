import { useState } from 'react'
import Icon from './Icon.jsx'
import { RegionMappingModal, Shell } from './ClientRegionFlow.jsx'
import PricingSourceArt from './PricingSourceArt.jsx'
import { REGION_TEMPLATES, addRegionTemplate, updateRegionTemplate, deleteRegionTemplate, freshRegionId } from '../data/regionMapping.js'
import { buildStandardRegionsFromSheet } from '../data/geoMaster.js'

// Client Pricing > Templates. Reusable region sets that sales picks from
// "Saved Templates" when adding pricing to a client. Rate cards use the
// Location Master regions (read-only); templates are editable.
const card = 'rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70'
const initials = (name) =>
  name
    .split(/[\s_-]+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

export default function ClientTemplatesTab() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  const [dialog, setDialog] = useState(null) // { step: 'name' | 'method', name, method }
  const [editing, setEditing] = useState(null) // { id|null, name, regions }
  const [attempted, setAttempted] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  // Template names: letters, numbers and _ only. Spaces become _.
  const cleanName = (v) => v.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').replace(/_{2,}/g, '_')
  const dName = dialog?.name ?? ''
  const taken = !!dName && REGION_TEMPLATES.some((t) => t.name.trim().toLowerCase() === dName.toLowerCase())

  function startEditing() {
    setEditing({ id: null, name: dialog.name, regions: dialog.method === 'standard-regions' ? buildStandardRegionsFromSheet(freshRegionId) : [] })
    setAttempted(false)
    setDialog(null)
  }
  function edit(t) {
    setEditing({ id: t.id, name: t.name, regions: JSON.parse(JSON.stringify(t.regions)) })
    setAttempted(false)
  }

  const regions = editing?.regions ?? []
  const emptyNames = regions.filter((r) => r.cities.length === 0).map((r) => r.name || 'Untitled region')
  const blankName = regions.some((r) => !r.name.trim())
  const dup = regions.map((r) => r.name.trim().toLowerCase()).filter((n, i, a) => n && a.indexOf(n) !== i)
  const error = !attempted
    ? ''
    : regions.length === 0
      ? 'Create at least one region.'
      : blankName
        ? 'Every region needs a name.'
        : dup.length
          ? 'Two regions share the same name. Give each region its own name.'
          : emptyNames.length
            ? `${emptyNames.join(', ')} ${emptyNames.length > 1 ? 'have' : 'has'} no states or cities. Add coverage or delete ${emptyNames.length > 1 ? 'them' : 'it'}.`
            : ''

  function save() {
    setAttempted(true)
    if (regions.length === 0 || blankName || dup.length || emptyNames.length) return
    if (editing.id) updateRegionTemplate(editing.id, { regions, overrides: {}, defaultRate: '' })
    else {
      const t = addRegionTemplate(editing.name)
      updateRegionTemplate(t.id, { regions, overrides: {}, defaultRate: '' })
    }
    setEditing(null)
    setAttempted(false)
    refresh()
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Region mapping templates</h3>
          <button type="button" onClick={() => setDialog({ step: 'name', name: '', method: '' })} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 py-2 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark">
            <Icon name="plus" className="h-3.5 w-3.5" />
            Create new template
          </button>
        </div>
        <div className={`overflow-hidden ${card}`}>
          <div className="grid grid-cols-[1fr_110px_110px_150px] gap-3 border-b border-slate-100 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <span>Template</span>
            <span>Regions</span>
            <span>Cities</span>
            <span className="text-right">Actions</span>
          </div>
          {REGION_TEMPLATES.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon name="route" className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">No templates yet</p>
              <p className="text-xs text-slate-500">Type a name above, then start from scratch or from the standard regions.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {REGION_TEMPLATES.map((t) => (
                <div key={t.id} onClick={() => confirmId !== t.id && edit(t)} className="grid cursor-pointer grid-cols-[1fr_110px_110px_150px] items-center gap-3 px-5 py-3 hover:bg-slate-50/70">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-semibold text-brand-orange-dark">{initials(t.name)}</span>
                    <span className="truncate text-sm font-medium text-slate-800">{t.name}</span>
                  </span>
                  <span className="text-sm text-slate-600">{t.regions.length} regions</span>
                  <span className="text-sm text-slate-600">{t.regions.reduce((n, r) => n + r.cities.length, 0)} cities</span>
                  <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {confirmId === t.id ? (
                      <span className="flex items-center gap-2 text-xs font-medium">
                        <span className="text-slate-500">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteRegionTemplate(t.id)
                            setConfirmId(null)
                            refresh()
                          }}
                          className="text-rose-600 hover:underline"
                        >
                          Yes
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-slate-500 hover:underline">
                          No
                        </button>
                      </span>
                    ) : (
                      <>
                        <button type="button" onClick={() => edit(t)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                          <Icon name="edit" className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button type="button" onClick={() => setConfirmId(t.id)} title="Delete" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {dialog && dialog.step === 'name' && (
        <Shell wide="max-w-md" title="Create new template" onClose={() => setDialog(null)}>
          <div className="px-5 py-5">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Template name <span className="text-brand-orange-dark">*</span>
              </span>
              <input
                autoFocus
                type="text"
                value={dialog.name}
                onChange={(e) => setDialog({ ...dialog, name: cleanName(e.target.value) })}
                onKeyDown={(e) => e.key === 'Enter' && dialog.name && !taken && setDialog({ ...dialog, step: 'method' })}
                placeholder="e.g. North_1_Sales_Team"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              {taken ? <span className="mt-1.5 block text-xs text-rose-600">A template with this name already exists. Use a different name.</span> : <span className="mt-1.5 block text-xs text-slate-400">No spaces. Letters, numbers and _ only. Spaces become _.</span>}
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <button type="button" onClick={() => setDialog(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
            <button type="button" disabled={!dialog.name || taken} onClick={() => setDialog({ ...dialog, step: 'method' })} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50">
              Next
            </button>
          </div>
        </Shell>
      )}

      {dialog && dialog.step === 'method' && (
        <Shell wide="max-w-xl" title="How do you want to start?" onClose={() => setDialog(null)}>
          <div className="px-5 pt-4">
            <p className="text-xs text-slate-500">
              Template <span className="font-semibold text-slate-800">{dialog.name}</span>
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              { key: 'standard-regions', title: 'From Standard Regions', text: 'Start with 13 standard regions and edit them as needed.', tag: 'Quickest' },
              { key: 'scratch', title: 'From Scratch', text: 'Build your own regions from the ground up.', tag: 'Fully custom' },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setDialog({ ...dialog, method: o.key })}
                className={`flex flex-col gap-2 rounded-2xl border bg-white p-3.5 text-left transition-colors ${dialog.method === o.key ? 'border-brand-orange ring-1 ring-brand-orange/40' : 'border-slate-200/80 hover:border-brand-orange/40'}`}
              >
                <span className="flex h-[88px] items-center justify-center rounded-xl bg-slate-50 px-2">
                  <PricingSourceArt kind={o.key} />
                </span>
                <span className="text-sm font-semibold text-slate-800">{o.title}</span>
                <span className="text-xs leading-relaxed text-slate-500">{o.text}</span>
                <span className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${o.key === 'standard-regions' ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-100 text-slate-500'}`}>{o.tag}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <button type="button" onClick={() => setDialog({ ...dialog, step: 'name' })} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Back
            </button>
            <button type="button" disabled={!dialog.method} onClick={startEditing} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50">
              Continue
            </button>
          </div>
        </Shell>
      )}

      {editing && (
        <RegionMappingModal
          name={editing.name}
          regions={editing.regions}
          setRegions={(u) => setEditing((e) => ({ ...e, regions: typeof u === 'function' ? u(e.regions) : u }))}
          error={error}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import Icon from './Icon.jsx'
import MultiSelect from './MultiSelect.jsx'
import { btnPrimary, btnSecondary } from './ui.js'
import { lookupPincode } from '../data/geo.js'

export function Field({ label, required, hint, className = '', ...props }) {
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

let siteSeq = 1
export const newSite = (label = '') => ({ id: `site-${Date.now()}-${siteSeq++}`, label, address: '', pincode: '', city: '', state: '' })
const emptyParty = { partyName: '', company: '', pocName: '', pocPhone: '', pocEmail: '' }

// One-line summary of a site, shared by the master and Client Configuration.
export const siteLine = (s) => `${s.address}, ${s.city}, ${s.state} ${s.pincode}`

// Shared add/edit modal for consignors AND consignees. A party can have
// several sites (pickup locations for a consignor, delivery locations for a
// consignee), each with its own address; the POC and client mapping are per
// party. Company defaults to the client the party is mapped under but stays
// editable. Pincode light-fills city/state (data/geo.js lookupPincode).
export default function PartyModal({ kind, companyDefault = '', initial, onClose, onSave, clientOptions }) {
  const editMode = !!initial
  const isConsignor = kind === 'consignor'
  const label = isConsignor ? 'Consignor' : 'Consignee'
  const locationLabel = isConsignor ? 'Pickup site' : 'Delivery site'
  const [form, setForm] = useState(() =>
    initial ? { ...initial, sites: initial.sites.map((s) => ({ ...s })) } : { ...emptyParty, company: companyDefault, clientIds: [], sites: [newSite('Main')] },
  )

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }
  function setSite(id, patch) {
    setForm((f) => ({ ...f, sites: f.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  }
  function onPincode(id, pincode) {
    setSite(id, { pincode })
    if (pincode.length !== 6) return
    lookupPincode(pincode).then((res) => {
      if (res) setForm((f) => ({ ...f, sites: f.sites.map((s) => (s.id === id && s.pincode === pincode ? { ...s, city: res.city, state: res.state } : s)) }))
    })
  }

  const siteValid = (s) => s.address.trim() && s.pincode.length === 6 && s.city.trim() && s.state.trim()
  const isValid =
    form.partyName.trim() && form.pocName.trim() && form.pocPhone.trim() && form.pocEmail.trim() && form.sites.length > 0 && form.sites.every(siteValid)

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{editMode ? `Edit ${label}` : `Add ${label}`}</h3>
          <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <Field label={`${label} Name`} required value={form.partyName} onChange={(e) => set('partyName', e.target.value)} placeholder="Nova Retail" />
          <Field label="Company Name" required value={form.company} onChange={(e) => set('company', e.target.value)} hint="Editable if shipping for another party" />
          <Field label="POC Name" required value={form.pocName} onChange={(e) => set('pocName', e.target.value)} placeholder="Arvind Krishnan" />
          <Field label="POC Phone" required value={form.pocPhone} onChange={(e) => set('pocPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9845012211" />
          <Field label="POC Email" required type="email" className="sm:col-span-2" value={form.pocEmail} onChange={(e) => set('pocEmail', e.target.value)} placeholder="arvind.k@novaretail.in" />
          {clientOptions && (
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Clients Mapped</span>
              <MultiSelect
                noun="client"
                placeholder="Select clients…"
                options={clientOptions.map((c) => c.name)}
                selected={(form.clientIds ?? []).map((id) => clientOptions.find((c) => c.id === id)?.name).filter(Boolean)}
                onChange={(names) => set('clientIds', names.map((n) => clientOptions.find((c) => c.name === n).id))}
              />
            </div>
          )}

          {form.sites.map((site, i) => (
            <div key={site.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:col-span-2 sm:grid-cols-3">
              <div className="flex items-center justify-between sm:col-span-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{locationLabel} {i + 1}</span>
                {form.sites.length > 1 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, sites: f.sites.filter((s) => s.id !== site.id) }))} className="text-xs font-medium text-slate-400 hover:text-rose-500">
                    Remove site
                  </button>
                )}
              </div>
              <Field label="Site name" className="sm:col-span-3" value={site.label} onChange={(e) => setSite(site.id, { label: e.target.value })} placeholder="Whitefield Warehouse" />
              <Field label="Address" required className="sm:col-span-3" value={site.address} onChange={(e) => setSite(site.id, { address: e.target.value })} placeholder="Plot 14, ITPL Main Road, Whitefield" />
              <Field label="Pincode" required value={site.pincode} onChange={(e) => onPincode(site.id, e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="560066" />
              <Field label="City" required value={site.city} onChange={(e) => setSite(site.id, { city: e.target.value })} placeholder="Bengaluru" />
              <Field label="State" required value={site.state} onChange={(e) => setSite(site.id, { state: e.target.value })} placeholder="Karnataka" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, sites: [...f.sites, newSite()] }))}
            className="inline-flex items-center gap-1.5 justify-self-start text-xs font-medium text-brand-orange-dark hover:underline sm:col-span-2"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add another site
          </button>
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

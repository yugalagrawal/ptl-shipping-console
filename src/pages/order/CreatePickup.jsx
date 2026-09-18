import { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { card } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { initOrdersSeed, savedPickupAddressesForClient, savedDeliveryAddressesForClient } from '../../data/orders.js'
import {
  PICKUPS_SEED, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE, MINI_HUBS, createPickup,
  PICKUP_TYPE, REPEAT_END_TYPE, createRecurringSeries, refreshPickupLocks, refreshRecurringWindows,
  RECURRING_WINDOW_DAYS, EDIT_LOCK_HOURS,
} from '../../data/pickups.js'

// Mirrors the coworker-built "Create Pickup" prototype (Pickups > Create
// Pickup) — a leaner, single-screen pickup-request form vs. the old
// multi-step Create Pickup - Old flow (formerly OrderManagement.jsx/
// NewOrder.jsx/BulkOrder.jsx, deleted once this flow fully replaced it).
// Confirming here creates a real Pickup record (data/pickups.js) that PRS
// then groups — estimated weight, pickup location (consignor) and drop Mini
// Hub are the only mandatory
// fields; everything else (repeat, helpers, materials, packages estimate,
// instructions) is optional extra context for the field visit.
// A driver is already assigned to every pickup, so this list only covers
// extra manpower — one non-overlapping role per function, not near-synonyms
// like "Helper"/"Picker" that would double-count the same person.
const HELPER_TYPES = ['Extra Driver', 'Loader', 'Packer', 'Supervisor']
const MATERIALS = ['Bubble Wrapping material', 'Paper Packing', 'Crates - Fruits and Vegetables', 'Ice Boxes', 'Carton Box', 'Plain Covers', 'Ropes']
const REPEAT_FREQUENCIES = ['Daily', 'Weekly']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PAYMENT_TERMS = ['Credit', 'Retail']

// Per product's ask — a pickup now anchors on a verified "site" (the
// physical pickup location) rather than a bare consignor address; the site
// carries its own operating window, serving Mini Hub, and site-level contact
// (Incharge/SOL), on top of the consignor fields the site already had.
const SITE_TYPES = ['Warehouse', 'Factory', 'Store', 'Other']
const CONTENT_TYPES = ['General Cargo', 'Cosmetics', 'Electronics', 'Pharmaceuticals', 'Perishables (Non-Frozen)', 'Textiles & Apparel', 'Documents', 'Furniture', 'Other']
// Standard UN transport hazard classes 1-9.
const HAZARD_CLASSES = [
  'Class 1 — Explosives', 'Class 2 — Gases', 'Class 3 — Flammable Liquids', 'Class 4 — Flammable Solids',
  'Class 5 — Oxidizing Substances', 'Class 6 — Toxic & Infectious Substances', 'Class 7 — Radioactive Material',
  'Class 8 — Corrosives', 'Class 9 — Miscellaneous Dangerous Goods',
]

// A Consignor (the business/party) is one thing; the Sites it books pickups
// from are another, and a consignor can have more than one — this is the
// devs' own dropdown-then-sites pattern, not the earlier "site card carries
// everything" design. Consignor holds only who they are; Site holds where
// and its own operating details.
const emptyConsignor = { name: '', company: '', pocName: '', phone: '', email: '' }
const emptySite = {
  address: '', landmark: '', pincode: '', city: '', state: '', latitude: '', longitude: '',
  // Blank/defaulted for a brand-new site; a site surfaced from order history
  // is treated as already verified (see selectSite below).
  siteType: SITE_TYPES[0], verified: false, windowStart: '09:00', windowEnd: '17:00',
  workingDays: WEEKDAYS.filter((d) => d !== 'Sun'), pocName: '', pocPhone: '', pocEmail: '',
}
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40'

function Field({ label, required, className = '', hint, ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-brand-orange-dark"> *</span>}
      </span>
      <input {...props} className={inputCls} />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

function pillBtn(active) {
  return `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100'}`
}

// Search-as-you-type dropdown over a flat {id, label} list — used for Client
// (below) instead of a plain <select>, since the client list is long enough
// that scanning a native dropdown is slower than typing a few letters.
function Typeahead({ label, value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value ?? '')
  // Filtering runs off this, not `query` — query starts pre-filled with the
  // current selection's label, so filtering off it directly would make
  // opening the dropdown immediately narrow the list down to just that one
  // match instead of showing every option. Resets to '' on focus so opening
  // always shows the full list; only narrows once the user actually types.
  const [filterText, setFilterText] = useState('')
  useEffect(() => setQuery(value ?? ''), [value])
  const filtered = filterText.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(filterText.trim().toLowerCase()))
    : options
  return (
    <label className="relative block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-brand-orange-dark"> *</span>}
      </span>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setFilterText(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); setFilterText('') }}
        placeholder={placeholder}
        className={inputCls}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQuery(value ?? '') }} />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange(o.id); setQuery(o.label); setOpen(false) }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                    i === 0 && filterText.trim() && o.label.toLowerCase() === filterText.trim().toLowerCase() ? 'bg-brand-orange text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </label>
  )
}

// Consignor identity only — who they are, not where. Name is reuse-or-create
// against this client's known consignor names (typeahead); Company/POC are
// plain fields. Sites (below) are a separate, per-consignor concern.
// The same 5 sections (type, address, exact location, operating window, POC
// of site) used by EditSiteModal below — shared so a site added inline from
// Add Consignor asks for exactly the same fields as Add Site does.
function SiteFieldsBlock({ site, set, topBorder = true }) {
  return (
    <>
      <div className={topBorder ? 'mt-5 border-t border-slate-100 pt-4' : ''}>
        <span className="mb-3 block text-xs font-medium text-slate-500">Site type</span>
        <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 text-xs font-medium">
          {SITE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('siteType', t)}
              className={`px-2 py-2 transition-colors ${site.siteType === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
        <Field label="Address" required value={site.address} onChange={(e) => set('address', e.target.value)} placeholder="Building, street, area" />
        <Field label="Landmark" value={site.landmark} onChange={(e) => set('landmark', e.target.value)} placeholder="Any nearby post office, market, hospital" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pincode" required value={site.pincode} onChange={(e) => set('pincode', e.target.value)} />
          <Field label="City" required value={site.city} onChange={(e) => set('city', e.target.value)} />
          <Field label="State" required value={site.state} onChange={(e) => set('state', e.target.value)} />
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">Exact location</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" value={site.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="e.g. 12.9698" />
          <Field label="Longitude" value={site.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="e.g. 77.7500" />
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">Operating window</span>
        <div className="grid grid-cols-2 gap-4">
          <input type="time" value={site.windowStart} onChange={(e) => set('windowStart', e.target.value)} className={inputCls} />
          <input type="time" value={site.windowEnd} onChange={(e) => set('windowEnd', e.target.value)} className={inputCls} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set('workingDays', site.workingDays.includes(d) ? site.workingDays.filter((x) => x !== d) : [...site.workingDays, d])}
              className={pillBtn(site.workingDays.includes(d))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">POC of Site</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={site.pocName} onChange={(e) => set('pocName', e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Phone</span>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
              <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">+91</span>
              <input value={site.pocPhone} onChange={(e) => set('pocPhone', e.target.value)} className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none" />
            </div>
          </label>
        </div>
        <div className="mt-4">
          <Field label="Email" type="email" value={site.pocEmail} onChange={(e) => set('pocEmail', e.target.value)} />
        </div>
      </div>
    </>
  )
}

function EditConsignorModal({ consignorNames, initial, isNew, onClose, onSave }) {
  const [party, setParty] = useState(initial)
  const [nameQuery, setNameQuery] = useState(initial.name ?? '')
  const [nameOpen, setNameOpen] = useState(false)
  // A brand-new consignor needs at least one pickup site up front, with the
  // same fields Add Site asks for. Which one is "default" is a Client
  // Configuration > Consignor concern, not this quick-add flow.
  const [sites, setSites] = useState(isNew ? [{ ...emptySite }] : [])

  function set(field, value) {
    setParty((prev) => ({ ...prev, [field]: value }))
  }
  function addSiteRow() {
    setSites((prev) => [...prev, { ...emptySite }])
  }
  function removeSiteRow(i) {
    setSites((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateSiteRow(i, field, value) {
    setSites((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  const nameMatches = nameQuery.trim()
    ? consignorNames.filter((n) => n.toLowerCase().includes(nameQuery.trim().toLowerCase()))
    : consignorNames

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{isNew ? 'Add Consignor' : 'Edit Consignor'}</h3>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="relative block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
              Consignor Name<span className="text-brand-orange-dark"> *</span>
            </span>
            <input
              value={nameQuery}
              onChange={(e) => { setNameQuery(e.target.value); set('name', e.target.value); setNameOpen(true) }}
              onFocus={() => setNameOpen(true)}
              placeholder="Search or type a new name"
              className={inputCls}
              disabled={!isNew}
            />
            {isNew && <span className="mt-1 block text-xs text-slate-400">Pick an existing catalog entry or create a new name</span>}
            {isNew && nameOpen && nameMatches.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNameOpen(false)} />
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
                  {nameMatches.map((n) => (
                    <button key={n} type="button" onClick={() => { set('name', n); setNameQuery(n); setNameOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </label>
          <Field label="Company Name" required value={party.company} onChange={(e) => set('company', e.target.value)} hint="Editable if shipping for another company" />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="POC Name" required value={party.pocName} onChange={(e) => set('pocName', e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
              POC Phone<span className="text-brand-orange-dark"> *</span>
            </span>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
              <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">+91</span>
              <input value={party.phone} onChange={(e) => set('phone', e.target.value)} className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none" />
            </div>
          </label>
        </div>

        <div className="mt-4">
          <Field label="POC Email" required type="email" value={party.email} onChange={(e) => set('email', e.target.value)} />
        </div>

        {isNew && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Pickup Site<span className="text-brand-orange-dark"> *</span>
              </span>
              <button type="button" onClick={addSiteRow} className="text-xs font-medium text-brand-orange-dark hover:underline">
                + Add another site
              </button>
            </div>
            <div className="space-y-4">
              {sites.map((s, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  {sites.length > 1 && (
                    <div className="flex items-center justify-end">
                      <button type="button" onClick={() => removeSiteRow(i)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500">
                        <Icon name="close" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <SiteFieldsBlock site={s} set={(field, value) => updateSiteRow(i, field, value)} topBorder={false} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(party, isNew ? { sites } : null)}
            className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// One consignor's pickup Site — type, address (+ exact lat/long), operating
// window, and the on-site POC. "Apply this update to" only shows
// when editing a site that already exists (oldKey set) — mirrors the old
// Create Pickup - Old flow's PartyModal toggle in spirit, though this pass
// only applies the edit to this session's own state either way (a site
// surfaced from order history isn't written back to that history yet).
function EditSiteModal({ initial, oldKey, onClose, onSave }) {
  const [site, setSite] = useState(initial)
  const [applyPermanently, setApplyPermanently] = useState(false)

  function set(field, value) {
    setSite((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{oldKey ? 'Edit Site' : 'Add Site'}</h3>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <SiteFieldsBlock site={site} set={set} />

        {oldKey && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Apply this update to</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
              <button type="button" onClick={() => setApplyPermanently(false)} className={`rounded-lg px-3.5 py-1.5 font-medium transition-colors ${!applyPermanently ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'}`}>
                Just this pickup
              </button>
              <button type="button" onClick={() => setApplyPermanently(true)} className={`rounded-lg px-3.5 py-1.5 font-medium transition-colors ${applyPermanently ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
                Update permanently
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Updates this saved site for this consignor and future pickups.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(site, applyPermanently)} className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// A Consignee (delivery-side business, grouped by company) mirrors the
// Consignor -> Site split: one company can have more than one delivery
// Site. Unlike a pickup Site, a consignee's site record here is the flatter
// shape orders.js already uses (name/address/pincode/city/state/phone/
// email) — no siteType/lat-long/operating-window, since that's pickup-only.
function EditConsigneeModal({ isNewCompany, company, onClose, onSave }) {
  const [companyName, setCompanyName] = useState(isNewCompany ? '' : company)
  const [site, setSite] = useState({ name: '', address: '', pincode: '', city: '', state: '', phone: '', email: '' })

  function set(field, value) {
    setSite((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{isNewCompany ? 'Add Consignee' : 'Add Site'}</h3>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {isNewCompany && (
            <Field label="Consignee Name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Business / brand name" />
          )}
          <Field label="Site Name" required value={site.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Store — Indiranagar" />
          <Field label="Address" required value={site.address} onChange={(e) => set('address', e.target.value)} placeholder="Building, street, area" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Pincode" required value={site.pincode} onChange={(e) => set('pincode', e.target.value)} />
            <Field label="City" required value={site.city} onChange={(e) => set('city', e.target.value)} />
            <Field label="State" required value={site.state} onChange={(e) => set('state', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">POC Phone</span>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
                <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">+91</span>
                <input value={site.phone} onChange={(e) => set('phone', e.target.value)} className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none" />
              </div>
            </label>
            <Field label="POC Email" type="email" value={site.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...site, company: isNewCompany ? companyName : company })}
            className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Bulk Pickup ------------------------------------------------------------
// One CSV upload → many one-time pickups, created in one click straight from
// this same screen (a modal, not a second route) — Yugal was explicit that
// this shouldn't repeat the old flow's "Create Pickup (list) -> New Pickup
// (separate page)" two-hop pattern. Column set/parser mirrors the old bulk
// order flow's own CSV machinery (the now-deleted BulkOrder.jsx) but reshaped for a Pickup's
// fields (consignor + drop Mini Hub + weight + schedule) instead of an
// Order's (consignor + consignee + package dims). Recurring pickups aren't
// supported via bulk upload — every row becomes a plain one-time (PU) pickup.
const BULK_COLUMNS = [
  'client_name', 'consignor_name', 'consignor_company', 'consignor_phone', 'consignor_email',
  'consignor_address', 'consignor_pincode', 'consignor_city', 'consignor_state',
  'drop_mini_hub', 'est_weight_kg', 'packages_estimate', 'pickup_date', 'pickup_time',
]
const BULK_REQUIRED_COLUMNS = BULK_COLUMNS.filter((c) => !['consignor_company', 'consignor_email', 'packages_estimate'].includes(c))
const BULK_SAMPLE_ROWS = [
  {
    client_name: 'Nykaa', consignor_name: 'Nykaa FC Bhiwandi', consignor_company: 'Nykaa', consignor_phone: '9820011223', consignor_email: 'fc.bhiwandi@nykaa.com',
    consignor_address: 'Plot 12, MIDC Industrial Area', consignor_pincode: '400001', consignor_city: 'Mumbai', consignor_state: 'Maharashtra',
    drop_mini_hub: 'Andheri Depot', est_weight_kg: '120', packages_estimate: '4', pickup_date: '2026-09-20', pickup_time: '11:00',
  },
  {
    client_name: 'Lenskart', consignor_name: 'Lenskart Warehouse', consignor_company: 'Lenskart Solutions Pvt Ltd', consignor_phone: '9911022334', consignor_email: '',
    consignor_address: 'Udyog Vihar Phase 4', consignor_pincode: '122001', consignor_city: 'Gurugram', consignor_state: 'Haryana',
    drop_mini_hub: 'Udyog Vihar Yard', est_weight_kg: '95', packages_estimate: '', pickup_date: '2026-09-21', pickup_time: '14:30',
  },
]

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
function isValidDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
}
function isValidTime(v) {
  return /^\d{2}:\d{2}$/.test(v)
}
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCsv(rows) {
  const lines = [BULK_COLUMNS.join(',')]
  rows.forEach((row) => lines.push(BULK_COLUMNS.map((c) => csvCell(row[c])).join(',')))
  return lines.join('\n')
}
function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
// Minimal RFC4180-ish CSV parser — handles quoted fields (addresses with
// commas survive) without pulling in a library for a prototype-scale sheet.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') pushField()
    else if (ch === '\r') continue
    else if (ch === '\n') pushRow()
    else field += ch
  }
  if (field.length || row.length) pushRow()
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function validateBulkRow(record) {
  const errors = []
  const client = ACTIVE_CLIENTS_SEED.find((c) => c.name.toLowerCase() === (record.client_name || '').trim().toLowerCase())
  if (!record.client_name) errors.push('Missing client_name')
  else if (!client) errors.push(`Unknown client "${record.client_name}"`)

  const hub = MINI_HUBS.find((h) => h.name.toLowerCase() === (record.drop_mini_hub || '').trim().toLowerCase())
  if (!record.drop_mini_hub) errors.push('Missing drop_mini_hub')
  else if (!hub) errors.push(`Unknown drop_mini_hub "${record.drop_mini_hub}"`)

  BULK_REQUIRED_COLUMNS.forEach((col) => {
    if (col === 'client_name' || col === 'drop_mini_hub') return
    if (!String(record[col] ?? '').trim()) errors.push(`Missing ${col}`)
  })

  if (record.consignor_phone && !/^\d{10}$/.test(record.consignor_phone.trim())) errors.push('consignor_phone must be 10 digits')
  if (record.consignor_pincode && !/^\d{6}$/.test(record.consignor_pincode.trim())) errors.push('consignor_pincode must be 6 digits')
  if (record.consignor_email && !isValidEmail(record.consignor_email.trim())) errors.push('consignor_email is invalid')
  if (record.est_weight_kg && !(Number(record.est_weight_kg) > 0)) errors.push('est_weight_kg must be a positive number')
  if (record.packages_estimate && !(Number(record.packages_estimate) > 0)) errors.push('packages_estimate must be a positive number')
  if (record.pickup_date && !isValidDate(record.pickup_date)) errors.push('pickup_date must be YYYY-MM-DD')
  if (record.pickup_time && !isValidTime(record.pickup_time)) errors.push('pickup_time must be HH:MM')

  return { record, client, hub, errors }
}

function BulkPickupModal({ onClose, onCreated }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState(null)
  const [parseError, setParseError] = useState('')

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? []
  const invalidRows = rows?.filter((r) => r.errors.length > 0) ?? []

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setParseError('')
    const reader = new FileReader()
    reader.onload = () => {
      const table = parseCsv(String(reader.result))
      if (table.length < 2) {
        setParseError('No data rows found in this file.')
        setRows(null)
        return
      }
      const header = table[0].map((h) => h.trim())
      const missingCols = BULK_COLUMNS.filter((c) => !header.includes(c))
      if (missingCols.length) {
        setParseError(`Missing column${missingCols.length > 1 ? 's' : ''}: ${missingCols.join(', ')}`)
        setRows(null)
        return
      }
      const parsed = table.slice(1).map((cells) => {
        const record = Object.fromEntries(header.map((col, i) => [col, (cells[i] ?? '').trim()]))
        return validateBulkRow(record)
      })
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  function handleCreate() {
    validRows.forEach(({ record, client, hub }) => {
      createPickup({
        clientId: client.id,
        clientName: client.name,
        consignor: {
          name: record.consignor_name, company: record.consignor_company, phone: record.consignor_phone, email: record.consignor_email,
          address: record.consignor_address, pincode: record.consignor_pincode, city: record.consignor_city, state: record.consignor_state,
        },
        dropMiniHubId: hub.id,
        estWeightKg: record.est_weight_kg,
        packagesEstimate: record.packages_estimate || null,
        pickupType: PICKUP_TYPE.ONE_TIME,
        scheduledDate: record.pickup_date,
        scheduledTime: record.pickup_time,
      })
    })
    onCreated(validRows.length)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Bulk Pickup</h3>
            <p className="mt-1 text-sm text-slate-500">Upload a CSV to book several pickups at once — each row becomes one one-time pickup.</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => downloadCsv('bulk-pickup-template.csv', toCsv(BULK_SAMPLE_ROWS))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            Download sample CSV
          </button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Icon name="upload" className="h-3.5 w-3.5" />
            {fileName || 'Upload CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0] ?? null)} />
          </label>
        </div>

        {parseError && <p className="mt-3 text-sm text-rose-600">{parseError}</p>}

        {rows && !parseError && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">{validRows.length} ready</span>
              {invalidRows.length > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-600">{invalidRows.length} with errors</span>}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Consignor</th>
                    <th className="px-3 py-2">Drop Mini Hub</th>
                    <th className="px-3 py-2">Pickup</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ record, errors }, i) => (
                    <tr key={i} className={errors.length ? 'bg-rose-50/40' : ''}>
                      <td className="px-3 py-2 text-slate-700">{record.client_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{record.consignor_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{record.drop_mini_hub || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{record.pickup_date} {record.pickup_time}</td>
                      <td className="px-3 py-2">
                        {errors.length === 0 ? (
                          <span className="text-emerald-600">Ready</span>
                        ) : (
                          <span className="text-rose-600" title={errors.join('; ')}>{errors[0]}{errors.length > 1 ? ` +${errors.length - 1} more` : ''}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={validRows.length === 0}
            className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create {validRows.length || ''} pickup{validRows.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreatePickup() {
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))
  const [version, setVersion] = useState(0)

  // Standing in for a scheduled job in this no-backend prototype — promotes
  // any Draft past its lock window to CREATED, and tops up recurring series'
  // rolling windows, so this screen's own "Last 5 pickups" list and any
  // freshly generated PS occurrences are current whenever this page mounts.
  useEffect(() => {
    refreshPickupLocks()
    refreshRecurringWindows()
    setVersion((v) => v + 1)
  }, [])

  const [clientId, setClientId] = useState(ACTIVE_CLIENTS_SEED[0]?.id ?? '')
  const client = ACTIVE_CLIENTS_SEED.find((c) => c.id === clientId)

  const savedConsignors = useMemo(() => savedPickupAddressesForClient(clientId), [clientId, ordersSeed])
  const lastPickups = useMemo(
    () => PICKUPS_SEED.filter((p) => p.clientId === clientId).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, version],
  )

  // Consignor identity, grouped from order history by name — one consignor
  // can have more than one Site under them (below), which is the dropdown-
  // then-sites shape asked for, not one merged "site card" record.
  const consignorGroups = useMemo(() => {
    const map = new Map()
    savedConsignors.forEach((p) => {
      if (!map.has(p.name)) map.set(p.name, { name: p.name, company: p.company, pocName: p.pocName ?? '', phone: p.phone, email: p.email, sites: [] })
      map.get(p.name).sites.push(p)
    })
    return [...map.values()]
  }, [savedConsignors])

  const [consignorName, setConsignorName] = useState('')
  const [consignor, setConsignor] = useState(emptyConsignor)
  const [showEditConsignor, setShowEditConsignor] = useState(false)
  const [isNewConsignor, setIsNewConsignor] = useState(true)

  // Sites added this session, layered on top of whatever order history
  // already has for that consignor — same no-backend "mutable in-memory"
  // convention the rest of this prototype uses, keyed by consignor name so
  // switching consignors shows the right set.
  const [extraSitesByConsignor, setExtraSitesByConsignor] = useState({})
  function sitesFor(name) {
    const fromHistory = consignorGroups.find((g) => g.name === name)?.sites ?? []
    return [...fromHistory, ...(extraSitesByConsignor[name] ?? [])]
  }
  const availableSites = consignorName ? sitesFor(consignorName) : []

  const [siteKey, setSiteKey] = useState('')
  const [site, setSite] = useState(null)
  const [showEditSite, setShowEditSite] = useState(false)
  const [isNewSite, setIsNewSite] = useState(true)

  const savedConsignees = useMemo(() => savedDeliveryAddressesForClient(clientId), [clientId, ordersSeed])
  // Sites added this session for a consignee — same session-local, keyed-
  // by-identity convention as extraSitesByConsignor.
  const [extraSitesByConsignee, setExtraSitesByConsignee] = useState({})
  // Same Consignee -> Site split as the pickup side: a consignee (the
  // business, grouped by company) can have more than one delivery Site.
  const consigneeGroups = useMemo(() => {
    const map = new Map()
    savedConsignees.forEach((p) => {
      if (!map.has(p.company)) map.set(p.company, { company: p.company, sites: [] })
      map.get(p.company).sites.push(p)
    })
    Object.entries(extraSitesByConsignee).forEach(([company, sites]) => {
      if (!map.has(company)) map.set(company, { company, sites: [] })
      map.get(company).sites.push(...sites)
    })
    return [...map.values()]
  }, [savedConsignees, extraSitesByConsignee])

  const [destinations, setDestinations] = useState([{ id: 1, company: '', siteKey: '', consignee: null, boxes: '', kg: '', over50k: false, destLabel: '' }])
  const destSeqRef = useState({ current: 2 })[0]
  const [consigneeUnknown, setConsigneeUnknown] = useState(false)
  const [showEditConsignee, setShowEditConsignee] = useState(false)
  const [editConsigneeIsNewCompany, setEditConsigneeIsNewCompany] = useState(true)
  const [editConsigneeRowId, setEditConsigneeRowId] = useState(null)
  const [editConsigneeCompany, setEditConsigneeCompany] = useState('')
  function addDestination() {
    setDestinations((prev) => [...prev, { id: destSeqRef.current++, company: '', siteKey: '', consignee: null, boxes: '', kg: '', over50k: false, destLabel: '' }])
  }
  function removeDestination(id) {
    setDestinations((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev))
  }
  function updateDestination(id, field, value) {
    setDestinations((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }
  function selectDestinationCompany(id, company) {
    if (company === '__add_new__') {
      setEditConsigneeIsNewCompany(true)
      setEditConsigneeCompany('')
      setEditConsigneeRowId(id)
      setShowEditConsignee(true)
      return
    }
    const sites = consigneeGroups.find((g) => g.company === company)?.sites ?? []
    const auto = sites.length === 1 ? sites[0] : null
    setDestinations((prev) => prev.map((d) => (d.id === id ? {
      ...d, company, siteKey: auto ? `${auto.name}|${auto.pincode}` : '', consignee: auto,
    } : d)))
  }
  function selectDestinationSite(id, key) {
    if (key === '__add_new__') {
      const company = destinations.find((d) => d.id === id)?.company ?? ''
      setEditConsigneeIsNewCompany(false)
      setEditConsigneeCompany(company)
      setEditConsigneeRowId(id)
      setShowEditConsignee(true)
      return
    }
    setDestinations((prev) => prev.map((d) => {
      if (d.id !== id) return d
      const found = consigneeGroups.find((g) => g.company === d.company)?.sites.find((s) => `${s.name}|${s.pincode}` === key) ?? null
      return { ...d, siteKey: key, consignee: found }
    }))
  }
  function handleSaveConsigneeSite(record) {
    setExtraSitesByConsignee((prev) => ({ ...prev, [record.company]: [...(prev[record.company] ?? []), record] }))
    setDestinations((prev) => prev.map((d) => (d.id === editConsigneeRowId ? {
      ...d, company: record.company, siteKey: `${record.name}|${record.pincode}`, consignee: record,
    } : d)))
    setShowEditConsignee(false)
  }

  function selectSite(p) {
    setSiteKey(`${p.address}|${p.pincode}`)
    // A site surfaced from order history already has real bookings behind
    // it, so treat it as verified even though this prototype has no separate
    // site-verification workflow to have actually set that flag.
    setSite({ ...emptySite, ...p, verified: p.verified ?? true })
  }

  function handleClientChange(id) {
    setClientId(id)
    setConsignorName('')
    setConsignor(emptyConsignor)
    setSiteKey('')
    setSite(null)
    setDestinations([{ id: 1, company: '', siteKey: '', consignee: null, boxes: '', kg: '', over50k: false, destLabel: '' }])
    setExtraSitesByConsignee({})
    setConsigneeUnknown(false)
  }
  function handleConsignorPick(name) {
    setConsignorName(name)
    setSiteKey('')
    setSite(null)
    if (!name) {
      setConsignor(emptyConsignor)
      return
    }
    const group = consignorGroups.find((g) => g.name === name)
    setConsignor(group ? { name: group.name, company: group.company, pocName: group.pocName, phone: group.phone, email: group.email } : emptyConsignor)
    const sites = sitesFor(name)
    if (sites.length === 1) selectSite(sites[0])
  }
  function handleSaveConsignor(party, siteData) {
    setConsignor(party)
    setConsignorName(party.name)
    const filled = siteData?.sites.filter((s) => s.address && s.pincode && s.city && s.state) ?? []
    if (filled.length > 0) {
      const records = filled.map((s) => ({ ...emptySite, ...s }))
      setExtraSitesByConsignor((prev) => ({ ...prev, [party.name]: [...(prev[party.name] ?? []), ...records] }))
      selectSite(records[0])
    } else {
      setSiteKey('')
      setSite(null)
    }
    setShowEditConsignor(false)
  }
  // "Update permanently" only patches this session's own extraSitesByConsignor
  // — a site edited here that came straight from order history isn't written
  // back to that history in this pass, same scope limit as the rest of this
  // prototype's read-only seed data.
  function handleSaveSite(siteRecord) {
    setExtraSitesByConsignor((prev) => {
      const list = prev[consignorName] ?? []
      const idx = list.findIndex((p) => `${p.address}|${p.pincode}` === siteKey)
      if (idx === -1) return { ...prev, [consignorName]: [...list, siteRecord] }
      const next = [...list]
      next[idx] = siteRecord
      return { ...prev, [consignorName]: next }
    })
    selectSite(siteRecord)
    setShowEditSite(false)
  }

  const [contentType, setContentType] = useState('')
  const [contentDescription, setContentDescription] = useState('')
  const [fragile, setFragile] = useState(false)
  const [hazardous, setHazardous] = useState(false)
  const [hazardClass, setHazardClass] = useState('')
  const [unNumber, setUnNumber] = useState('')

  const [estWeight, setEstWeight] = useState('')
  const [estimatedBoxes, setEstimatedBoxes] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')


  const [repeatPickup, setRepeatPickup] = useState(false)
  const [repeatFrequency, setRepeatFrequency] = useState('Weekly')
  const [repeatDays, setRepeatDays] = useState([])
  const [repeatEndDate, setRepeatEndDate] = useState('')
  function toggleRepeatDay(day) {
    setRepeatDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const [helperOpen, setHelperOpen] = useState(false)
  const [helperCounts, setHelperCounts] = useState(Object.fromEntries(HELPER_TYPES.map((t) => [t, 0])))
  const totalHelpers = Object.values(helperCounts).reduce((a, b) => a + b, 0)
  function bumpHelper(type, delta) {
    setHelperCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] + delta) }))
  }

  const [materialsOpen, setMaterialsOpen] = useState(false)
  const [materials, setMaterials] = useState([])
  function toggleMaterial(m) {
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const [dropMiniHubId, setDropMiniHubId] = useState('')
  const [paymentTerm, setPaymentTerm] = useState(PAYMENT_TERMS[0])
  const [instructions, setInstructions] = useState('')

  const [showConfirmed, setShowConfirmed] = useState(false)
  const [lastCreated, setLastCreated] = useState(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkCreatedCount, setBulkCreatedCount] = useState(null)
  // What actually goes on the Pickup record — the consignor's identity plus
  // whichever of their sites is currently chosen, flattened into the same
  // shape downstream pages (Last 5 Pickups, PRS, MyOrders) already expect
  // from a single "consignor" object.
  const fullConsignor = { ...consignor, ...(site ?? {}) }
  // Consignee List is optional, but once someone starts splitting weight/boxes
  // across consignees there, those totals must foot to Shipment Details'
  // own estimate — otherwise the split silently disagrees with the docket.
  const destWeightEntered = destinations.some((d) => d.kg !== '')
  const destBoxesEntered = destinations.some((d) => d.boxes !== '')
  const destWeightTotal = destinations.reduce((s, d) => s + (Number(d.kg) || 0), 0)
  const destBoxesTotal = destinations.reduce((s, d) => s + (Number(d.boxes) || 0), 0)
  const weightMismatch = destWeightEntered && destWeightTotal !== Number(estWeight || 0)
  const boxesMismatch = destBoxesEntered && destBoxesTotal !== Number(estimatedBoxes || 0)
  const canSubmit = Boolean(
    client && consignor.name && site && pickupDate && pickupTime && estWeight && (!hazardous || hazardClass) && !weightMismatch && !boxesMismatch
      && (!repeatPickup || repeatEndDate),
  )
  function handleConfirm() {
    if (!canSubmit) return
    // Everything product added beyond the devs' original fields (shipment
    // nature, per-consignee destination split, booking-data source, e-way
    // bill) doesn't have its own dedicated column on a Pickup — bundled as
    // one `details` bag instead of exploding createPickup's own signature
    // further for fields nothing downstream (PRS/MyOrders) reads yet.
    const details = {
      contentType, contentDescription, fragile, hazardous, hazardClass, unNumber,
      estimatedBoxes: estimatedBoxes ? Number(estimatedBoxes) : null,
      destinations: destinations.filter((d) => consigneeUnknown || d.consignee).map((d, i) => ({
        consignee: consigneeUnknown ? { name: d.destLabel || String.fromCharCode(65 + i) } : d.consignee,
        deliveryMiniHubId: dropMiniHubId || null,
        boxes: d.boxes ? Number(d.boxes) : null, kg: d.kg ? Number(d.kg) : null, over50k: d.over50k,
      })),
    }
    let created
    let seriesGeneratedCount = 1
    if (repeatPickup) {
      const series = createRecurringSeries({
        clientId,
        clientName: client?.name ?? '',
        consignor: fullConsignor,
        dropMiniHubId: dropMiniHubId || null,
        estWeightKg: estWeight,
        packagesEstimate: estimatedBoxes || null,
        frequency: repeatFrequency,
        days: repeatDays,
        endType: REPEAT_END_TYPE.ON_DATE,
        endDate: repeatEndDate || null,
        anchorDate: pickupDate,
        scheduledTime: pickupTime,
        paymentTerm,
        details,
      })
      const generated = PICKUPS_SEED.filter((p) => p.recurringSeriesId === series.id)
      created = generated[0] ?? null
      seriesGeneratedCount = generated.length
    } else {
      created = createPickup({
        clientId,
        clientName: client?.name ?? '',
        consignor: fullConsignor,
        dropMiniHubId: dropMiniHubId || null,
        estWeightKg: estWeight,
        packagesEstimate: estimatedBoxes || null,
        pickupType: PICKUP_TYPE.ONE_TIME,
        scheduledDate: pickupDate,
        scheduledTime: pickupTime,
        paymentTerm,
        details,
      })
    }
    setLastCreated(created ? { ...created, seriesGeneratedCount } : null)
    setVersion((v) => v + 1)
    setShowConfirmed(true)
    setTimeout(() => setShowConfirmed(false), 1800)
    // Reset the per-pickup fields (not the client) so logging several
    // pickups for the same client back-to-back doesn't require re-picking it.
    setConsignorName('')
    setConsignor(emptyConsignor)
    setSiteKey('')
    setSite(null)
    setDestinations([{ id: 1, company: '', siteKey: '', consignee: null, boxes: '', kg: '', over50k: false, destLabel: '' }])
    setExtraSitesByConsignee({})
    setConsigneeUnknown(false)
    setDropMiniHubId('')
    setPaymentTerm(PAYMENT_TERMS[0])
    setContentType('')
    setContentDescription('')
    setFragile(false)
    setHazardous(false)
    setDeclaredValueOver50k(false)
    setHazardClass('')
    setUnNumber('')
    setEstWeight('')
    setEstimatedBoxes('')
    setPickupDate('')
    setPickupTime('')
    setEwbApplicable(true)
    setInstructions('')
    setRepeatPickup(false)
    setRepeatDays([])
    setRepeatEnds('Never')
    setRepeatEndDate('')
    setRepeatCount('')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Create Pickup Request</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowBulkModal(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-soft hover:bg-slate-50"
        >
          <Icon name="upload" className="h-4 w-4" />
          Bulk Pickup
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className={`space-y-5 p-6 ${card}`}>
          <Typeahead
            label="Client"
            required
            value={client?.name ?? ''}
            onChange={handleClientChange}
            options={ACTIVE_CLIENTS_SEED.map((c) => ({ id: c.id, label: c.name }))}
            placeholder="Search clients…"
          />

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
              Consignor<span className="text-brand-orange-dark"> *</span>
            </span>
            <select
              value={consignorName}
              onChange={(e) => {
                const v = e.target.value
                if (v === '__add_new__') { setIsNewConsignor(true); setShowEditConsignor(true); return }
                handleConsignorPick(v)
              }}
              className={`appearance-none ${inputCls}`}
            >
              <option value="">Select a consignor…</option>
              {consignorGroups.map((g) => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
              <option value="__add_new__" style={{ color: '#A83710', fontWeight: 700 }}>+ Add new consignor</option>
            </select>
          </div>

          {consignorName && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                Site<span className="text-brand-orange-dark"> *</span>
              </span>
              <div className="space-y-3">
                {site && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{consignor.name}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{site.siteType}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${site.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {site.verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => { setIsNewSite(false); setShowEditSite(true) }} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Edit site
                        </button>
                        {/* Always a <select>, never a button that swaps into one — so
                            there's no layout change/reflow on click at all, just the
                            browser's native dropdown opening in place. Controlled back
                            to value="" every render so it keeps showing "Select Other
                            Site" as its label instead of whatever was last picked. */}
                        <select
                          value=""
                          onChange={(e) => {
                            const v = e.target.value
                            if (!v) return
                            if (v === '__add_new__') { setIsNewSite(true); setShowEditSite(true); return }
                            const p = availableSites.find((s) => `${s.address}|${s.pincode}` === v)
                            if (p) selectSite(p)
                          }}
                          className="w-40 max-w-[10rem] shrink-0 appearance-none truncate rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                        >
                          <option value="" disabled hidden>Select Other Site</option>
                          {availableSites
                            .filter((p) => `${p.address}|${p.pincode}` !== siteKey)
                            .map((p) => (
                              <option key={`${p.address}|${p.pincode}`} value={`${p.address}|${p.pincode}`}>{p.city} — {p.address}</option>
                            ))}
                          <option value="__add_new__" style={{ color: '#A83710', fontWeight: 700 }}>+ Add new site</option>
                        </select>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {site.address}{site.city ? `, ${site.city}` : ''}{site.pincode ? ` ${site.pincode}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {site.windowStart && site.windowEnd && <>Window: {site.windowStart}–{site.windowEnd} · </>}
                      {site.workingDays?.length ? site.workingDays.join(' ') : ''}
                    </p>
                    {(site.pocName || site.pocPhone || site.pocEmail) && (
                      <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                        POC: {site.pocName || '—'} · {site.pocPhone ? `+91 ${site.pocPhone}` : '—'} · {site.pocEmail || '—'}
                      </p>
                    )}
                  </div>
                )}

                {!site && (
                  <>
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                    {availableSites.length === 0 ? 'No sites on file yet for this consignor.' : 'Pick a site.'}
                  </p>
                  <div className="flex items-end gap-2">
                    {availableSites.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === '__add_new__') { setIsNewSite(true); setShowEditSite(true); return }
                          const p = availableSites.find((s) => `${s.address}|${s.pincode}` === v)
                          if (p) selectSite(p)
                        }}
                        className={`appearance-none ${inputCls}`}
                      >
                        <option value="" disabled>Select a site…</option>
                        {availableSites.map((p) => (
                          <option key={`${p.address}|${p.pincode}`} value={`${p.address}|${p.pincode}`}>{p.city} — {p.address}</option>
                        ))}
                        <option value="__add_new__" style={{ color: '#A83710', fontWeight: 700 }}>+ Add new site</option>
                      </select>
                    )}
                    {availableSites.length === 0 && (
                      <button
                        type="button"
                        onClick={() => { setIsNewSite(true); setShowEditSite(true) }}
                        className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-2 text-xs font-medium text-brand-orange-dark hover:bg-brand-orange/20"
                      >
                        + Add new site
                      </button>
                    )}
                  </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pickup date" required type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                Pickup time<span className="text-brand-orange-dark"> *</span>
              </span>
              <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={inputCls} />
              {site?.windowStart && site?.windowEnd && (
                <span className="mt-1 block text-xs text-slate-400">Within site window {site.windowStart}–{site.windowEnd}</span>
              )}
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={repeatPickup} onChange={(e) => setRepeatPickup(e.target.checked)} className="h-4 w-4 rounded accent-brand-orange" />
              Repeat this pickup
            </label>
            {repeatPickup && (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Every
                  <select value={repeatFrequency} onChange={(e) => setRepeatFrequency(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40">
                    {REPEAT_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
                {repeatFrequency === 'Weekly' && (
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <button key={d} type="button" onClick={() => toggleRepeatDay(d)} className={pillBtn(repeatDays.includes(d))}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <span className="mb-1.5 block text-xs text-slate-400">
                    Ends<span className="text-brand-orange-dark"> *</span>
                  </span>
                  <input
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                    max={client?.contractEnd || undefined}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
                  />
                  {client?.contractEnd && (
                    <span className="mt-1 block text-xs text-slate-400">Can't go past the client's contract end ({client.contractEnd})</span>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Repeats {repeatFrequency.toLowerCase()}
                    {repeatFrequency === 'Weekly' && repeatDays.length ? ` on ${repeatDays.join(', ')}` : ''}
                    {(repeatFrequency !== 'Weekly' || repeatDays.length > 0) && `, until ${repeatEndDate || '—'}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Shipment Details</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estimated weight (kg)" required type="number" value={estWeight} onChange={(e) => setEstWeight(e.target.value)} />
              <Field label="Estimated box count" type="number" value={estimatedBoxes} onChange={(e) => setEstimatedBoxes(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500">Content type</span>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={`appearance-none ${inputCls}`}>
                  <option value="">Select the nature of goods</option>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Content description"
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                placeholder="e.g. Cosmetics"
              />
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={fragile} onChange={(e) => setFragile(e.target.checked)} className="h-4 w-4 rounded accent-brand-orange" />
                Fragile material
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={hazardous} onChange={(e) => setHazardous(e.target.checked)} className="h-4 w-4 rounded accent-rose-500" />
                Hazardous / dangerous goods
              </label>
            </div>
            {hazardous && (
              <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">
                      Hazard class<span className="text-brand-orange-dark"> *</span>
                    </span>
                    <select value={hazardClass} onChange={(e) => setHazardClass(e.target.value)} className={`appearance-none ${inputCls}`}>
                      <option value="">Select class</option>
                      {HAZARD_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="UN number" value={unNumber} onChange={(e) => setUnNumber(e.target.value)} placeholder="e.g. UN3481" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Consignee List</span>
              <button type="button" onClick={addDestination} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                + Add more consignee
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={consigneeUnknown} onChange={(e) => setConsigneeUnknown(e.target.checked)} className="h-4 w-4 rounded accent-brand-orange" />
              Don't Know Exact consignee details
            </label>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    {consigneeUnknown ? (
                      <th className="pb-2 pr-2">Consignee</th>
                    ) : (
                      <>
                        <th className="pb-2 pr-2">Consignee</th>
                        <th className="pb-2 px-2">Site</th>
                      </>
                    )}
                    <th className="pb-2 px-2">Estimated Weight (kg)</th>
                    <th className="pb-2 px-2">Estimated Box count</th>
                    <th className="pb-2 px-2 text-center">Declared value ≥ ₹50k</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {destinations.map((d, i) => {
                    const sitesForCompany = consigneeGroups.find((g) => g.company === d.company)?.sites ?? []
                    return (
                      <tr key={d.id}>
                        {consigneeUnknown ? (
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={d.destLabel || String.fromCharCode(65 + i)}
                              onChange={(e) => updateDestination(d.id, 'destLabel', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700"
                            />
                          </td>
                        ) : (
                          <>
                            <td className="py-2 pr-2">
                              <select
                                value={d.company}
                                onChange={(e) => selectDestinationCompany(d.id, e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                              >
                                <option value="">Select consignee</option>
                                {consigneeGroups.map((g) => (
                                  <option key={g.company} value={g.company}>{g.company}</option>
                                ))}
                                <option value="__add_new__" style={{ color: '#A83710', fontWeight: 700 }}>+ Add new consignee</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={d.siteKey}
                                onChange={(e) => selectDestinationSite(d.id, e.target.value)}
                                disabled={!d.company}
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40 disabled:opacity-50"
                              >
                                <option value="">Select site</option>
                                {sitesForCompany.map((p) => (
                                  <option key={`${p.name}|${p.pincode}`} value={`${p.name}|${p.pincode}`}>{p.name} — {p.city}</option>
                                ))}
                                <option value="__add_new__" style={{ color: '#A83710', fontWeight: 700 }}>+ Add new site</option>
                              </select>
                            </td>
                          </>
                        )}
                        <td className="py-2 px-2">
                          <input type="number" value={d.kg} onChange={(e) => updateDestination(d.id, 'kg', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" value={d.boxes} onChange={(e) => updateDestination(d.id, 'boxes', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input type="checkbox" checked={d.over50k} onChange={(e) => updateDestination(d.id, 'over50k', e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
                        </td>
                        <td className="py-2 pl-2 text-right">
                          {destinations.length > 1 && (
                            <button type="button" onClick={() => removeDestination(d.id)} className="text-slate-400 hover:text-rose-500">
                              <Icon name="close" className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-slate-100 text-xs font-medium">
                    <td className="pt-2 pr-2 text-slate-400" colSpan={consigneeUnknown ? 1 : 2}>Total</td>
                    <td className="pt-2 px-2">
                      <span className={weightMismatch ? 'text-rose-600' : destWeightEntered ? 'text-emerald-600' : 'text-slate-400'}>
                        {destWeightTotal}/{estWeight || 0}
                      </span>
                    </td>
                    <td className="pt-2 px-2">
                      <span className={boxesMismatch ? 'text-rose-600' : destBoxesEntered ? 'text-emerald-600' : 'text-slate-400'}>
                        {destBoxesTotal}/{estimatedBoxes || 0}
                      </span>
                    </td>
                    <td className="pt-2 px-2" />
                    <td className="pt-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Helper types needed</span>
              <div className="relative">
                <button type="button" onClick={() => setHelperOpen((v) => !v)} className={`flex items-center justify-between ${inputCls}`}>
                  <span className={totalHelpers ? 'text-slate-800' : 'text-slate-400'}>
                    {totalHelpers ? `${totalHelpers} helper${totalHelpers === 1 ? '' : 's'} selected` : 'Select helper types needed'}
                  </span>
                  <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${helperOpen ? 'rotate-180' : ''}`} />
                </button>
                {helperOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setHelperOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-soft">
                      {HELPER_TYPES.map((t) => (
                        <div key={t} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-700">
                          {t}
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => bumpHelper(t, -1)} className="h-6 w-6 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                              −
                            </button>
                            <span className="w-4 text-center tabular-nums">{helperCounts[t]}</span>
                            <button type="button" onClick={() => bumpHelper(t, 1)} className="h-6 w-6 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Materials needed</span>
              <div className="relative">
                <button type="button" onClick={() => setMaterialsOpen((v) => !v)} className={`flex items-center justify-between ${inputCls}`}>
                  <span className={materials.length ? 'text-slate-800' : 'text-slate-400'}>{materials.length ? `${materials.length} selected` : 'Select materials needed'}</span>
                  <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${materialsOpen ? 'rotate-180' : ''}`} />
                </button>
                {materialsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMaterialsOpen(false)} />
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-soft">
                      {MATERIALS.map((m) => (
                        <label key={m} className="flex items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <input type="checkbox" checked={materials.includes(m)} onChange={() => toggleMaterial(m)} className="h-3.5 w-3.5 rounded accent-brand-orange" />
                          {m}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Special instructions</span>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className={inputCls} />
          </label>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm pickup
            </button>
          </div>
        </div>

        <div className={`h-fit space-y-3 p-5 ${card}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last 5 pickups — {client?.name ?? '—'}</h3>
          {lastPickups.length === 0 ? (
            <p className="text-sm text-slate-400">No pickups on file for this client yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {lastPickups.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{p.id}</div>
                    <div className="text-xs text-slate-400">
                      {p.consignor.city} → {p.dropMiniHubName || 'no hub yet'}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${PICKUP_STATUS_BADGE[p.status]}`}>{PICKUP_STATUS_LABEL[p.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirmed && lastCreated && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-soft">
            <h3 className="text-base font-semibold text-slate-900">Your pickup is confirmed</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              {lastCreated.seriesGeneratedCount > 1
                ? `${lastCreated.seriesGeneratedCount} recurring pickups created, starting with ${lastCreated.id} — ${lastCreated.clientName} · ${lastCreated.estWeightKg} kg${lastCreated.dropMiniHubName ? ` · drop at ${lastCreated.dropMiniHubName}` : ''}.`
                : `${lastCreated.id} — ${lastCreated.clientName} · ${lastCreated.estWeightKg} kg${lastCreated.dropMiniHubName ? ` · drop at ${lastCreated.dropMiniHubName}` : ''}.`}
            </p>
          </div>
        </div>
      )}

      {showEditConsignor && (
        <EditConsignorModal
          consignorNames={consignorGroups.map((g) => g.name)}
          initial={isNewConsignor ? { ...emptyConsignor, company: client?.name ?? '' } : consignor}
          isNew={isNewConsignor}
          onClose={() => setShowEditConsignor(false)}
          onSave={handleSaveConsignor}
        />
      )}

      {showEditSite && (
        <EditSiteModal
          initial={isNewSite ? emptySite : (site ?? emptySite)}
          oldKey={isNewSite ? null : (site ? siteKey : null)}
          onClose={() => setShowEditSite(false)}
          onSave={handleSaveSite}
        />
      )}

      {showEditConsignee && (
        <EditConsigneeModal
          isNewCompany={editConsigneeIsNewCompany}
          company={editConsigneeCompany}
          onClose={() => setShowEditConsignee(false)}
          onSave={handleSaveConsigneeSite}
        />
      )}

      {showBulkModal && (
        <BulkPickupModal
          onClose={() => setShowBulkModal(false)}
          onCreated={(count) => {
            setShowBulkModal(false)
            setBulkCreatedCount(count)
            setVersion((v) => v + 1)
            setTimeout(() => setBulkCreatedCount(null), 2500)
          }}
        />
      )}

      {bulkCreatedCount !== null && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-soft">
            <h3 className="text-base font-semibold text-slate-900">{bulkCreatedCount} pickup{bulkCreatedCount === 1 ? '' : 's'} created</h3>
            <p className="mt-1.5 text-sm text-slate-500">Each one lands the same way a single pickup would — Draft if it's more than {EDIT_LOCK_HOURS}h out, locked and ready for PRS otherwise.</p>
          </div>
        </div>
      )}
    </div>
  )
}

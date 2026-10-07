import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { card, thCls, rowCls } from '../../components/ui.js'
import { INDIAN_STATES, lookupPincode, STATE_TO_GST_CODE } from '../../data/geo.js'
import {
  STATES, citiesForStates, pincodesForCities, citiesUnderStates, pincodesUnderCities,
  TERRITORIES, circlesForTerritories, circlesUnderTerritories,
} from '../../data/permissions.js'
import { submitPartnerForApproval } from '../../data/partners.js'
import {
  PARTNER_ACTIVATION_STATUS, PARTNER_ACTIVATIONS_SEED,
  createPartnerActivation, updatePartnerActivationStatus, removePartnerActivation,
} from '../../data/partnerActivations.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { VEHICLE_TYPES } from '../../data/fleet.js'

// Create Partner wizard — being built step by step per Yugal's prompts.
// Fields below are placeholders based on the Softpal vendor-onboarding
// reference he shared, trimmed steps (no separate Vendor Mapping step) —
// expect these to change once he sends the real field list.
const STEPS = [
  { key: 'partner', label: 'Partner Info', icon: 'building' },
  { key: 'contact', label: 'Contact Info', icon: 'onboarding' },
  { key: 'gstin', label: 'GSTIN Info', icon: 'shield' },
  { key: 'billing', label: 'Billing Info', icon: 'invoice' },
  { key: 'pricing', label: 'Pricing', icon: 'tag' },
  { key: 'kyc', label: 'KYC', icon: 'mis' },
]

const PARTNER_TYPES = ['Agent', 'Co-loader', 'Driver-cum-Owner (DCO)', 'Fleet Owner (2+ Vehicles)', 'Franchise', 'Individual Driver']
// Per Yugal — shown via the (i) beside the Partner type field so ops can tell
// these apart at a glance instead of guessing from the label alone. Kept in
// the same alphabetical order as PARTNER_TYPES above so the two line up.
const PARTNER_TYPE_INFO = [
  { type: 'Agent', description: 'A broker or intermediary who manages bookings and logistics coordination without owning vehicles or driving.' },
  { type: 'Co-loader', description: 'A carrier or service provider that consolidates cargo from multiple sources to maximize vehicle capacity.' },
  { type: 'Driver-cum-Owner (DCO)', description: 'A self-employed operator who owns and actively drives a single commercial vehicle.' },
  { type: 'Fleet Owner (2+ Vehicles)', description: 'A business or partner managing two or more vehicles and hiring drivers for operations.' },
  { type: 'Franchise', description: 'A local partner operating under the main brand to manage branch hubs, bookings, and regional deliveries.' },
  { type: 'Individual Driver', description: 'A contracted or employed driver who operates a vehicle provided by a third party or fleet owner.' },
]
const FLEET_VEHICLE_TYPES = VEHICLE_TYPES.map((v) => v.type)
const BILLING_PERIODS = ['Weekly', 'Fortnightly', 'Monthly']
const STATES_COUNTRY = ['India']
// Same list as Client Onboarding's own KYC upload (NewClient.jsx).
const DOCUMENT_TYPES = ['AADHAR Card (Back)', 'AADHAR Card (Front)', 'EIC Certificate', 'GST Certificate', 'MSME Certificate', 'PAN Card', 'Post Dated Check', 'Signed Contract']
// Same shape as Client Onboarding's own Billing Info documents (NewClient.jsx)
// — one fixed upload slot per type, from the partner's side of the same
// commercial relationship (their agreed rate card, their signed contract).
const PARTNER_BILLING_DOCUMENT_TYPES = ['Rate Card', 'Contract', 'Other Communication']
// Same as Client Onboarding's POC Mobile (NewClient.jsx) — India-only for now.
const PHONE_CODES = ['🇮🇳 +91']

// Mirrors Customer payment type from Client Onboarding (NewClient.jsx) — same
// shape, "Partner" instead of "Customer".
const PARTNER_PAYMENT_TYPES = ['Credit Partner', 'Prepaid Partner', 'Cash Partner', 'Prepaid Franchisee Commission']
const PARTNER_PAYMENT_TYPE_CODE = {
  'Credit Partner': 'CR',
  'Prepaid Partner': 'PC',
  'Cash Partner': 'CA',
  'Prepaid Franchisee Commission': 'PF',
}

// Payout methods, scoped per service leg — mirrors the "Category based on
// Type of service" reference Yugal shared: FM, MM and LM each have their own
// legal set of payout bases, not one shared list applied everywhere. Per
// Yugal — this is the vocabulary his business team actually uses.
const SERVICE_TYPE_CODE = { 'FirstMile - Pickup': 'FM', MidMile: 'MM', 'LastMile - Delivery': 'LM' }

const RATE_METHOD = {
  PER_KG: 'per_kg',
  PER_DOCKET: 'per_docket',
  PER_BOX: 'per_box',
  PCT_FREIGHT: 'pct_freight',
  PCT_INVOICE: 'pct_invoice',
  PCT_REV: 'pct_rev',
  PER_TRIP: 'per_trip',
  FIXED_MONTHLY_KM_SLAB: 'fixed_monthly_km_slab',
  KM_ONLY: 'km_only',
  MONTHLY_PLUS_KM: 'monthly_plus_km',
  TRIP_LANE: 'trip_lane',
  KM_GUARANTEE: 'km_guarantee',
}
const RATE_METHOD_LABEL = {
  [RATE_METHOD.PER_KG]: 'Per KGs',
  [RATE_METHOD.PER_DOCKET]: 'Per Docket',
  [RATE_METHOD.PER_BOX]: 'Per Box',
  [RATE_METHOD.PCT_FREIGHT]: '% of Freight Value',
  [RATE_METHOD.PCT_INVOICE]: '% of Invoice Value',
  [RATE_METHOD.PCT_REV]: '% of Rev Value',
  [RATE_METHOD.PER_TRIP]: 'Per Trip',
  [RATE_METHOD.FIXED_MONTHLY_KM_SLAB]: 'Fixed monthly payout (Km slab)',
  [RATE_METHOD.KM_ONLY]: 'Km based only',
  [RATE_METHOD.MONTHLY_PLUS_KM]: 'Monthly payout + Km based',
  [RATE_METHOD.TRIP_LANE]: 'Trip based (lane/route defined)',
  [RATE_METHOD.KM_GUARANTEE]: 'Per Km price ± monthly guarantee',
}
const RATE_METHOD_UNIT = {
  [RATE_METHOD.PER_KG]: '₹ / Kg',
  [RATE_METHOD.PER_DOCKET]: '₹ / Docket',
  [RATE_METHOD.PER_BOX]: '₹ / Box',
  [RATE_METHOD.PCT_FREIGHT]: '% of Freight',
  [RATE_METHOD.PCT_INVOICE]: '% of Invoice',
  [RATE_METHOD.PCT_REV]: '% of Revenue',
  [RATE_METHOD.PER_TRIP]: '₹ / Trip',
  [RATE_METHOD.KM_ONLY]: '₹ / Km',
}
// Which methods a leg may use — FM gets every weight/value method plus every
// trip/km/monthly variant; MM is trip/km/guarantee-based only (nothing to
// weigh a docket/box against mid-haul) plus a plain per-Kg option; LM is
// restricted back to the weight/value list only (no lane/route to price a
// last-mile delivery leg by).
const RATE_METHODS_BY_SERVICE = {
  'FirstMile - Pickup': [
    RATE_METHOD.PER_KG, RATE_METHOD.PER_DOCKET, RATE_METHOD.PER_BOX,
    RATE_METHOD.PCT_FREIGHT, RATE_METHOD.PCT_INVOICE, RATE_METHOD.PCT_REV,
    RATE_METHOD.PER_TRIP, RATE_METHOD.FIXED_MONTHLY_KM_SLAB, RATE_METHOD.KM_ONLY, RATE_METHOD.MONTHLY_PLUS_KM,
  ],
  MidMile: [RATE_METHOD.TRIP_LANE, RATE_METHOD.KM_GUARANTEE, RATE_METHOD.PER_KG],
  'LastMile - Delivery': [
    RATE_METHOD.PER_KG, RATE_METHOD.PER_DOCKET, RATE_METHOD.PER_BOX,
    RATE_METHOD.PCT_FREIGHT, RATE_METHOD.PCT_INVOICE, RATE_METHOD.PCT_REV,
  ],
}
const isPercentMethod = (method) => method?.startsWith('pct_')
function emptyRateConfig(method) {
  return {
    method, rateValue: '',
    minKm: '', payoutAtMinKm: '', ratePerKmAboveMin: '', tollParkingExtra: false,
    fixedMonthly: '', ratePerKm: '',
    guaranteeType: 'Minimum guarantee', guaranteeAmount: '',
  }
}

// IFSC already encodes bank + branch, so a separate "Bank name"/"Bank
// branch" pair of free-text inputs would just be duplicate, error-prone data
// entry — this mock lookup (stand-in for a real IFSC API) derives the bank
// name from the first 4 letters, same "type the code, we resolve the rest"
// pattern as pincode lookup in data/geo.js.
const IFSC_BANK_PREFIXES = {
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  SBIN: 'State Bank of India',
  UTIB: 'Axis Bank',
  PUNB: 'Punjab National Bank',
  KKBK: 'Kotak Mahindra Bank',
  YESB: 'Yes Bank',
  IDFB: 'IDFC First Bank',
}
function bankNameForIfsc(ifsc) {
  return IFSC_BANK_PREFIXES[ifsc.slice(0, 4).toUpperCase()] ?? null
}

// Vehicle type is auto-filled from the registration number instead of picked
// manually — per Yugal, a real lookup (VAHAN or similar RTO registry) is a
// dev-side integration for later; this is a random-but-deterministic
// stand-in so the same reg number always resolves to the same type here.
function vehicleTypeFromRegNo(regNo) {
  let hash = 0
  for (let i = 0; i < regNo.length; i++) hash = (hash * 31 + regNo.charCodeAt(i)) >>> 0
  return FLEET_VEHICLE_TYPES[hash % FLEET_VEHICLE_TYPES.length]
}

function formatDisplayDate(iso) {
  if (!iso) return null
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Mirrors Client Onboarding's own Toggle (NewClient.jsx).
function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2.5 text-sm ${disabled ? 'text-slate-300' : 'text-slate-600'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${checked ? 'bg-brand-orange' : 'bg-slate-200'} ${disabled ? 'opacity-50' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {label}
    </label>
  )
}

const SERVICE_TYPES = ['FirstMile - Pickup', 'MidMile', 'LastMile - Delivery']
const TRANSPORT_MODES = ['Surface', 'Air', 'Rail', 'Water/Others']

// Same generic checklist-in-a-dropdown widget as Access Management's Geography
// Access section (ScopeDropdown, pages/admin/AccessManagement.jsx) — copied
// rather than imported since that one lives on a page component, not a
// shared module. `items` is `{ group, value }[]` (group renders as a sticky
// sub-header, pass null for flat lists); `selected` is the checked `value`s.
function ScopeDropdown({ label, hint, unit, unitPlural, items, selected, onToggle, onReset, open, onOpenChange, showChips = true }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter(({ group, value }) => value.toLowerCase().includes(q) || group?.toLowerCase().includes(q)) : items
  let lastGroup
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h3>
      {hint && <p className="mt-1 min-h-[2rem] text-xs text-slate-400">{hint}</p>}
      <div className="relative mt-3">
        <button
          type="button"
          onClick={() => {
            onOpenChange(!open)
            setQuery('')
          }}
          className="flex min-h-[2.625rem] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          {selected.length && showChips ? (
            <span className="flex flex-1 flex-wrap gap-1.5 py-0.5 text-left">
              {selected.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-brand-orange-dark">
                  {v}
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(v)
                    }}
                    className="rounded-full p-0.5 hover:bg-brand-orange/20"
                  >
                    <Icon name="close" className="h-2.5 w-2.5" />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className={`truncate text-left ${selected.length ? 'text-slate-800' : 'text-slate-400'}`}>
              {selected.length ? `${selected.length} ${selected.length === 1 ? unit : unitPlural} selected` : `Select ${unitPlural}`}
            </span>
          )}
          <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-soft">
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
                  Clear selection
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

function Stepper({ step, onJump }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center last:flex-none">
          <button
            type="button"
            disabled={i > step}
            onClick={() => onJump(i)}
            className="flex flex-col items-center gap-2 disabled:cursor-not-allowed"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                i === step
                  ? 'bg-brand-orange text-white'
                  : i < step
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Icon name={i < step ? 'approve' : s.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className={`text-xs font-medium ${i === step ? 'text-slate-900' : i < step ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</span>
          </button>
          {i < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${i < step ? 'bg-emerald-200' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className={`space-y-4 p-6 ${card}`}>
      <div>
        <h2 className="font-medium text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  )
}

function PhoneField({ label, required, phoneCode, onPhoneCodeChange, mobile, onMobileChange, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-brand-orange-dark"> *</span>}
      </span>
      <div className="flex gap-1.5">
        <select
          value={phoneCode}
          onChange={(e) => onPhoneCodeChange(e.target.value)}
          className="w-[4.5rem] shrink-0 appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-2 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          {PHONE_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={mobile}
          onChange={(e) => onMobileChange(e.target.value)}
          placeholder="99999 99999"
          className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        />
      </div>
    </label>
  )
}

function Field({ label, required, className = '', ...props }) {
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
    </label>
  )
}

// Hover (i) beside a field label — used where a value needs more explanation
// than the label alone gives (e.g. Partner type's 6 near-synonymous options).
// Wider and left-aligned vs. the plain one-line tooltip elsewhere in the app
// (AccessManagement.jsx) since this one holds a full definition list.
function InfoTooltip({ children }) {
  return (
    <span className="group relative inline-flex align-middle">
      <Icon name="info" className="ml-1 h-3.5 w-3.5 cursor-help text-slate-300 hover:text-slate-400" />
      {/* Opens downward (not the usual bottom-full-above pattern) — this
          field sits near the top of the form, so an upward tooltip this
          tall gets clipped by the viewport before a hover ever shows it. */}
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 rounded-xl bg-slate-800 p-3.5 text-left text-[11px] font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {children}
      </span>
    </span>
  )
}

function SelectField({ label, value, onChange, options, required, placeholder, renderOption, className = '', info }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-brand-orange-dark"> *</span>}
        {info && <InfoTooltip>{info}</InfoTooltip>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </label>
  )
}

// Renders the right inputs for whichever RATE_METHOD a service card's method
// select is currently on — one method, one shape of fields; switching
// methods (setServiceRateMethod) resets the rest of the config so a leftover
// field from a previous method never silently keeps applying.
function RateMethodFields({ config, onChange }) {
  const set = (field, value) => onChange({ ...config, [field]: value })
  const selectCls = 'min-w-[10rem] appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40'
  const numberCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40'

  function RateValue({ unit, placeholder = '18' }) {
    return (
      <div className="flex min-w-[9rem] flex-1 items-center gap-2">
        <input type="number" value={config.rateValue} onChange={(e) => set('rateValue', e.target.value)} placeholder={placeholder} className={numberCls} />
        <span className="shrink-0 text-xs text-slate-400">{unit}</span>
      </div>
    )
  }
  function NumberField({ label, field, placeholder }) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
        <input type="number" value={config[field]} onChange={(e) => set(field, e.target.value)} placeholder={placeholder} className={numberCls} />
      </label>
    )
  }

  switch (config.method) {
    case RATE_METHOD.FIXED_MONTHLY_KM_SLAB:
      return (
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Minimum Km" field="minKm" placeholder="3000" />
          <NumberField label="Payout at minimum Km (₹)" field="payoutAtMinKm" placeholder="60000" />
          <NumberField label="Rate above minimum (₹ / Km)" field="ratePerKmAboveMin" placeholder="10" />
          <div className="flex items-end pb-2.5">
            <Toggle label="Toll & parking extra" checked={config.tollParkingExtra} onChange={(v) => set('tollParkingExtra', v)} />
          </div>
        </div>
      )
    case RATE_METHOD.MONTHLY_PLUS_KM:
      return (
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <NumberField label="Fixed monthly payout (₹)" field="fixedMonthly" placeholder="40000" />
          <NumberField label="Rate per Km (₹)" field="ratePerKm" placeholder="8" />
        </div>
      )
    case RATE_METHOD.TRIP_LANE:
      return (
        <div className="flex-1 space-y-1.5">
          <RateValue unit={RATE_METHOD_UNIT[RATE_METHOD.PER_TRIP]} />
          <p className="text-xs text-slate-400">Lane/route for this leg is defined via its Serviceability area, back in Billing Info.</p>
        </div>
      )
    case RATE_METHOD.KM_GUARANTEE:
      return (
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <NumberField label="Rate per Km (₹)" field="ratePerKm" placeholder="12" />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Guarantee type</span>
            <select value={config.guaranteeType} onChange={(e) => set('guaranteeType', e.target.value)} className={`w-full ${selectCls}`}>
              <option>Minimum guarantee</option>
              <option>Additional cap</option>
            </select>
          </label>
          <NumberField label="Guarantee amount (₹ / month)" field="guaranteeAmount" placeholder="15000" />
        </div>
      )
    default:
      return <RateValue unit={RATE_METHOD_UNIT[config.method]} placeholder={isPercentMethod(config.method) ? '2.5' : '18'} />
  }
}

let idRowSeq = 1
let docRowSeq = 1

// Mirrors Client Onboarding's IdentificationRow (NewClient.jsx) — same GSTIN
// derivation (state code + partner PAN + typed suffix) and per-row pincode
// lookup, "Partner" instead of "Client" in copy. STATE_TO_GST_CODE lives in
// data/geo.js, shared between the two.
function IdentificationRow({ row, index, onUpdate, onRemove, removable, partnerPan }) {
  const [cityTouched, setCityTouched] = useState(false)
  const [pincodeLookupStatus, setPincodeLookupStatus] = useState('idle')
  const [pincodeLookupResult, setPincodeLookupResult] = useState(null)

  const gstinCode = STATE_TO_GST_CODE[row.state] ?? null
  const gstinPrefix = gstinCode && partnerPan ? `${gstinCode}${partnerPan.trim().toUpperCase()}` : null
  const gstinSuffix = gstinPrefix && row.idNumber.startsWith(gstinPrefix) ? row.idNumber.slice(gstinPrefix.length) : ''

  useEffect(() => {
    if (!/^\d{6}$/.test(row.pincode)) {
      setPincodeLookupStatus('idle')
      setPincodeLookupResult(null)
      return
    }
    let cancelled = false
    setPincodeLookupStatus('loading')
    lookupPincode(row.pincode).then((result) => {
      if (cancelled) return
      if (result) {
        if (!cityTouched) onUpdate(row.id, 'city', result.city)
        setPincodeLookupStatus('found')
        setPincodeLookupResult(result)
      } else {
        setPincodeLookupStatus('not-found')
        setPincodeLookupResult(null)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.pincode])

  const stateMismatch = Boolean(pincodeLookupResult && row.state && pincodeLookupResult.state !== row.state)

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">GSTIN {index + 1}</span>
        {removable && (
          <button type="button" onClick={onRemove} className="text-xs font-medium text-rose-500 hover:underline">
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="State"
          required
          value={row.state}
          onChange={(v) => onUpdate(row.id, 'state', v)}
          options={INDIAN_STATES}
          placeholder="Select state"
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">
            GSTIN<span className="text-brand-orange-dark"> *</span>
          </span>
          {gstinPrefix ? (
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 pl-3 focus-within:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/40">
              <span className="shrink-0 text-sm font-medium tracking-wide text-slate-500">{gstinPrefix}</span>
              <input
                type="text"
                value={gstinSuffix}
                onChange={(e) => onUpdate(row.id, 'idNumber', gstinPrefix + e.target.value.toUpperCase().slice(0, 3))}
                placeholder="1Z5"
                maxLength={3}
                className="w-16 min-w-0 rounded-xl bg-transparent py-2.5 pl-0.5 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-400">
              Select a state above to auto-fill the GSTIN prefix
            </p>
          )}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Registered address" required value={row.address} onChange={(e) => onUpdate(row.id, 'address', e.target.value)} />
        <Field
          label="Pincode"
          required
          value={row.pincode}
          onChange={(e) => onUpdate(row.id, 'pincode', e.target.value)}
          placeholder="410208"
        />
        <Field
          label="City"
          required
          value={row.city}
          onChange={(e) => {
            onUpdate(row.id, 'city', e.target.value)
            setCityTouched(true)
          }}
          placeholder="Mumbai"
        />
        <SelectField label="Country" required value={row.country} onChange={(v) => onUpdate(row.id, 'country', v)} options={STATES_COUNTRY} />
      </div>
      {(pincodeLookupStatus === 'loading' || pincodeLookupStatus === 'not-found' || stateMismatch) && (
        <p className={`text-xs ${stateMismatch ? 'font-medium text-rose-500' : 'text-slate-400'}`}>
          {stateMismatch
            ? `This pincode is in ${pincodeLookupResult.state}, not ${row.state} — check the address.`
            : pincodeLookupStatus === 'loading'
              ? 'Looking up city…'
              : 'Not recognized in this demo — enter city manually'}
        </p>
      )}

      <div>
        <span className="mb-1.5 block text-xs font-medium text-slate-500">Upload document</span>
        <label className="flex max-w-xs cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-500 transition-colors hover:border-brand-orange/40">
          <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{row.document ? row.document.name : 'Click to upload or drag a file'}</span>
          <input type="file" className="hidden" onChange={(e) => onUpdate(row.id, 'document', e.target.files[0] ?? null)} />
        </label>
      </div>
    </div>
  )
}

export default function NewPartner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // A row in Partner Onboarding's "Partner activation in progress" list links
  // back here as ?step=pricing&id=... or ?step=kyc&id=... (whichever the
  // partner's status still needs) — resolve the step to a starting point
  // instead of always step 0, and carry the id so later steps update that
  // same activation record rather than a brand-new one. Mirrors NewClient.jsx.
  const [searchParams] = useSearchParams()
  const initialStep = STEPS.findIndex((s) => s.key === searchParams.get('step'))
  const [step, setStep] = useState(initialStep >= 0 ? initialStep : 0)
  const isLastStep = step === STEPS.length - 1
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false)
  // Set once Billing Info is confirmed and the activation record exists (or
  // read from the URL when resuming one) — lets later steps update that same
  // record's status in place.
  const [activationId, setActivationId] = useState(searchParams.get('id') || null)
  // If this activation was sent back by Supply Admin, surface their comment
  // so whoever's fixing it (usually Supply Executive) knows what to change.
  const correctionRow = activationId
    ? PARTNER_ACTIVATIONS_SEED.find((r) => r.id === activationId && r.status === PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED)
    : null

  function goBack() {
    navigate('/partner-module/onboarding')
  }
  function handleNext() {
    if (isLastStep) {
      // Registration number, Vehicle type and RC are mandatory for every
      // vehicle row (Other documents stays optional) — row 1 itself is
      // mandatory same as GSTIN's row 1. Send them straight to the Vehicles
      // tab instead of a generic blocked-button state.
      if (vehicles.some((v) => !v.regNo.trim() || !v.rcFile)) {
        setFleetTab('vehicles')
        return
      }
      // KYC submitted — the partner is done with the wizard entirely and
      // moves from "Partner activation in progress" to Partner Approvals for
      // Supply Admin's sign-off. Mirrors NewClient.jsx's own submit step.
      submitPartnerForApproval({
        id: activationId || `pp-${Date.now()}`,
        organisationName: partnerName || legalName,
        type: partnerType,
        city,
        submittedBy: user?.name,
        kycDocsCount: documents.filter((doc) => doc.file).length,
        kycDocsTotal: documents.length,
        details: {
          partner: {
            partnerType, partnerName, pan, partnerPaymentType, legalName, address, pincode, city, state,
            bankAccountName, bankAccountNumber, ifscCode,
          },
          contact: { pocName, pocPhoneCode, pocMobile, pocEmail },
          identifications: noGstin ? [] : identifications,
          billing: { contractStart, contractEnd, billingPeriod, billingDocuments },
          fleet: { vehicles, drivers, teamMembers },
          documents,
        },
      })
      if (activationId) removePartnerActivation(activationId)
      setShowSubmittedDialog(true)
      return
    }
    if (step === 3) {
      // Billing Info confirmed — the partner record itself is considered
      // created here, same as NewClient.jsx's own Billing→Tier transition.
      const id = activationId || createPartnerActivation({ name: partnerName || legalName, owner: user?.name })
      setActivationId(id)
    }
    if (step === 4) {
      // Pricing step confirmed — pricing done, documents still outstanding.
      if (activationId) updatePartnerActivationStatus(activationId, PARTNER_ACTIVATION_STATUS.DOCS_PENDING)
    }
    setStep((s) => s + 1)
  }
  // No button on this one — there's no decision left for the user to make,
  // so it just confirms and moves on. Mirrors Client Onboarding's own
  // post-submit dialog (NewClient.jsx) — Partner Approvals is Supply Admin's
  // screen, not the submitter's, so this sends the submitter back to Partner
  // Onboarding instead.
  useEffect(() => {
    if (!showSubmittedDialog) return
    const timer = setTimeout(() => navigate('/partner-module/onboarding', { state: { tab: 'in-progress' } }), 1400)
    return () => clearTimeout(timer)
  }, [showSubmittedDialog])

  const [partnerType, setPartnerType] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerPaymentType, setPartnerPaymentType] = useState('')
  const [legalName, setLegalName] = useState('')
  const [pan, setPan] = useState('')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const addressRequired = legalName.trim() !== ''

  const [bankAccountName, setBankAccountName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const bankName = ifscCode.length >= 4 ? bankNameForIfsc(ifscCode) : null

  const [pocName, setPocName] = useState('')
  const [pocPhoneCode, setPocPhoneCode] = useState(PHONE_CODES[0])
  const [pocMobile, setPocMobile] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  // Exactly 2 optional alternate contact slots, each toggled on via its own
  // checkbox right inside the Partner POC card rather than a separate card
  // per contact.
  const emptyAlternate = { enabled: false, name: '', phoneCode: PHONE_CODES[0], mobile: '', email: '' }
  const [alt1, setAlt1] = useState(emptyAlternate)
  const [alt2, setAlt2] = useState(emptyAlternate)
  function updateAlt(setAlt, field, value) {
    setAlt((prev) => ({ ...prev, [field]: value }))
  }

  // GSTIN Info (repeatable) — row 1 is mandatory unless noGstin is checked.
  // Mirrors Client Onboarding's own GSTIN Info step (NewClient.jsx).
  const [panDocument, setPanDocument] = useState(null)
  const [noGstin, setNoGstin] = useState(false)
  const [identifications, setIdentifications] = useState([
    { id: idRowSeq++, idNumber: '', country: 'India', address: '', pincode: '', city: '', state: '', document: null },
  ])
  function handleNoGstin(checked) {
    setNoGstin(checked)
    if (checked) setIdentifications([])
    else if (identifications.length === 0)
      setIdentifications([{ id: idRowSeq++, idNumber: '', country: 'India', address: '', pincode: '', city: '', state: '', document: null }])
  }
  function addIdentification() {
    setIdentifications((rows) => [...rows, { id: idRowSeq++, idNumber: '', country: 'India', address: '', pincode: '', city: '', state: '', document: null }])
  }
  function updateIdentification(id, field, value) {
    setIdentifications((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function removeIdentification(id) {
    setIdentifications((rows) => rows.filter((r) => r.id !== id))
  }

  const [billingPeriod, setBillingPeriod] = useState('')
  const [contractStart, setContractStart] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [contractExecutionDate, setContractExecutionDate] = useState(todayISO())
  const [tdsTax, setTdsTax] = useState(false)
  const [tdsTaxPercentage, setTdsTaxPercentage] = useState('')
  const [tinNumber, setTinNumber] = useState('')
  // Rest of Contract Information's toggles aren't built yet — kept visible
  // but disabled so the eventual shape of this section is clear.
  const [canUseStockForBooking, setCanUseStockForBooking] = useState(false)
  const [isCentralisedPayment, setIsCentralisedPayment] = useState(false)
  const [wantCopyRates, setWantCopyRates] = useState(false)
  const [assignContractRateFrom, setAssignContractRateFrom] = useState(false)

  // Partner Services — which leg(s) of the move this partner serves. Each
  // selected service type gets its own independent Serviceability Area
  // (a partner might run FirstMile pickups only in Maharashtra but LastMile
  // delivery pan-India), so the area state below is keyed by service type
  // rather than shared. Each area mirrors Access Management's own Geography
  // Access widget (AccessManagement.jsx): State/UT → City → Pincode is one
  // address chain, Territory → Circle is a separate grouping — picking a
  // broader tier auto-checks everything under it in its own chain.
  const [serviceTypeDropdownOpen, setServiceTypeDropdownOpen] = useState(false)
  const [serviceTypes, setServiceTypes] = useState([])
  function toggleServiceType(type) {
    setServiceTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const [transportModeDropdownOpen, setTransportModeDropdownOpen] = useState(false)
  const [transportModes, setTransportModes] = useState([])
  function toggleTransportMode(mode) {
    setTransportModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]))
  }

  const emptyServiceArea = { states: [], cities: [], pincodes: [], territories: [], circles: [] }
  // { [serviceType]: { states, cities, pincodes, territories, circles } } —
  // an entry is created lazily the first time its type is selected and is
  // left in place (not deleted) if the type is later unchecked, so
  // re-checking it restores what was picked before.
  const [serviceAreas, setServiceAreas] = useState({})
  const areaFor = (type) => serviceAreas[type] ?? emptyServiceArea
  function updateServiceArea(type, updater) {
    setServiceAreas((prev) => ({ ...prev, [type]: updater(prev[type] ?? emptyServiceArea) }))
  }
  // { [serviceType]: { state, city, pincode, territory, circle } } — which of
  // that type's own 5 ScopeDropdowns is currently open.
  const [areaDropdownOpen, setAreaDropdownOpen] = useState({})
  const isAreaOpen = (type, tier) => Boolean(areaDropdownOpen[type]?.[tier])
  function setAreaOpen(type, tier, value) {
    setAreaDropdownOpen((prev) => ({ ...prev, [type]: { ...prev[type], [tier]: value } }))
  }

  function toggleServiceAreaState(type, state) {
    updateServiceArea(type, (area) => {
      const has = area.states.includes(state)
      if (has) {
        const droppedCities = citiesUnderStates([state])
        const droppedPincodes = pincodesUnderCities(droppedCities)
        return {
          ...area,
          states: area.states.filter((s) => s !== state),
          cities: area.cities.filter((c) => !droppedCities.includes(c)),
          pincodes: area.pincodes.filter((p) => !droppedPincodes.includes(p)),
        }
      }
      const newCities = citiesUnderStates([state])
      const newPincodes = pincodesUnderCities(newCities)
      return {
        ...area,
        states: [...area.states, state],
        cities: [...new Set([...area.cities, ...newCities])],
        pincodes: [...new Set([...area.pincodes, ...newPincodes])],
      }
    })
  }
  function toggleServiceAreaCity(type, city) {
    updateServiceArea(type, (area) => {
      const has = area.cities.includes(city)
      if (has) {
        const droppedPincodes = pincodesUnderCities([city])
        return { ...area, cities: area.cities.filter((c) => c !== city), pincodes: area.pincodes.filter((p) => !droppedPincodes.includes(p)) }
      }
      const newPincodes = pincodesUnderCities([city])
      return { ...area, cities: [...area.cities, city], pincodes: [...new Set([...area.pincodes, ...newPincodes])] }
    })
  }
  function toggleServiceAreaPincode(type, pincode) {
    updateServiceArea(type, (area) => ({
      ...area,
      pincodes: area.pincodes.includes(pincode) ? area.pincodes.filter((p) => p !== pincode) : [...area.pincodes, pincode],
    }))
  }
  function toggleServiceAreaTerritory(type, territory) {
    updateServiceArea(type, (area) => {
      const has = area.territories.includes(territory)
      if (has) {
        const droppedCircles = circlesUnderTerritories([territory])
        return { ...area, territories: area.territories.filter((t) => t !== territory), circles: area.circles.filter((c) => !droppedCircles.includes(c)) }
      }
      const newCircles = circlesUnderTerritories([territory])
      return { ...area, territories: [...area.territories, territory], circles: [...new Set([...area.circles, ...newCircles])] }
    })
  }
  function toggleServiceAreaCircle(type, circle) {
    updateServiceArea(type, (area) => ({
      ...area,
      circles: area.circles.includes(circle) ? area.circles.filter((c) => c !== circle) : [...area.circles, circle],
    }))
  }

  // Per-service Agreed Rate — a partner can serve more than one leg (Partner
  // Services, Billing Info step), and each leg has its own legal set of
  // payout methods (RATE_METHODS_BY_SERVICE above), so there's no single
  // shared "Agreed Rate" field that makes sense across FM/MM/LM the way there
  // is on Client pricing — one config per selected service type instead, each
  // lazily defaulted the first time that type's card is touched.
  const [serviceRateConfigs, setServiceRateConfigs] = useState({})
  function serviceRateConfigFor(type) {
    return serviceRateConfigs[type] ?? emptyRateConfig(RATE_METHODS_BY_SERVICE[type][0])
  }
  function updateServiceRateConfig(type, next) {
    setServiceRateConfigs((prev) => ({ ...prev, [type]: next }))
  }
  function setServiceRateMethod(type, method) {
    updateServiceRateConfig(type, { ...emptyRateConfig(method), rateValue: serviceRateConfigFor(type).rateValue })
  }

  // CFT→Kg conversion, one factor per Transportation mode actually selected
  // in Partner Services (Billing Info) — mirrors Client Onboarding's own CFT
  // conversion (NewClient.jsx) but scoped to whichever of the 4 modes
  // (Surface/Air/Rail/Water/Others) this partner was picked for, instead of a
  // fixed Air+Surface pair, since a partner may not touch every mode.
  const [cftConversions, setCftConversions] = useState({})
  function cftConversionFor(mode) {
    return cftConversions[mode] ?? ''
  }
  function updateCftConversion(mode, value) {
    setCftConversions((prev) => ({ ...prev, [mode]: value }))
  }

  // KYC (repeatable) — mirrors Client Onboarding's own KYC upload (NewClient.jsx).
  const [documents, setDocuments] = useState([
    { id: docRowSeq++, type: 'PAN Card', file: null },
    { id: docRowSeq++, type: 'GST Certificate', file: null },
  ])
  function addDocument() {
    setDocuments((rows) => [...rows, { id: docRowSeq++, type: DOCUMENT_TYPES[0], file: null }])
  }
  function updateDocument(id, field, value) {
    setDocuments((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function removeDocument(id) {
    setDocuments((rows) => rows.filter((r) => r.id !== id))
  }

  // Billing documents — one fixed slot per type (rate card, signed contract,
  // other billing correspondence), shown in the Billing Info step next to
  // Contract Information. Mirrors Client Onboarding's billingDocuments
  // (NewClient.jsx) exactly, "Partner" side of the same relationship instead
  // of "Client". Shares docRowSeq with KYC's documents above so ids never
  // collide across the two lists.
  const [billingDocuments, setBillingDocuments] = useState(
    PARTNER_BILLING_DOCUMENT_TYPES.map((type) => ({ id: docRowSeq++, type, file: null })),
  )
  function updateBillingDocument(id, field, value) {
    setBillingDocuments((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  // Fleet & Team (KYC step) — the partner's own vehicles, drivers and
  // back-office users, none of which any prior step captured. Shown for
  // every partner type — even an Agent/Co-loader may run a small fleet of
  // its own rather than only brokering — and at least 1 vehicle is required
  // before the partner can go for approval (validated in handleNext).
  // Shares docRowSeq with the document lists above so ids never collide.
  const [fleetTab, setFleetTab] = useState('vehicles')

  // Row 1 is mandatory (no remove button) same as GSTIN Info's first row —
  // "Add vehicle" appends further, removable rows. Vehicle type isn't picked
  // manually — it's auto-filled the moment a registration number is typed
  // (see vehicleTypeFromRegNo above). Insurance/Permit are optional — each is
  // a checkbox that reveals its own upload slot when ticked, rather than a
  // generic "Add document" row + type dropdown.
  function emptyVehicle() {
    return { id: docRowSeq++, regNo: '', type: '', rcFile: null, hasInsurance: false, insuranceFile: null, hasPermit: false, permitFile: null }
  }
  const [vehicles, setVehicles] = useState([emptyVehicle()])
  function addVehicle() {
    setVehicles((rows) => [...rows, emptyVehicle()])
  }
  function updateVehicle(id, field, value) {
    setVehicles((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function updateVehicleRegNo(id, regNo) {
    setVehicles((rows) => rows.map((r) => (r.id === id ? { ...r, regNo, type: regNo.trim() ? vehicleTypeFromRegNo(regNo.trim()) : '' } : r)))
  }
  function removeVehicle(id) {
    setVehicles((rows) => rows.filter((r) => r.id !== id))
  }
  // Unticking a checkbox clears its file too, so a hidden upload never lingers.
  function toggleVehicleDoc(vehicleId, docKey, checked) {
    setVehicles((rows) =>
      rows.map((r) => (r.id === vehicleId ? { ...r, [`has${docKey}`]: checked, [`${docKey.toLowerCase()}File`]: checked ? r[`${docKey.toLowerCase()}File`] : null } : r)),
    )
  }

  const [drivers, setDrivers] = useState([])
  function addDriver() {
    setDrivers((rows) => [...rows, { id: docRowSeq++, name: '', phoneCode: PHONE_CODES[0], mobile: '', licenseNumber: '', assignedVehicleId: '' }])
  }
  function updateDriver(id, field, value) {
    setDrivers((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function removeDriver(id) {
    setDrivers((rows) => rows.filter((r) => r.id !== id))
  }

  const [teamMembers, setTeamMembers] = useState([])
  function addTeamMember() {
    setTeamMembers((rows) => [...rows, { id: docRowSeq++, name: '', phoneCode: PHONE_CODES[0], mobile: '', email: '', label: '' }])
  }
  function updateTeamMember(id, field, value) {
    setTeamMembers((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function removeTeamMember(id) {
    setTeamMembers((rows) => rows.filter((r) => r.id !== id))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Create Partner</h1>
        <p className="mt-1 text-slate-500">Onboard a new partner — fields below are placeholders and will be refined.</p>
      </div>

      {correctionRow?.correctionComment && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">Correction requested by Supply Admin</div>
          <p className="mt-1 text-sm text-rose-700">{correctionRow.correctionComment}</p>
        </div>
      )}

      <div className={`p-6 ${card}`}>
        <Stepper step={step} onJump={setStep} />
      </div>

      {step === 0 && (
        <Section title="Partner details" subtitle="Legal identity and registered address for the partner.">
          <SelectField
            label="Partner type"
            required
            value={partnerType}
            onChange={setPartnerType}
            options={PARTNER_TYPES}
            placeholder="Select type"
            info={
              <div className="space-y-2">
                {PARTNER_TYPE_INFO.map(({ type, description }) => (
                  <div key={type}>
                    <div className="font-semibold text-white">{type}</div>
                    <div className="text-slate-300">{description}</div>
                  </div>
                ))}
              </div>
            }
          />
          <Field label="Partner name" required value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Speedex Logistics" />
          <Field label="PAN card number" required value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="AAACA1234A" />
          <SelectField
            label="Partner payment type"
            required
            value={partnerPaymentType}
            onChange={setPartnerPaymentType}
            options={PARTNER_PAYMENT_TYPES}
            renderOption={(t) => `${t} (${PARTNER_PAYMENT_TYPE_CODE[t]})`}
            placeholder="Select type"
          />
          <Field label="Legal entity name" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Speedex Logistics Pvt Ltd" />
          <Field label="Pincode" required={addressRequired} value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="410208" />
          <Field label="City" required={addressRequired} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
          <Field label="State" required={addressRequired} value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" />
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
              Registered address
              {addressRequired && <span className="text-brand-orange-dark"> *</span>}
            </span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Building, street, area"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
          </label>
        </Section>
      )}

      {step === 0 && (
        <div className={`p-6 ${card}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange-dark">
              <Icon name="finance" className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-medium text-slate-900">Bank details</h2>
              <p className="mt-0.5 text-xs text-slate-400">Payments will be made to this account.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Account name"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="As per bank records"
            />
            <Field
              label="Account number"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="50100123456789"
            />
            <div>
              <Field label="IFSC code" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="HDFC0001234" />
              {ifscCode.length >= 4 && (
                <p className={`mt-1.5 text-xs ${bankName ? 'font-medium text-emerald-600' : 'text-slate-400'}`}>
                  {bankName ? `✓ ${bankName}` : 'Bank not recognized — will be verified during KYC.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <Section title="Partner POC" subtitle="Primary contact for day-to-day coordination.">
          <Field label="Partner POC name" required value={pocName} onChange={(e) => setPocName(e.target.value)} placeholder="Name" />
          <PhoneField
            label="POC mobile"
            required
            phoneCode={pocPhoneCode}
            onPhoneCodeChange={setPocPhoneCode}
            mobile={pocMobile}
            onMobileChange={setPocMobile}
          />
          <Field label="POC email" required value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} placeholder="dispatch@partner.in" />

          {[
            { alt: alt1, setAlt: setAlt1, label: 'Add alternate contact 1' },
            { alt: alt2, setAlt: setAlt2, label: 'Add alternate contact 2' },
          ].map(({ alt, setAlt, label }) => (
            <div key={label} className="sm:col-span-2 lg:col-span-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={alt.enabled} onChange={(e) => updateAlt(setAlt, 'enabled', e.target.checked)} />
                {label}
              </label>
              {alt.enabled && (
                <div className="mt-3 grid gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Name" required value={alt.name} onChange={(e) => updateAlt(setAlt, 'name', e.target.value)} placeholder="Name" />
                  <PhoneField
                    label="Mobile"
                    required
                    phoneCode={alt.phoneCode}
                    onPhoneCodeChange={(v) => updateAlt(setAlt, 'phoneCode', v)}
                    mobile={alt.mobile}
                    onMobileChange={(v) => updateAlt(setAlt, 'mobile', v)}
                  />
                  <Field label="Email" value={alt.email} onChange={(e) => updateAlt(setAlt, 'email', e.target.value)} placeholder="Optional" />
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {step === 2 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900">GSTIN Info</h2>
              <p className="mt-0.5 text-xs text-slate-400">A pan-India partner often holds one GSTIN per state — add one row per registration.</p>
            </div>
            <button
              type="button"
              onClick={addIdentification}
              disabled={noGstin}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add GSTIN
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={noGstin} onChange={(e) => handleNoGstin(e.target.checked)} />
            Partner does not have any GSTIN
          </label>

          <div className={`grid gap-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4 ${legalName.trim() ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Field label="PAN card number" value={pan} disabled readOnly />
            {legalName.trim() && <Field label="Legal entity name" value={legalName} disabled readOnly />}
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Upload document</span>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-500 transition-colors hover:border-brand-orange/40">
                <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{panDocument ? panDocument.name : 'Click to upload or drag a file'}</span>
                <input type="file" className="hidden" onChange={(e) => setPanDocument(e.target.files[0] ?? null)} />
              </label>
            </div>
          </div>

          {!noGstin &&
            identifications.map((row, i) => (
              <IdentificationRow
                key={row.id}
                row={row}
                index={i}
                onUpdate={updateIdentification}
                onRemove={() => removeIdentification(row.id)}
                removable={i > 0}
                partnerPan={pan}
              />
            ))}
        </div>
      )}

      {step === 3 && (
        <Section title="Contract Information">
          <label className="relative block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
              Contract duration<span className="text-brand-orange-dark"> *</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDurationPicker((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-left text-sm focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
            >
              <span className={contractStart && contractEnd ? 'text-slate-800' : 'text-slate-400'}>
                {contractStart && contractEnd ? `${formatDisplayDate(contractStart)} – ${formatDisplayDate(contractEnd)}` : 'Select date range'}
              </span>
              <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showDurationPicker ? 'rotate-180' : ''}`} />
            </button>
            {showDurationPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDurationPicker(false)} />
                <div className="absolute z-20 mt-1 rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                  <div className="flex items-end gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-400">From</span>
                      <input
                        type="date"
                        value={contractStart}
                        onChange={(e) => setContractStart(e.target.value)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                      />
                    </label>
                    <span className="pb-2 text-slate-300">→</span>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-400">To</span>
                      <input
                        type="date"
                        value={contractEnd}
                        min={contractStart || undefined}
                        onChange={(e) => setContractEnd(e.target.value)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDurationPicker(false)}
                    className="mt-3 w-full rounded-lg bg-slate-900 py-1.5 text-xs font-medium text-white"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </label>
          <Field
            label="Contract execution date"
            required
            type="date"
            value={contractExecutionDate}
            onChange={(e) => setContractExecutionDate(e.target.value)}
          />
          <SelectField label="Billing period" required value={billingPeriod} onChange={setBillingPeriod} options={BILLING_PERIODS} placeholder="Select period" />

          <div className="space-y-3 sm:col-span-2 lg:col-span-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upload documents</span>
            <div className="flex flex-wrap gap-3">
              {billingDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2">
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                      doc.file
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-brand-orange/40'
                    }`}
                  >
                    <Icon name={doc.file ? 'approve' : 'plus'} className="h-3.5 w-3.5 shrink-0" />
                    {doc.type}
                    <input type="file" className="hidden" onChange={(e) => updateBillingDocument(doc.id, 'file', e.target.files[0] ?? null)} />
                  </label>
                  {doc.file && (
                    <>
                      <span className="max-w-[9rem] truncate text-xs text-slate-500">{doc.file.name}</span>
                      <button
                        type="button"
                        onClick={() => updateBillingDocument(doc.id, 'file', null)}
                        className="text-xs font-medium text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">At least one document upload is mandatory.</p>
          </div>

          <div className="space-y-4 sm:col-span-2 lg:col-span-4">
            <Toggle label="TDS tax" checked={tdsTax} onChange={setTdsTax} />
            {tdsTax && (
              <div className="grid gap-4 border-l-2 border-slate-100 pl-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="TDS tax percentage"
                  required
                  type="number"
                  value={tdsTaxPercentage}
                  onChange={(e) => setTdsTaxPercentage(e.target.value)}
                  placeholder="2"
                />
                <Field label="TIN number" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} placeholder="Optional" />
              </div>
            )}
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Toggle label="Can use stock for booking" checked={canUseStockForBooking} onChange={setCanUseStockForBooking} disabled />
              <Toggle label="Is centralised payment" checked={isCentralisedPayment} onChange={setIsCentralisedPayment} disabled />
              <Toggle label="Do you want copy rates" checked={wantCopyRates} onChange={setWantCopyRates} disabled />
              <Toggle label="Assign contract rate from" checked={assignContractRateFrom} onChange={setAssignContractRateFrom} disabled />
            </div>
            <p className="text-xs text-slate-400">Will build these later.</p>
          </div>
        </Section>
      )}

      {step === 3 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div>
            <h2 className="font-medium text-slate-900">Partner Services</h2>
            <p className="mt-0.5 text-xs text-slate-400">Which leg(s) of the move this partner serves, and where.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ScopeDropdown
              label="Service type"
              unitPlural="services"
              items={SERVICE_TYPES.map((t) => ({ group: null, value: t }))}
              selected={serviceTypes}
              onToggle={toggleServiceType}
              onReset={() => setServiceTypes([])}
              open={serviceTypeDropdownOpen}
              onOpenChange={setServiceTypeDropdownOpen}
            />
            <ScopeDropdown
              label="Transportation modes"
              unitPlural="modes"
              items={TRANSPORT_MODES.map((m) => ({ group: null, value: m }))}
              selected={transportModes}
              onToggle={toggleTransportMode}
              onReset={() => setTransportModes([])}
              open={transportModeDropdownOpen}
              onOpenChange={setTransportModeDropdownOpen}
            />
          </div>

          {transportModes.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <span className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                CFT to Kg conversion
                <span
                  title="Volumetric weight factor used to convert chargeable volume (CFT) into chargeable weight (Kg) when settling this partner's payout — one factor per Transportation mode picked above."
                  className="cursor-help text-slate-400"
                >
                  ⓘ
                </span>
              </span>
              <div className="flex flex-wrap gap-4">
                {transportModes.map((mode) => (
                  <div key={mode} className="flex items-end gap-2">
                    <div className="w-24 shrink-0">
                      <span className="mb-1.5 block text-xs font-medium text-slate-500">Mode</span>
                      <div className="truncate rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">{mode}</div>
                    </div>
                    <Field
                      label="1 CFT = ? Kg"
                      required
                      type="number"
                      min="0"
                      value={cftConversionFor(mode)}
                      onChange={(e) => updateCftConversion(mode, e.target.value)}
                      placeholder="e.g. 6"
                      className="w-28"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {serviceTypes.length === 0 ? (
            <p className="text-xs text-slate-400">Pick a service type above to set up its serviceability area.</p>
          ) : (
            serviceTypes.map((type) => {
              const area = areaFor(type)
              return (
                <div key={type} className="space-y-3 border-t border-slate-100 pt-5 first:border-0 first:pt-0">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Serviceability area — {type}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      State/UT → City → Pincode is one address chain; Territory → Circle is a separate grouping. Picking a broader tier auto-checks everything under it — uncheck individual items to narrow further.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ScopeDropdown
                      label="State/UT"
                      hint="Default is every state/UT."
                      unit="state/UT"
                      unitPlural="states/UTs"
                      items={STATES.map((s) => ({ group: null, value: s }))}
                      selected={area.states}
                      onToggle={(v) => toggleServiceAreaState(type, v)}
                      onReset={() => updateServiceArea(type, (a) => ({ ...a, states: [], cities: [], pincodes: [] }))}
                      open={isAreaOpen(type, 'state')}
                      onOpenChange={(v) => setAreaOpen(type, 'state', v)}
                      showChips={false}
                    />
                    <ScopeDropdown
                      label="City"
                      hint={`Default is every city${area.states.length ? ' within the states/UTs above' : ''}.`}
                      unit="city"
                      unitPlural="cities"
                      items={citiesForStates(area.states)}
                      selected={area.cities}
                      onToggle={(v) => toggleServiceAreaCity(type, v)}
                      onReset={() => updateServiceArea(type, (a) => ({ ...a, cities: [], pincodes: [] }))}
                      open={isAreaOpen(type, 'city')}
                      onOpenChange={(v) => setAreaOpen(type, 'city', v)}
                      showChips={false}
                    />
                    <ScopeDropdown
                      label="Pincode"
                      hint={`Default is every pincode${area.cities.length ? ' within the cities above' : ''}.`}
                      unit="pincode"
                      unitPlural="pincodes"
                      items={pincodesForCities(area.cities)}
                      selected={area.pincodes}
                      onToggle={(v) => toggleServiceAreaPincode(type, v)}
                      onReset={() => updateServiceArea(type, (a) => ({ ...a, pincodes: [] }))}
                      open={isAreaOpen(type, 'pincode')}
                      onOpenChange={(v) => setAreaOpen(type, 'pincode', v)}
                      showChips={false}
                    />
                    <ScopeDropdown
                      label="Territory"
                      hint="Default is every territory."
                      unit="territory"
                      unitPlural="territories"
                      items={TERRITORIES.map((t) => ({ group: null, value: t }))}
                      selected={area.territories}
                      onToggle={(v) => toggleServiceAreaTerritory(type, v)}
                      onReset={() => updateServiceArea(type, (a) => ({ ...a, territories: [], circles: [] }))}
                      open={isAreaOpen(type, 'territory')}
                      onOpenChange={(v) => setAreaOpen(type, 'territory', v)}
                      showChips={false}
                    />
                    <ScopeDropdown
                      label="Circle"
                      hint={`Default is every circle${area.territories.length ? ' within the territories above' : ''}.`}
                      unit="circle"
                      unitPlural="circles"
                      items={circlesForTerritories(area.territories)}
                      selected={area.circles}
                      onToggle={(v) => toggleServiceAreaCircle(type, v)}
                      onReset={() => updateServiceArea(type, (a) => ({ ...a, circles: [] }))}
                      open={isAreaOpen(type, 'circle')}
                      onOpenChange={(v) => setAreaOpen(type, 'circle', v)}
                      showChips={false}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          {serviceTypes.length === 0 ? (
            <div className={`p-6 text-center text-sm text-slate-400 ${card}`}>
              No services picked yet — choose Service type under Partner Services (Billing Info step) to price this partner's leg(s).
            </div>
          ) : (
            serviceTypes.map((type) => {
              const methods = RATE_METHODS_BY_SERVICE[type]
              const config = serviceRateConfigFor(type)
              return (
                <div key={type} className={`space-y-4 p-6 ${card}`}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-xs font-bold text-brand-orange-dark">
                      {SERVICE_TYPE_CODE[type]}
                    </span>
                    <h2 className="font-medium text-slate-900">{type}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-500">
                        Payout method<span className="text-brand-orange-dark"> *</span>
                      </span>
                      <select
                        value={config.method}
                        onChange={(e) => setServiceRateMethod(type, e.target.value)}
                        className="min-w-[15rem] appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                      >
                        {methods.map((m) => (
                          <option key={m} value={m}>
                            {RATE_METHOD_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <RateMethodFields config={config} onChange={(next) => updateServiceRateConfig(type, next)} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {step === 5 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div>
            <h2 className="font-medium text-slate-900">Fleet & Team</h2>
          </div>

          <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
            <button
              type="button"
              onClick={() => setFleetTab('vehicles')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${fleetTab === 'vehicles' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vehicles {vehicles.length > 0 && <span className="text-slate-400">({vehicles.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setFleetTab('drivers')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${fleetTab === 'drivers' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Drivers {drivers.length > 0 && <span className="text-slate-400">({drivers.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setFleetTab('team')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${fleetTab === 'team' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Team members {teamMembers.length > 0 && <span className="text-slate-400">({teamMembers.length})</span>}
            </button>
          </div>

          {fleetTab === 'vehicles' && (
            <div className="space-y-3">
              <div className={`overflow-x-auto ${card}`}>
                <table className="w-full min-w-[44rem]">
                  <thead>
                    <tr>
                      <th className={`${thCls} w-10`}>#</th>
                      <th className={`${thCls} w-44`}>
                        Registration number<span className="text-brand-orange-dark"> *</span>
                      </th>
                      <th className={`${thCls} w-48`}>
                        Vehicle type<span className="text-brand-orange-dark"> *</span>
                      </th>
                      <th className={`${thCls} w-36`}>
                        Upload RC<span className="text-brand-orange-dark"> *</span>
                      </th>
                      <th className={`${thCls} w-36`}>Other documents</th>
                      <th className={`${thCls} w-10`} />
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v, i) => (
                      <tr key={v.id} className={rowCls}>
                        <td className="px-3 py-3 align-top text-sm font-medium text-slate-400">{i + 1}</td>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="text"
                            required
                            value={v.regNo}
                            onChange={(e) => updateVehicleRegNo(v.id, e.target.value.toUpperCase())}
                            placeholder="MH04 AB 1234"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top text-sm">
                          {v.type ? <span className="text-slate-800">{v.type}</span> : <span className="text-xs text-slate-400">Auto-filled from reg. no.</span>}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-2.5 py-1.5 text-xs text-slate-500 hover:border-brand-orange/40">
                            <Icon name="upload" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{v.rcFile ? v.rcFile.name : 'Upload'}</span>
                            <input type="file" className="hidden" onChange={(e) => updateVehicle(v.id, 'rcFile', e.target.files[0] ?? null)} />
                          </label>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <label className="flex items-center gap-1 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={v.hasInsurance}
                                onChange={(e) => toggleVehicleDoc(v.id, 'Insurance', e.target.checked)}
                                className="h-3.5 w-3.5 rounded accent-brand-orange"
                              />
                              Insurance
                            </label>
                            {v.hasInsurance && (
                              <label className="flex cursor-pointer items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-1.5 text-slate-500 hover:border-brand-orange/40" title={v.insuranceFile ? v.insuranceFile.name : 'Upload insurance copy'}>
                                <Icon name="upload" className="h-3.5 w-3.5" />
                                <input type="file" className="hidden" onChange={(e) => updateVehicle(v.id, 'insuranceFile', e.target.files[0] ?? null)} />
                              </label>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <label className="flex items-center gap-1 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={v.hasPermit}
                                onChange={(e) => toggleVehicleDoc(v.id, 'Permit', e.target.checked)}
                                className="h-3.5 w-3.5 rounded accent-brand-orange"
                              />
                              Permit
                            </label>
                            {v.hasPermit && (
                              <label className="flex cursor-pointer items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-1.5 text-slate-500 hover:border-brand-orange/40" title={v.permitFile ? v.permitFile.name : 'Upload permit copy'}>
                                <Icon name="upload" className="h-3.5 w-3.5" />
                                <input type="file" className="hidden" onChange={(e) => updateVehicle(v.id, 'permitFile', e.target.files[0] ?? null)} />
                              </label>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          {i > 0 && (
                            <button type="button" onClick={() => removeVehicle(v.id)} className="text-slate-400 hover:text-rose-500" title="Remove vehicle">
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addVehicle}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Add vehicle
                </button>
              </div>
            </div>
          )}

          {fleetTab === 'drivers' && (
            <div className="space-y-3">
              {drivers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No drivers added yet.</p>
              ) : (
                <div className={`overflow-x-auto ${card}`}>
                  <table className="w-full min-w-[44rem]">
                    <thead>
                      <tr>
                        <th className={`${thCls} w-10`}>#</th>
                        <th className={`${thCls} w-40`}>
                          Driver name<span className="text-brand-orange-dark"> *</span>
                        </th>
                        <th className={`${thCls} w-40`}>
                          License number<span className="text-brand-orange-dark"> *</span>
                        </th>
                        <th className={`${thCls} w-40`}>
                          Driver mobile<span className="text-brand-orange-dark"> *</span>
                        </th>
                        <th className={`${thCls} w-44`}>Assigned vehicle</th>
                        <th className={`${thCls} w-10`} />
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d, i) => (
                        <tr key={d.id} className={rowCls}>
                          <td className="px-3 py-3 align-top text-sm font-medium text-slate-400">{i + 1}</td>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="text"
                              required
                              value={d.name}
                              onChange={(e) => updateDriver(d.id, 'name', e.target.value)}
                              placeholder="Name"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="text"
                              required
                              value={d.licenseNumber}
                              onChange={(e) => updateDriver(d.id, 'licenseNumber', e.target.value.toUpperCase())}
                              placeholder="MH1420110012345"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex gap-1">
                              <select
                                value={d.phoneCode}
                                onChange={(e) => updateDriver(d.id, 'phoneCode', e.target.value)}
                                className="w-16 shrink-0 appearance-none rounded-lg border border-slate-200 bg-slate-50/60 px-1.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                              >
                                {PHONE_CODES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                required
                                value={d.mobile}
                                onChange={(e) => updateDriver(d.id, 'mobile', e.target.value)}
                                placeholder="99999 99999"
                                className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select
                              value={d.assignedVehicleId}
                              onChange={(e) => updateDriver(d.id, 'assignedVehicleId', e.target.value)}
                              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            >
                              <option value="">Unassigned</option>
                              {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.regNo || 'Unnamed vehicle'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <button type="button" onClick={() => removeDriver(d.id)} className="text-slate-400 hover:text-rose-500" title="Remove driver">
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addDriver}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Add driver
                </button>
              </div>
            </div>
          )}

          {fleetTab === 'team' && (
            <div className="space-y-3">
              {teamMembers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No team members added yet.</p>
              ) : (
                <div className={`overflow-x-auto ${card}`}>
                  <table className="w-full min-w-[44rem]">
                    <thead>
                      <tr>
                        <th className={`${thCls} w-10`}>#</th>
                        <th className={`${thCls} w-40`}>
                          Name<span className="text-brand-orange-dark"> *</span>
                        </th>
                        <th className={`${thCls} w-40`}>
                          Mobile<span className="text-brand-orange-dark"> *</span>
                        </th>
                        <th className={`${thCls} w-48`}>
                          Email<span className="text-brand-orange-dark"> *</span>
                        </th>
                        <th className={`${thCls} w-40`}>Member label</th>
                        <th className={`${thCls} w-10`} />
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((m, i) => (
                        <tr key={m.id} className={rowCls}>
                          <td className="px-3 py-3 align-top text-sm font-medium text-slate-400">{i + 1}</td>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="text"
                              required
                              value={m.name}
                              onChange={(e) => updateTeamMember(m.id, 'name', e.target.value)}
                              placeholder="Name"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex gap-1">
                              <select
                                value={m.phoneCode}
                                onChange={(e) => updateTeamMember(m.id, 'phoneCode', e.target.value)}
                                className="w-16 shrink-0 appearance-none rounded-lg border border-slate-200 bg-slate-50/60 px-1.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                              >
                                {PHONE_CODES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                required
                                value={m.mobile}
                                onChange={(e) => updateTeamMember(m.id, 'mobile', e.target.value)}
                                placeholder="99999 99999"
                                className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="email"
                              required
                              value={m.email}
                              onChange={(e) => updateTeamMember(m.id, 'email', e.target.value)}
                              placeholder="name@partner.in"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="text"
                              value={m.label}
                              onChange={(e) => updateTeamMember(m.id, 'label', e.target.value)}
                              placeholder="e.g. Warehouse POC"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <button type="button" onClick={() => removeTeamMember(m.id)} className="text-slate-400 hover:text-rose-500" title="Remove team member">
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Add team member
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900">KYC upload</h2>
            </div>
            <button
              type="button"
              onClick={addDocument}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add document
            </button>
          </div>

          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <SelectField label="Document type" value={doc.type} onChange={(v) => updateDocument(doc.id, 'type', v)} options={DOCUMENT_TYPES} className="sm:w-56" />
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-center text-xs text-slate-500 transition-colors hover:border-brand-orange/40">
                {doc.file ? doc.file.name : 'Click to upload or drag a file'}
                <input type="file" className="hidden" onChange={(e) => updateDocument(doc.id, 'file', e.target.files[0] ?? null)} />
              </label>
              {documents.length > 1 && (
                <button type="button" onClick={() => removeDocument(doc.id)} className="text-xs font-medium text-rose-500 hover:underline">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Previous
            </button>
          )}
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Save as draft
          </button>
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLastStep ? 'Submit' : 'Next'}
        </button>
      </div>

      {showSubmittedDialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-soft">
            <h3 className="text-base font-semibold text-slate-900">Partner submitted for Approval</h3>
            <p className="mt-1.5 text-sm text-slate-500">This partner has been sent to Supply Admin for approval.</p>
          </div>
        </div>
      )}
    </div>
  )
}

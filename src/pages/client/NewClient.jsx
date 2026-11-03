import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { btnPrimary, btnSecondary } from '../../components/ui.js'

const card = 'rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70'
const LABEL = 'mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600'
const INPUT = 'w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline focus:outline-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
const INPUT_OK = 'border-slate-200 focus:border-brand-orange focus:outline-brand-orange/20'
const INPUT_ERR = 'border-rose-300 focus:outline-rose-200'

import RegionPincodeMappingModal from '../../components/RegionPincodeMappingModal.jsx'
import OdaListManager from '../../components/OdaListManager.jsx'
import {
  TIER_DISCOUNTS,
  ZONES,
  ADDITIONAL_CHARGES_MASTER,
  RULES_CATALOG,
  computeMatrixAtDiscount,
  matrixArrayToObject,
  formatChargeRule,
  emptyChargeRule,
} from '../../data/pricing.js'
import { STATE_CITY_DIRECTORY, buildRegionsFromStandard, freshRegionId, REGION_TEMPLATES, cloneRegionTemplate } from '../../data/regionMapping.js'
import { cloneDefaultOdaEntries, cloneDefaultOdaOverrides, cloneOdaRates, getDefaultOdaRate } from '../../data/odaPincodes.js'
import { INDIAN_STATES, lookupPincode, STATE_TO_GST_CODE } from '../../data/geo.js'

const CHARGE_RULE_UNITS = { flat_per_awb: '₹ / AWB', per_kg: '₹ / kg', percent_of_freight: '%', percent_of_cod: '%' }

// Editable values for an already-typed charge rule (cloned from the
// Additional Charges master when it was added to this client) — the rule's
// `type`/shape is fixed here, only the numbers are editable, since changing
// the shape of a charge type is what the master (not a single client) is for.
function ChargeValueFields({ rule, onChange }) {
  if (rule.type === 'nil') return <span className="text-xs text-slate-400">NIL</span>
  if (rule.type === 'actuals') return <span className="text-xs text-slate-400">Billed at actuals — no value to set</span>
  if (rule.type === 'max_of' || rule.type === 'min_of') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {rule.options.map((opt, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-xs text-slate-400">or</span>}
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              {CHARGE_RULE_UNITS[opt.type]?.startsWith('₹') ? '₹' : ''}
              <input
                type="number"
                value={opt.value}
                onChange={(e) => onChange({ ...rule, options: rule.options.map((o, idx) => (idx === i ? { ...o, value: e.target.value } : o)) })}
                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              {opt.type === 'percent_of_freight' || opt.type === 'percent_of_cod' ? '%' : opt.type === 'per_kg' ? '/kg' : '/AWB'}
            </span>
          </span>
        ))}
        <span className="text-xs text-slate-400">whichever {rule.type === 'min_of' ? 'lower' : 'higher'}</span>
      </div>
    )
  }
  if (rule.type === 'range_by_weight') {
    return (
      <div className="space-y-1.5">
        {rule.bands.map((band, i) => {
          const isLast = i === rule.bands.length - 1
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              {isLast ? (
                <span className="shrink-0 text-xs text-slate-500">Above {rule.bands[i - 1]?.uptoKg} kg:</span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                  Up to
                  <input
                    type="number"
                    value={band.uptoKg}
                    onChange={(e) =>
                      onChange({ ...rule, bands: rule.bands.map((b, idx) => (idx === i ? { ...b, uptoKg: e.target.value } : b)) })
                    }
                    className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                  />
                  kg:
                </span>
              )}
              <ChargeValueFields
                rule={band.rule}
                onChange={(nextBandRule) => onChange({ ...rule, bands: rule.bands.map((b, idx) => (idx === i ? { ...b, rule: nextBandRule } : b)) })}
              />
            </div>
          )
        })}
      </div>
    )
  }
  // flat_per_awb / per_kg / percent_of_freight / percent_of_cod
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      {CHARGE_RULE_UNITS[rule.type]?.startsWith('₹') ? '₹' : ''}
      <input
        type="number"
        value={rule.value}
        onChange={(e) => onChange({ ...rule, value: e.target.value })}
        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {rule.type === 'percent_of_freight' || rule.type === 'percent_of_cod' ? '%' : rule.type === 'per_kg' ? '/kg' : '/AWB'}
    </span>
  )
}
import { LT_USERS } from '../../data/users.js'
import { isReportOf } from '../../data/relations.js'
import PersonNameFields from '../../components/PersonNameFields.jsx'
import DateRangePicker from '../../components/DateRangePicker.jsx'
import DatePicker from '../../components/DatePicker.jsx'
import InfoTip from '../../components/InfoTip.jsx'
import { joinName, namePartOk } from '../../utils/personName.js'
import { GROUP_SUGGESTIONS, LEGAL_ENTITY_SUGGESTIONS, groupById } from '../../data/groups.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED, submitClientForApproval } from '../../data/clients.js'
import { ACTIVATION_STATUS, ACTIVATIONS_SEED, createActivation, updateActivationStatus, removeActivation } from '../../data/activations.js'
import { CITIES, CITY_BRANCHES } from '../../data/permissions.js'
import { useAuth } from '../../context/AuthContext.jsx'

// Field set modeled on the legacy Softpal "Create Customer" wizard (Company →
// Contact → Identification → Billing → Portal Settings → KYC), with Portal
// Settings dropped (account/login config, not client master data) and a new
// Pricing step appended (still keyed 'tier' internally — see STEPS below,
// renaming the key would break ACTIVATION_RESUME_STEP/?step= deep links) —
// tier is fixed by declared volume alone; Additional Charges is picked from
// the same step.

const STEPS = [
  { key: 'company', label: 'Company Info', icon: 'building' },
  { key: 'contact', label: 'Contact Info', icon: 'onboarding' },
  { key: 'identification', label: 'GSTIN Info', icon: 'shield' },
  { key: 'billing', label: 'Billing Info', icon: 'invoice' },
  { key: 'tier', label: 'Pricing', icon: 'tag' },
  { key: 'kyc', label: 'KYC', icon: 'mis' },
]

const PAYMENT_TYPES = ['Credit Customer', 'Prepaid Customer', 'Cash Customer', 'Prepaid Franchisee Commission']
// Business-classification of the customer — separate from organisationType
// (auto-derived from the PAN's 4th character just above) since a client can
// be, say, a Retail business that's also a Private company; this is picked
// by hand, not derived.
const CUSTOMER_TYPES = ['AIC', 'MSME', 'RETAIL', 'CAGENT', 'GOVT']
const PHONE_CODES = ['🇮🇳 +91']
const STATES_COUNTRY = ['India']
const BILLING_PERIODS = ['Immediate', 'Weekly', 'Fortnightly', 'Monthly']
const BILL_PRINT_FORMATS = ['Format - 1', 'Format - 2', 'Format - 3']
const DEFAULT_BILL_PRINT_FORMAT = BILL_PRINT_FORMATS[0]
// Matches the legacy Softpal KYC document-type list (ground truth from
// screenshots) rather than the earlier ad-hoc set.
const DOCUMENT_TYPES = ['AADHAR Card (Back)', 'AADHAR Card (Front)', 'EIC Certificate', 'GST Certificate', 'MSME Certificate', 'PAN Card', 'Post Dated Check', 'Signed Contract']
// Four buckets, each takes any number of files.
const BILLING_DOCUMENT_TYPES = ['Agreement / Contract', 'Payment Terms / Rate Card', 'Communications', 'Others']
const DEFAULT_CREDIT_LIMIT = '500000'
const DEFAULT_CFT_FACTOR = '5.5'
const VOLUME_UNITS = ['Kg', 'CFT']
const DEPOSIT_PAYMENT_TYPES = ['Cheque', 'NEFT/RTGS', 'UPI', 'Cash', 'Demand Draft']
// All optional — a blank mode is saved with the safe factor (DEFAULT_CFT_FACTOR).
const CFT_CONVERSION_TYPES = ['Surface', 'Air', 'Rail', 'Water/Other']

// "Copy rates from" needs to show the *legal entity* on file for each active
// client (not the trade name shown everywhere else), since rates are legally
// attached to the entity, not the brand — pulled from its Customer Group.
// Each of today's seeded groups only has one legal entity, so [0] is
// unambiguous; a client tied to a multi-entity group would need the actual
// entity it onboarded under once that's tracked per-client.
// PANs already on file for onboarded / in-approval clients — a PAN can belong
// to only one client, so typing one of these flags it (see panOwner).
const EXISTING_PANS = Object.fromEntries(
  [...ACTIVE_CLIENTS_SEED, ...PENDING_CLIENTS_SEED]
    .map((c) => [String(c.details?.company?.pan ?? '').trim().toUpperCase(), c.name])
    .filter(([pan]) => pan),
)

const COPY_RATES_CLIENT_OPTIONS = ACTIVE_CLIENTS_SEED.map((c) => ({
  id: c.id,
  label: groupById(c.groupId)?.legalEntities[0] ?? c.name,
}))
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum']
const PRICING_TYPES = ['Standard', 'Custom']
const REGION_MAPPING_TYPES = ['Standard', 'Custom']

// Which state each PTL hub city sits in — same 15-city set as CITIES
// (data/permissions.js) and the pincode mock table below, kept as a plain
// lookup here since "which state is this billing hub in" isn't a concern
// permissions.js needs to know about.
const CITY_TO_STATE = {
  Mumbai: 'Maharashtra',
  'New Delhi': 'Delhi',
  Bengaluru: 'Karnataka',
  Chennai: 'Tamil Nadu',
  Kolkata: 'West Bengal',
  Hyderabad: 'Telangana',
  Pune: 'Maharashtra',
  Ahmedabad: 'Gujarat',
  Jaipur: 'Rajasthan',
  Gurugram: 'Haryana',
  Noida: 'Uttar Pradesh',
  Kochi: 'Kerala',
  Chandigarh: 'Chandigarh',
  Bhubaneswar: 'Odisha',
  Ranchi: 'Jharkhand',
}
const BILLING_STATES = [...new Set(Object.values(CITY_TO_STATE))].sort()

function citiesForState(state) {
  return CITIES.filter((c) => CITY_TO_STATE[c] === state)
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TIER_BADGE = {
  Platinum: 'bg-violet-50 text-violet-700',
  Gold: 'bg-amber-50 text-amber-700',
  Silver: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-800',
}

// Per the Income Tax Dept PAN format, the 4th character encodes the holder
// type. A sole proprietorship files under its proprietor's own (Individual)
// PAN, so that bucket is labelled to reflect both possibilities honestly
// rather than guessing one.
const ORG_TYPE_BY_PAN_CHAR = {
  C: 'Company',
  P: 'Individual / Proprietorship',
  H: 'HUF',
  F: 'Partnership Firm',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
}

function organisationTypeFromPan(pan) {
  const char = (pan || '').trim().toUpperCase()[3]
  return ORG_TYPE_BY_PAN_CHAR[char] ?? null
}

// GSTIN structure: 2-digit GST state code + 10-char PAN + 1-char entity code
// + 'Z' (literal) + 1-char checksum = 15 characters. Since the state (picked
// above) and the company PAN (from Company Info) are both already known, the
// first 12 characters are fully determined — only the last 3 are unique per
// registration and need typing. STATE_TO_GST_CODE lives in data/geo.js,
// shared with Partner Onboarding's own GSTIN Info step.

const PAYMENT_TYPE_CODE = {
  'Credit Customer': 'CR',
  'Prepaid Customer': 'PC',
  'Cash Customer': 'CA',
  'Prepaid Franchisee Commission': 'PF',
}

function twoLetterCode(str) {
  const letters = (str || '').replace(/[^a-zA-Z]/g, '').toUpperCase()
  return letters.padEnd(2, 'X').slice(0, 2)
}

// {Group}-{LegalEntity}-{PaymentType}-{serial}, e.g. "NY-TE-CR-001". Fully
// derived and non-editable — the serial is a provisional "-001" — only the
// backend can guarantee true uniqueness once it owns the customer master.
function deriveCustomerCode({ groupName, legalName, paymentType }) {
  if (!groupName.trim() || !legalName.trim()) return ''
  const groupCode = twoLetterCode(groupName)
  const legalCode = twoLetterCode(legalName)
  const paymentCode = PAYMENT_TYPE_CODE[paymentType] ?? 'XX'
  return `${groupCode}-${legalCode}-${paymentCode}-001`
}

// MOCK_PINCODE_LOOKUP/lookupPincode/INDIAN_STATES now live in
// data/geo.js (imported above) — shared with OdaListManager's own
// "type a pincode" quick-add.

// Prototype stand-in for the production PAN verification API: a well-formed
// PAN comes back "Verified" with a registered name. The 4th character of a PAN
// is its holder type (P person, C company, F firm...), so the dummy name
// follows it. Deterministic per PAN so the same input always shows the same name.
const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/
// GSTIN: 2-digit state code + 10-char PAN + entity code (1-9 / A-Z) + literal 'Z' + 1 check character.
const GSTIN_FORMAT = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const DUMMY_NAMES = {
  P: ['MOHD AZAD', 'RAJESH KUMAR SHARMA', 'PRIYA SINGH', 'ANITA DESAI', 'VIKRAM NAIR'],
  C: ['ACME FOODS PRIVATE LIMITED', 'BRIGHT LOGISTICS PRIVATE LIMITED', 'NORTHSTAR RETAIL PRIVATE LIMITED'],
  F: ['SHARMA TRADERS', 'GUPTA & SONS', 'KUMAR ENTERPRISES'],
  default: ['SUNRISE TRADING COMPANY', 'METRO SUPPLIES', 'GREENLEAF VENTURES'],
}
const KNOWN_PAN_NAMES = { CRPPA2503J: 'MOHD AZAD' }
function dummyRegisteredName(pan) {
  if (KNOWN_PAN_NAMES[pan]) return KNOWN_PAN_NAMES[pan]
  const pool = DUMMY_NAMES[pan[3]] ?? DUMMY_NAMES.default
  let h = 0
  for (const ch of pan) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const emailOk = (v) => EMAIL_FORMAT.test(v.trim())
const sameEmail = (a, b) => a.trim() !== '' && a.trim().toLowerCase() === b.trim().toLowerCase()
// 10 digits shown as "99999 99999"
const formatMobile = (digits) => (digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits)

let idRowSeq = 1
let docRowSeq = 1
let cftRowSeq = 1

// Tier is fixed by declared volume alone — not a suggestion ops can pick
// around, a direct rule. Thresholds are in Tonnes/month; the declared volume
// field is captured in Kg, so convert before comparing.
function tierFromVolume({ volumeKg }) {
  const tonnes = (Number(volumeKg) || 0) / 1000
  if (tonnes >= 10000) return 'Platinum'
  if (tonnes >= 1000) return 'Gold'
  if (tonnes >= 100) return 'Silver'
  return 'Bronze'
}

function Field({ label, required, labelInfo, badge, hint, error, locked, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className={LABEL}>
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
        {labelInfo && <InfoTip text={labelInfo} />}
        {badge && <span className="ml-auto">{badge}</span>}
      </span>
      <input
        {...props}
        readOnly={locked || props.readOnly}
        className={`${INPUT} ${error ? INPUT_ERR : INPUT_OK} ${locked ? 'cursor-not-allowed !bg-slate-50 text-slate-600' : ''}`}
      />
      {hint && <p className={`mt-1 text-[11px] ${error ? 'font-medium text-rose-500' : 'text-slate-400'}`}>{hint}</p>}
    </label>
  )
}

function SelectField({ label, labelInfo, hint, value, onChange, options, required, disabled, placeholder, renderOption, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className={LABEL}>
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
        {labelInfo && <InfoTip text={labelInfo} />}
      </span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} ${INPUT_OK} appearance-none pr-9 ${value === '' ? 'text-slate-400' : ''}`}
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
        <Icon name="chevron" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
      {hint && <p className="mt-1 truncate whitespace-nowrap text-[11px] text-slate-400">{hint}</p>}
    </label>
  )
}

// Dropdown whose default option carries a "Default" tag (native <select> can't).
function DefaultFlagSelect({ label, required, value, options, defaultValue, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const tag = <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Default</span>
  return (
    <div className={`relative ${className}`}>
      <span className={LABEL}>
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
      </span>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${INPUT} ${INPUT_OK} flex items-center justify-between gap-2 text-left`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-slate-800">{value}</span>
          {value === defaultValue && tag}
        </span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 w-full min-w-[180px] rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false) }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${value === o ? 'bg-orange-50/60 font-medium text-slate-900' : 'text-slate-600'}`}
              >
                {o}
                {o === defaultValue && tag}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2.5 text-sm ${disabled ? 'text-slate-500' : 'text-slate-600'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${checked ? 'bg-brand-orange' : 'bg-slate-200'} ${disabled ? 'opacity-70' : ''}`}
      >
        <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {label}
    </label>
  )
}

function Typeahead({ hintTitle, code, label, required, labelInfo, boldLabel, value, onChange, suggestions, renderSuggestion, onSelectSuggestion, placeholder, hint, error, disabled, className = '' }) {
  const [open, setOpen] = useState(false)
  const tokens = value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const filtered = tokens.length ? suggestions.filter((s) => { const label = s.label.toLowerCase(); return tokens.some((t) => label.includes(t)) }) : suggestions

  return (
    <label className={`relative block ${className}`}>
      <span className={`mb-1.5 flex items-center gap-1 text-xs ${boldLabel ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
        {labelInfo && <InfoTip text={labelInfo} />}
      </span>
      <div className="relative">
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={`${INPUT} ${error ? INPUT_ERR : INPUT_OK} ${code ? 'pr-28' : ''}`}
      />
        {code && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
            {code}
          </span>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => onSelectSuggestion(s)}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              {renderSuggestion ? renderSuggestion(s) : s.label}
            </button>
          ))}
        </div>
      )}
      {hint && <p title={hintTitle ?? (typeof hint === 'string' ? hint : undefined)} className={`mt-1 truncate whitespace-nowrap text-[11px] ${error ? 'font-medium text-rose-500' : 'text-slate-400'}`}>{hint}</p>}
    </label>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className={card}>
      {title && (
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      )}
      <div className="grid gap-x-4 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
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

// Each identification (GSTIN/PAN/etc.) carries its own address, so pincode
// lookup is scoped per row rather than to the wizard as a whole — same mock
// lookupPincode() / MOCK_PINCODE_LOOKUP used by Company Info's address block.
// For a GSTIN row specifically, State comes from the GSTIN's own state code
// (an authoritative fact of that registration), not from the pincode lookup —
// pincode only drives City here, and its looked-up state is cross-checked
// against the GSTIN's state to catch a mismatched/wrong-state address.
// Dashed "click to upload" tile shared by the PAN and GSTIN document pickers.
function UploadTile({ file, onFile, text = 'Click to upload or drag a file', className = '' }) {
  return (
    <label
      className={`flex h-[38px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3.5 text-xs text-slate-500 transition-colors hover:border-brand-orange/50 hover:bg-orange-50/30 ${className}`}
    >
      <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{file ? file.name : text}</span>
      <input type="file" className="hidden" onChange={(e) => onFile(e.target.files[0] ?? null)} />
    </label>
  )
}

function IdentificationRow({ row, index, onUpdate, onRemove, removable, companyPan, highlight }) {
  const rowRef = useRef(null)
  useEffect(() => {
    if (!highlight) return
    rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    rowRef.current?.querySelector('select')?.focus({ preventScroll: true })
  }, [highlight])
  const [pincodeLookupStatus, setPincodeLookupStatus] = useState('idle')
  const [pincodeLookupResult, setPincodeLookupResult] = useState(null)

  // A GSTIN's first 12 characters are fully determined by facts we already
  // have (2-digit state code + the 10-char company PAN) — only the last 3
  // (entity code + 'Z' + checksum) are unique per registration and need typing.
  const gstinCode = STATE_TO_GST_CODE[row.state] ?? null
  const gstinPrefix = gstinCode && companyPan ? `${gstinCode}${companyPan.trim().toUpperCase()}` : null
  const gstinSuffix = gstinPrefix && row.idNumber.startsWith(gstinPrefix) ? row.idNumber.slice(gstinPrefix.length) : ''

  // City is never typed — the pincode alone fills it.
  useEffect(() => {
    if (!/^\d{6}$/.test(row.pincode)) {
      setPincodeLookupStatus('idle')
      setPincodeLookupResult(null)
      if (row.city) onUpdate(row.id, 'city', '')
      if (row.pincodeState) onUpdate(row.id, 'pincodeState', '')
      return
    }
    let cancelled = false
    setPincodeLookupStatus('loading')
    lookupPincode(row.pincode).then((result) => {
      if (cancelled) return
      onUpdate(row.id, 'city', result?.city ?? '')
      onUpdate(row.id, 'pincodeState', result?.state ?? '') // lets the step block a pincode from another state
      setPincodeLookupStatus(result ? 'found' : 'not-found')
      setPincodeLookupResult(result ?? null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.pincode])

  const stateMismatch = Boolean(pincodeLookupResult && row.state && pincodeLookupResult.state !== row.state)
  // Only judged once all 3 trailing characters are typed.
  const gstinInvalid = Boolean(gstinPrefix) && gstinSuffix.length === 3 && !GSTIN_FORMAT.test(row.idNumber)

  return (
    <div
      ref={rowRef}
      className={`space-y-4 rounded-2xl border p-4 transition-all duration-500 ${
        highlight ? 'border-brand-orange/60 bg-orange-50/50 ring-4 ring-brand-orange/15' : 'border-slate-200/80 bg-slate-50/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          GSTIN {index + 1}
          {highlight && <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-white">Added</span>}
        </span>
        {removable && (
          <button type="button" onClick={onRemove} className="text-xs font-medium text-rose-500 hover:underline">
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
        <SelectField className="lg:col-span-2" label="State" required value={row.state} onChange={(v) => onUpdate(row.id, 'state', v)} options={INDIAN_STATES} placeholder="Select state" />
        <label className="block lg:col-span-2">
          <span className={LABEL}>
            GSTIN<span className="text-brand-orange-dark">*</span>
          </span>
          {gstinPrefix ? (
            <div
              className={`flex items-center rounded-xl border bg-white pl-3.5 transition-colors focus-within:outline focus-within:outline-2 ${
                gstinInvalid
                  ? 'border-rose-300 focus-within:border-rose-300 focus-within:outline-rose-200'
                  : 'border-slate-200 focus-within:border-brand-orange focus-within:outline-brand-orange/20'
              }`}
            >
              <span className="shrink-0 text-sm font-medium tracking-wide text-slate-500">{gstinPrefix}</span>
              <input
                type="text"
                value={gstinSuffix}
                onChange={(e) => onUpdate(row.id, 'idNumber', gstinPrefix + e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                maxLength={3}
                className="w-16 min-w-0 rounded-xl bg-transparent py-2 pl-0.5 pr-3.5 text-sm text-slate-800 focus:outline-none"
              />
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-400">Select a state first</p>
          )}
          {gstinInvalid && <p className="mt-1 text-[11px] font-medium text-rose-500">Invalid GSTIN</p>}
          {gstinPrefix && !gstinInvalid && gstinSuffix.length < 3 && <p className="mt-1 text-[11px] text-slate-400">Enter the last 3 digits of the GSTIN</p>}
        </label>
        <div className="lg:col-span-2">
          <span className={LABEL}>
            Upload GSTIN Document<span className="text-brand-orange-dark">*</span>
          </span>
          <UploadTile file={row.document} onFile={(f) => onUpdate(row.id, 'document', f)} />
        </div>

        <Field className="sm:col-span-2 lg:col-span-3" label="Registered address" required value={row.address} onChange={(e) => onUpdate(row.id, 'address', e.target.value)} placeholder="Building, street, area" />
        <Field
          label="Pincode"
          required
          inputMode="numeric"
          maxLength={6}
          value={row.pincode}
          onChange={(e) => onUpdate(row.id, 'pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="410208"
          error={stateMismatch || pincodeLookupStatus === 'not-found'}
          hint={
            pincodeLookupStatus === 'loading'
              ? 'Looking up…'
              : pincodeLookupStatus === 'not-found'
                ? 'Pincode not found'
                : stateMismatch
                  ? `This pincode is in ${pincodeLookupResult.state}, not ${row.state}`
                  : undefined
          }
        />
        <Field label="City" required locked value={row.city} placeholder="From pincode" />
        <Field label="Country" required locked value={row.country} />
      </div>
    </div>
  )
}

export default function NewClient() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // A row in Onboarding's "Client activation in progress" list links back
  // here as ?step=tier&id=... or ?step=kyc&id=... (whichever the client's
  // status still needs) — resolve the step to a starting point instead of
  // always step 0, and carry the id so later steps update that same
  // activation record rather than a brand-new one.
  const [searchParams] = useSearchParams()
  const initialStep = STEPS.findIndex((s) => s.key === searchParams.get('step'))
  const [step, setStep] = useState(initialStep >= 0 ? initialStep : 0)
  const [showClientCreatedDialog, setShowClientCreatedDialog] = useState(false)
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false)
  // Set once Billing Info is confirmed and the activation record exists (or
  // read from the URL when resuming one) — lets later steps update that same
  // record's status in place.
  const [activationId, setActivationId] = useState(searchParams.get('id') || null)
  // If this activation was sent back by Sales Admin, surface their comment so
  // whoever's fixing it (usually Sales Executive) knows what to change.
  const correctionRow = activationId
    ? ACTIVATIONS_SEED.find((r) => r.id === activationId && r.status === ACTIVATION_STATUS.CORRECTION_REQUESTED)
    : null

  // Company Info
  const [groupName, setGroupName] = useState('')
  const [groupId, setGroupId] = useState(null)
  const groupFilled = groupName.trim().length > 0
  // Falls back to a name match so pasting/typing an existing group's exact
  // name (without clicking its suggestion) still scopes legal entities
  // correctly, rather than treating it as a brand-new group.
  const effectiveGroupId =
    groupId ?? GROUP_SUGGESTIONS.find((g) => g.label.trim().toLowerCase() === groupName.trim().toLowerCase())?.id ?? null
  // A brand-new group has no legal entities yet, so the dropdown should stay
  // empty rather than surfacing every other group's entities.
  const legalEntitySuggestionsForGroup = useMemo(
    () => (effectiveGroupId ? LEGAL_ENTITY_SUGGESTIONS.filter((s) => s.groupId === effectiveGroupId) : []),
    [effectiveGroupId],
  )
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [pan, setPan] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [paymentType, setPaymentType] = useState('')
  const duplicateLegalEntity = useMemo(
    () => LEGAL_ENTITY_SUGGESTIONS.find((s) => s.label.trim().toLowerCase() === legalName.trim().toLowerCase()) ?? null,
    [legalName],
  )
  // Production shows a code chip inside the Customer group / Legal entity
  // fields (CG000008 / CL000014). Existing records use their own serial; a new
  // one shows the next serial it will get on creation.
  const groupCode = useMemo(() => {
    if (!groupName.trim()) return ''
    const n = effectiveGroupId ? parseInt(effectiveGroupId.replace(/\D/g, ''), 10) : GROUP_SUGGESTIONS.length + 1
    return `CG${String(n).padStart(6, '0')}`
  }, [groupName, effectiveGroupId])
  const legalCode = useMemo(() => {
    if (!legalName.trim()) return ''
    const idx = LEGAL_ENTITY_SUGGESTIONS.findIndex((x) => x.label.trim().toLowerCase() === legalName.trim().toLowerCase())
    return `CL${String((idx >= 0 ? idx : LEGAL_ENTITY_SUGGESTIONS.length) + 1).padStart(6, '0')}`
  }, [legalName])
  const organisationType = useMemo(() => organisationTypeFromPan(pan), [pan])
  const panOwner = EXISTING_PANS[pan.trim().toUpperCase()] ?? null
  const panFormatOk = PAN_FORMAT.test(pan.trim().toUpperCase())
  const panVerified = panFormatOk && !panOwner
  const panRegisteredName = panVerified ? dummyRegisteredName(pan.trim().toUpperCase()) : ''
  const customerCode = useMemo(
    () => deriveCustomerCode({ groupName, legalName, paymentType }),
    [groupName, legalName, paymentType],
  )
  const [fullAddress, setFullAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [pincodeLookupStatus, setPincodeLookupStatus] = useState('idle') // idle | loading | found | not-found
  const [state, setState] = useState('')
  const [country] = useState(STATES_COUNTRY[0])

  // City / State / Country are never typed — the pincode alone fills them.
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeLookupStatus('idle')
      setCity('')
      setState('')
      return
    }
    let cancelled = false
    setPincodeLookupStatus('loading')
    lookupPincode(pincode).then((result) => {
      if (cancelled) return
      setCity(result?.city ?? '')
      setState(result?.state ?? '')
      setPincodeLookupStatus(result ? 'found' : 'not-found')
    })
    return () => {
      cancelled = true
    }
  }, [pincode])
  const [sacNumber, setSacNumber] = useState('')
  const [hsnNumber, setHsnNumber] = useState('')
  const [tanNumber, setTanNumber] = useState('')
  const [msmeNumber, setMsmeNumber] = useState('')

  // Contact Info
  const [pocFirstName, setPocFirstName] = useState('')
  const [pocLastName, setPocLastName] = useState('')
  const pocName = joinName(pocFirstName, pocLastName) // derived, never typed
  const [phoneCode] = useState(PHONE_CODES[0])
  const [pocMobile, setPocMobile] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [opsEmail, setOpsEmail] = useState('')
  const [financeEmail, setFinanceEmail] = useState('')
  const [salesPerson, setSalesPerson] = useState(user?.name ?? '')
  // The signed-in user plus everyone who reports to them (directly or not);
  // they are the default.
  const salesPersonOptions = useMemo(() => {
    if (!user) return []
    const reports = LT_USERS.filter((u) => u.email !== user.email && isReportOf(LT_USERS, u.email, user.email))
      .map((u) => u.name)
      .sort((a, b) => a.localeCompare(b))
    return [user.name, ...reports]
  }, [user])

  // GSTIN Info (repeatable) — row 1 is mandatory unless noGstin is checked
  const [panDocument, setPanDocument] = useState(null)
  const [noGstin, setNoGstin] = useState(false)
  const [identifications, setIdentifications] = useState([
    { id: idRowSeq++, idNumber: '', country: 'India', address: '', pincode: '', city: '', state: '', document: null },
  ])

  function handleNoGstin(checked) {
    setNoGstin(checked)
    if (checked) setIdentifications([])
    else if (identifications.length === 0) setIdentifications([{ id: idRowSeq++, idNumber: '', country: 'India', address: '', pincode: '', city: '', state: '', document: null }])
  }

  // Billing Info
  const [contractStart, setContractStart] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  // Defaults to today — almost always signed the day it's entered; editable
  // for the rare backdated/postdated case.
  const [contractExecutionDate, setContractExecutionDate] = useState(todayISO())
  const [billingPeriod, setBillingPeriod] = useState(BILLING_PERIODS[2])
  const [billPrintFormat, setBillPrintFormat] = useState(DEFAULT_BILL_PRINT_FORMAT)
  const [creditLimit, setCreditLimit] = useState('')
  const [centralisedPayment, setCentralisedPayment] = useState(false)
  const [billingState, setBillingState] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingBranch, setBillingBranch] = useState('')
  const [securityDeposit, setSecurityDeposit] = useState(false)
  const [securityDepositAmount, setSecurityDepositAmount] = useState('')
  // 'No' isn't a dead end today — it's meant to surface as an outstanding
  // payment on the client's own side later; that surfacing isn't built yet.
  const [securityDepositPaid, setSecurityDepositPaid] = useState('No')
  const [depositPaymentDate, setDepositPaymentDate] = useState('')
  const [depositPaymentType, setDepositPaymentType] = useState(DEPOSIT_PAYMENT_TYPES[0])
  const [depositReferenceNo, setDepositReferenceNo] = useState('')
  const [taxExemption, setTaxExemption] = useState(false)
  const [fuelSurchargeExemption, setFuelSurchargeExemption] = useState(false)
  const [expectedVolumeKg, setExpectedVolumeKg] = useState('')
  const [volumeUnit, setVolumeUnit] = useState(VOLUME_UNITS[0])
  const [copyRatesEnabled, setCopyRatesEnabled] = useState(false)
  const [copyRatesFrom, setCopyRatesFrom] = useState('')

  // CFT-to-KG conversion for charges (repeatable) — different shipment types
  // (Air, Surface) often use different volumetric conversion factors for the
  // same client, so this is a list rather than a single value.
  const [cftConversions, setCftConversions] = useState(
    CFT_CONVERSION_TYPES.map((type) => ({ id: cftRowSeq++, type, conversion: '' })),
  )

  // KYC (repeatable)
  const [documents, setDocuments] = useState([
    { id: docRowSeq++, type: 'PAN Card', file: null },
    { id: docRowSeq++, type: 'GST Certificate', file: null },
  ])

  // Billing documents — one fixed slot per type (rate card, signed contract,
  // other billing correspondence); at least one must be uploaded. Shares
  // docRowSeq with KYC's documents so ids never collide across the two lists.
  const [billingDocuments, setBillingDocuments] = useState(
    BILLING_DOCUMENT_TYPES.map((type) => ({ id: docRowSeq++, type, files: [] })),
  )

  // Pricing (tier + additional charges)
  // Tier is fixed by declared volume — not a choice, just shown for context.
  // Optional: left blank, it counts as 1.
  const effectiveVolume = expectedVolumeKg.trim() === '' ? '1' : expectedVolumeKg
  const effectiveCreditLimit = creditLimit.trim() === '' ? DEFAULT_CREDIT_LIMIT : creditLimit
  const tier = useMemo(() => tierFromVolume({ volumeKg: effectiveVolume }), [effectiveVolume])

  // Standard = the fixed, un-discounted rate card, same for every client
  // (editing it lives in Client Pricing Configuration, never per-client
  // here). Custom applies a discount % instead — defaults to the tier's
  // suggested 5/10/15, but ops can type any number.
  const [pricingType, setPricingType] = useState('Standard')
  const [regionMappingType, setRegionMappingType] = useState('Standard')
  const [discountPercent, setDiscountPercent] = useState(String(TIER_DISCOUNTS[tier] ?? 0))
  const [discountTouched, setDiscountTouched] = useState(false)

  // Re-syncs the suggested % whenever the volume-driven tier changes, unless
  // ops already typed their own value — same "don't clobber a manual edit"
  // pattern as pincode auto-fill elsewhere in this form.
  useEffect(() => {
    if (!discountTouched) setDiscountPercent(String(TIER_DISCOUNTS[tier] ?? 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier])

  const effectiveDiscount = pricingType === 'Custom' ? Number(discountPercent) || 0 : 0
  // Single matrix shown at a time — Standard's list rate, or the entered
  // discount %, optionally overridden cell-by-cell below.
  const previewMatrix = useMemo(() => matrixArrayToObject(computeMatrixAtDiscount(effectiveDiscount)), [effectiveDiscount])

  // Custom Region Definition — a client-scoped region set (not a variant of
  // the shared 13-zone matrix), each region a plain list of cities, priced
  // as a sparse region x region grid. Cities are assigned exclusively — a
  // city can sit in only one region at a time.
  const [customRegions, setCustomRegions] = useState([])
  // Sparse overrides only, keyed `${originId}|${destId}` — a lane left blank
  // isn't priced yet, so it falls back to unmappedDefaultRate rather than
  // silently reading as free.
  const [customRegionOverrides, setCustomRegionOverrides] = useState({})
  const [unmappedDefaultRate, setUnmappedDefaultRate] = useState('')
  const [showRegionBuilder, setShowRegionBuilder] = useState(false)
  const [expandedRegionCities, setExpandedRegionCities] = useState(null)
  const [regionCitySearch, setRegionCitySearch] = useState('')

  const assignedCityKeys = useMemo(() => {
    const map = new Map()
    customRegions.forEach((region) => {
      region.cities.forEach(({ state, city }) => map.set(`${state}|${city}`, region.id))
    })
    return map
  }, [customRegions])

  const unmappedCities = useMemo(() => {
    const list = []
    Object.entries(STATE_CITY_DIRECTORY).forEach(([state, cities]) => {
      cities.forEach((city) => {
        if (!assignedCityKeys.has(`${state}|${city}`)) list.push({ state, city })
      })
    })
    return list
  }, [assignedCityKeys])

  // Master-detail selection for the Regions rail below — `expandedRegionCities`
  // (one open region at a time, same state that used to just toggle a single
  // card's expand/collapse) now doubles as "which region is selected", falling
  // back to the first region so something is always shown instead of every
  // region collapsed and blank.
  const selectedRegion = customRegions.find((r) => r.id === expandedRegionCities) ?? customRegions[0] ?? null

  const [pickingRegionTemplate, setPickingRegionTemplate] = useState(false)

  function openRegionBuilder() {
    setShowRegionBuilder(true)
    setExpandedRegionCities(null)
    setRegionCitySearch('')
    setPickingRegionTemplate(false)
  }

  function seedRegionsFromStandard() {
    setCustomRegions(buildRegionsFromStandard())
    setCustomRegionOverrides({})
    setUnmappedDefaultRate('')
  }

  function startRegionsFresh() {
    setCustomRegions([])
    setCustomRegionOverrides({})
    setUnmappedDefaultRate('')
  }

  // Clones a saved template (built ahead of time from Client Pricing >
  // Client Mapping) into this client's own region set — a copy, not a live
  // reference, so editing it here never touches the shared template.
  function pullRegionTemplate(templateId) {
    const cloned = cloneRegionTemplate(templateId)
    if (!cloned) return
    setCustomRegions(cloned.regions)
    setCustomRegionOverrides(cloned.overrides)
    setUnmappedDefaultRate(cloned.defaultRate)
    setPickingRegionTemplate(false)
  }

  function addCustomRegion() {
    const id = freshRegionId()
    setCustomRegions((rows) => [...rows, { id, name: `Region ${rows.length + 1}`, cities: [] }])
    setExpandedRegionCities(id)
  }

  function renameCustomRegion(id, name) {
    setCustomRegions((rows) => rows.map((r) => (r.id === id ? { ...r, name } : r)))
  }

  function deleteCustomRegion(id) {
    setCustomRegions((rows) => rows.filter((r) => r.id !== id))
    setCustomRegionOverrides((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${id}|`) || key.endsWith(`|${id}`)) delete next[key]
      })
      return next
    })
    if (expandedRegionCities === id) setExpandedRegionCities(null)
  }

  // A city belongs to at most one region — assigning it here silently pulls
  // it out of whichever region (including this one, as a toggle-off) held it
  // before.
  function toggleCityInRegion(regionId, state, city) {
    setCustomRegions((rows) =>
      rows.map((r) => {
        const has = r.cities.some((c) => c.state === state && c.city === city)
        if (r.id === regionId) {
          return has ? { ...r, cities: r.cities.filter((c) => !(c.state === state && c.city === city)) } : { ...r, cities: [...r.cities, { state, city }] }
        }
        return has ? { ...r, cities: r.cities.filter((c) => !(c.state === state && c.city === city)) } : r
      }),
    )
  }

  function regionCellKey(originId, destId) {
    return `${originId}|${destId}`
  }
  function regionCellValue(originId, destId) {
    return customRegionOverrides[regionCellKey(originId, destId)] ?? ''
  }
  function setRegionCellValue(originId, destId, value) {
    const key = regionCellKey(originId, destId)
    setCustomRegionOverrides((prev) => {
      if (value === '') {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: Math.max(0, Number(value) || 0) }
    })
  }

  // Off by default — the discounted matrix above is what's used. Checking it
  // snapshots those current values into an editable copy so cell edits start
  // from the discount actually applied, not a stale one; unchecking just
  // stops using it — edits made while checked aren't lost, so re-checking
  // (without the discount % having moved in between) restores them.
  const [requireCellChanges, setRequireCellChanges] = useState(false)
  const [customMatrix, setCustomMatrix] = useState(null)
  const editingCells = pricingType === 'Custom' && regionMappingType === 'Standard' && requireCellChanges

  // Standard pricing hides the rate card behind a button by default — it's
  // the same fixed matrix for every client, so there's no need to dump it on
  // screen up front. Custom always shows its matrix since that's what's
  // actually being configured.
  const [showStandardMatrix, setShowStandardMatrix] = useState(false)
  useEffect(() => {
    if (pricingType !== 'Standard') setShowStandardMatrix(false)
  }, [pricingType])

  // Region Mapping — same pincode → zone reference shown from Client Pricing
  // Configuration, surfaced here too once the standard matrix is open so ops
  // can check which zone a client's pincode falls under.
  const [showRegionMappingModal, setShowRegionMappingModal] = useState(false)

  // A discount %/pricing-type change while not actively editing invalidates
  // any old snapshot, so the next check-on re-seeds from the current numbers
  // instead of resurrecting values from a since-changed discount.
  useEffect(() => {
    if (!requireCellChanges) setCustomMatrix(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDiscount, pricingType, regionMappingType])

  function handleRequireCellChangesToggle(checked) {
    setRequireCellChanges(checked)
    if (checked) setCustomMatrix((prev) => prev ?? previewMatrix)
  }

  function updateCustomMatrixCell(origin, dest, value) {
    setCustomMatrix((prev) => ({ ...prev, [origin]: { ...prev[origin], [dest]: Math.max(0, Number(value) || 0) } }))
  }

  // Client ODA list — pincodes/areas this specific client is Out of Delivery
  // Area for, so ops can see up front which deliveries will attract the ODA
  // charge (tagged below under Additional Charges, not computed from this
  // list yet — it's a reference list, not wired into charge resolution).
  // Defaults to a clone of the shared "Default ODA List" (configured
  // centrally in Client Pricing Configuration > Additional Charges, see
  // data/odaPincodes.js) rather than empty — every new client starts fully
  // covering it, per Yugal, and can edit their own copy from there without
  // touching the shared default. All the view/edit/picker UI itself lives
  // in components/OdaListManager.jsx, shared with that Client Pricing page.
  const [odaEntries, setOdaEntries] = useState(() => cloneDefaultOdaEntries())
  const [odaPricing, setOdaPricing] = useState(() => cloneDefaultOdaOverrides())
  const [odaDefaultRate, setOdaDefaultRate] = useState(() => cloneOdaRates(getDefaultOdaRate()))
  const [noOda, setNoOda] = useState(false)

  function handleNoOda(checked) {
    setNoOda(checked)
    if (checked) setOdaEntries([])
  }

  // Mandatory — ops must make an explicit call here, even if that call is
  // "no additional charges for this client" (noAdditionalCharges), rather
  // than the step silently defaulting to nothing. The master (Client Pricing
  // Configuration) only defines each charge's type/shape and a default value;
  // adding one here clones its rule so the actual number can be edited for
  // this specific client without touching the master's default.
  const [selectedCharges, setSelectedCharges] = useState([])
  const [noAdditionalCharges, setNoAdditionalCharges] = useState(false)

  function addCharge(name) {
    const master = ADDITIONAL_CHARGES_MASTER.find((c) => c.name === name)
    if (!master) return
    setSelectedCharges((rows) => [...rows, { name: master.name, rule: JSON.parse(JSON.stringify(master.rule)) }])
    setNoAdditionalCharges(false)
  }
  function updateChargeRule(name, nextRule) {
    setSelectedCharges((rows) => rows.map((r) => (r.name === name ? { ...r, rule: nextRule } : r)))
  }
  function removeCharge(name) {
    setSelectedCharges((rows) => rows.filter((r) => r.name !== name))
  }
  function handleNoAdditionalCharges(checked) {
    setNoAdditionalCharges(checked)
    if (checked) setSelectedCharges([])
  }

  // The row just added is scrolled into view and briefly highlighted, so it is
  // obvious that "Add another GSTIN" did something.
  const [justAddedId, setJustAddedId] = useState(null)
  function addIdentification() {
    const id = idRowSeq++
    setIdentifications((rows) => [
      ...rows,
      { id, idNumber: '', country: 'India', address: '', pincode: '', city: '', state: '', document: null },
    ])
    setJustAddedId(id)
    setTimeout(() => setJustAddedId((cur) => (cur === id ? null : cur)), 2200)
  }
  function updateIdentification(id, field, value) {
    setIdentifications((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function removeIdentification(id) {
    setIdentifications((rows) => rows.filter((r) => r.id !== id))
  }

  function addDocument() {
    setDocuments((rows) => [...rows, { id: docRowSeq++, type: DOCUMENT_TYPES[0], file: null }])
  }
  function updateDocument(id, field, value) {
    setDocuments((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  function removeDocument(id) {
    setDocuments((rows) => rows.filter((r) => r.id !== id))
  }

  function addBillingFiles(id, fileList) {
    const added = Array.from(fileList ?? [])
    if (!added.length) return
    setBillingDocuments((rows) => rows.map((r) => (r.id === id ? { ...r, files: [...r.files, ...added] } : r)))
  }

  function removeBillingFile(id, index) {
    setBillingDocuments((rows) => rows.map((r) => (r.id === id ? { ...r, files: r.files.filter((_, i) => i !== index) } : r)))
  }

  function updateCftConversion(id, field, value) {
    const next = field === 'conversion' && value !== '' ? String(Math.max(0, Number(value) || 0)) : value
    setCftConversions((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: next } : r)))
  }

  function handleBillingStateChange(v) {
    setBillingState(v)
    setBillingCity('')
    setBillingBranch('')
  }
  function handleBillingCityChange(v) {
    setBillingCity(v)
    setBillingBranch('')
  }

  function goBack() {
    navigate('/client-module/onboarding')
  }

  const isLastStep = step === STEPS.length - 1

  // The client record itself is considered created once Billing Info is
  // confirmed — it leaves Drafts right there and shows up in "Client
  // activation in progress" as Tier Pricing Pending, even though Client Tier
  // and KYC still need finishing before it's actually Active.
  function handleNext() {
    if (isLastStep) {
      // Full snapshot of every step — this is what Sales Admin's review panel
      // reads from in Client Approvals (identity/address, contact, billing,
      // identification rows + docs); pricing/additional charges stay separate
      // since that's Finance Admin's stage, not Sales Admin's.
      const details = {
        company: {
          groupName, legalName, tradeName, pan, organisationType, paymentType, customerCode,
          fullAddress, pincode, city, state, country,
          sacNumber, hsnNumber, tanNumber, msmeNumber, panDocument,
        },
        contact: { pocName, pocFirstName, pocLastName, phoneCode, pocMobile, pocEmail, opsEmail, financeEmail, salesPerson },
        identifications,
        billing: {
          contractStart, contractEnd, contractExecutionDate, billingPeriod, billPrintFormat, creditLimit: effectiveCreditLimit,
          centralisedPayment, billingState, billingCity, billingBranch,
          securityDeposit, securityDepositAmount, securityDepositPaid, depositPaymentDate, depositPaymentType, depositReferenceNo,
          taxExemption, fuelSurchargeExemption, expectedVolumeKg: effectiveVolume, volumeUnit,
          copyRatesEnabled, copyRatesFrom, billingDocuments,
          cftConversions: cftConversions.map((r) => ({ ...r, conversion: String(r.conversion).trim() === '' ? DEFAULT_CFT_FACTOR : r.conversion })),
        },
        documents,
      }
      // KYC submitted — the client is done with the wizard entirely and moves
      // from "Client activation in progress" to Client Approvals for pricing
      // sign-off, same lifecycle stage every other pending client sits in.
      submitClientForApproval({
        id: activationId || `act-${Date.now()}`,
        name: tradeName || legalName,
        groupId,
        gstin: identifications[0]?.idNumber || '',
        city,
        state,
        tier,
        submittedBy: user?.name,
        additionalCharges: noAdditionalCharges ? [] : selectedCharges.map((c) => ({ name: c.name, value: formatChargeRule(c.rule) })),
        kycDocsCount: documents.filter((doc) => doc.file ?? (doc.type === 'PAN Card' ? panDocument : null)).length,
        kycDocsTotal: documents.length,
        details,
        // What was actually chosen on the Pricing step — additive alongside
        // the tier-derived `matrix`/`charges` seedClientPricing already
        // attaches, so Client Pricing > Client Mapping has the real picture
        // to show/search, regardless of Standard vs Custom vs Custom region.
        pricingProfile: {
          pricingType,
          regionMappingType: pricingType === 'Custom' ? regionMappingType : null,
          discountPercent: pricingType === 'Custom' ? effectiveDiscount : 0,
          customRegions: pricingType === 'Custom' && regionMappingType === 'Custom' ? customRegions : [],
          customRegionOverrides: pricingType === 'Custom' && regionMappingType === 'Custom' ? customRegionOverrides : {},
          unmappedDefaultRate: pricingType === 'Custom' && regionMappingType === 'Custom' ? unmappedDefaultRate : '',
        },
      })
      if (activationId) removeActivation(activationId)
      setShowSubmittedDialog(true)
      return
    }
    if (step === 3) {
      const id = createActivation({ name: tradeName || legalName, owner: user?.name })
      setActivationId(id)
      setShowClientCreatedDialog(true)
      return
    }
    if (step === 4) {
      // Tier confirmed — pricing done, documents still outstanding.
      if (activationId) updateActivationStatus(activationId, ACTIVATION_STATUS.DOCS_PENDING)
    }
    setStep((s) => s + 1)
  }

  function handleClientCreatedContinue() {
    setShowClientCreatedDialog(false)
    setStep((s) => s + 1)
  }

  // No button on this one (unlike the "Client Created" dialog) — there's no
  // decision left for the user to make, so it just confirms and moves on.
  // Client Approvals is Sales Admin/Finance Admin's screen, not the
  // submitter's — the submitter (usually Sales Executive) belongs back on
  // Client Onboarding, where their client now shows up under "Client
  // activation in progress" as pending the next approval stage.
  useEffect(() => {
    if (!showSubmittedDialog) return
    const timer = setTimeout(() => navigate('/client-module/onboarding', { state: { tab: 'in-progress' } }), 1400)
    return () => clearTimeout(timer)
  }, [showSubmittedDialog])

  // The GST certificate uploaded on GSTIN Info also satisfies KYC's GST Certificate row.
  const gstDocument = identifications.find((r) => r.document)?.document ?? null

  // POC, Ops and Finance emails must all be different from each other.
  const opsDupe = sameEmail(opsEmail, pocEmail)
  const financeDupe = sameEmail(financeEmail, pocEmail) || sameEmail(financeEmail, opsEmail)

  // Mirrors the `required` fields marked with * on each step — Next stays
  // disabled until all of them are filled (and the legal entity isn't a
  // flagged duplicate), so the wizard can't be pushed forward incomplete.
  const stepValid = [
    groupFilled &&
      !duplicateLegalEntity &&
      !panOwner &&
      legalName.trim().length > 0 &&
      panVerified &&
      paymentType.trim().length > 0 &&
      fullAddress.trim().length > 0 &&
      pincode.trim().length > 0 &&
      city.trim().length > 0 &&
      state.trim().length > 0 &&
      country.trim().length > 0,
    namePartOk(pocFirstName) &&
      namePartOk(pocLastName) &&
      pocMobile.length === 10 &&
      emailOk(pocEmail) &&
      (opsEmail.trim() === '' || (emailOk(opsEmail) && !opsDupe)) &&
      (financeEmail.trim() === '' || (emailOk(financeEmail) && !financeDupe)) &&
      salesPerson.trim().length > 0,
    !!panDocument &&
      (noGstin ||
      (identifications.length > 0 &&
        identifications.every(
          (row) =>
            GSTIN_FORMAT.test(row.idNumber.trim()) &&
            row.address.trim().length > 0 &&
            row.pincode.trim().length > 0 &&
            row.city.trim().length > 0 &&
            row.state.trim().length > 0 &&
            row.country.trim().length > 0 &&
            row.pincodeState === row.state &&
            !!row.document,
        ))),
    contractStart.trim().length > 0 &&
      contractEnd.trim().length > 0 &&
      contractExecutionDate.trim().length > 0 &&
      billingPeriod.trim().length > 0 &&
      billPrintFormat.trim().length > 0 &&
      billingDocuments.some((doc) => doc.files.length > 0) &&
      (!centralisedPayment ||
        (billingState.trim().length > 0 && billingCity.trim().length > 0 && billingBranch.trim().length > 0)),
    (noOda || odaEntries.length > 0) && (noAdditionalCharges || selectedCharges.length > 0), // Pricing — Final tier always has a value; ODA list and Additional Charges must both be an explicit choice (incl. "None")
    // KYC must actually be done — every listed document needs a file — before
    // this can leave "Client activation in progress" for Sales Admin's queue.
    // Remove a document row instead of leaving it empty if it doesn't apply.
    documents.every((doc) => doc.file ?? (doc.type === 'PAN Card' ? panDocument : doc.type === 'GST Certificate' ? gstDocument : null)),
  ][step]

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div>
        <Link
          to="/client-module/onboarding"
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          Back to Client Onboarding
        </Link>
        {/* The heading becomes the client's own name once it's typed, so it's
            always clear who is being onboarded. */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">{tradeName.trim() || legalName.trim() || 'Create new client'}</h1>
          {(tradeName.trim() || legalName.trim()) && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-brand-orange-dark">New client · Draft</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Company identity, address, commercial terms and KYC — save as a draft any time.</p>
      </div>

      {correctionRow?.correctionComment && (
        <div className="flex gap-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <div>
            <div className="text-xs font-semibold text-rose-600">Correction requested</div>
            <p className="mt-0.5 text-sm text-rose-700">{correctionRow.correctionComment}</p>
          </div>
        </div>
      )}

      {step === 0 && panOwner && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
          <Icon name="info" className="h-4 w-4 shrink-0" />
          <span>
            PAN already exists for another client
            <span className="font-normal text-rose-500"> · {panOwner}</span>
          </span>
        </div>
      )}

      <div className={`p-6 ${card}`}>
        <Stepper step={step} onJump={setStep} />
      </div>

      {step === 0 && (
        <Section>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3 lg:col-span-4">
          <Typeahead
            code={groupCode}
            label="Customer group"
            required
            value={groupName}
            onChange={(v) => {
              setGroupName(v)
              setGroupId(null)
              setLegalName('')
            }}
            suggestions={GROUP_SUGGESTIONS}
            onSelectSuggestion={(s) => {
              setGroupName(s.label)
              setGroupId(s.id)
              setLegalName('')
            }}
            placeholder="Search or type a new group name"
            hint={effectiveGroupId ? undefined : groupName.trim() ? 'New group — will be created' : 'Fill this first to unlock the form'}
          />
          <Typeahead
            code={legalCode}
            label="Legal entity name"
            required
            disabled={!groupFilled}
            value={legalName}
            onChange={setLegalName}
            suggestions={legalEntitySuggestionsForGroup}
            renderSuggestion={(s) => (
              <>
                {s.label} <span className="text-slate-400">— {s.groupName}</span>
              </>
            )}
            onSelectSuggestion={(s) => {
              setLegalName(s.label)
              setGroupName(s.groupName)
              setGroupId(s.groupId)
            }}
            placeholder={groupFilled ? 'ABC Manufacturing Pvt Ltd' : 'Fill Customer group first'}
            error={!!duplicateLegalEntity}
            hintTitle={duplicateLegalEntity ? `Already onboarded under ${duplicateLegalEntity.groupName} — check My Clients or Drafts instead of creating a duplicate.` : undefined}
            hint={
              duplicateLegalEntity
                ? 'Already onboarded · see My Clients'
                : undefined
            }
          />
          <Field label="Trade name" disabled={!groupFilled} value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="ABC Manufacturing" />
          <Field
            label="PAN card number"
            required
            disabled={!groupFilled}
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="AAACA1234A"
            error={!!panOwner || (pan.trim().length === 10 && !panFormatOk)}
            badge={
              panVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  <Icon name="approve" className="h-3 w-3" />
                  Verified
                </span>
              ) : undefined
            }
            hint={
              panOwner
                ? 'PAN already exists for another client'
                : pan.trim().length === 10 && !panFormatOk
                  ? 'Not a valid PAN — format AAACA1234A'
                  : panVerified
                    ? `Registered as ${panRegisteredName}`
                    : undefined
            }
          />
          <SelectField
            label="Customer Type"
            required
            disabled={!groupFilled}
            value={customerType}
            onChange={setCustomerType}
            options={CUSTOMER_TYPES}
            placeholder="Select"
          />
          <SelectField
            label="Customer payment type"
            required
            disabled={!groupFilled}
            value={paymentType}
            onChange={setPaymentType}
            options={PAYMENT_TYPES}
            placeholder="Select"
            renderOption={(t) => `${t} (${PAYMENT_TYPE_CODE[t]})`}
          />
          </div>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className={LABEL}>
              Registered address
              <span className="text-brand-orange-dark">*</span>
            </span>
            <textarea
              value={fullAddress}
              disabled={!groupFilled}
              onChange={(e) => setFullAddress(e.target.value)}
              rows={2}
              placeholder="Building, street, area"
              className={`${INPUT} ${INPUT_OK}`}
            />
          </label>
          <Field
            label="Pincode"
            required
            disabled={!groupFilled}
            value={pincode}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="410208"
            error={pincodeLookupStatus === 'not-found'}
            hint={pincodeLookupStatus === 'loading' ? 'Looking up…' : pincodeLookupStatus === 'not-found' ? 'Pincode not found' : undefined}
          />
          <Field label="City" required locked disabled={!groupFilled} value={city} placeholder="City from pincode" />
          <Field label="State" required locked disabled={!groupFilled} value={state} placeholder="State from pincode" />
          <Field label="Country" required locked disabled value={country} />

          <div className="sm:col-span-2 lg:col-span-4 -mb-2 mt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">If applicable</span>
          </div>
          <Field label="SAC number" disabled={!groupFilled} value={sacNumber} onChange={(e) => setSacNumber(e.target.value)} placeholder="Optional" hint="For services, e.g. 996511" />
          <Field label="HSN number" disabled={!groupFilled} value={hsnNumber} onChange={(e) => setHsnNumber(e.target.value)} placeholder="Optional" hint="For goods, e.g. 8704" />
          <Field label="TAN number" disabled={!groupFilled} value={tanNumber} onChange={(e) => setTanNumber(e.target.value.toUpperCase())} placeholder="Optional" hint="e.g. DELA12345B" />
          <Field label="UDYAM number" disabled={!groupFilled} value={msmeNumber} onChange={(e) => setMsmeNumber(e.target.value)} placeholder="Optional" hint="e.g. UDYAM-MH-01-0000001" />
        </Section>
      )}

      {step === 1 && (
        <Section>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            <PersonNameFields label="POC Name" className="sm:col-span-2" labelClassName={LABEL} inputClassName={`${INPUT} ${INPUT_OK}`} first={pocFirstName} last={pocLastName} onFirst={setPocFirstName} onLast={setPocLastName} />

            <label className="block">
              <span className={LABEL}>
                POC Mobile
                <span className="text-brand-orange-dark">*</span>
              </span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white transition-colors focus-within:border-brand-orange focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/20">
                <span className="select-none border-r border-slate-200 px-3.5 text-sm font-medium text-slate-600">{phoneCode.replace(/^\S+\s/, '')}</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatMobile(pocMobile)}
                  onChange={(e) => setPocMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="99999 99999"
                  className="w-full min-w-0 rounded-xl border-0 bg-transparent px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {pocMobile.length > 0 && pocMobile.length < 10 && <p className="mt-1 text-[11px] text-slate-400">{10 - pocMobile.length} more digits</p>}
            </label>

            <Field
              label="POC Email"
              required
              type="email"
              value={pocEmail}
              onChange={(e) => setPocEmail(e.target.value)}
              placeholder="dispatch@company.in"
              error={pocEmail.trim().length > 0 && !emailOk(pocEmail)}
              hint={pocEmail.trim().length > 0 && !emailOk(pocEmail) ? 'Enter a valid email' : undefined}
            />

            <div className="border-t border-slate-100 sm:col-span-2 lg:col-span-4" />

            <SelectField
              label="Sales Person"
              labelInfo="LT employee who owns this account — you or anyone who reports to you"
              required
              value={salesPerson}
              onChange={setSalesPerson}
              options={salesPersonOptions}
              disabled={salesPersonOptions.length <= 1}
              hint={salesPersonOptions.length <= 1 ? 'Assigned from your login' : undefined}
            />
            <Field
              label="Ops Email"
              type="email"
              value={opsEmail}
              onChange={(e) => setOpsEmail(e.target.value)}
              placeholder="name@company.in"
              error={opsEmail.trim().length > 0 && (!emailOk(opsEmail) || opsDupe)}
              hint={opsEmail.trim().length > 0 ? (!emailOk(opsEmail) ? 'Enter a valid email' : opsDupe ? "Can't be same as POC email" : undefined) : undefined}
            />
            <Field
              label="Finance Email"
              type="email"
              value={financeEmail}
              onChange={(e) => setFinanceEmail(e.target.value)}
              placeholder="name@company.in"
              error={financeEmail.trim().length > 0 && (!emailOk(financeEmail) || financeDupe)}
              hint={
                financeEmail.trim().length > 0
                  ? !emailOk(financeEmail)
                    ? 'Enter a valid email'
                    : financeDupe
                      ? `Can't be same as ${sameEmail(financeEmail, pocEmail) ? 'POC' : 'Ops'} email`
                      : undefined
                  : undefined
              }
            />
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-sky-50/70 px-4 py-2.5 ring-1 ring-sky-100 sm:col-span-2 lg:col-span-4">
            <Icon name="info" className="h-4 w-4 shrink-0 text-sky-600" />
            <p
              className="truncate whitespace-nowrap text-[11px] text-slate-600"
              title="Please fill with attention. The POC will be the Primary User of this client, and their client portal and app account will be created automatically."
            >
              <span className="font-semibold text-slate-800">Please fill with attention.</span> The POC will be the{' '}
              <span className="font-medium text-slate-800">Primary User</span>; their account will be created automatically.
            </p>
          </div>
        </Section>
      )}

      {step === 2 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={noGstin} onChange={(e) => handleNoGstin(e.target.checked)} className="h-3.5 w-3.5 rounded accent-brand-orange" />
              Client does not have any GSTIN
            </label>
            <div className="flex items-center gap-3">
              {!noGstin && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {identifications.length} {identifications.length === 1 ? 'GSTIN' : 'GSTINs'}
                </span>
              )}
              <button
                type="button"
                onClick={addIdentification}
                disabled={noGstin}
                className={`${btnSecondary} !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white`}
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add another GSTIN
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Legal entity name" locked value={legalName} />
            <Field label="PAN card number" locked value={pan} />
            <div>
              <span className={LABEL}>
                Upload PAN Card<span className="text-brand-orange-dark">*</span>
              </span>
              <UploadTile file={panDocument} onFile={setPanDocument} />
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
                companyPan={pan}
                highlight={row.id === justAddedId}
              />
            ))}
        </div>
      )}

      {step === 3 && (
        <Section>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            <DateRangePicker
              label="Contract duration"
              required
              className="sm:col-span-2"
              start={contractStart}
              end={contractEnd}
              onChange={({ start, end }) => {
                setContractStart(start)
                setContractEnd(end)
              }}
            />
            <DatePicker
              label="Contract Submission Date"
              required
              labelInfo="Date the contract was finalised"
              value={contractExecutionDate}
              onChange={setContractExecutionDate}
            />
            <SelectField label="Billing period" required value={billingPeriod} onChange={setBillingPeriod} options={BILLING_PERIODS} />

            <DefaultFlagSelect label="Bill print format" required value={billPrintFormat} onChange={setBillPrintFormat} options={BILL_PRINT_FORMATS} defaultValue={DEFAULT_BILL_PRINT_FORMAT} />
            <Field label="Maximum credit limit (₹)" type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="5,00,000" hint="Optional — 5,00,000 is used if skipped. No orders beyond limit until paid." />
            <label className="block sm:col-span-2">
              <span className={LABEL}>
                Monthly Vol. Expectation
              </span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white transition-colors focus-within:border-brand-orange focus-within:outline focus-within:outline-2 focus-within:outline-brand-orange/20">
                <input
                  type="number"
                  value={expectedVolumeKg}
                  onChange={(e) => setExpectedVolumeKg(e.target.value)}
                  placeholder="1"
                  className="w-full min-w-0 rounded-xl border-0 bg-transparent px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <div className="flex shrink-0 gap-0.5 border-l border-slate-200 p-1">
                  {VOLUME_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setVolumeUnit(u)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${volumeUnit === u ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </label>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <span className={LABEL}>Volumetric conversion factor</span>
            <p className="-mt-1 mb-2.5 text-xs text-slate-400">
              Converts volumetric weight in CFT to chargeable weight in Kg. Optional — {DEFAULT_CFT_FACTOR} is filled as the safe factor for any mode left blank.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cftConversions.map((row) => (
                <label key={row.id} className="block rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3 transition-colors focus-within:border-brand-orange/50 focus-within:bg-white">
                  <span className="text-xs font-semibold text-slate-600">{row.type}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="shrink-0 text-xs text-slate-400">1 CFT =</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.conversion}
                      onChange={(e) => updateCftConversion(row.id, 'conversion', e.target.value)}
                      placeholder={DEFAULT_CFT_FACTOR}
                      className={`${INPUT} ${INPUT_OK} !w-full min-w-0 !px-2.5 !py-1.5`}
                    />
                    <span className="shrink-0 text-xs text-slate-400">Kg</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <span className={LABEL}>
              Upload documents<span className="text-brand-orange-dark">*</span>
              <span className="font-normal text-slate-400">· at least one file, multiple allowed per box</span>
            </span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {billingDocuments.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">{doc.type}</span>
                    {doc.files.length > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{doc.files.length}</span>}
                  </div>
                  {doc.files.length > 0 && (
                    <ul className="space-y-1">
                      {doc.files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200/70">
                          <span className="truncate">{f.name}</span>
                          <button type="button" onClick={() => removeBillingFile(doc.id, i)} className="shrink-0 font-medium text-rose-500 hover:underline">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="mt-auto inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-brand-orange/50 hover:bg-orange-50/30">
                    <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
                    {doc.files.length > 0 ? 'Add more' : 'Add files'}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addBillingFiles(doc.id, e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 sm:col-span-2 lg:col-span-4">
            <Toggle label="Security deposit required" checked={securityDeposit} onChange={setSecurityDeposit} />
            {securityDeposit && (
              <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Amount (₹)" type="number" value={securityDepositAmount} onChange={(e) => setSecurityDepositAmount(e.target.value)} placeholder="0" />
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Paid</span>
                  <div className="flex w-fit rounded-xl bg-slate-100 p-1 text-sm">
                    {['Yes', 'No'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSecurityDepositPaid(v)}
                        className={`rounded-lg px-4 py-1 font-medium transition-colors ${securityDepositPaid === v ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                {securityDepositPaid === 'Yes' && (
                  <>
                    <DatePicker label="Payment date" value={depositPaymentDate} onChange={setDepositPaymentDate} />
                    <SelectField label="Payment type" value={depositPaymentType} onChange={setDepositPaymentType} options={DEPOSIT_PAYMENT_TYPES} />
                    <Field label="Reference no." value={depositReferenceNo} onChange={(e) => setDepositReferenceNo(e.target.value)} placeholder="UTR / cheque / txn no." />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                Upcoming features
              </span>
              <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">Coming soon</span>
            </div>
            <div className="pointer-events-none flex select-none flex-wrap gap-x-8 gap-y-3 px-4 py-3.5 opacity-80" aria-disabled="true">
              <Toggle label="Is centralised payment" checked={false} onChange={() => {}} disabled />
              <Toggle label="Tax exemption" checked={false} onChange={() => {}} disabled />
              <Toggle label="Fuel surcharge exemption" checked={false} onChange={() => {}} disabled />
            </div>
          </div>
        </Section>
      )}

      {step === 4 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div className="-mx-6 -mt-6 border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Pricing</h2>
            <p className="mt-0.5 text-xs text-slate-400">Tier is fixed by declared volume — Standard uses the list rate, Custom applies a discount %.</p>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <SelectField label="Pricing type" required value={pricingType} onChange={setPricingType} options={PRICING_TYPES} className="sm:max-w-xs" />
            <div className="sm:w-40">
              <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                Tier
                <span className="group relative inline-flex">
                  <span tabIndex={0} className="cursor-help text-slate-300 outline-none hover:text-slate-500">
                    <Icon name="info" className="h-3.5 w-3.5" />
                  </span>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-60 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left normal-case opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <p className="text-[11px] font-semibold text-slate-700">Fixed by declared volume</p>
                    <table className="mt-1.5 w-full text-[11px] text-slate-600">
                      <thead>
                        <tr className="text-slate-400">
                          <th className="border-b border-slate-100 pb-1 text-left font-medium">Volume / month</th>
                          <th className="border-b border-slate-100 pb-1 text-right font-medium">Tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1">Below 100 tonne</td>
                          <td className="py-1 text-right font-medium text-slate-700">Bronze</td>
                        </tr>
                        <tr>
                          <td className="py-1">100–999 tonne</td>
                          <td className="py-1 text-right font-medium text-slate-700">Silver</td>
                        </tr>
                        <tr>
                          <td className="py-1">1,000–9,999 tonne</td>
                          <td className="py-1 text-right font-medium text-slate-700">Gold</td>
                        </tr>
                        <tr>
                          <td className="py-1">10,000+ tonne</td>
                          <td className="py-1 text-right font-medium text-slate-700">Platinum</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </span>
              </span>
              <div className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIER_BADGE[tier]}`}>{tier}</span>
              </div>
            </div>
            {pricingType === 'Custom' && (
              <SelectField
                label="Region Definition"
                required
                value={regionMappingType}
                onChange={setRegionMappingType}
                options={REGION_MAPPING_TYPES}
                className="sm:w-40"
              />
            )}
            {pricingType === 'Custom' && regionMappingType === 'Standard' && (
              <Field
                label="Flat Discount on standard"
                required
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(e.target.value)
                  setDiscountTouched(true)
                }}
                hint={`Suggested ${TIER_DISCOUNTS[tier] ?? 0}% for ${tier}`}
                className="sm:w-40"
              />
            )}
            {pricingType === 'Custom' && regionMappingType === 'Custom' && (
              <div>
                <span className="mb-1.5 block text-xs font-medium text-transparent select-none" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  onClick={openRegionBuilder}
                  className="whitespace-nowrap rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
                >
                  {customRegions.length > 0 ? 'Edit Client Region & Pricing' : 'Define Client Region & Pricing'}
                </button>
              </div>
            )}
          </div>

          {pricingType === 'Custom' && regionMappingType === 'Custom' ? (
            customRegions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-500">No client regions defined yet.</p>
                <p className="mt-1 text-xs text-slate-400">Use "Define Client Region & Pricing" above to build the client's own region set and lane pricing.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {customRegions.length} client region{customRegions.length === 1 ? '' : 's'} defined
                  </span>
                  {unmappedCities.length > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      {unmappedCities.length} cit{unmappedCities.length === 1 ? 'y' : 'ies'} unmapped
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                        {customRegions.map((r) => (
                          <th key={r.id} className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-500">
                            {r.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customRegions.map((origin) => (
                        <tr key={origin.id} className="border-t border-slate-100">
                          <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-600">{origin.name}</th>
                          {customRegions.map((dest) => {
                            const override = regionCellValue(origin.id, dest.id)
                            const fallback = unmappedDefaultRate !== '' ? unmappedDefaultRate : '—'
                            return (
                              <td key={dest.id} className="px-2 py-1.5 text-center tabular-nums">
                                {override !== '' ? (
                                  <span className="font-medium text-brand-orange-dark">{override}</span>
                                ) : (
                                  <span className="text-slate-400">{fallback}</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
                  Orange = negotiated lane price. Grey = falls back to the default rate for unspecified lanes. Edit both from "Edit Client Region & Pricing" above.
                </p>
              </div>
            )
          ) : pricingType === 'Standard' && !showStandardMatrix ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <p className="text-xs text-slate-400">Please check standard pricing in detail.</p>
              <button
                type="button"
                onClick={() => setShowStandardMatrix(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-brand-orange/40 hover:text-brand-orange-dark"
              >
                View standard pricing
                <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {pricingType === 'Custom' ? `At ${effectiveDiscount}% discount${editingCells ? ' (custom)' : ''}` : 'Standard rate card'}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {pricingType === 'Custom' && (
                  <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
                    <input
                      type="checkbox"
                      checked={requireCellChanges}
                      onChange={(e) => handleRequireCellChangesToggle(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                    />
                    Require cell level changes
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setShowRegionMappingModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <Icon name="route" className="h-3.5 w-3.5" />
                  Region Definition
                </button>
                {pricingType === 'Standard' && (
                  <button
                    type="button"
                    onClick={() => setShowStandardMatrix(false)}
                    title="Collapse"
                    className="inline-flex items-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Icon name="chevron" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                    {ZONES.map((z) => (
                      <th key={z} className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-500">
                        {z}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ZONES.map((origin) => (
                    <tr key={origin} className="border-t border-slate-100">
                      <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-600">{origin}</th>
                      {ZONES.map((dest) => (
                        <td key={dest} className="px-1 py-1 text-center">
                          {editingCells ? (
                            <input
                              type="number"
                              min="0"
                              value={customMatrix[origin][dest]}
                              onChange={(e) => updateCustomMatrixCell(origin, dest, e.target.value)}
                              className="w-14 rounded border border-transparent px-1 py-1 text-center tabular-nums hover:border-slate-200 focus:border-brand-orange/40 focus:bg-white focus:outline-none"
                            />
                          ) : (
                            <span className="block px-2 py-1.5 tabular-nums text-slate-700">{previewMatrix[origin][dest]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
              {pricingType === 'Custom'
                ? editingCells
                  ? 'Custom rates — overrides the tier discount above. Still editable later under Client Approvals.'
                  : 'This is what gets attached on creation — editable later under Client Approvals.'
                : 'INR per kg, chargeable weight — origin (row) → destination (column). Same for every client; edited only from Client Pricing Configuration, never per-client here.'}
            </p>
          </div>
          )}

          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={noOda} onChange={(e) => handleNoOda(e.target.checked)} />
            No ODA for this client
          </label>

          {!noOda && (
            <OdaListManager
              title="Client ODA List"
              entries={odaEntries}
              onEntriesChange={setOdaEntries}
              rate={odaDefaultRate}
              onRateChange={setOdaDefaultRate}
              overrides={odaPricing}
              onOverridesChange={setOdaPricing}
            />
          )}

          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={noAdditionalCharges} onChange={(e) => handleNoAdditionalCharges(e.target.checked)} />
            No additional charges for this client
          </label>

          {!noAdditionalCharges && (
          <div className="rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <span className="text-xs font-medium text-slate-500">
                Additional Charges
                <span className="text-brand-orange-dark"> *</span>
              </span>
            </div>

              <div className="space-y-4 p-4">
                {selectedCharges.length === 0 && <p className="text-xs text-slate-400">No charges selected yet.</p>}

                <div className="flex flex-wrap gap-2">
                  {ADDITIONAL_CHARGES_MASTER.map((c) => {
                    const isSelected = selectedCharges.some((s) => s.name === c.name)
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => (isSelected ? removeCharge(c.name) : addCharge(c.name))}
                        title={`Default: ${c.defaultValue}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-brand-orange/40 bg-brand-orange/5 text-brand-orange-dark'
                            : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-brand-orange/40'
                        }`}
                      >
                        <Icon name={isSelected ? 'approve' : 'plus'} className="h-3.5 w-3.5 shrink-0" />
                        {c.name}
                      </button>
                    )
                  })}
                </div>

                {selectedCharges.length > 0 && (
                  <div className="space-y-2">
                    {selectedCharges.map((selected) => (
                      <div key={selected.name} className="rounded-lg bg-slate-50/60 p-3">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-700">{selected.name}</span>
                          <button type="button" onClick={() => removeCharge(selected.name)} className="text-xs font-medium text-rose-600 hover:underline">
                            Remove
                          </button>
                        </div>
                        <label className="mb-2 block">
                          <span className="mb-1 block text-[11px] font-medium text-slate-500">Rule</span>
                          <select
                            value={selected.rule.type}
                            onChange={(e) => updateChargeRule(selected.name, emptyChargeRule(e.target.value))}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                          >
                            {RULES_CATALOG.map((r) => (
                              <option key={r.type} value={r.type}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <ChargeValueFields rule={selected.rule} onChange={(next) => updateChargeRule(selected.name, next)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            <p className="border-t border-slate-100 px-4 py-1.5 text-[11px] text-slate-400">
              Selecting a charge pulls its default rule and value from the Additional Charges master (Client Pricing Configuration) — switch the rule or edit
              the value here for this client only.
            </p>
          </div>
          )}

        </div>
      )}

      {step === 5 && (
        <div className={`space-y-5 p-6 ${card}`}>
          <div className="flex items-center justify-between -mx-6 -mt-6 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">KYC upload</h2>
              <p className="mt-0.5 text-xs text-slate-400">Upload every proof document this client needs. All must be uploaded before submitting; remove rows that don't apply.</p>
            </div>
            <button
              type="button"
              onClick={addDocument}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add document
            </button>
          </div>

          {documents.map((doc) => {
            // PAN was already captured (number on Company Info, file upload on
            // GSTIN Info) — reflect that instead of asking again.
            const fromPan = !doc.file && ((doc.type === 'PAN Card' && panDocument) || (doc.type === 'GST Certificate' && gstDocument))
            const effectiveFile = doc.file ?? (doc.type === 'PAN Card' ? panDocument : doc.type === 'GST Certificate' ? gstDocument : null)
            return (
            <div key={doc.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4 sm:flex-row sm:items-end">
              <SelectField label="Document type" value={doc.type} onChange={(v) => updateDocument(doc.id, 'type', v)} options={DOCUMENT_TYPES} className="sm:w-56" />
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-center text-xs text-slate-500 transition-colors hover:border-brand-orange/50 hover:bg-orange-50/30">
                {effectiveFile ? (
                  <>
                    {effectiveFile.name}
                    {fromPan && <span className="text-emerald-600">(already uploaded on GSTIN Info)</span>}
                  </>
                ) : (
                  'Click to upload or drag a file'
                )}
                <input type="file" className="hidden" onChange={(e) => updateDocument(doc.id, 'file', e.target.files[0] ?? null)} />
              </label>
              {documents.length > 1 && (
                <button type="button" onClick={() => removeDocument(doc.id)} className="text-xs font-medium text-rose-500 hover:underline">
                  Remove
                </button>
              )}
            </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={btnSecondary}>
              Previous
            </button>
          )}
          <button type="button" onClick={goBack} className={btnSecondary}>
            Save as draft
          </button>
        </div>
        <button
          type="button"
          disabled={!stepValid}
          onClick={handleNext}
          className={`${btnPrimary} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-slate-200`}
        >
          {step === 3 ? 'Confirm & Create Client' : isLastStep ? 'Submit for activation' : 'Next'}
        </button>
      </div>

      {showRegionMappingModal && <RegionPincodeMappingModal onClose={() => setShowRegionMappingModal(false)} />}

      {showRegionBuilder && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Define Client Region &amp; Pricing</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">Build this client's own regions from negotiated cities, then price the lanes between them.</p>
              </div>
              <button type="button" onClick={() => setShowRegionBuilder(false)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-56px)] overflow-auto">
              {customRegions.length === 0 && pickingRegionTemplate ? (
                <div className="p-5">
                  <button
                    type="button"
                    onClick={() => setPickingRegionTemplate(false)}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    <Icon name="arrow-left" className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <div className="space-y-2">
                    {REGION_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pullRegionTemplate(t.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {t.regions.length} region{t.regions.length === 1 ? '' : 's'} · {t.regions.reduce((n, r) => n + r.cities.length, 0)} cities mapped
                          </p>
                        </div>
                        <Icon name="chevron" className="h-4 w-4 -rotate-90 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : customRegions.length === 0 ? (
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={seedRegionsFromStandard}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
                  >
                    <p className="text-sm font-semibold text-slate-800">Start from Standard regions</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Clone the 13 standard regions (North 1, West 2…) with cities pre-matched where possible. Rename, merge, split or reassign cities from there.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={startRegionsFresh}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
                  >
                    <p className="text-sm font-semibold text-slate-800">Start from scratch</p>
                    <p className="mt-1 text-xs text-slate-400">Build the client's regions one at a time, assigning cities exactly as negotiated.</p>
                  </button>
                  {REGION_TEMPLATES.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPickingRegionTemplate(true)}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5 sm:col-span-2"
                    >
                      <p className="text-sm font-semibold text-slate-800">Pull existing mapping</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Reuse a named region set already built in Client Pricing ({REGION_TEMPLATES.length} saved) — starts as a copy, safe to edit for this client.
                      </p>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-left sm:col-span-2">
                      <p className="text-sm font-semibold text-slate-400">Pull existing mapping</p>
                      <p className="mt-1 text-xs text-slate-400">No saved region mappings yet — build one from Client Pricing &gt; Client Mapping to reuse across clients.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Regions</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={startRegionsFresh} className="text-[11px] font-medium text-slate-400 hover:text-slate-600">
                          Start over
                        </button>
                        <button
                          type="button"
                          onClick={addCustomRegion}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-orange-dark hover:bg-brand-orange/5"
                        >
                          <Icon name="plus" className="h-3.5 w-3.5" />
                          Add region
                        </button>
                      </div>
                    </div>

                    <div className="flex overflow-hidden rounded-xl border border-slate-200">
                      <div className="max-h-72 w-44 shrink-0 overflow-y-auto border-r border-slate-100">
                        {customRegions.map((region) => {
                          const active = selectedRegion?.id === region.id
                          return (
                            <button
                              key={region.id}
                              type="button"
                              onClick={() => {
                                setExpandedRegionCities(region.id)
                                setRegionCitySearch('')
                              }}
                              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs ${
                                active ? 'bg-brand-orange/10 text-brand-navy' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate font-medium">{region.name || 'Untitled region'}</span>
                              <span className="shrink-0 tabular-nums text-slate-400">{region.cities.length}</span>
                            </button>
                          )
                        })}
                      </div>

                      <div className="min-w-0 flex-1 p-3">
                        {!selectedRegion ? (
                          <p className="text-xs text-slate-400">Add a region to start assigning cities.</p>
                        ) : (
                          <>
                            <div className="mb-2 flex items-center gap-2">
                              <input
                                value={selectedRegion.name}
                                onChange={(e) => renameCustomRegion(selectedRegion.id, e.target.value)}
                                className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-brand-orange/40 focus:bg-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => deleteCustomRegion(selectedRegion.id)}
                                title="Delete region"
                                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Icon name="close" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={regionCitySearch}
                              onChange={(e) => setRegionCitySearch(e.target.value)}
                              placeholder="Search a city or state…"
                              className="mb-2 w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                            <div className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1 overflow-auto sm:grid-cols-3">
                              {Object.entries(STATE_CITY_DIRECTORY).flatMap(([state, cities]) =>
                                cities
                                  .filter((city) => {
                                    const q = regionCitySearch.trim().toLowerCase()
                                    return !q || city.toLowerCase().includes(q) || state.toLowerCase().includes(q)
                                  })
                                  .map((city) => {
                                    const ownerId = assignedCityKeys.get(`${state}|${city}`)
                                    const checked = ownerId === selectedRegion.id
                                    const ownerName = ownerId && ownerId !== selectedRegion.id ? customRegions.find((r) => r.id === ownerId)?.name : null
                                    return (
                                      <label key={`${state}|${city}`} className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs ${ownerName ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleCityInRegion(selectedRegion.id, state, city)}
                                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                                        />
                                        <span className="truncate">{city}</span>
                                        {ownerName && <span className="shrink-0 text-[10px] text-slate-300">({ownerName})</span>}
                                      </label>
                                    )
                                  }),
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {unmappedCities.length > 0 && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                        {unmappedCities.length} {unmappedCities.length === 1 ? 'city is' : 'cities are'} not in any region yet — unmapped cities fall back to the default rate below.{' '}
                        {unmappedCities
                          .slice(0, 8)
                          .map((c) => c.city)
                          .join(', ')}
                        {unmappedCities.length > 8 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  <Field
                    label="Default rate for unspecified lanes (₹/kg)"
                    type="number"
                    min="0"
                    value={unmappedDefaultRate}
                    onChange={(e) => setUnmappedDefaultRate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                    hint="Used for any lane below that hasn't been priced individually, and for unmapped cities."
                    className="sm:max-w-xs"
                  />

                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Lane pricing</span>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="text-xs">
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                              {customRegions.map((r) => (
                                <th key={r.id} className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-500">
                                  {r.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {customRegions.map((origin) => (
                              <tr key={origin.id} className="border-t border-slate-100">
                                <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-600">{origin.name}</th>
                                {customRegions.map((dest) => (
                                  <td key={dest.id} className="px-1 py-1 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={regionCellValue(origin.id, dest.id)}
                                      onChange={(e) => setRegionCellValue(origin.id, dest.id, e.target.value)}
                                      placeholder={unmappedDefaultRate !== '' ? String(unmappedDefaultRate) : '—'}
                                      className="w-14 rounded border border-transparent px-1 py-1 text-center tabular-nums hover:border-slate-200 focus:border-brand-orange/40 focus:bg-white focus:outline-none"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
                        Blank cells use the default rate above. Only type a value where the negotiated price differs.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setShowRegionBuilder(false)}
                className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showClientCreatedDialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
            <h3 className="text-base font-semibold text-slate-900">Client Created Successfully</h3>
            <p className="mt-2 text-sm text-slate-500">Add Pricing &amp; Do KYC to activate it.</p>
            <button
              type="button"
              onClick={handleClientCreatedContinue}
              className="mt-5 w-full rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
            >
              Continue to Pricing
            </button>
          </div>
        </div>
      )}

      {showSubmittedDialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-soft">
            <h3 className="text-base font-semibold text-slate-900">Client submitted for Approval</h3>
          </div>
        </div>
      )}

    </div>
  )
}

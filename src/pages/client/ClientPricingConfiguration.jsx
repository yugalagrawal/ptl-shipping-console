import BackButton from '../../components/BackButton.jsx'
import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import ClientTemplatesTab from '../../components/ClientTemplatesTab.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { card, thCls, tdCls, rowCls } from '../../components/ui.js'
import ClientRegionFlow, { RegionMappingModal, Shell } from '../../components/ClientRegionFlow.jsx'
import ClientTemplateFlow from '../../components/ClientTemplateFlow.jsx'
import { buildStandardRegionsFromSheet } from '../../data/geoMaster.js'
import PricingSourceArt from '../../components/PricingSourceArt.jsx'
import OdaListManager from '../../components/OdaListManager.jsx'
import {
  ZONES as ALL_ZONES,
  RATE_CARD_HISTORY_SEED,
  TIER_DISCOUNTS,
  TIER_BADGE,
  ADDITIONAL_CHARGES_MASTER,
  RULES_CATALOG,
  SIMPLE_RULE_TYPES,
  formatChargeRule,
  emptyChargeRule,
  isChargeRuleValid,
  matrixArrayToObject,
} from '../../data/pricing.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED } from '../../data/clients.js'
import { RATE_CARDS_SEED, INDUSTRY_CODES, slugFromCode } from '../../data/rateCards.js'
import {
  STATE_CITY_DIRECTORY,
  buildRegionsFromStandard,
  freshRegionId,
  cloneRegionTemplate,
  REGION_TEMPLATES,
  addRegionTemplate,
  deleteRegionTemplate,
  updateRegionTemplate,
} from '../../data/regionMapping.js'
import {
  getDefaultOdaEntries,
  getDefaultOdaRate,
  getDefaultOdaOverrides,
  setDefaultOdaEntries,
  setDefaultOdaRate,
  setDefaultOdaOverrides,
} from '../../data/odaPincodes.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Volume bands that fix a client's tier in the New Client wizard's Pricing
// step (see tierFromVolume in NewClient.jsx, kept in sync by hand — this
// page only displays the mapping, it doesn't drive the wizard). All four
// tiers, including Platinum, are derived from declared volume alone.
const TIER_VOLUME_BANDS = {
  Bronze: 'Under 100 tonne',
  Silver: '100 to under 1k tonne',
  Gold: '1k to under 10k tonne',
  Platinum: '10k+ tonne',
}

function NumberField({ value, onChange, placeholder, suffix }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </span>
  )
}

const SIMPLE_UNIT = { flat_per_awb: '₹ / AWB', per_kg: '₹ / kg', percent_of_freight: '%', percent_of_cod: '%' }

// Sub-rule row used inside a max_of/min_of list — type restricted to
// SIMPLE_RULE_TYPES so a rule can't be built into an unrenderable/meaningless
// nested shape.
function SimpleRuleRow({ rule, onChange, onRemove, removable }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={rule.type}
        onChange={(e) => onChange({ type: e.target.value, value: rule.value ?? '' })}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
      >
        {Object.entries(SIMPLE_RULE_TYPES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <NumberField value={rule.value} onChange={(v) => onChange({ ...rule, value: v })} placeholder="Value" suffix={SIMPLE_UNIT[rule.type]} />
      {removable && (
        <button type="button" onClick={onRemove} className="text-xs font-medium text-rose-600 hover:underline">
          Remove
        </button>
      )}
    </div>
  )
}

function MultiRuleBuilder({ rule, onChange }) {
  function updateOption(i, next) {
    onChange({ ...rule, options: rule.options.map((o, idx) => (idx === i ? next : o)) })
  }
  function addOption() {
    onChange({ ...rule, options: [...rule.options, { type: 'flat_per_awb', value: '' }] })
  }
  function removeOption(i) {
    onChange({ ...rule, options: rule.options.filter((_, idx) => idx !== i) })
  }
  return (
    <div className="space-y-2">
      {rule.options.map((opt, i) => (
        <SimpleRuleRow key={i} rule={opt} onChange={(next) => updateOption(i, next)} onRemove={() => removeOption(i)} removable={rule.options.length > 2} />
      ))}
      <button type="button" onClick={addOption} className="inline-flex items-center gap-1 text-xs font-medium text-brand-orange-dark hover:underline">
        <Icon name="plus" className="h-3 w-3" />
        Add condition
      </button>
      <p className="text-[11px] text-slate-400">Whichever of these resolves {rule.type === 'min_of' ? 'lower' : 'higher'} is charged.</p>
    </div>
  )
}

// One row inside a weight band's own rule when it's set to Higher/Lower of —
// deliberately fixed to per-kg + flat-per-AWB (the one real example,
// Handling, needs no more).
const BAND_RULE_TYPES = { nil: 'NIL (no charge)', ...SIMPLE_RULE_TYPES, max_of: 'Higher of per-kg / per-AWB', min_of: 'Lower of per-kg / per-AWB' }

function BandRuleFields({ rule, onChange }) {
  const options = rule.options ?? [{ type: 'per_kg', value: '' }, { type: 'flat_per_awb', value: '' }]
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <select
        value={rule.type}
        onChange={(e) => {
          const t = e.target.value
          if (t === 'nil') onChange({ type: 'nil' })
          else if (t === 'max_of' || t === 'min_of') onChange({ type: t, options: [{ type: 'per_kg', value: '' }, { type: 'flat_per_awb', value: '' }] })
          else onChange({ type: t, value: '' })
        }}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
      >
        {Object.entries(BAND_RULE_TYPES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {rule.type === 'max_of' || rule.type === 'min_of' ? (
        <div className="flex flex-wrap items-center gap-2">
          <NumberField value={options[0].value} onChange={(v) => onChange({ ...rule, options: [{ ...options[0], value: v }, options[1]] })} placeholder="Per kg" suffix="₹/kg" />
          <span className="text-xs text-slate-400">or</span>
          <NumberField value={options[1].value} onChange={(v) => onChange({ ...rule, options: [options[0], { ...options[1], value: v }] })} placeholder="Per AWB" suffix="₹/AWB" />
        </div>
      ) : rule.type !== 'nil' ? (
        <NumberField value={rule.value} onChange={(v) => onChange({ ...rule, value: v })} placeholder="Value" suffix={SIMPLE_UNIT[rule.type]} />
      ) : null}
    </div>
  )
}

function RangeByWeightBuilder({ rule, onChange }) {
  function updateBand(i, next) {
    onChange({ ...rule, bands: rule.bands.map((b, idx) => (idx === i ? next : b)) })
  }
  function addBand() {
    const bands = [...rule.bands]
    bands.splice(bands.length - 1, 0, { uptoKg: '', rule: { type: 'flat_per_awb', value: '' } })
    onChange({ ...rule, bands })
  }
  function removeBand(i) {
    onChange({ ...rule, bands: rule.bands.filter((_, idx) => idx !== i) })
  }
  return (
    <div className="space-y-2">
      {rule.bands.map((band, i) => {
        const isLast = i === rule.bands.length - 1
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
            {isLast ? (
              <span className="w-32 shrink-0 text-xs text-slate-500">Above {rule.bands[i - 1]?.uptoKg || '—'} kg</span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                Up to <NumberField value={band.uptoKg} onChange={(v) => updateBand(i, { ...band, uptoKg: v })} placeholder="kg" suffix="kg" />
              </span>
            )}
            <BandRuleFields rule={band.rule} onChange={(next) => updateBand(i, { ...band, rule: next })} />
            {rule.bands.length > 2 && !isLast && (
              <button type="button" onClick={() => removeBand(i)} className="text-xs font-medium text-rose-600 hover:underline">
                Remove
              </button>
            )}
          </div>
        )
      })}
      <button type="button" onClick={addBand} className="inline-flex items-center gap-1 text-xs font-medium text-brand-orange-dark hover:underline">
        <Icon name="plus" className="h-3 w-3" />
        Add weight band
      </button>
    </div>
  )
}

// Switches a charge's default rule TYPE (from the closed RULES_CATALOG —
// see "Rules List") and edits that rule's own value(s) — the rule types
// themselves aren't created or edited here, only which one a charge uses
// and what its number/text is.
function ChargeRuleEditor({ rule, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Default rule type</span>
        <select
          value={rule.type}
          onChange={(e) => onChange(emptyChargeRule(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
        >
          {RULES_CATALOG.map((r) => (
            <option key={r.type} value={r.type}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <p className="pt-1 text-sm font-medium text-slate-700">Default rule &amp; price</p>

      {['flat_per_awb', 'per_kg', 'percent_of_freight', 'percent_of_cod'].includes(rule.type) && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">{{ flat_per_awb: 'Amount (₹)', per_kg: 'Rate (₹ per kg)', percent_of_freight: 'Percentage (% of Basic Freight)', percent_of_cod: 'Percentage (% of COD amount)' }[rule.type]}</span>
          <input
            type="number"
            value={rule.value}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
            placeholder="0"
            className="w-48 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
        </label>
      )}

      {(rule.type === 'max_of' || rule.type === 'min_of') && <MultiRuleBuilder rule={rule} onChange={onChange} />}
      {rule.type === 'range_by_weight' && <RangeByWeightBuilder rule={rule} onChange={onChange} />}
      {rule.type === 'actuals' && <p className="text-xs text-slate-400">Billed at cost incurred — no value needed, added at POD/invoicing.</p>}

      {isChargeRuleValid(rule) && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Preview: </span>
          {formatChargeRule(rule)}
        </p>
      )}
    </div>
  )
}

function HeaderButton({ icon, label, onClick, variant = 'default' }) {
  const variantCls =
    variant === 'primary'
      ? 'bg-brand-orange text-white hover:bg-brand-orange-dark'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${variantCls}`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

// Search-or-create combobox for the Code field — starts from a seeded list
// of common industry codes (PHARMA, FMCG, …) but typing anything not
// already in that list offers to create it on the fly, same "search or add
// new" shape as the client/consignee typeaheads elsewhere in the app.
function CodeCombobox({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const query = value.trim().toUpperCase()
  const filtered = query ? options.filter((o) => o.includes(query)) : options
  const exactExists = options.some((o) => o === query)

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Search or create a code…"
        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      {open && (filtered.length > 0 || (query && !exactExists)) && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o); setOpen(false) }}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {o}
            </button>
          ))}
          {query && !exactExists && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(query); setOpen(false) }}
              className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3.5 py-2 text-left text-sm font-medium text-brand-orange-dark hover:bg-slate-50"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Create "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Rate card names allow only letters, numbers and _ — spaces become _ and
// anything else is dropped as you type.
const cleanName = (v) => v.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').replace(/_{2,}/g, '_')
// Rate card codes are 3 letters + 3 numbers (ABC123). Created from the name:
// its first three letters, then the next free number for those letters.
const CODE_RE = /^[A-Z]{3}[0-9]{3}$/
const autoCode = (name, cards) => {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  if (!/[A-Za-z]/.test(name)) return ''
  let n = 1
  while (cards.some((c) => c.code === `${letters}${String(n).padStart(3, '0')}`)) n += 1
  return `${letters}${String(n).padStart(3, '0')}`
}
const ACRONYMS = { FMCG: 'FMCG' }
const nameFromCode = (code) =>
  code
    .split(/[-_\s]+/)
    .map((w) => ACRONYMS[w] ?? w.charAt(0) + w.slice(1).toLowerCase())
    .join('_')

function Modal({ title, subtitle, size = 'max-w-4xl', headerAction, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`max-h-[85vh] w-full ${size} overflow-hidden rounded-2xl bg-white shadow-soft`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(85vh-56px)] overflow-auto">{children}</div>
      </div>
    </div>
  )
}

// Blank on purpose — this page is the future home for editing the standard
// rate card, tier discounts and charge types (currently all hardcoded in
// data/pricing.js). For now it just surfaces the standard matrix read-only,
// same values every client tier discounts off of.

// Version history: version rail on the left, the chosen version's full grid on
// the right with changed cells shown as previous -> new. Each version's grid is
// rebuilt by undoing later versions' changes from the current matrix.
function RateCardHistoryModal({ name, history, currentMatrix, zones: ZONES_IN, onClose }) {
  const ZONES = ZONES_IN ?? ALL_ZONES
  const versions = useMemo(() => {
    let grid = currentMatrix.map((row) => [...row])
    const out = []
    for (let k = history.length - 1; k >= 0; k--) {
      const v = history[k]
      out.unshift({ ...v, n: k + 1, grid: grid.map((row) => [...row]) })
      for (const c of v.changes ?? []) grid[ZONES.indexOf(c.origin)][ZONES.indexOf(c.dest)] = c.from
    }
    return out
  }, [history, currentMatrix])
  const newestFirst = [...versions].reverse()
  const [selId, setSelId] = useState(newestFirst[0]?.id)
  const [hover, setHover] = useState(null)
  const sel = versions.find((v) => v.id === selId) ?? newestFirst[0]
  if (!sel) return null
  const changeAt = (o, d) => sel.changes?.find((c) => c.origin === ZONES[o] && c.dest === ZONES[d])
  const range = (v) => `${formatDate(v.effectiveFrom)} – ${v.effectiveTo ? formatDate(v.effectiveTo) : 'Present'}`
  return (
    <Shell wide="max-w-6xl" title={`Rate card history · ${name}`} onClose={onClose}>
      <div className="flex min-h-0 flex-1">
        <div className="w-60 shrink-0 space-y-3 overflow-y-auto border-r border-slate-100 bg-slate-50/50 p-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Version</span>
              <span>Status</span>
            </div>
            {newestFirst.map((v) => {
              const on = v.id === sel.id
              const active = v.effectiveTo === null
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelId(v.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${on ? 'bg-brand-orange/10 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  v{v.n}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Active' : 'Archived'}</span>
                </button>
              )
            })}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <div>
              <div className="text-slate-400">Created by</div>
              <div className="mt-0.5 break-all font-medium text-slate-800">{sel.updatedBy}</div>
            </div>
            <div>
              <div className="text-slate-400">{sel.effectiveTo === null ? 'Active' : 'Was active'}</div>
              <div className="mt-0.5 font-medium text-slate-800">{range(sel)}</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs text-slate-500">
            Version {sel.n}{sel.effectiveTo === null ? ' (active)' : ''} — INR per kg, origin (row) → destination (column).
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-800">
              {sel.changes === null ? 'Initial version' : `${sel.changes.length} cell${sel.changes.length === 1 ? '' : 's'} changed vs v${sel.n - 1}`}
            </span>
            {sel.changes !== null && (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm border border-brand-orange bg-brand-orange/10" />
                highlighted cells show previous → new
              </span>
            )}
          </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed border-collapse text-xs" onMouseLeave={() => setHover(null)}>
            <colgroup>
              <col style={{ width: 92 }} />
              {ZONES.map((z) => (
                <col key={z} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                <th />
                {ZONES.map((z, d) => (
                  <th key={z} className={`px-0.5 py-2 text-center text-[10px] font-semibold leading-tight ${hover?.[1] === d ? 'text-brand-orange-dark' : 'text-slate-500'}`}>
                    {z.replace(/ (\d)$/, '\n$1').split('\n').map((t, k) => (
                      <span key={k} className="block">
                        {t}
                      </span>
                    ))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZONES.map((origin, o) => (
                <tr key={origin} className="border-t border-slate-100">
                  <th className={`whitespace-nowrap px-3 py-1.5 text-left text-xs font-semibold ${hover?.[0] === o ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-50 text-slate-700'}`}>{origin}</th>
                  {ZONES.map((dest, d) => {
                    const ch = changeAt(o, d)
                    return (
                      <td key={dest} onMouseEnter={() => setHover([o, d])} className={`px-1 py-1.5 text-center tabular-nums ${ch ? 'bg-brand-orange/10 font-semibold text-brand-orange-dark ring-1 ring-inset ring-brand-orange' : hover && (hover[0] === o || hover[1] === d) ? 'bg-slate-50 text-slate-800' : 'text-slate-700'}`}>
                        {ch ? (
                          <span className="leading-tight">
                            <span className="block text-[9px] font-normal text-slate-400 line-through">{ch.from}</span>
                            {ch.to}
                          </span>
                        ) : (
                          sel.grid[o][d]
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </Shell>
  )
}

export default function ClientPricingConfiguration() {
  const { user } = useAuth()
  // Multiple standard rate cards (General + vertical-specific samples) —
  // each keeps its own matrix + history, keyed by card id. The "Recent"
  // chips + "Browse all" search modal below are the pattern Yugal picked
  // over a plain growing sidebar list (which doesn't scale past a
  // handful of cards).
  const [rateCards, setRateCards] = useState(RATE_CARDS_SEED)
  const [selectedRateCardId, setSelectedRateCardId] = useState(RATE_CARDS_SEED[0].id)
  const [recentRateCardIds, setRecentRateCardIds] = useState([RATE_CARDS_SEED[0].id])
  const [matricesByCardId, setMatricesByCardId] = useState(() =>
    Object.fromEntries(RATE_CARDS_SEED.map((c) => [c.id, c.matrix.map((row) => [...row])])),
  )
  const [historiesByCardId, setHistoriesByCardId] = useState(() =>
    Object.fromEntries(RATE_CARDS_SEED.map((c) => [c.id, c.isGeneral ? RATE_CARD_HISTORY_SEED : []])),
  )
  const [showBrowseRateCardsModal, setShowBrowseRateCardsModal] = useState(false)
  const [rateCardSearch, setRateCardSearch] = useState('')
  const [showCreateRateCardModal, setShowCreateRateCardModal] = useState(false)
  const [createStep, setCreateStep] = useState('details') // 'details' | 'source' | 'source-existing'
  const [newCardCode, setNewCardCode] = useState('')
  const [newCardName, setNewCardName] = useState('')
  const [newCardDescription, setNewCardDescription] = useState('')
  const [codeEditing, setCodeEditing] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  // A card created via finalizeCreateRateCard isn't "real" until its first
  // Save & publish — if the edit modal that opens right after creation gets
  // cancelled/closed instead, the card (and its matrix/history) are rolled
  // back rather than left behind half-made.
  const [pendingNewCard, setPendingNewCard] = useState(null) // { id, previousSelectedId } | null

  const codeTaken = !!newCardCode && rateCards.some((c) => c.code === newCardCode)
  const codeValid = CODE_RE.test(newCardCode)
  const selectedRateCard = rateCards.find((c) => c.id === selectedRateCardId) ?? rateCards[0]
  const currentMatrix = matricesByCardId[selectedRateCardId]
  const rateCardHistory = historiesByCardId[selectedRateCardId] ?? []
  const zones = selectedRateCard.zones ?? ALL_ZONES
  const matrix = useMemo(() => {
    const obj = {}
    zones.forEach((o, i) => {
      obj[o] = {}
      zones.forEach((d, j) => {
        obj[o][d] = currentMatrix[i][j]
      })
    })
    return obj
  }, [currentMatrix, zones])

  function selectRateCard(id) {
    setSelectedRateCardId(id)
    setRecentRateCardIds((ids) => [id, ...ids.filter((x) => x !== id)].slice(0, 4))
  }

  function setCurrentMatrix(updater) {
    setMatricesByCardId((byId) => ({
      ...byId,
      [selectedRateCardId]: typeof updater === 'function' ? updater(byId[selectedRateCardId]) : updater,
    }))
  }

  function setRateCardHistory(updater) {
    setHistoriesByCardId((byId) => ({
      ...byId,
      [selectedRateCardId]: typeof updater === 'function' ? updater(byId[selectedRateCardId] ?? []) : updater,
    }))
  }

  function openCreateRateCardModal() {
    setNewCardCode('')
    setNewCardName('')
    setNewCardDescription('')
    setCodeEditing(false)
    setNameOpen(false)
    setCreateStep('details')
    setShowCreateRateCardModal(true)
  }

  // Name comes first and the Code follows from it automatically (PHARMA,
  // HOME-APPLIANCES, …) until the user chooses to edit the code by hand.
  function handleNameChange(name) {
    setNewCardName(name)
    if (!codeEditing) setNewCardCode(autoCode(name, rateCards))
  }

  function goToSourceStep() {
    if (!codeValid || !newCardName.trim() || !newCardDescription.trim() || codeTaken) return
    setRcSource('')
    setCreateStep('source')
  }

  // Bypasses currentMatrix (which reflects selectedRateCardId as of the
  // *current* render) so the edit modal can be opened for a card that was
  // just created in this same handler, before the selection state update
  // has re-rendered.
  function openUpdateRateCardModalFor(rows) {
    setDraftMatrix(rows.map((row) => [...row]))
    setShowUpdateRateCardModal(true)
  }

  // Creates the card, drops the user straight into editing its matrix —
  // per Yugal's ask, "Create" should point the user at what to do next
  // rather than silently finishing.
  function finalizeCreateRateCard(sourceMatrix) {
    const code = newCardCode.trim().toUpperCase()
    const name = newCardName.trim()
    const description = newCardDescription.trim()
    if (!code || !name || !description) return
    const id = slugFromCode(code) || slugFromCode(name)
    if (rateCards.some((c) => c.id === id)) return
    const matrixRows = sourceMatrix.map((row) => [...row])
    setRateCards((cards) => [...cards, { id, code, name, description }])
    setMatricesByCardId((byId) => ({ ...byId, [id]: matrixRows }))
    setHistoriesByCardId((byId) => ({ ...byId, [id]: [] }))
    setShowCreateRateCardModal(false)
    setCreateStep('details')
    setPendingNewCard({ id, previousSelectedId: selectedRateCardId })
    selectRateCard(id)
    openUpdateRateCardModalFor(matrixRows)
  }

  // The edit modal that opens right after creation was closed via Cancel/X
  // rather than Save — the card was never confirmed, so undo the creation
  // entirely instead of leaving a half-made card sitting in the list.
  function closeUpdateRateCardModal() {
    if (pendingNewCard) {
      const { id, previousSelectedId } = pendingNewCard
      setRateCards((cards) => cards.filter((c) => c.id !== id))
      setMatricesByCardId((byId) => { const next = { ...byId }; delete next[id]; return next })
      setHistoriesByCardId((byId) => { const next = { ...byId }; delete next[id]; return next })
      setRecentRateCardIds((ids) => ids.filter((x) => x !== id))
      setSelectedRateCardId(previousSelectedId)
      setPendingNewCard(null)
    }
    setShowUpdateRateCardModal(false)
  }

  function createRateCardFromStandard() {
    const standardCard = rateCards.find((c) => c.isGeneral) ?? rateCards[0]
    finalizeCreateRateCard(matricesByCardId[standardCard.id] ?? standardCard.matrix)
  }

  function createRateCardFromScratch() {
    finalizeCreateRateCard(ALL_ZONES.map(() => ALL_ZONES.map(() => '')))
  }

  // The four ways to start pricing — same as Client Onboarding. The two
  // region-based ones (Standard Regions, Scratch) and Saved Templates run the
  // shared region flow; the result becomes a rate card on its own region set.
  const [regionFlowStep, setRegionFlowStep] = useState('')
  const [newRegions, setNewRegions] = useState([])
  const [newOverrides, setNewOverrides] = useState({})
  const [newDefaultRate, setNewDefaultRate] = useState('')
  const [templatePicking, setTemplatePicking] = useState(false)
  const [rcSource, setRcSource] = useState('')

  function reopenSourceStep(step = 'source') {
    setRcSource('')
    setCreateStep(step)
    setShowCreateRateCardModal(true)
  }

  function startRegionFlow(regions, overrides = {}, dflt = '', step = 'map') {
    setNewRegions(regions)
    setNewOverrides(overrides)
    setNewDefaultRate(dflt)
    setShowCreateRateCardModal(false)
    setRegionFlowStep(step)
  }

  function saveRegionRateCard() {
    const code = newCardCode.trim().toUpperCase()
    const name = newCardName.trim()
    const description = newCardDescription.trim()
    const id = slugFromCode(code) || slugFromCode(name)
    if (!code || !name || !description || rateCards.some((c) => c.id === id)) return
    const dflt = Number(newDefaultRate) > 0 ? Number(newDefaultRate) : ''
    const rows = newRegions.map((o) =>
      newRegions.map((d) => {
        const v = newOverrides[`${o.id}|${d.id}`]
        return v !== undefined && v !== '' ? Number(v) : dflt
      }),
    )
    setRateCards((cards) => [...cards, { id, code, name, description, zones: newRegions.map((r) => r.name), regions: JSON.parse(JSON.stringify(newRegions)) }])
    setMatricesByCardId((byId) => ({ ...byId, [id]: rows }))
    setHistoriesByCardId((byId) => ({ ...byId, [id]: [] }))
    setCreateStep('details')
    selectRateCard(id)
  }

  function createRateCardFromExisting(cardId) {
    const source = matricesByCardId[cardId]
    if (source) finalizeCreateRateCard(source)
  }
  const [tab, setTab] = useState('rate-card')
  const [hoverCell, setHoverCell] = useState(null)
  const [rcHover, setRcHover] = useState(null)
  const standardRegions = useMemo(() => buildStandardRegionsFromSheet(freshRegionId), [])
  const [showRegionMappingModal, setShowRegionMappingModal] = useState(false)
  const [showUpdateRateCardModal, setShowUpdateRateCardModal] = useState(false)
  const [showRateCardHistoryModal, setShowRateCardHistoryModal] = useState(false)
  const [draftMatrix, setDraftMatrix] = useState(null)
  const [additionalCharges, setAdditionalCharges] = useState(ADDITIONAL_CHARGES_MASTER)
  const [showNewChargeModal, setShowNewChargeModal] = useState(false)
  const [showRulesListModal, setShowRulesListModal] = useState(false)
  const [newChargeName, setNewChargeName] = useState('')
  const [newChargeRule, setNewChargeRule] = useState(() => emptyChargeRule('flat_per_awb'))
  const [clientPricingSearch, setClientPricingSearch] = useState('')
  const [selectedPricingClientId, setSelectedPricingClientId] = useState(null)
  const [editingChargeIndex, setEditingChargeIndex] = useState(null)
  const [editChargeName, setEditChargeName] = useState('')
  const [editChargeRule, setEditChargeRule] = useState(null)

  // Region Mapping Templates — named, reusable region + pricing sets built
  // ahead of onboarding, so a sales exec building a sibling client's region
  // set doesn't have to redo the same negotiated cities from scratch. Backed
  // by the shared REGION_TEMPLATES store (data/regionMapping.js), same shape
  // a client's own customRegions use in NewClient.jsx — only one template is
  // ever being edited at a time via this local draft.
  const [regionTemplatesTick, setRegionTemplatesTick] = useState(0) // bumped after any mutation, since REGION_TEMPLATES is a plain mutable array
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
  const [draftTemplateId, setDraftTemplateId] = useState(null)
  const [draftTemplateName, setDraftTemplateName] = useState('')
  const [draftRegions, setDraftRegions] = useState([])
  const [draftOverrides, setDraftOverrides] = useState({})
  const [draftDefaultRate, setDraftDefaultRate] = useState('')
  const [expandedDraftRegion, setExpandedDraftRegion] = useState(null)
  const [draftCitySearch, setDraftCitySearch] = useState('')
  const [newTemplateName, setNewTemplateName] = useState('')

  const assignedDraftCityKeys = useMemo(() => {
    const map = new Map()
    draftRegions.forEach((region) => region.cities.forEach(({ state, city }) => map.set(`${state}|${city}`, region.id)))
    return map
  }, [draftRegions])

  function openNewTemplate() {
    if (!newTemplateName.trim()) return
    const template = addRegionTemplate(newTemplateName.trim())
    setNewTemplateName('')
    setRegionTemplatesTick((t) => t + 1)
    loadTemplateDraft(template)
  }

  function loadTemplateDraft(template) {
    setDraftTemplateId(template.id)
    setDraftTemplateName(template.name)
    setDraftRegions(template.regions)
    setDraftOverrides(template.overrides)
    setDraftDefaultRate(template.defaultRate)
    setExpandedDraftRegion(null)
    setDraftCitySearch('')
    setShowTemplateBuilder(true)
  }

  function saveTemplateDraft() {
    if (draftTemplateId) {
      updateRegionTemplate(draftTemplateId, { name: draftTemplateName, regions: draftRegions, overrides: draftOverrides, defaultRate: draftDefaultRate })
      setRegionTemplatesTick((t) => t + 1)
    }
    setShowTemplateBuilder(false)
  }

  function handleDeleteTemplate(id) {
    deleteRegionTemplate(id)
    setRegionTemplatesTick((t) => t + 1)
  }

  // Default ODA List — configured here, and what every new client's own
  // "Client ODA List" (New Client wizard, Pricing step) is seeded from when
  // their draft is created. Same plain-mutable-module pattern as
  // REGION_TEMPLATES above: local state mirrors data/odaPincodes.js so
  // OdaListManager can render it, and every change is also written back to
  // the shared module so it's the value a freshly-opened wizard clones.
  const [defaultOdaEntries, setDefaultOdaEntriesState] = useState(() => getDefaultOdaEntries())
  const [defaultOdaRate, setDefaultOdaRateState] = useState(() => getDefaultOdaRate())
  const [defaultOdaOverrides, setDefaultOdaOverridesState] = useState(() => getDefaultOdaOverrides())

  function updateDefaultOdaEntries(updater) {
    setDefaultOdaEntriesState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      setDefaultOdaEntries(next)
      return next
    })
  }
  function updateDefaultOdaRate(updater) {
    setDefaultOdaRateState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      setDefaultOdaRate(next)
      return next
    })
  }
  function updateDefaultOdaOverrides(updater) {
    setDefaultOdaOverridesState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      setDefaultOdaOverrides(next)
      return next
    })
  }

  function addDraftRegion() {
    const id = freshRegionId()
    setDraftRegions((rows) => [...rows, { id, name: `Region ${rows.length + 1}`, cities: [] }])
    setExpandedDraftRegion(id)
  }
  function renameDraftRegion(id, name) {
    setDraftRegions((rows) => rows.map((r) => (r.id === id ? { ...r, name } : r)))
  }
  function deleteDraftRegion(id) {
    setDraftRegions((rows) => rows.filter((r) => r.id !== id))
    setDraftOverrides((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${id}|`) || key.endsWith(`|${id}`)) delete next[key]
      })
      return next
    })
    if (expandedDraftRegion === id) setExpandedDraftRegion(null)
  }
  function toggleDraftCity(regionId, state, city) {
    setDraftRegions((rows) =>
      rows.map((r) => {
        const has = r.cities.some((c) => c.state === state && c.city === city)
        if (r.id === regionId) {
          return has ? { ...r, cities: r.cities.filter((c) => !(c.state === state && c.city === city)) } : { ...r, cities: [...r.cities, { state, city }] }
        }
        return has ? { ...r, cities: r.cities.filter((c) => !(c.state === state && c.city === city)) } : r
      }),
    )
  }
  function draftCellValue(originId, destId) {
    return draftOverrides[`${originId}|${destId}`] ?? ''
  }
  function setDraftCellValue(originId, destId, value) {
    const key = `${originId}|${destId}`
    setDraftOverrides((prev) => {
      if (value === '') {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: Math.max(0, Number(value) || 0) }
    })
  }

  // Combined active + pending roster, same "exists the moment it's created"
  // stance as Client Email Logs — pricing conversations (and now, pricing
  // profile review) can matter before a client is fully active.
  const pricingClientResults = useMemo(() => {
    const roster = [
      ...ACTIVE_CLIENTS_SEED.map((c) => ({ ...c, status: 'active' })),
      ...PENDING_CLIENTS_SEED.map((c) => ({ ...c, status: 'pending' })),
    ]
    const q = clientPricingSearch.trim().toLowerCase()
    if (!q) return []
    return roster.filter((c) => c.name.toLowerCase().includes(q))
  }, [clientPricingSearch])

  const selectedPricingClient = useMemo(
    () => [...ACTIVE_CLIENTS_SEED, ...PENDING_CLIENTS_SEED].find((c) => c.id === selectedPricingClientId) ?? null,
    [selectedPricingClientId],
  )

  function openNewChargeModal() {
    setNewChargeName('')
    setNewChargeRule(emptyChargeRule('flat_per_awb'))
    setShowNewChargeModal(true)
  }

  function handleCreateCharge() {
    const name = newChargeName.trim()
    if (!name || !isChargeRuleValid(newChargeRule)) return
    setAdditionalCharges((rows) => [...rows, { name, rule: newChargeRule, defaultValue: formatChargeRule(newChargeRule) }])
    setNewChargeName('')
    setNewChargeRule(emptyChargeRule('flat_per_awb'))
    setShowNewChargeModal(false)
  }

  function openEditCharge(i) {
    setEditingChargeIndex(i)
    const c = additionalCharges[i]
    setEditChargeName(c.name)
    setEditChargeRule(c.rule ?? emptyChargeRule('flat_per_awb'))
  }

  function closeEditCharge() {
    setEditingChargeIndex(null)
    setEditChargeName('')
    setEditChargeRule(null)
  }

  function handleSaveChargeEdit() {
    const name = editChargeName.trim()
    if (!name || !isChargeRuleValid(editChargeRule)) return
    setAdditionalCharges((rows) =>
      rows.map((c, i) => (i === editingChargeIndex ? { ...c, name, rule: editChargeRule, defaultValue: formatChargeRule(editChargeRule) } : c)),
    )
    closeEditCharge()
  }

  function openUpdateRateCardModal() {
    setDraftMatrix(currentMatrix.map((row) => [...row]))
    setShowUpdateRateCardModal(true)
  }

  function updateDraftCell(i, j, value) {
    setDraftMatrix((rows) => rows.map((row, ri) => (ri === i ? row.map((v, ci) => (ci === j ? value : v)) : row)))
  }

  const draftChanges = useMemo(() => {
    if (!draftMatrix) return []
    const changes = []
    zones.forEach((origin, i) => {
      zones.forEach((dest, j) => {
        const from = Number(currentMatrix[i][j])
        const to = Number(draftMatrix[i][j])
        if (draftMatrix[i][j] !== '' && !Number.isNaN(to) && to !== from) changes.push({ origin, dest, from, to })
      })
    })
    return changes
  }, [draftMatrix, currentMatrix])

  function handleSaveRateCard() {
    // Clicking Save is an explicit confirm — even with nothing to record in
    // history (e.g. a from-scratch card with blank cells untouched), a
    // just-created pending card is now considered real and kept.
    setPendingNewCard(null)
    if (draftChanges.length === 0) {
      setShowUpdateRateCardModal(false)
      return
    }
    const today = todayISO()
    setRateCardHistory((history) => [
      ...history.map((v) => (v.effectiveTo === null ? { ...v, effectiveTo: today } : v)),
      { id: `v${history.length + 1}`, effectiveFrom: today, effectiveTo: null, updatedBy: user?.name ?? 'Unknown', changes: draftChanges },
    ])
    setCurrentMatrix(draftMatrix.map((row) => [...row]))
    setShowUpdateRateCardModal(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <BackButton />
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Client Pricing</h1>
        <p className="mt-0.5 text-xs text-slate-500">Manage rate cards, additional charges and region templates, and see the pricing attached to each client.</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        <button
          type="button"
          onClick={() => setTab('rate-card')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'rate-card' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Rate Card
        </button>
        <button
          type="button"
          onClick={() => setTab('additional-charges')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'additional-charges' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Additional Charges
        </button>
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'templates' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Region Templates
        </button>
        <button
          type="button"
          onClick={() => setTab('client-pricing')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'client-pricing' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Client Tier &amp; Pricing
        </button>
      </div>

      {tab === 'rate-card' && (
        <>
      <div>
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${card}`}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recents</span>
          {recentRateCardIds.slice(0, 3).map((id) => {
            const rc = rateCards.find((c) => c.id === id)
            if (!rc) return null
            const on = id === selectedRateCardId
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectRateCard(id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? 'bg-slate-900 text-white shadow-soft' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {rc.name}
              </button>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:ml-auto">
          <button
            type="button"
            onClick={() => { setRateCardSearch(''); setShowBrowseRateCardsModal(true) }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 py-1.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
          >
            <Icon name="search" className="h-4 w-4" />
            Browse or Create Rate Card
          </button>
        </div>
      </div>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-slate-900">{selectedRateCard.name}</h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">{selectedRateCard.code}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">INR per kg · origin (row) to destination (column)</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <HeaderButton icon="route" label="Region Mapping" onClick={() => setShowRegionMappingModal(true)} />
            <HeaderButton icon="history" label="History" onClick={() => setShowRateCardHistoryModal(true)} />
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <HeaderButton icon="edit" label="Update Rate Card" onClick={openUpdateRateCardModal} variant="primary" />
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto" onMouseLeave={() => setHoverCell(null)}>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-slate-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">From / To</th>
                {zones.map((z) => (
                  <th key={z} className={`sticky top-0 z-10 whitespace-nowrap px-2.5 py-2.5 text-center font-semibold transition-colors ${hoverCell?.d === z ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-50 text-slate-500'}`}>
                    {z}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((origin) => (
                <tr key={origin} className="border-t border-slate-100">
                  <th className={`sticky left-0 z-10 whitespace-nowrap px-3 py-1.5 text-left font-semibold transition-colors ${hoverCell?.o === origin ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-50 text-slate-600'}`}>{origin}</th>
                  {zones.map((dest) => {
                    const here = hoverCell?.o === origin && hoverCell?.d === dest
                    const line = hoverCell && (hoverCell.o === origin || hoverCell.d === dest)
                    return (
                      <td
                        key={dest}
                        onMouseEnter={() => setHoverCell({ o: origin, d: dest })}
                        className={`px-2.5 py-1.5 text-center tabular-nums transition-colors ${here ? 'bg-brand-orange font-semibold text-white' : line ? 'bg-brand-orange/5 text-slate-800' : 'text-slate-700'}`}
                      >
                        {matrix[origin][dest]}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ClientTemplateFlow
        open={templatePicking}
        onBack={() => {
          setTemplatePicking(false)
          reopenSourceStep()
        }}
        onClose={() => setTemplatePicking(false)}
        onPick={(templateId) => {
          const cloned = cloneRegionTemplate(templateId)
          if (!cloned) return
          setTemplatePicking(false)
          startRegionFlow(cloned.regions, cloned.overrides, cloned.defaultRate, 'rates')
        }}
      />

      <ClientRegionFlow
        step={regionFlowStep}
        setStep={setRegionFlowStep}
        name={newCardName.trim() || 'New rate card'}
        regions={newRegions}
        setRegions={setNewRegions}
        overrides={newOverrides}
        setOverrides={setNewOverrides}
        defaultRate={newDefaultRate}
        setDefaultRate={setNewDefaultRate}
        onUseRateCard={() => {
          setRegionFlowStep('')
          reopenSourceStep('source-existing')
        }}
        onSavePricing={saveRegionRateCard}
      />

      {showRegionMappingModal && (
        <RegionMappingModal
          name={selectedRateCard.name}
          regions={selectedRateCard.regions ?? standardRegions}
          setRegions={() => {}}
          readOnly
          onCancel={() => setShowRegionMappingModal(false)}
          onSave={() => setShowRegionMappingModal(false)}
        />
      )}

      {showBrowseRateCardsModal && (
        <Modal title="Rate Cards" subtitle={`${rateCards.length} rate card${rateCards.length === 1 ? '' : 's'}`} size="max-w-md"
          headerAction={
            <button
              type="button"
              onClick={() => {
                setShowBrowseRateCardsModal(false)
                openCreateRateCardModal()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Create New Rate Card
            </button>
          }
          onClose={() => setShowBrowseRateCardsModal(false)}
        >
          <div className="px-5 pt-4">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={rateCardSearch}
                onChange={(e) => setRateCardSearch(e.target.value)}
                placeholder="Search by name or code…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto px-5 py-3">
            {(() => {
              const q = rateCardSearch.trim().toLowerCase()
              const list = rateCards.filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
              if (list.length === 0) return <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">No rate cards match "{rateCardSearch}".</div>
              return list.map((c) => {
                const all = (matricesByCardId[c.id] ?? c.matrix ?? []).flat().map(Number).filter((v) => Number.isFinite(v) && v > 0)
                const range = all.length ? `₹${Math.min(...all)}–₹${Math.max(...all)}/kg` : 'No prices yet'
                const on = c.id === selectedRateCardId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      selectRateCard(c.id)
                      setShowBrowseRateCardsModal(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange/40' : 'border-slate-200 hover:border-brand-orange/40'}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{c.name}</span>
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500">{c.code}</span>
                      </span>
                      {c.description && <span className="mt-0.5 block truncate text-xs text-slate-500">{c.description}</span>}
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {(c.zones ?? ALL_ZONES).length} regions · {range}
                      </span>
                    </span>
                  </button>
                )
              })
            })()}
          </div>
        </Modal>
      )}

      {showCreateRateCardModal && createStep === 'details' && (
        <Modal title="Create rate card" subtitle="Step 1 of 2 · Basic details" size="max-w-md" onClose={() => setShowCreateRateCardModal(false)}>
          <div className="space-y-3.5 p-4">
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Name <span className="text-brand-orange-dark">*</span>
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={newCardName}
                    onChange={(e) => {
                      handleNameChange(cleanName(e.target.value))
                      setNameOpen(true)
                    }}
                    onFocus={() => setNameOpen(true)}
                    onBlur={() => setTimeout(() => setNameOpen(false), 120)}
                    placeholder="e.g. Home_Appliances"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                  />
                  {nameOpen && (() => {
                    const q = newCardName.trim().toLowerCase()
                    const names = INDUSTRY_CODES.map(nameFromCode)
                    const hits = names.filter((n) => !q || n.toLowerCase().includes(q))
                    const exact = names.some((n) => n.toLowerCase() === q)
                    if (hits.length === 0 && (!q || exact)) return null
                    return (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        {hits.map((n) => (
                          <button key={n} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { handleNameChange(n); setNameOpen(false) }} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                            {n}
                            <span className="text-[11px] text-slate-400">{autoCode(n, rateCards)}</span>
                          </button>
                        ))}
                        {q && !exact && (
                          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setNameOpen(false)} className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 text-left text-sm font-medium text-brand-orange-dark hover:bg-slate-50">
                            <Icon name="plus" className="h-3.5 w-3.5" />
                            Create "{newCardName.trim()}"
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
              <div className="w-32 shrink-0">
                <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>
                    Code <span className="text-brand-orange-dark">*</span>
                  </span>
                  {!codeEditing && newCardCode && (
                    <button type="button" onClick={() => setCodeEditing(true)} className="font-medium text-brand-orange-dark hover:underline">
                      Edit
                    </button>
                  )}
                </span>
                <input
                  type="text"
                  value={newCardCode}
                  readOnly={!codeEditing}
                  onChange={(e) => setNewCardCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123"
                  className={`w-full rounded-lg border px-3 py-2 text-sm tabular-nums placeholder:text-slate-300 focus:outline focus:outline-2 focus:outline-brand-orange/40 ${codeEditing ? 'border-slate-200 bg-white text-slate-800' : 'border-slate-200 bg-slate-100/70 text-slate-600'}`}
                />
              </div>
            </div>
            {codeTaken ? (
              <p className="-mt-2 text-xs text-rose-600">This code is already used by another rate card.</p>
            ) : codeEditing && newCardCode && !codeValid ? (
              <p className="-mt-2 text-xs text-rose-600">Code is 3 letters then 3 numbers, like ABC123.</p>
            ) : (
              <p className="-mt-2 text-xs text-slate-400">Name: letters, numbers and _ only. Code is made from the name.</p>
            )}

            <div>
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>
                  Description <span className="text-brand-orange-dark">*</span>
                </span>
                <span className="font-normal tabular-nums text-slate-400">{newCardDescription.length}/120</span>
              </span>
              <textarea
                rows={2}
                maxLength={120}
                value={newCardDescription}
                onChange={(e) => setNewCardDescription(e.target.value)}
                placeholder="Who this card is for"
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setShowCreateRateCardModal(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={goToSourceStep}
                disabled={!codeValid || !newCardName.trim() || !newCardDescription.trim() || codeTaken}
                className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCreateRateCardModal && createStep === 'source' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowCreateRateCardModal(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-3.5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Add pricing</h3>
                <p className="mt-0.5 text-xs text-slate-500">How do you want to set this rate card's regions and rates?</p>
              </div>
              <button type="button" onClick={() => setShowCreateRateCardModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                ×
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                { key: 'rate-cards', title: 'Pick from Standard Rate Cards', text: 'Pick a standard rate card, then change cell prices if needed.', tag: 'Most common' },
                { key: 'standard-regions', title: 'Start with Standard Regions', text: 'Start with 13 standard regions, edit as needed, then enter your grid prices.', tag: 'Editable regions' },
                { key: 'templates', title: 'Saved Templates', text: 'Reuse a region template saved by you or your team, then price its grid.', tag: 'Reusable regions' },
                { key: 'scratch', title: 'Start from Scratch', text: 'Build your own regions from the ground up, then set every price yourself.', tag: 'Fully custom deals' },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setRcSource(o.key)}
                  className={`flex flex-col gap-2 rounded-2xl border bg-white p-3.5 text-left transition-colors ${rcSource === o.key ? 'border-brand-orange ring-1 ring-brand-orange/40' : 'border-slate-200/80 hover:border-brand-orange/40'}`}
                >
                  <span className="flex h-[68px] items-center justify-center rounded-xl bg-slate-50 px-2">
                    <PricingSourceArt kind={o.key} />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{o.title}</span>
                  <span className="text-xs leading-relaxed text-slate-500">{o.text}</span>
                  <span className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${o.key === 'rate-cards' ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-100 text-slate-500'}`}>{o.tag}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                disabled={!rcSource}
                onClick={() => {
                  if (rcSource === 'rate-cards') setCreateStep('source-existing')
                  if (rcSource === 'standard-regions') startRegionFlow(buildStandardRegionsFromSheet(freshRegionId))
                  if (rcSource === 'templates') {
                    setShowCreateRateCardModal(false)
                    setTemplatePicking(true)
                  }
                  if (rcSource === 'scratch') startRegionFlow([])
                }}
                className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateRateCardModal && createStep === 'source-existing' && (
        <Modal title={`Copy pricing for ${newCardName.trim()}`} onClose={() => setShowCreateRateCardModal(false)}>
          <div className="p-5">
            <button type="button" onClick={() => setCreateStep('source')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="space-y-2">
              {rateCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => createRateCardFromExisting(c.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{c.code}</p>
                  </div>
                  <Icon name="chevron" className="h-4 w-4 -rotate-90 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showUpdateRateCardModal && draftMatrix && (() => {
        const changedKey = (i, j) => {
          const to = Number(draftMatrix[i][j])
          return draftMatrix[i][j] !== '' && !Number.isNaN(to) && to !== Number(currentMatrix[i][j])
        }
        const move = (i, j, e) => {
          const el = e.target
          let to = null
          if (e.key === 'ArrowDown' || e.key === 'Enter') to = [i + 1, j]
          else if (e.key === 'ArrowUp') to = [i - 1, j]
          else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length) to = [i, j + 1]
          else if (e.key === 'ArrowLeft' && el.selectionStart === 0) to = [i, j - 1]
          const next = to && document.getElementById(`urc-${to[0]}-${to[1]}`)
          if (next) {
            e.preventDefault()
            next.focus()
          }
        }
        const lane = rcHover
          ? { from: zones[rcHover[0]], to: zones[rcHover[1]], now: draftMatrix[rcHover[0]][rcHover[1]], was: currentMatrix[rcHover[0]][rcHover[1]], edited: changedKey(rcHover[0], rcHover[1]) }
          : null
        return (
          <Shell wide="max-w-5xl" title={`Update rate card · ${selectedRateCard.name}`} onClose={closeUpdateRateCardModal}>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-brand-orange bg-brand-orange/10" />
                  Changed by you
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-50" />
                  Within the same region
                </span>
              </div>
              <div className="mt-3 flex min-h-[28px] items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                {lane ? (
                  <span className="text-slate-700">
                    <span className="font-semibold">{lane.from}</span> → <span className="font-semibold">{lane.to}</span> · ₹{lane.now === '' ? '—' : lane.now}/kg
                    {lane.edited && <span className="ml-2 text-brand-orange-dark">changed · was ₹{lane.was}</span>}
                  </span>
                ) : (
                  <span className="text-slate-400">Click a price to change it. Arrow keys move between cells. Rows are origin, columns are destination · ₹/kg.</span>
                )}
                {draftChanges.length > 0 && (
                  <span className="shrink-0 text-slate-500">
                    {draftChanges.length} changed ·{' '}
                    <button type="button" onClick={() => setDraftMatrix(currentMatrix.map((row) => [...row]))} className="font-semibold text-brand-orange-dark hover:underline">
                      Reset
                    </button>
                  </span>
                )}
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full table-fixed border-collapse text-xs" onMouseLeave={() => setRcHover(null)}>
                  <colgroup>
                    <col style={{ width: 92 }} />
                    {zones.map((z) => (
                      <col key={z} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-slate-400">From ↓ To →</th>
                      {zones.map((z, ci) => (
                        <th key={z} title={z} className={`px-0.5 py-1.5 text-center text-[10px] font-semibold leading-tight ${rcHover?.[1] === ci ? 'text-brand-orange-dark' : 'text-slate-500'}`}>
                          {z.replace(/ (\d)$/, '\n$1').split('\n').map((t, k) => (
                            <span key={k} className="block">
                              {t}
                            </span>
                          ))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((origin, i) => (
                      <tr key={origin} className="border-t border-slate-100">
                        <th className={`whitespace-nowrap px-3 py-0 text-left text-xs font-semibold ${rcHover?.[0] === i ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-50 text-slate-700'}`}>{origin}</th>
                        {zones.map((dest, j) => {
                          const edited = changedKey(i, j)
                          return (
                            <td key={dest} className="p-[2px]" onMouseEnter={() => setRcHover([i, j])}>
                              <input
                                id={`urc-${i}-${j}`}
                                type="text"
                                inputMode="decimal"
                                value={draftMatrix[i][j]}
                                onFocus={(e) => {
                                  e.target.select()
                                  setRcHover([i, j])
                                }}
                                onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && updateDraftCell(i, j, e.target.value)}
                                onKeyDown={(e) => move(i, j, e)}
                                className={`h-8 w-full rounded-md text-center text-xs tabular-nums transition-shadow focus:outline focus:outline-2 focus:outline-brand-orange ${
                                  edited ? 'border border-brand-orange bg-brand-orange/10 font-semibold text-brand-orange-dark' : i === j ? 'border border-slate-300 bg-slate-50 font-semibold text-slate-900' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                }`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-3">
              <p className="text-xs text-slate-500">
                {draftChanges.length === 0 ? 'No changes yet.' : `${draftChanges.length} price${draftChanges.length === 1 ? '' : 's'} changed. Saving publishes a new version.`}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={closeUpdateRateCardModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRateCard}
                  disabled={draftChanges.length === 0}
                  className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save new version
                </button>
              </div>
            </div>
          </Shell>
        )
      })()}

      {showRateCardHistoryModal && (
        <RateCardHistoryModal name={selectedRateCard.name} history={rateCardHistory} currentMatrix={currentMatrix} zones={selectedRateCard.zones} onClose={() => setShowRateCardHistoryModal(false)} />
      )}
        </>
      )}

      {tab === 'templates' && <ClientTemplatesTab />}

      {tab === 'client-pricing' && (
        <div className="space-y-6">
        <div className={`p-5 ${card}`}>
          <h2 className="text-sm font-semibold text-slate-900">Tier discounts</h2>
          <p className="mt-0.5 text-xs text-slate-500">Tier is set by monthly volume. The discount is taken off the standard rate card.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(TIER_DISCOUNTS).map(([tier, discount]) => (
              <div key={tier} className="rounded-xl border border-slate-200/80 p-3.5">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${TIER_BADGE[tier]}`}>{tier}</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{discount}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{TIER_VOLUME_BANDS[tier]} / month</p>
              </div>
            ))}
          </div>
        </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange-dark">
                <Icon name="search" className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Search Clients</h2>
                <p className="mt-0.5 text-xs text-slate-500">Look up a client to check the region mapping and pricing attached to them.</p>
              </div>
            </div>

            {selectedPricingClient ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedPricingClientId(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
                  Back to search
                </button>

                <div className={`flex flex-wrap items-center justify-between gap-3 p-5 ${card}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-sm font-semibold text-brand-orange-dark">{selectedPricingClient.name.slice(0, 2).toUpperCase()}</span>
                    <div>
                    <div className="text-base font-semibold text-slate-900">{selectedPricingClient.name}</div>
                    <div className="text-xs text-slate-400">{selectedPricingClient.city}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Pricing type </span>
                      <span className="font-medium text-slate-700">{selectedPricingClient.pricingProfile?.pricingType ?? 'Standard'}</span>
                    </div>
                    {selectedPricingClient.pricingProfile?.pricingType === 'Custom' && (
                      <div>
                        <span className="text-slate-400">Region Definition </span>
                        <span className="font-medium text-slate-700">{selectedPricingClient.pricingProfile.regionMappingType}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Tier </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIER_BADGE[selectedPricingClient.tier]}`}>{selectedPricingClient.tier}</span>
                    </div>
                  </div>
                </div>

                {selectedPricingClient.pricingProfile?.pricingType === 'Custom' &&
                selectedPricingClient.pricingProfile.regionMappingType === 'Custom' &&
                selectedPricingClient.pricingProfile.customRegions.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {selectedPricingClient.pricingProfile.customRegions.length} client regions
                    </div>
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="text-xs">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                            {selectedPricingClient.pricingProfile.customRegions.map((r) => (
                              <th key={r.id} className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-500">
                                {r.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPricingClient.pricingProfile.customRegions.map((origin) => (
                            <tr key={origin.id} className="border-t border-slate-100">
                              <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-600">{origin.name}</th>
                              {selectedPricingClient.pricingProfile.customRegions.map((dest) => {
                                const key = `${origin.id}|${dest.id}`
                                const override = selectedPricingClient.pricingProfile.customRegionOverrides[key]
                                const fallback = selectedPricingClient.pricingProfile.unmappedDefaultRate
                                return (
                                  <td key={dest.id} className="px-2 py-1.5 text-center tabular-nums">
                                    {override !== undefined ? (
                                      <span className="font-medium text-brand-orange-dark">{override}</span>
                                    ) : (
                                      <span className="text-slate-400">{fallback !== '' ? fallback : '—'}</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Rate card on file</div>
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="text-xs">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                            {ALL_ZONES.map((z) => (
                              <th key={z} className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-500">
                                {z}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_ZONES.map((origin) => (
                            <tr key={origin} className="border-t border-slate-100">
                              <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-600">{origin}</th>
                              {ALL_ZONES.map((dest) => (
                                <td key={dest} className="px-2 py-1.5 text-center tabular-nums text-slate-700">
                                  {selectedPricingClient.matrix?.[origin]?.[dest]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="relative max-w-sm">
                  <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientPricingSearch}
                    onChange={(e) => setClientPricingSearch(e.target.value)}
                    placeholder="Search by client name…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                  />
                </div>
                {clientPricingSearch.trim() === '' ? (
                  <div className={`flex flex-col items-center gap-2 p-10 text-center ${card}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Icon name="search" className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-slate-700">Search for a client</p>
                    <p className="text-xs text-slate-500">Check the region mapping and pricing attached to them.</p>
                  </div>
                ) : pricingClientResults.length === 0 ? (
                  <div className={`flex flex-col items-center gap-2 p-10 text-center ${card}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Icon name="search" className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-slate-700">No clients match "{clientPricingSearch}"</p>
                  </div>
                ) : (
                  <div className={`divide-y divide-slate-100 overflow-hidden ${card}`}>
                    {pricingClientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedPricingClientId(c.id)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-400">
                            {c.city} · {c.pricingProfile?.pricingType ?? 'Standard'}
                            {c.pricingProfile?.pricingType === 'Custom' ? ` (${c.pricingProfile.regionMappingType})` : ''}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {c.status === 'pending' && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Pending</span>}
                          <Icon name="chevron" className="h-4 w-4 -rotate-90 text-slate-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'additional-charges' && (
        <div className={`overflow-hidden ${card}`}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <p className="text-sm text-slate-500">One default rule and price per charge type.</p>
            <div className="flex items-center gap-2">
              <HeaderButton icon="grid" label="Rules List" onClick={() => setShowRulesListModal(true)} />
              <HeaderButton icon="plus" label="Create new charge type" onClick={openNewChargeModal} variant="primary" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="w-20 px-5 py-3">Sl no</th>
                  <th className="px-3 py-3">Charge</th>
                  <th className="px-3 py-3">Default rule &amp; price</th>
                  <th className="w-24 px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {additionalCharges.map((c, i) => (
                  <tr key={c.name} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-3.5 font-medium text-slate-800">{c.name}</td>
                    <td className="px-3 py-3.5 text-slate-600">{c.defaultValue}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEditCharge(i)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-orange-dark"
                        aria-label={`Switch default rule — ${c.name}`}
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400">
            Every charge type has one default rule and price — edit a row to switch which rule it uses. Client-specific amounts are set during onboarding.
          </p>

        </div>
      )}

      {tab === 'additional-charges' && (
        <div className={`overflow-hidden ${card}`}>
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Default ODA list</h2>
          </div>
          <div className="p-5">
            <OdaListManager
              summary
              title="Default ODA List"
              entries={defaultOdaEntries}
              onEntriesChange={updateDefaultOdaEntries}
              rate={defaultOdaRate}
              onRateChange={updateDefaultOdaRate}
              overrides={defaultOdaOverrides}
              onOverridesChange={updateDefaultOdaOverrides}
            />
            <p className="mt-3 text-[11px] text-slate-400">
              Every new client's own ODA list starts as a copy of this list — edits here don't change pincodes a client has already onboarded with.
            </p>
          </div>
        </div>
      )}

      {showRulesListModal && (
        <Modal title="Rules List" size="max-w-[52rem]" onClose={() => setShowRulesListModal(false)}>
          <div className="grid grid-cols-[1fr_17rem] gap-x-6 border-b border-slate-100 bg-slate-50/70 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Rule</span>
            <span>Formula</span>
          </div>
          <div className="divide-y divide-slate-100">
            {RULES_CATALOG.map((r) => (
              <div key={r.type} className="grid grid-cols-[1fr_17rem] items-center gap-x-6 px-5 py-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-slate-800">{r.label}</div>
                  <p className="text-[11px] leading-snug text-slate-500">{r.description}</p>
                </div>
                <span className="justify-self-start rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">{r.formula}</span>
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 bg-amber-50 px-5 py-2 text-[11px] text-amber-700">
            This list is fixed — new rules can't be created here. To create a new rule, contact Tech Admin.
          </p>
        </Modal>
      )}

      {showNewChargeModal && (
        <Modal title="Create new charge type" size="max-w-md" onClose={() => setShowNewChargeModal(false)}>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Charge name</span>
              <input
                type="text"
                value={newChargeName}
                onChange={(e) => setNewChargeName(e.target.value)}
                placeholder="e.g. Insurance Charges"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </label>

            <ChargeRuleEditor rule={newChargeRule} onChange={setNewChargeRule} />

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowNewChargeModal(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                disabled={!newChargeName.trim() || !isChargeRuleValid(newChargeRule)}
                onClick={handleCreateCharge}
                className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create charge type
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingChargeIndex !== null && editChargeRule && (
        <Modal title={`Switch Default Rule — ${additionalCharges[editingChargeIndex].name}`} size="max-w-md" onClose={closeEditCharge}>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Charge name</span>
              <input
                type="text"
                value={editChargeName}
                onChange={(e) => setEditChargeName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </label>

            <ChargeRuleEditor rule={editChargeRule} onChange={setEditChargeRule} />

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={closeEditCharge} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                disabled={!editChargeName.trim() || !isChargeRuleValid(editChargeRule)}
                onClick={handleSaveChargeEdit}
                className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showTemplateBuilder && (
        <Modal title="Region Mapping Template" onClose={saveTemplateDraft}>
          <div className="space-y-5 p-5">
            <label className="block max-w-sm">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Template name</span>
              <input
                type="text"
                value={draftTemplateName}
                onChange={(e) => setDraftTemplateName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </label>

            {draftRegions.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'standard-regions', title: 'Start from Standard Regions', text: 'Clone the 13 standard regions with cities pre-matched. Rename, merge, split or reassign.', tag: 'Quickest', onClick: () => setDraftRegions(buildRegionsFromStandard()) },
                  { key: 'scratch', title: 'Start from Scratch', text: 'Build regions one at a time, assigning cities exactly as negotiated.', tag: 'Fully custom', onClick: () => setDraftRegions([]) },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={o.onClick}
                    className="flex flex-col items-stretch gap-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left transition-colors hover:border-brand-orange/40"
                  >
                    <span className="flex h-[68px] items-center justify-center rounded-xl bg-slate-50 px-2">
                      <PricingSourceArt kind={o.key} />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{o.title}</span>
                    <span className="text-xs leading-relaxed text-slate-500">{o.text}</span>
                    <span className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${o.key === 'standard-regions' ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-100 text-slate-500'}`}>{o.tag}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Regions</span>
                    <button type="button" onClick={addDraftRegion} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-orange-dark hover:bg-brand-orange/5">
                      <Icon name="plus" className="h-3.5 w-3.5" />
                      Add region
                    </button>
                  </div>

                  {draftRegions.map((region) => {
                    const expanded = expandedDraftRegion === region.id
                    return (
                      <div key={region.id} className="rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input
                            value={region.name}
                            onChange={(e) => renameDraftRegion(region.id, e.target.value)}
                            className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-brand-orange/40 focus:bg-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedDraftRegion(expanded ? null : region.id)
                              setDraftCitySearch('')
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                          >
                            {region.cities.length} {region.cities.length === 1 ? 'city' : 'cities'}
                            <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDraftRegion(region.id)}
                            title="Delete region"
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Icon name="close" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {expanded && (
                          <div className="border-t border-slate-100 p-3">
                            <input
                              type="text"
                              value={draftCitySearch}
                              onChange={(e) => setDraftCitySearch(e.target.value)}
                              placeholder="Search a city or state…"
                              className="mb-2 w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                            />
                            <div className="grid max-h-48 grid-cols-2 gap-x-4 gap-y-1 overflow-auto sm:grid-cols-3">
                              {Object.entries(STATE_CITY_DIRECTORY).flatMap(([state, cities]) =>
                                cities
                                  .filter((city) => {
                                    const q = draftCitySearch.trim().toLowerCase()
                                    return !q || city.toLowerCase().includes(q) || state.toLowerCase().includes(q)
                                  })
                                  .map((city) => {
                                    const ownerId = assignedDraftCityKeys.get(`${state}|${city}`)
                                    const checked = ownerId === region.id
                                    const ownerName = ownerId && ownerId !== region.id ? draftRegions.find((r) => r.id === ownerId)?.name : null
                                    return (
                                      <label key={`${state}|${city}`} className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs ${ownerName ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleDraftCity(region.id, state, city)}
                                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                                        />
                                        <span className="truncate">{city}</span>
                                        {ownerName && <span className="shrink-0 text-[10px] text-slate-300">({ownerName})</span>}
                                      </label>
                                    )
                                  }),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <label className="block max-w-xs">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Default rate for unspecified lanes (₹/kg)</span>
                  <input
                    type="number"
                    min="0"
                    value={draftDefaultRate}
                    onChange={(e) => setDraftDefaultRate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Lane pricing</span>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="text-xs">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                            {draftRegions.map((r) => (
                              <th key={r.id} className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-500">
                                {r.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {draftRegions.map((origin) => (
                            <tr key={origin.id} className="border-t border-slate-100">
                              <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-600">{origin.name}</th>
                              {draftRegions.map((dest) => (
                                <td key={dest.id} className="px-1 py-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={draftCellValue(origin.id, dest.id)}
                                    onChange={(e) => setDraftCellValue(origin.id, dest.id, e.target.value)}
                                    placeholder={draftDefaultRate !== '' ? String(draftDefaultRate) : '—'}
                                    className="w-14 rounded border border-transparent px-1 py-1 text-center tabular-nums hover:border-slate-200 focus:border-brand-orange/40 focus:bg-white focus:outline-none"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">Blank cells use the default rate above. Only type a value where the negotiated price differs.</p>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={saveTemplateDraft}
              className="w-full rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
            >
              Save template
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

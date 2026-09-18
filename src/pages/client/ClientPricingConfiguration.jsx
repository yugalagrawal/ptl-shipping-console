import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { card, thCls, tdCls, rowCls } from '../../components/ui.js'
import RegionPincodeMappingModal from '../../components/RegionPincodeMappingModal.jsx'
import OdaListManager from '../../components/OdaListManager.jsx'
import {
  ZONES,
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
  Bronze: 'Below 100 tonne',
  Silver: '100–999 tonne',
  Gold: '1,000–9,999 tonne',
  Platinum: '10,000+ tonne',
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
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Rule type</span>
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

      {['flat_per_awb', 'per_kg', 'percent_of_freight', 'percent_of_cod'].includes(rule.type) && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Value</span>
          <NumberField value={rule.value} onChange={(v) => onChange({ ...rule, value: v })} placeholder="0" suffix={SIMPLE_UNIT[rule.type]} />
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
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
  // A card created via finalizeCreateRateCard isn't "real" until its first
  // Save & publish — if the edit modal that opens right after creation gets
  // cancelled/closed instead, the card (and its matrix/history) are rolled
  // back rather than left behind half-made.
  const [pendingNewCard, setPendingNewCard] = useState(null) // { id, previousSelectedId } | null

  const selectedRateCard = rateCards.find((c) => c.id === selectedRateCardId) ?? rateCards[0]
  const currentMatrix = matricesByCardId[selectedRateCardId]
  const rateCardHistory = historiesByCardId[selectedRateCardId] ?? []
  const matrix = useMemo(() => matrixArrayToObject(currentMatrix), [currentMatrix])

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
    setCreateStep('details')
    setShowCreateRateCardModal(true)
  }

  // Picking/creating a code also suggests a Name from it (only while Name
  // is still untouched) — e.g. "ELECTRONICS" -> "Electronics" — since for
  // these industry codes the two are almost always the same word.
  function handlePickCode(code) {
    setNewCardCode(code)
    if (!newCardName.trim()) {
      setNewCardName(code.toLowerCase().replace(/(^|[\s-])\w/g, (m) => m.toUpperCase()))
    }
  }

  function goToSourceStep() {
    if (!newCardCode.trim() || !newCardName.trim()) return
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
    if (!code || !name) return
    const id = slugFromCode(code) || slugFromCode(name)
    if (rateCards.some((c) => c.id === id)) return
    const matrixRows = sourceMatrix.map((row) => [...row])
    setRateCards((cards) => [...cards, { id, code, name }])
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
    finalizeCreateRateCard(ZONES.map(() => ZONES.map(() => '')))
  }

  function createRateCardFromExisting(cardId) {
    const source = matricesByCardId[cardId]
    if (source) finalizeCreateRateCard(source)
  }
  const [tab, setTab] = useState('rate-card')
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
    ZONES.forEach((origin, i) => {
      ZONES.forEach((dest, j) => {
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
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Client Pricing</h1>
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
          onClick={() => setTab('client-pricing')}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'client-pricing' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Client Pricing
        </button>
      </div>

      {tab === 'rate-card' && (
        <>
      <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${card}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent</span>
          {recentRateCardIds.map((id) => {
            const rc = rateCards.find((c) => c.id === id)
            if (!rc) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectRateCard(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  id === selectedRateCardId ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {rc.name}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <HeaderButton icon="search" label="Browse all rate cards" onClick={() => { setRateCardSearch(''); setShowBrowseRateCardsModal(true) }} />
          <HeaderButton icon="plus" label="Create" onClick={openCreateRateCardModal} />
        </div>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {selectedRateCard.name} <span className="text-slate-300">·</span> {selectedRateCard.code}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <HeaderButton icon="route" label="Region Mapping" onClick={() => setShowRegionMappingModal(true)} />
            <HeaderButton icon="history" label="Rate Card History" onClick={() => setShowRateCardHistoryModal(true)} />
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <HeaderButton icon="edit" label="Update Rate Card" onClick={openUpdateRateCardModal} variant="primary" />
          </div>
        </div>
        <div className="overflow-x-auto">
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
                    <td key={dest} className="px-2 py-1.5 text-center tabular-nums text-slate-700">
                      {matrix[origin][dest]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
          INR per kg, chargeable weight — origin (row) → destination (column).
        </p>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="border-b border-slate-100 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tier discount mapping</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={thCls}>Tier</th>
              <th className={thCls}>Monthly volume</th>
              <th className={thCls}>Suggested discount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(TIER_DISCOUNTS).map(([tier, discount]) => (
              <tr key={tier} className={rowCls}>
                <td className={tdCls}>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${TIER_BADGE[tier]}`}>{tier}</span>
                </td>
                <td className={tdCls}>{TIER_VOLUME_BANDS[tier]}</td>
                <td className={`${tdCls} tabular-nums`}>{discount}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
          Flat discount off the standard matrix above — tier is fixed by declared monthly volume alone.
        </p>
      </div>

      {showRegionMappingModal && <RegionPincodeMappingModal onClose={() => setShowRegionMappingModal(false)} />}

      {showBrowseRateCardsModal && (
        <Modal title="Rate Cards" onClose={() => setShowBrowseRateCardsModal(false)}>
          <div className="border-b border-slate-100 p-4">
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
          <div className="max-h-96 overflow-y-auto p-2">
            {rateCards
              .filter((c) => {
                const q = rateCardSearch.trim().toLowerCase()
                return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
              })
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    selectRateCard(c.id)
                    setShowBrowseRateCardsModal(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                    c.id === selectedRateCardId ? 'bg-slate-50' : ''
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.code}</div>
                  </div>
                  {c.isGeneral && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Standard</span>
                  )}
                </button>
              ))}
            {rateCards.filter((c) => {
              const q = rateCardSearch.trim().toLowerCase()
              return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
            }).length === 0 && <div className="px-3.5 py-8 text-center text-sm text-slate-400">No rate cards match "{rateCardSearch}".</div>}
          </div>
        </Modal>
      )}

      {showCreateRateCardModal && createStep === 'details' && (
        <Modal title="Create rate card" onClose={() => setShowCreateRateCardModal(false)}>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Code</span>
              <CodeCombobox value={newCardCode} options={INDUSTRY_CODES} onChange={handlePickCode} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
              <input
                type="text"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder="Electronics"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowCreateRateCardModal(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={goToSourceStep}
                disabled={!newCardCode.trim() || !newCardName.trim()}
                className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCreateRateCardModal && createStep === 'source' && (
        <Modal title={`Set up pricing for ${newCardName.trim()}`} onClose={() => setShowCreateRateCardModal(false)}>
          <div className="p-5">
            <button type="button" onClick={() => setCreateStep('details')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              Back
            </button>
            <p className="mb-3 text-xs text-slate-400">Edit the matrix according to your changes once it's set up — pick a starting point below.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={createRateCardFromStandard}
                className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
              >
                <p className="text-sm font-semibold text-slate-800">Start with Standard_V1</p>
                <p className="mt-1 text-xs text-slate-400">Clone the original standard rate card's zone-to-zone pricing. Edit any cell from there.</p>
              </button>
              <button
                type="button"
                onClick={createRateCardFromScratch}
                className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
              >
                <p className="text-sm font-semibold text-slate-800">Start from scratch</p>
                <p className="mt-1 text-xs text-slate-400">Blank matrix — fill in every zone-to-zone rate yourself.</p>
              </button>
              <button
                type="button"
                onClick={() => setCreateStep('source-existing')}
                className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5 sm:col-span-2"
              >
                <p className="text-sm font-semibold text-slate-800">Copy from an existing rate card</p>
                <p className="mt-1 text-xs text-slate-400">
                  Reuse pricing already set up on another rate card ({rateCards.length} existing) — starts as a copy, safe to edit from there.
                </p>
              </button>
            </div>
          </div>
        </Modal>
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

      {showUpdateRateCardModal && draftMatrix && (
        <Modal title={`Update ${selectedRateCard.name} Rate Card`} onClose={closeUpdateRateCardModal}>
          <div className="space-y-3 p-4">
            <p className="text-xs text-slate-400">
              INR per kg, chargeable weight — origin (row) → destination (column). Edit any cell, then save to publish a new version.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400"></th>
                    {ZONES.map((z) => (
                      <th key={z} className="whitespace-nowrap px-1 py-2 text-center font-semibold text-slate-500">
                        {z}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ZONES.map((origin, i) => (
                    <tr key={origin} className="border-t border-slate-100">
                      <th className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-1 text-left font-semibold text-slate-600">{origin}</th>
                      {ZONES.map((dest, j) => (
                        <td key={dest} className="px-1 py-1 text-center">
                          <input
                            type="number"
                            value={draftMatrix[i][j]}
                            onChange={(e) => updateDraftCell(i, j, e.target.value)}
                            className="w-14 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-xs tabular-nums text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                {draftChanges.length === 0
                  ? 'No changes yet.'
                  : `${draftChanges.length} cell${draftChanges.length === 1 ? '' : 's'} changed from the current rate card.`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeUpdateRateCardModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRateCard}
                  disabled={draftChanges.length === 0}
                  className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Save &amp; publish new version
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showRateCardHistoryModal && (
        <Modal title="Previous rate cards" onClose={() => setShowRateCardHistoryModal(false)}>
          <div className="divide-y divide-slate-100">
            {[...rateCardHistory].reverse().map((v) => (
              <div key={v.id} className="space-y-2 px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {formatDate(v.effectiveFrom)} – {v.effectiveTo ? formatDate(v.effectiveTo) : 'Present'}
                    </span>
                    {v.effectiveTo === null && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Current</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">Updated by {v.updatedBy}</span>
                </div>
                {v.changes === null ? (
                  <p className="text-xs text-slate-400">Initial rate card — no prior version to compare against.</p>
                ) : (
                  <ul className="space-y-1">
                    {v.changes.map((c, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-medium text-slate-600">
                          {c.origin} → {c.dest}:
                        </span>
                        <span className="tabular-nums text-slate-400 line-through">₹{c.from}</span>
                        <Icon name="arrow-left" className="h-3 w-3 rotate-180 text-slate-300" />
                        <span className="tabular-nums font-semibold text-slate-800">₹{c.to}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
        </>
      )}

      {tab === 'client-pricing' && (
        <div className="space-y-6">
          <div className={`overflow-hidden ${card}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange-dark">
                  <Icon name="route" className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Region Mapping Templates</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Named, reusable region sets — pick one from "Pull existing mapping" in the New Client wizard.</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && openNewTemplate()}
                  placeholder="New template name…"
                  className="w-44 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                />
                <button
                  type="button"
                  onClick={openNewTemplate}
                  disabled={!newTemplateName.trim()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-orange px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
            </div>
            {REGION_TEMPLATES.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Icon name="route" className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-slate-700">No region mapping templates yet</p>
                <p className="text-xs text-slate-500">Name one above to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {REGION_TEMPLATES.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.regions.length} region{t.regions.length === 1 ? '' : 's'} · {t.regions.reduce((n, r) => n + r.cities.length, 0)} cities mapped
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => loadTemplateDraft(t)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                        <Icon name="edit" className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDeleteTemplate(t.id)} title="Delete template" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                        <Icon name="close" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

                <div className={`flex flex-wrap items-center justify-between gap-3 p-4 ${card}`}>
                  <div>
                    <div className="font-medium text-slate-800">{selectedPricingClient.name}</div>
                    <div className="text-xs text-slate-400">{selectedPricingClient.city}</div>
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
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Additional Charges</span>
            <div className="flex items-center gap-2">
              <HeaderButton icon="grid" label="Rules List" onClick={() => setShowRulesListModal(true)} />
              <HeaderButton icon="plus" label="Create new charge type" onClick={openNewChargeModal} variant="primary" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-400">
                <th className="w-14 px-4 py-2">Sl no</th>
                <th className="w-56 px-4 py-2">Charge</th>
                <th className="px-4 py-2">Default rule &amp; price</th>
                <th className="w-16 px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {additionalCharges.map((c, i) => (
                <tr key={c.name} className="border-t border-slate-100">
                  <td className="px-4 py-3 align-top text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 align-top font-medium text-slate-700">{c.name}</td>
                  <td className="px-4 py-3 align-top text-slate-600">{c.defaultValue}</td>
                  <td className="px-4 py-3 align-top text-right">
                    <button
                      type="button"
                      onClick={() => openEditCharge(i)}
                      className="inline-flex items-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-orange-dark"
                      aria-label={`Switch default rule — ${c.name}`}
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
            Every charge type has one default rule and price — edit a row to switch which rule it uses. Client-specific amounts are set during onboarding.
          </p>

          <div className="border-t border-slate-100 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Default ODA List</p>
            <OdaListManager
              title="Default ODA List"
              entries={defaultOdaEntries}
              onEntriesChange={updateDefaultOdaEntries}
              rate={defaultOdaRate}
              onRateChange={updateDefaultOdaRate}
              overrides={defaultOdaOverrides}
              onOverridesChange={updateDefaultOdaOverrides}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Every new client's own ODA list starts as a copy of this list — edits here don't change pincodes a client has already onboarded with.
            </p>
          </div>
        </div>
      )}

      {showRulesListModal && (
        <Modal title="Rules List" onClose={() => setShowRulesListModal(false)}>
          <div className="divide-y divide-slate-100">
            {RULES_CATALOG.map((r) => (
              <div key={r.type} className="flex flex-wrap items-start justify-between gap-2 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{r.label}</div>
                  <p className="mt-1 text-xs text-slate-500">{r.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-500">{r.formula}</span>
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            This list is fixed — new rules can't be created here. To create a new rule, contact Tech Admin.
          </p>
        </Modal>
      )}

      {showNewChargeModal && (
        <Modal title="Create new charge type" onClose={() => setShowNewChargeModal(false)}>
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
                Create
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingChargeIndex !== null && editChargeRule && (
        <Modal title={`Switch Default Rule — ${additionalCharges[editingChargeIndex].name}`} onClose={closeEditCharge}>
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
                <button
                  type="button"
                  onClick={() => setDraftRegions(buildRegionsFromStandard())}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
                >
                  <p className="text-sm font-semibold text-slate-800">Start from Standard regions</p>
                  <p className="mt-1 text-xs text-slate-400">Clone the 13 standard regions with cities pre-matched where possible. Rename, merge, split or reassign from there.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftRegions([])}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/5"
                >
                  <p className="text-sm font-semibold text-slate-800">Start from scratch</p>
                  <p className="mt-1 text-xs text-slate-400">Build regions one at a time, assigning cities exactly as negotiated.</p>
                </button>
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

import { useMemo, useState } from 'react'
import { card } from '../../components/ui.js'
import {
  TIER_DISCOUNTS, TIER_BADGE, computeEffectiveMatrix, matrixArrayToObject,
  cloneStandardCharges, zoneFromPincode, computeOrderPricing,
} from '../../data/pricing.js'
import { PAYMENT_MODES } from '../../data/orders.js'

// Standalone "what would this cost" tool — reuses the exact same pricing
// engine as Create Order's live Freight Preview (data/pricing.js), but
// against a synthetic { tier, matrix, charges } client rather than a real
// activated one, so ops/sales can quote a lane before a client even exists.

const TIERS = Object.keys(TIER_DISCOUNTS)

function clampNonNegative(v) {
  if (v === '') return v
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n < 0 ? '0' : v
}

function money(n) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function Field({ label, className = '', hint, error, ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <input
        {...props}
        className={`w-full rounded-xl border bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 ${
          error ? 'border-rose-300 focus:outline-rose-300' : 'border-slate-200 focus:outline-brand-orange/40'
        }`}
      />
      {hint && <p className={`mt-1 text-xs ${error ? 'font-medium text-rose-500' : 'text-slate-400'}`}>{hint}</p>}
    </label>
  )
}

function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

export default function FreightCalculator() {
  const [originPincode, setOriginPincode] = useState('')
  const [destPincode, setDestPincode] = useState('')
  const [tier, setTier] = useState('Silver')
  const [actualWeightKg, setActualWeightKg] = useState('')
  const [dims, setDims] = useState({ l: '', w: '', h: '', count: '1' })
  const [paymentType, setPaymentType] = useState('Prepaid')
  const [codAmount, setCodAmount] = useState('')

  const originZone = zoneFromPincode(originPincode)
  const destZone = zoneFromPincode(destPincode)

  const volumetricWeightKg = useMemo(() => {
    const l = Number(dims.l) || 0
    const w = Number(dims.w) || 0
    const h = Number(dims.h) || 0
    const count = Number(dims.count) || 0
    if (!l || !w || !h || !count) return 0
    return Math.round(((l * w * h) / 28316.85) * 6 * count * 10) / 10
  }, [dims])

  // A synthetic client shaped exactly like what data/clients.js gives every
  // real activated client — so computeOrderPricing needs no special-casing
  // for "no real client yet."
  const syntheticClient = useMemo(
    () => ({ tier, matrix: matrixArrayToObject(computeEffectiveMatrix(tier)), charges: cloneStandardCharges() }),
    [tier]
  )

  const preview = useMemo(() => {
    if (!originPincode || !destPincode || !actualWeightKg) return null
    return computeOrderPricing(syntheticClient, {
      originPincode,
      destPincode,
      actualWeightKg: Number(actualWeightKg) || 0,
      volumetricWeightKg,
      paymentType,
      codAmount: Number(codAmount) || 0,
    })
  }, [syntheticClient, originPincode, destPincode, actualWeightKg, volumetricWeightKg, paymentType, codAmount])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Freight Calculator</h1>
        <p className="mt-1 text-slate-500">Estimate freight for any lane, tier and weight — no order or client required.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className={`space-y-4 p-6 ${card}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Origin Pincode"
              value={originPincode}
              onChange={(e) => setOriginPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              hint={originZone ? `Region: ${originZone}` : originPincode.length === 6 ? 'Region not in master yet' : undefined}
              error={originPincode.length === 6 && !originZone}
              placeholder="e.g. 400001"
            />
            <Field
              label="Destination Pincode"
              value={destPincode}
              onChange={(e) => setDestPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              hint={destZone ? `Region: ${destZone}` : destPincode.length === 6 ? 'Region not in master yet' : undefined}
              error={destPincode.length === 6 && !destZone}
              placeholder="e.g. 560001"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Client Tier" value={tier} onChange={setTier} options={TIERS} />
            <SelectField label="Payment Type" value={paymentType} onChange={setPaymentType} options={PAYMENT_MODES} />
            {paymentType === 'COD' && (
              <Field label="COD Amount (₹)" type="number" min="0" value={codAmount} onChange={(e) => setCodAmount(clampNonNegative(e.target.value))} />
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <span className="mb-2 block text-xs font-medium text-slate-500">Shipment</span>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Actual Weight (kg)" type="number" min="0" value={actualWeightKg} onChange={(e) => setActualWeightKg(clampNonNegative(e.target.value))} />
              <Field label="L (cm)" type="number" min="0" value={dims.l} onChange={(e) => setDims({ ...dims, l: clampNonNegative(e.target.value) })} />
              <Field label="W (cm)" type="number" min="0" value={dims.w} onChange={(e) => setDims({ ...dims, w: clampNonNegative(e.target.value) })} />
              <Field label="H (cm)" type="number" min="0" value={dims.h} onChange={(e) => setDims({ ...dims, h: clampNonNegative(e.target.value) })} />
              <Field label="# Pkgs" type="number" min="1" value={dims.count} onChange={(e) => setDims({ ...dims, count: clampNonNegative(e.target.value) })} />
            </div>
            <p className="mt-2 text-xs text-slate-400">Volumetric weight: <span className="font-medium text-slate-600">{volumetricWeightKg || 0} kg</span> (1 CFT = 6 kg)</p>
          </div>
        </div>

        <div className={`space-y-3 p-6 ${card}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Estimate</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIER_BADGE[tier]}`}>{tier}</span>
          </div>
          {!preview ? (
            <p className="text-sm text-slate-400">Enter both pincodes and weight to see an estimate.</p>
          ) : preview.baseFreight == null ? (
            <p className="text-sm text-slate-400">One or both pincodes aren't in the region master yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="text-xs text-slate-400">{preview.originZone} → {preview.destZone}</div>
              <div className="text-slate-700">₹{preview.ratePerKg}/kg × {preview.chargeableWeightKg} kg = {money(preview.baseFreight)}</div>
              <div className="space-y-1 border-t border-slate-100 pt-2">
                {preview.appliedCharges.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs text-slate-500">
                    <span>{c.label}</span>
                    <span className="text-slate-700">{c.amount == null ? 'at actuals' : money(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>GST</span>
                  <span className="text-slate-700">{money(preview.gstAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{money(preview.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

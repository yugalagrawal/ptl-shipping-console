import { useState } from 'react'
import Icon from './Icon.jsx'
import { ZONES } from '../data/pricing.js'

// Rates, charges and weights are never negative — clamp every pricing number at entry.
function nonNegative(value) {
  return Math.max(0, Number(value) || 0)
}

function ChargeRow({ charge, onChange, onRemove, readOnly }) {
  return (
    <tr className="group border-t border-slate-100">
      <td className="px-4 py-2.5 text-sm text-slate-700">
        {charge.label}
        {charge.isWeightFloor && <span className="ml-1.5 text-[10px] text-slate-400">(billing floor, not a charge)</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400">{charge.unit}</td>
      <td className="px-4 py-2.5">
        {charge.type === 'actuals' ? (
          <span className="text-sm text-slate-500">Billed at actuals</span>
        ) : charge.type === 'max_of' ? (
          readOnly ? (
            <span className="text-sm tabular-nums text-slate-700">
              ₹{charge.options[0].value}/kg or ₹{charge.options[1].value}/AWB, whichever higher
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={charge.options[0].value}
                onChange={(e) => onChange({ ...charge, options: [{ ...charge.options[0], value: nonNegative(e.target.value) }, charge.options[1]] })}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm tabular-nums"
              />
              <span className="text-xs text-slate-400">/kg &nbsp;or&nbsp; ₹</span>
              <input
                type="number"
                min="0"
                value={charge.options[1].value}
                onChange={(e) => onChange({ ...charge, options: [charge.options[0], { ...charge.options[1], value: nonNegative(e.target.value) }] })}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm tabular-nums"
              />
              <span className="text-xs text-slate-400">/AWB, whichever higher</span>
            </div>
          )
        ) : readOnly ? (
          <span className="text-sm tabular-nums text-slate-700">
            {charge.type !== 'percent_of_freight' && charge.type !== 'percent_of_cod' && '₹'}
            {charge.value}
            {(charge.type === 'percent_of_freight' || charge.type === 'percent_of_cod') && '%'}
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            {charge.type !== 'percent_of_freight' && charge.type !== 'percent_of_cod' && <span className="text-xs text-slate-400">₹</span>}
            <input
              type="number"
              min="0"
              disabled={charge.locked}
              value={charge.value}
              onChange={(e) => onChange({ ...charge, value: nonNegative(e.target.value) })}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-400"
            />
            {(charge.type === 'percent_of_freight' || charge.type === 'percent_of_cod') && <span className="text-xs text-slate-400">%</span>}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        {!readOnly && !charge.locked && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  )
}

const NEW_CHARGE_TYPES = ['flat_per_awb', 'per_kg', 'percent_of_freight', 'percent_of_cod', 'actuals']
const NEW_CHARGE_TYPE_LABEL = {
  flat_per_awb: 'Flat ₹ / AWB',
  per_kg: '₹ / kg',
  percent_of_freight: '% of base freight',
  percent_of_cod: '% of COD amount',
  actuals: 'Billed at actuals',
}

// Plain-text rendering of one final charge for the email-preview body — a
// simplified sibling of ChargeRow's interactive cells, since an email body
// just needs the resolved value, not editable inputs.
function formatChargeForEmail(charge) {
  if (charge.type === 'actuals') return 'Billed at actuals'
  if (charge.type === 'max_of') {
    return `₹${charge.options[0].value}/kg or ₹${charge.options[1].value}/AWB, whichever higher`
  }
  const suffix = charge.type === 'percent_of_freight' || charge.type === 'percent_of_cod' ? '%' : ` ${charge.unit || ''}`.trimEnd()
  return `${charge.value}${suffix}`
}

// POC/Ops/Finance emails captured on Contact Info during onboarding
// (data/clients.js `details.contact`) — the intended recipients once a real
// send exists. Deduplicated since the same address is sometimes reused
// across roles.
function recipientEmails(client) {
  const contact = client.details?.contact
  if (!contact) return []
  return [...new Set([contact.pocEmail, contact.opsEmail, contact.financeEmail].filter(Boolean))]
}

// Sits inline in the approval panel (not behind a click) so Finance Admin
// sees exactly what goes out before approving — this is the mail drafted
// back on the client's own Pricing step during onboarding, held until this
// approval clears rather than sent then. Recipients default to every
// contact on file; unchecking one here excludes it from the actual send.
function MailPreviewCard({ client, checkedEmails, onToggleEmail }) {
  const recipients = recipientEmails(client)
  const subject = `Pricing - ${client.name}`
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon name="mail" className="h-3.5 w-3.5 shrink-0" />
        Pricing confirmation mail — sends on approval
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">Recipients</span>
        {recipients.length ? (
          <div className="space-y-1.5">
            {recipients.map((email) => (
              <label key={email} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!checkedEmails[email]}
                  onChange={() => onToggleEmail(email)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                />
                {email}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No contact emails on file for this client.</p>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <p className="text-xs">
          <span className="font-medium text-slate-400">Subject: </span>
          <span className="text-slate-700">{subject}</span>
        </p>
        <div className="mt-2 space-y-2 text-xs text-slate-600">
          <p>Hi {client.name} team,</p>
          <p>Your pricing has been approved. Final rates below:</p>
          <p className="text-slate-500">Region rate card (INR/kg, chargeable weight) — attached as approved.</p>
          {client.charges?.length > 0 && (
            <ul className="space-y-0.5">
              {client.charges.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span>{c.label}</span>
                  <span className="text-slate-400">{formatChargeForEmail(c)}</span>
                </li>
              ))}
            </ul>
          )}
          <p>Regards,<br />LetsTransport PTL Team</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Sample preview only — this prototype doesn't send real emails yet. Only the checked recipients above would receive it.
      </p>
    </div>
  )
}

export default function ClientPricingPanel({ client, onUpdate, onApprove, onRequestCorrection, readOnly }) {
  const [newChargeLabel, setNewChargeLabel] = useState('')
  const [newChargeType, setNewChargeType] = useState(NEW_CHARGE_TYPES[0])
  const [newChargeValue, setNewChargeValue] = useState('')
  const [checkedEmails, setCheckedEmails] = useState(() => Object.fromEntries(recipientEmails(client).map((e) => [e, true])))
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionComment, setCorrectionComment] = useState('')
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)

  function toggleEmail(email) {
    setCheckedEmails((prev) => ({ ...prev, [email]: !prev[email] }))
  }
  function sendCorrection() {
    if (!correctionComment.trim()) return
    onRequestCorrection(correctionComment.trim())
  }

  function updateCell(origin, dest, value) {
    onUpdate({ ...client, matrix: { ...client.matrix, [origin]: { ...client.matrix[origin], [dest]: nonNegative(value) } } })
  }
  function updateCharge(updatedCharge) {
    onUpdate({ ...client, charges: client.charges.map((c) => (c.id === updatedCharge.id ? updatedCharge : c)) })
  }
  function removeCharge(id) {
    onUpdate({ ...client, charges: client.charges.filter((c) => c.id !== id) })
  }
  function addCharge() {
    if (!newChargeLabel.trim()) return
    const charge = {
      id: `custom-${Date.now()}`,
      label: newChargeLabel.trim(),
      type: newChargeType,
      value: newChargeType === 'actuals' ? null : nonNegative(newChargeValue),
      unit: NEW_CHARGE_TYPE_LABEL[newChargeType],
      locked: false,
    }
    onUpdate({ ...client, charges: [...client.charges, charge] })
    setNewChargeLabel('')
    setNewChargeValue('')
  }

  return (
    <div className="space-y-5 border-t border-slate-100 bg-slate-50/40 p-5">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                    {readOnly ? (
                      <span className="block px-1 py-1 tabular-nums text-slate-700">{client.matrix[origin][dest]}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={client.matrix[origin][dest]}
                        onChange={(e) => updateCell(origin, dest, e.target.value)}
                        className="w-14 rounded border border-transparent px-1 py-1 text-center tabular-nums hover:border-slate-200 focus:border-brand-orange/40 focus:bg-white focus:outline-none"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">INR per kg, chargeable weight — origin (row) → destination (column).</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Additional charges</span>
        </div>
        <table className="w-full">
          <tbody>
            {client.charges.map((c) => (
              <ChargeRow key={c.id} charge={c} onChange={updateCharge} onRemove={() => removeCharge(c.id)} readOnly={readOnly} />
            ))}
          </tbody>
        </table>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3">
            <input
              type="text"
              value={newChargeLabel}
              onChange={(e) => setNewChargeLabel(e.target.value)}
              placeholder="New charge name"
              className="w-44 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400"
            />
            <select
              value={newChargeType}
              onChange={(e) => setNewChargeType(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            >
              {NEW_CHARGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {NEW_CHARGE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            {newChargeType !== 'actuals' && (
              <input
                type="number"
                min="0"
                value={newChargeValue}
                onChange={(e) => setNewChargeValue(e.target.value)}
                placeholder="Value"
                className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
              />
            )}
            <button
              type="button"
              onClick={addCharge}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Tag charge
            </button>
          </div>
        )}
      </div>

      {onApprove && (
        <div className="space-y-3">
          <MailPreviewCard client={client} checkedEmails={checkedEmails} onToggleEmail={toggleEmail} />

          {correctionOpen ? (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <label className="block text-xs font-medium text-slate-500">What needs to change?</label>
              <textarea
                value={correctionComment}
                onChange={(e) => setCorrectionComment(e.target.value)}
                rows={3}
                placeholder="e.g. FSC should be 4%, not 5% — please re-check with the client."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setCorrectionOpen(false); setCorrectionComment('') }}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!correctionComment.trim()}
                  onClick={sendCorrection}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
                >
                  Send back to Sales Executive
                </button>
              </div>
            </div>
          ) : approveConfirmOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm text-slate-600">This will be mailed to the client — are you sure you want to activate?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setApproveConfirmOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onApprove}
                  className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-orange-dark"
                >
                  Yes, activate client
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {onRequestCorrection && (
                <button
                  type="button"
                  onClick={() => setCorrectionOpen(true)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Request correction
                </button>
              )}
              <button
                type="button"
                onClick={() => setApproveConfirmOpen(true)}
                className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-orange-dark"
              >
                Approve pricing &amp; activate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { btnPrimary } from '../../components/ui.js'
import {
  PICKUP_STATUS, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE, PICKUP_TYPE,
  PICKUP_FAIL_REASONS, markPickupArrived, updatePickupFieldDetails, startPickup, failPickup, scanPackage,
  markReachedAtMiniHub, dropScanPackage,
} from '../../data/pickups.js'
import { fmtDocket } from '../../data/docketNumber.js'
import { STAGES, formatSlot } from './pickupDashboardLib.js'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40'

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input {...props} className={inputCls} />
    </label>
  )
}

function Section({ title, children }) {
  return (
    <section className="border-t border-slate-100 px-6 py-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {children}
    </section>
  )
}

function KV({ k, v, tone }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{k}</div>
      <div className={`mt-0.5 text-sm font-medium ${tone ?? 'text-slate-800'}`}>{v ?? '—'}</div>
    </div>
  )
}

function Timeline({ status }) {
  // Happy path only; Draft shows for pickups that were drafts, and a failed
  // pickup's path ends at Failed instead of continuing past Arrived.
  const happy = STAGES.filter((s) => s !== PICKUP_STATUS.DRAFT && s !== PICKUP_STATUS.FAILED)
  let steps = happy
  if (status === PICKUP_STATUS.FAILED) steps = [...happy.slice(0, happy.indexOf(PICKUP_STATUS.ARRIVED) + 1), PICKUP_STATUS.FAILED]
  if (status === PICKUP_STATUS.DRAFT) steps = [PICKUP_STATUS.DRAFT, ...happy]
  const cur = steps.indexOf(status)
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const done = i < cur
        const now = i === cur
        const bad = s === PICKUP_STATUS.FAILED
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${done ? 'border-emerald-500 bg-emerald-500' : bad ? 'border-red-500 bg-red-500' : now ? 'border-brand-orange bg-white' : 'border-slate-200 bg-white'}`}>
                {(done || bad) && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                {now && !bad && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />}
              </span>
              {i < steps.length - 1 && <span className={`h-5 w-0.5 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </div>
            <div className={`pb-3 text-sm ${bad ? 'font-semibold text-red-600' : now ? 'font-semibold text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>{PICKUP_STATUS_LABEL[s]}</div>
          </li>
        )
      })}
    </ol>
  )
}

function ScanProgress({ label, done, total, buttonLabel, icon, onClick }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium tabular-nums text-slate-800">{done}/{total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-orange transition-all" style={{ width: `${(done / total) * 100}%` }} /></div>
      <button type="button" onClick={onClick} className={btnPrimary}><Icon name={icon} className="h-4 w-4" />{buttonLabel}</button>
    </div>
  )
}

// Field workflow — Start pickup (arrived) → on-site details + docket punched
// (pickup_started) or Mark failed with a reason → package scans → reached at
// Mini Hub → drop scans.
function Actions({ p, onChanged }) {
  const [form, setForm] = useState({
    actualWeightKg: p.actualWeightKg ?? '', volumetricWeightKg: p.volumetricWeightKg ?? '', packagesCount: p.packagesCount ?? '',
    consigneeName: p.consignee?.name ?? '', consigneePhone: p.consignee?.phone ?? '', consigneeCity: p.consignee?.city ?? '', consigneePincode: p.consignee?.pincode ?? '',
  })
  const [failing, setFailing] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const ok = form.actualWeightKg && form.volumetricWeightKg && form.packagesCount && form.consigneeName
  const run = (fn) => { fn(); onChanged() }

  switch (p.status) {
    case PICKUP_STATUS.DRAFT:
    case PICKUP_STATUS.CREATED:
      return <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{p.status === PICKUP_STATUS.DRAFT ? 'Still editable — locks into the PRS pool 3 hours before the slot.' : 'Not yet assigned — batch this into a run sheet in PRS.'}</p>
    case PICKUP_STATUS.ASSIGNED:
      return <button type="button" onClick={() => run(() => markPickupArrived(p.id))} className={btnPrimary}><Icon name="approve" className="h-4 w-4" />Arrived — start pickup</button>
    case PICKUP_STATUS.ARRIVED:
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Actual kg" type="number" min="0" value={form.actualWeightKg} onChange={(e) => set('actualWeightKg', e.target.value)} />
            <Field label="Volumetric kg" type="number" min="0" value={form.volumetricWeightKg} onChange={(e) => set('volumetricWeightKg', e.target.value)} />
            <Field label="# Packages" type="number" min="0" value={form.packagesCount} onChange={(e) => set('packagesCount', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Consignee name" value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} />
            <Field label="Consignee phone" value={form.consigneePhone} onChange={(e) => set('consigneePhone', e.target.value)} />
            <Field label="Consignee city" value={form.consigneeCity} onChange={(e) => set('consigneeCity', e.target.value)} />
            <Field label="Consignee pincode" value={form.consigneePincode} onChange={(e) => set('consigneePincode', e.target.value)} />
          </div>
          <button
            type="button"
            disabled={!ok}
            onClick={() => run(() => {
              updatePickupFieldDetails(p.id, {
                actualWeightKg: form.actualWeightKg, volumetricWeightKg: form.volumetricWeightKg, packagesCount: form.packagesCount,
                consignee: { name: form.consigneeName, phone: form.consigneePhone, city: form.consigneeCity, pincode: form.consigneePincode },
              })
              startPickup(p.id)
            })}
            className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
          >Punch docket &amp; start pickup</button>

          <div className="border-t border-slate-100 pt-4">
            {!failing ? (
              <button type="button" onClick={() => setFailing(true)} className="text-[13px] font-medium text-red-600 hover:underline">Can&apos;t pick up? Mark as failed</button>
            ) : (
              <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/40 p-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Why did the pickup fail?</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
                    <option value="">Select a reason…</option>
                    {PICKUP_FAIL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <Field label={reason === 'Other' ? 'Details (required)' : 'Note (optional)'} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" disabled={!reason || (reason === 'Other' && !note.trim())} onClick={() => run(() => failPickup(p.id, { reason, note }))}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">Mark pickup failed</button>
                  <button type="button" onClick={() => setFailing(false)} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    case PICKUP_STATUS.STARTED:
    case PICKUP_STATUS.IN_PROGRESS:
      return <ScanProgress label="Package scan" done={p.scannedCount} total={p.packagesCount} icon="plus" buttonLabel={`Scan package ${p.scannedCount + 1} of ${p.packagesCount}`} onClick={() => run(() => scanPackage(p.id))} />
    case PICKUP_STATUS.COMPLETED:
      return <button type="button" onClick={() => run(() => markReachedAtMiniHub(p.id))} className={btnPrimary}><Icon name="warehouse" className="h-4 w-4" />Reached at Mini Hub</button>
    case PICKUP_STATUS.AT_HUB:
      return <ScanProgress label="Drop scan at hub" done={p.droppedCount ?? 0} total={p.packagesCount} icon="warehouse" buttonLabel={`Drop scan ${(p.droppedCount ?? 0) + 1} of ${p.packagesCount}`} onClick={() => run(() => dropScanPackage(p.id))} />
    case PICKUP_STATUS.FAILED:
      return (
        <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
          <div className="text-xs font-medium text-red-500">Pickup failed</div>
          <div className="mt-0.5 text-sm font-semibold text-red-700">{p.failure?.reason ?? 'No reason recorded'}</div>
          {p.failure?.note && <div className="mt-1 text-sm text-slate-600">{p.failure.note}</div>}
        </div>
      )
    default:
      return <p className="text-xs font-medium text-emerald-600">All parcels dropped at {p.dropMiniHubName} — docket is in Docket Module › Create Docket › Pending Dockets.</p>
  }
}

export default function PickupDrawer({ pickup: p, onClose, onChanged }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const dests = p.details?.destinations ?? []
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">{p.id}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PICKUP_STATUS_BADGE[p.status]}`}>{PICKUP_STATUS_LABEL[p.status]}</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">{p.clientName} · {p.type === PICKUP_TYPE.RECURRING ? 'Recurring' : 'One-time'} pickup</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.overdue && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Overdue slot</span>}
              {p.urgent && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">Urgent booking</span>}
              {p.hazardous && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Hazardous</span>}
              {p.fragile && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Fragile</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section title="Next step"><Actions key={`${p.id}-${p.status}-${p.packagesCount}`} p={p} onChanged={onChanged} /></Section>

          <Section title="Progress"><Timeline status={p.status} /></Section>

          <Section title="Pickup">
            <div className="grid grid-cols-2 gap-4">
              <KV k="Consignor" v={p.consignor.name} />
              <KV k="Scheduled" v={formatSlot(p)} tone={p.overdue ? 'text-red-600' : undefined} />
              <div className="col-span-2">
                <KV k="Address" v={`${p.consignor.address}, ${p.consignor.city} ${p.consignor.pincode}`} />
              </div>
              <KV k="Contact" v={p.consignor.phone} />
              <KV k="Email" v={p.consignor.email} />
            </div>
          </Section>

          <Section title="Route">
            <div className="grid grid-cols-2 gap-4">
              <KV k="Drop Mini Hub" v={p.dropMiniHubName} />
              <KV k="Run sheet" v={p.prsId} />
              <KV k="Vehicle" v={p.vehicle} />
              <KV k="Driver" v={p.driver} />
            </div>
          </Section>

          <Section title="Shipment">
            <div className="grid grid-cols-3 gap-4">
              <KV k="Est. weight" v={`${p.estWeightKg} kg`} />
              <KV k="Actual weight" v={p.actualWeightKg ? `${p.actualWeightKg} kg` : null} />
              <KV k="Volumetric" v={p.volumetricWeightKg ? `${p.volumetricWeightKg} kg` : null} />
              <KV k="Packages" v={p.packagesCount ? `${p.scannedCount}/${p.packagesCount} scanned` : null} />
              <KV k="vs estimate" v={p.variancePct == null ? null : `${p.variancePct > 0 ? '+' : ''}${p.variancePct}%`} tone={p.variancePct != null && Math.abs(p.variancePct) > 10 ? 'text-amber-600' : undefined} />
              <KV k="Content" v={p.details?.contentType} />
            </div>
            {p.hazardous && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{p.details.hazardClass} · {p.details.unNumber}</div>
            )}
          </Section>

          {(dests.length > 0 || p.consignee) && (
            <Section title={`Consignees (${dests.length || 1})`}>
              <ul className="space-y-2">
                {(dests.length ? dests : [{ consignee: p.consignee }]).map((d, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{d.consignee.name}</div>
                      <div className="text-xs text-slate-400">{d.consignee.city}{d.consignee.pincode ? ` · ${d.consignee.pincode}` : ''}</div>
                    </div>
                    {d.boxes != null && <div className="text-right text-xs text-slate-500">{d.boxes} boxes<br />{d.kg} kg</div>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {p.docketNumber && (
            <Section title="Docket & AWBs">
              <div className="text-sm font-medium text-slate-800">Docket {fmtDocket(p.docketNumber)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.awbNumbers.map((a) => <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{a}</span>)}
              </div>
            </Section>
          )}
        </div>
      </aside>
    </div>
  )
}

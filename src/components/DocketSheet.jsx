import { pill } from './ui.js'
import { DOCKET_STATUS_LABEL, DOCKET_STATUS_BADGE, MODE_LABEL, DELIVERY_TYPE_LABEL, PAYMENT_TERM_LABEL, POD_TYPE_LABEL } from '../data/dockets.js'

// The physical docket sheet itself — brand header + big docket-number
// block, an info strip, consignee/packages panels side by side, signature
// footer. Pure presentation, no modal chrome, no Print button — so it can
// be embedded two ways: wrapped in DocketSheetModal.jsx (view an existing
// docket, Docket Dashboard) or inline as a live-updating preview next to
// the form that's still filling it in (Create Docket) — same component
// either way, not two drifting copies. The Mode/E-way Bill/Payment/POD
// panel only renders when those fields are present — the two original
// seed dockets predate this field set and still render exactly as before.
export default function DocketSheet({ docket }) {
  const hasDetailedFields = docket.mode != null
  return (
    <div className="mx-auto max-w-2xl border border-slate-400 bg-white">
      <div className="flex items-stretch justify-between border-b-2 border-slate-900">
        <div className="p-4">
          <div className="text-lg font-extrabold tracking-tight text-brand-orange-dark">LETSTRANSPORT</div>
          <div className="mt-0.5 text-[11px] text-slate-500">Part Truck Load Network — Consignment Docket</div>
        </div>
        <div className="min-w-[220px] border-l-2 border-slate-900 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Docket No.</div>
          <div className="text-2xl font-extrabold tabular-nums">{docket.docketNumber}</div>
          <div className="mt-1.5 flex h-6 items-end justify-center gap-px">
            {String(docket.docketNumber).replace(/\D/g, '').split('').map((d, i) => (
              <div key={i} className="bg-slate-900" style={{ width: `${2 + (Number(d) % 4)}px`, height: '100%' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 divide-x divide-slate-200 border-b border-slate-300">
        {[
          ['Status', <span key="s" className={`${pill} ${DOCKET_STATUS_BADGE[docket.status]}`}>{DOCKET_STATUS_LABEL[docket.status]}</span>],
          ['Client', docket.clientName],
          ['Pickup ID', docket.pickupId],
          ['Drop Mini Hub', docket.dropMiniHubName],
          ['Raised', docket.createdAt],
        ].map(([label, value]) => (
          <div key={label} className="p-2.5">
            <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 text-[13px] font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {hasDetailedFields && (
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-300 bg-slate-50/60">
          {[
            ['Mode', MODE_LABEL[docket.mode]],
            ['Payment', PAYMENT_TERM_LABEL[docket.paymentTerm] ?? '—'],
            ['POD type', POD_TYPE_LABEL[docket.podType] ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="p-2.5">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-0.5 text-[13px] font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="border-b border-slate-200 p-4">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consignee</h4>
          {docket.consignee?.name ? (
            <div className="text-xs text-slate-700">
              <p className="font-medium">{docket.consignee.name}</p>
              <p className="mt-0.5 text-slate-500">{docket.consignee.city || '—'} {docket.consignee.pincode ? `· ${docket.consignee.pincode}` : ''}</p>
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">Not filled in yet.</p>
          )}
        </div>
        <div className="border-b border-slate-200 p-4">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Packages ({docket.awbCount || 0}) · {docket.totalWeightKg || 0} kg total</h4>
          {docket.awbNumbers?.length ? (
            <table className="w-full text-xs">
              <thead><tr className="text-[9px] uppercase text-slate-400"><th className="text-left font-medium">#</th><th className="text-left font-medium">Pack ID</th></tr></thead>
              <tbody>
                {docket.awbNumbers.map((awb, i) => (
                  <tr key={awb} className="border-t border-slate-100">
                    <td className="py-1 pr-2">{i + 1}</td>
                    <td className="py-1 pr-2 font-mono tabular-nums">{awb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs italic text-slate-400">Not filled in yet.</p>
          )}
        </div>
      </div>

      {hasDetailedFields && (
        <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200">
          <div className="p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">E-Way Bill / Vehicle</h4>
            <div className="space-y-0.5 text-xs text-slate-700">
              <p>{docket.ewayBillNo || 'Not applicable to this move'}{docket.ewayUnverified && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Not verified</span>}</p>
              {docket.vehicleNo && <p className="text-slate-500">Vehicle {docket.vehicleNo}{docket.transporterGstin ? ` · ${docket.transporterGstin}` : ''}</p>}
            </div>
          </div>
          <div className="p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Charges</h4>
            <p className="text-xs text-slate-700">Total <span className="font-semibold">₹{docket.pricing?.total?.toLocaleString('en-IN') ?? '—'}</span> <span className="text-slate-400">(incl. GST)</span></p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-4 pt-8">
          <div className="border-t border-slate-900 pt-1.5 text-[11px] text-slate-500">Booked by</div>
        </div>
        <div className="p-4 pt-8">
          <div className="border-t border-slate-900 pt-1.5 text-[11px] text-slate-500">Received by</div>
        </div>
      </div>
    </div>
  )
}

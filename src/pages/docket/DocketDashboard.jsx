import { Fragment, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import DocketSheetModal from '../../components/DocketSheetModal.jsx'
import { card, thCls, tdCls, rowCls, pill, btnPrimary, btnSecondary } from '../../components/ui.js'
import { DOCKETS_SEED, DOCKET_STATUS, DOCKET_STATUS_LABEL, DOCKET_STATUS_BADGE, markDocketReadyForTrip } from '../../data/dockets.js'

// Docket Dashboard — every docket raised so far, whichever pickup it came
// from and however far ops got through that pickup's scan before raising
// it (see scanPackage, data/pickups.js, and Create Docket's fast-track for
// stuck pickups). "Docket Ready for Trip" is the hand-off point to route
// planning (not built yet). Folded in from the old standalone "My Dockets"
// page — Docket Module's nav is just Create Docket + Docket Dashboard now,
// this IS the tracking view, not a separate one.
export default function DocketDashboard() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const [tab, setTab] = useState('pending')
  const [expandedDocket, setExpandedDocket] = useState(null)
  const [viewingDocket, setViewingDocket] = useState(null)

  const pending = DOCKETS_SEED.filter((d) => d.status === DOCKET_STATUS.PENDING)
  const ready = DOCKETS_SEED.filter((d) => d.status === DOCKET_STATUS.READY_FOR_TRIP)
  const rows = tab === 'pending' ? pending : ready

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Docket Dashboard</h1>
        <p className="mt-1 text-slate-500">Every docket raised so far — from a pickup's final scan, wherever that happened.</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm sm:w-fit">
        <button type="button" onClick={() => setTab('pending')} className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'pending' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
          Pending Dockets <span className="text-slate-400">({pending.length})</span>
        </button>
        <button type="button" onClick={() => setTab('ready')} className={`rounded-lg px-4 py-2 font-medium transition-colors ${tab === 'ready' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}>
          Ready for Trip <span className="text-slate-400">({ready.length})</span>
        </button>
      </div>

      <div className={`overflow-hidden ${card}`}>
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            {tab === 'pending' ? 'Nothing pending — dockets show up here as pickups finish their final scan.' : 'No dockets marked Ready for Trip yet.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Docket No.</th>
                <th className={thCls}>Pickup ID</th>
                <th className={thCls}>Client</th>
                <th className={thCls}>Drop Mini Hub</th>
                <th className={thCls}>AWBs</th>
                <th className={thCls}>Weight</th>
                <th className={thCls}>Status</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const isOpen = expandedDocket === d.docketNumber
                return (
                  <Fragment key={d.docketNumber}>
                    <tr className={`${rowCls} cursor-pointer`} onClick={() => setExpandedDocket(isOpen ? null : d.docketNumber)}>
                      <td className={`${tdCls} font-medium text-slate-800`}>{d.docketNumber}</td>
                      <td className={tdCls}>{d.pickupId}</td>
                      <td className={tdCls}>{d.clientName}</td>
                      <td className={tdCls}>{d.dropMiniHubName}</td>
                      <td className={tdCls}>{d.awbCount}</td>
                      <td className={tdCls}>{d.totalWeightKg} kg</td>
                      <td className={tdCls}>
                        <span className={`${pill} ${DOCKET_STATUS_BADGE[d.status]}`}>{DOCKET_STATUS_LABEL[d.status]}</span>
                      </td>
                      <td className={tdCls}>
                        <Icon name="chevron" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={8} className="space-y-3 px-6 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {d.awbNumbers.map((awb) => (
                              <span key={awb} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-soft">{awb}</span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setViewingDocket(d) }}
                              className={btnSecondary}
                            >
                              <Icon name="invoice" className="h-4 w-4" />
                              View / Print
                            </button>
                            {d.status === DOCKET_STATUS.PENDING && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); markDocketReadyForTrip(d.docketNumber); refresh() }}
                                className={btnPrimary}
                              >
                                <Icon name="approve" className="h-4 w-4" />
                                Docket Ready for Trip
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewingDocket && <DocketSheetModal docket={viewingDocket} onClose={() => setViewingDocket(null)} />}
    </div>
  )
}

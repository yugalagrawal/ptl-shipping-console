import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { card, btnPrimary, btnSecondary, pill } from '../../components/ui.js'
import { TRIP_STATUS, TRIP_STATUS_LABEL, TRIP_STATUS_BADGE, initTripsSeed, markDelivered, departTrip, reportException } from '../../data/trips.js'

function ExceptionForm({ onSubmit, onCancel }) {
  const [note, setNote] = useState('')
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Hub hold-up, 2hr delay expected"
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-brand-orange/40"
      />
      <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      <button
        type="button"
        onClick={() => note.trim() && onSubmit(note.trim())}
        disabled={!note.trim()}
        className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Log
      </button>
    </div>
  )
}

export default function Tracking() {
  const [tripsSeed] = useState(() => initTripsSeed())
  const [tick, setTick] = useState(0)
  const [loggingFor, setLoggingFor] = useState(null)

  const activeTrips = useMemo(
    () => tripsSeed.filter((t) => t.status === TRIP_STATUS.SCHEDULED || t.status === TRIP_STATUS.IN_TRANSIT),
    [tripsSeed, tick]
  )

  function handleDepart(id) {
    departTrip(id)
    setTick((t) => t + 1)
  }
  function handleDeliver(id) {
    markDelivered(id)
    setTick((t) => t + 1)
  }
  function handleException(id, note) {
    reportException(id, note)
    setLoggingFor(null)
    setTick((t) => t + 1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Trip Tracking</h1>
        <p className="mt-1 text-slate-500">Every trip on the road right now — status, ETA and exceptions.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Active Trips</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{activeTrips.length}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">In Transit</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{activeTrips.filter((t) => t.status === TRIP_STATUS.IN_TRANSIT).length}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-slate-400">Scheduled</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">{activeTrips.filter((t) => t.status === TRIP_STATUS.SCHEDULED).length}</div>
        </div>
        <div className={`p-4 ${card}`}>
          <div className="text-[11px] font-medium text-rose-500">Open Exceptions</div>
          <div className="mt-1.5 text-xl font-semibold text-rose-600">{activeTrips.reduce((sum, t) => sum + t.exceptions.length, 0)}</div>
        </div>
      </div>

      <div className="space-y-4">
        {activeTrips.map((trip) => (
          <div key={trip.id} className={`p-5 ${card}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{trip.id}</span>
                  <span className={`${pill} ${TRIP_STATUS_BADGE[trip.status]}`}>{TRIP_STATUS_LABEL[trip.status]}</span>
                  {trip.exceptions.length > 0 && (
                    <span className={`${pill} bg-rose-50 text-rose-600`}>{trip.exceptions.length} exception{trip.exceptions.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-slate-600">{trip.lane}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {trip.vehicle.regNo} · {trip.vehicle.type} · {trip.vehicle.driverName} · {trip.awbCount} AWBs · {trip.weightKg.toLocaleString('en-IN')} kg
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {trip.departedAt ? `Departed ${trip.departedAt}` : 'Not yet departed'} · ETA {trip.eta}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {trip.status === TRIP_STATUS.SCHEDULED && (
                  <button type="button" onClick={() => handleDepart(trip.id)} className={btnSecondary}>Mark Departed</button>
                )}
                <button type="button" onClick={() => setLoggingFor(loggingFor === trip.id ? null : trip.id)} className={btnSecondary}>Report Exception</button>
                {trip.status === TRIP_STATUS.IN_TRANSIT && (
                  <button type="button" onClick={() => handleDeliver(trip.id)} className={btnPrimary}>Mark Delivered</button>
                )}
              </div>
            </div>

            {trip.exceptions.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {trip.exceptions.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-rose-600">
                    <Icon name="flag" className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{e.note} <span className="text-slate-400">— {e.loggedAt}</span></span>
                  </div>
                ))}
              </div>
            )}

            {loggingFor === trip.id && (
              <div className="mt-3">
                <ExceptionForm onSubmit={(note) => handleException(trip.id, note)} onCancel={() => setLoggingFor(null)} />
              </div>
            )}
          </div>
        ))}
        {activeTrips.length === 0 && (
          <div className={`p-10 text-center text-sm text-slate-400 ${card}`}>No trips on the road right now.</div>
        )}
      </div>
    </div>
  )
}

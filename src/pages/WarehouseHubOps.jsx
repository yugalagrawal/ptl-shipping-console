import { useMemo, useState } from 'react'
import { card, thCls, tdCls, rowCls, pill, btnPrimary } from '../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../data/clients.js'
import { ORDERS_SEED, initOrdersSeed } from '../data/orders.js'
import { SCAN_EVENT_TYPES, HUBS, initScanEventsSeed, recordScan, hubFloorSummary } from '../data/warehouse.js'
import { useAuth } from '../context/AuthContext.jsx'

const EVENT_BADGE = {
  Inward: 'bg-sky-50 text-sky-700',
  Sorted: 'bg-amber-50 text-amber-700',
  'Loaded on Vehicle': 'bg-emerald-50 text-emerald-700',
  Outward: 'bg-slate-100 text-slate-600',
}

export default function WarehouseHubOps() {
  const { user } = useAuth()
  const [ordersSeed] = useState(() => initOrdersSeed(ACTIVE_CLIENTS_SEED))
  const [scansSeed] = useState(() => initScanEventsSeed(ordersSeed))
  const [tick, setTick] = useState(0)

  const [awbId, setAwbId] = useState('')
  const [hub, setHub] = useState(HUBS[0])
  const [eventType, setEventType] = useState(SCAN_EVENT_TYPES[0])
  const [search, setSearch] = useState('')

  const floorSummary = useMemo(() => hubFloorSummary(scansSeed), [scansSeed, ordersSeed, tick])

  const filteredScans = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = [...scansSeed].sort((a, b) => (a.id < b.id ? 1 : -1))
    if (!q) return rows
    return rows.filter((s) => s.awbId.toLowerCase().includes(q) || s.hub.toLowerCase().includes(q))
  }, [scansSeed, search, tick])

  function handleScan() {
    const trimmed = awbId.trim()
    if (!trimmed) return
    recordScan({ awbId: trimmed, hub, eventType, scannedBy: user?.name ?? 'Unknown' })
    setAwbId('')
    setTick((t) => t + 1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Warehouse & Hub Ops</h1>
        <p className="mt-1 text-slate-500">Barcode/QR scan events and what's currently on the floor at each hub.</p>
      </div>

      <div className={`space-y-4 p-6 ${card}`}>
        <h2 className="text-sm font-semibold text-slate-900">Record a scan</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">AWB Number</span>
            <input
              value={awbId}
              onChange={(e) => setAwbId(e.target.value.toUpperCase())}
              placeholder="e.g. AWB26071042"
              list="known-awbs"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
            />
            <datalist id="known-awbs">
              {ordersSeed.map((o) => <option key={o.id} value={o.id} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Hub</span>
            <select value={hub} onChange={(e) => setHub(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40">
              {HUBS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Event Type</span>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40">
              {SCAN_EVENT_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={handleScan} disabled={!awbId.trim()} className={`w-full ${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>
              Record Scan
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">On the floor, by hub</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {floorSummary.map((h) => (
            <div key={h.hub} className={`p-4 ${card}`}>
              <div className="text-[11px] font-medium text-slate-400">{h.hub}</div>
              <div className="mt-1.5 text-xl font-semibold text-slate-900">{h.count}</div>
              <div className="text-xs text-slate-400">AWB{h.count === 1 ? '' : 's'} awaiting load-out</div>
            </div>
          ))}
          {floorSummary.length === 0 && (
            <div className={`p-4 text-sm text-slate-400 ${card}`}>Nothing on the floor right now.</div>
          )}
        </div>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Scan log</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search AWB or hub…"
            className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>AWB</th>
                <th className={thCls}>Hub</th>
                <th className={thCls}>Event</th>
                <th className={thCls}>Timestamp</th>
                <th className={thCls}>Scanned By</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((s) => (
                <tr key={s.id} className={rowCls}>
                  <td className={`${tdCls} font-medium text-slate-800`}>{s.awbId}</td>
                  <td className={tdCls}>{s.hub}</td>
                  <td className={tdCls}><span className={`${pill} ${EVENT_BADGE[s.eventType]}`}>{s.eventType}</span></td>
                  <td className={tdCls}>{s.timestamp}</td>
                  <td className={tdCls}>{s.scannedBy}</td>
                </tr>
              ))}
              {filteredScans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">No scan events match this search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

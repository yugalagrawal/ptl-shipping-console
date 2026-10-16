import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import DocketSheetModal from '../../components/DocketSheetModal.jsx'
import Pagination, { usePagination } from '../../components/Pagination.jsx'
import { card, thCls, tdCls, rowCls, btnPrimary, btnSecondary } from '../../components/ui.js'
import { exportCSV } from '../../utils/exportTable.js'
import {
  DOCKETS_SEED, DOCKET_STATUS, DOCKET_STATUS_LABEL, DOCKET_STATUS_BADGE, DOCKET_LIFECYCLE, EXCEPTION_TYPES, PAYMENT_TERM_LABEL,
  markDocketReadyForTrip, raiseDocketException, resolveDocketException,
} from '../../data/dockets.js'
import { listEwayBills } from '../../data/ewayBills.js'
import { fmtDocket } from '../../data/docketNumber.js'
import { packagesOfDocket } from '../../data/packageSeries.js'
import DocketLabelsPanel from '../../components/DocketLabelsPanel.jsx'

const HOUR = 3600 * 1000
const EWB_THRESHOLD = 50000
const th = thCls.replace('px-6', 'px-3')
const td = tdCls.replace('px-6', 'px-3')
const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline focus:outline-2 focus:outline-brand-orange/40'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// "in 3 h" / "2 d late" — the delivery promise, red once it's slipped.
function eddInfo(d, now) {
  if (d.status === DOCKET_STATUS.DELIVERED) return { label: '—', late: false }
  const diff = d.edd - now
  const abs = Math.abs(diff)
  const txt = abs < 24 * HOUR ? `${Math.max(1, Math.round(abs / HOUR))} h` : `${Math.round(abs / (24 * HOUR))} d`
  return diff < 0 ? { label: `${txt} late`, late: true } : { label: `in ${txt}`, late: false }
}

// Deriving e-way bill state from the register instead of storing it on the
// docket keeps the two modules from drifting apart.
function ewayInfo(d, bills) {
  const bill = bills.find((b) => !b.cancelled && (b.docketNumber === d.docketNumber || (b.pickupId === d.pickupId && b.consignee.city === d.consignee?.city)))
  if (bill) return { kind: 'has', bill }
  return Number(d.invoiceValue) > EWB_THRESHOLD ? { kind: 'needed' } : { kind: 'na' }
}

function StatusBadge({ status }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DOCKET_STATUS_BADGE[status]}`}>{DOCKET_STATUS_LABEL[status]}</span>
}

function Select({ value, onChange, children, className = '' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} py-1.5 pr-8 ${value ? 'border-brand-orange/60 text-brand-orange-dark' : ''} ${className}`}>
      {children}
    </select>
  )
}

// ───────────────────────────── Detail drawer ─────────────────────────────
function DocketDrawer({ docket, bills, onClose, onChanged, onPrint }) {
  const [exOpen, setExOpen] = useState(false)
  const [exType, setExType] = useState(EXCEPTION_TYPES[0])
  const [exNote, setExNote] = useState('')
  const [resolveNote, setResolveNote] = useState('')
  const now = Date.now()
  const edd = eddInfo(docket, now)
  const ewb = ewayInfo(docket, bills)
  const liveStatus = docket.status === DOCKET_STATUS.EXCEPTION ? docket.exception?.previousStatus : docket.status
  const stepIdx = DOCKET_LIFECYCLE.indexOf(liveStatus)
  const canRaise = docket.status !== DOCKET_STATUS.EXCEPTION && docket.status !== DOCKET_STATUS.DELIVERED

  const rows = [
    ['Pickup', docket.pickupId],
    ['Route', `${docket.originCity || '—'} → ${docket.consignee?.city || '—'}`],
    ['Drop Mini Hub', docket.dropMiniHubName],
    ['Packages', `${docket.awbCount}`],
    ['Weight', `${docket.totalWeightKg} kg`],
    ['Payment', PAYMENT_TERM_LABEL[docket.paymentTerm] ?? '—'],
    ['Invoice value', docket.invoiceValue ? inr(docket.invoiceValue) : '—'],
    ['Trip', docket.tripId ?? '—'],
    ['Delivery by', docket.status === DOCKET_STATUS.DELIVERED ? 'Delivered' : `${when(docket.edd)} (${edd.label})`],
  ]

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-white shadow-soft">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs text-slate-400">Docket</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight text-slate-900">{fmtDocket(docket.docketNumber)}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusBadge status={docket.status} />
              <span className="text-xs text-slate-400">{docket.clientName}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {docket.status === DOCKET_STATUS.EXCEPTION && docket.exception && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
              <p className="text-sm font-semibold text-rose-700">{docket.exception.type}</p>
              {docket.exception.note && <p className="mt-0.5 text-xs text-rose-600">{docket.exception.note}</p>}
              <div className="mt-3 flex gap-2">
                <input className={`${inputCls} flex-1 py-1.5 text-xs`} placeholder="Resolution note (optional)" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} />
                <button type="button" onClick={() => { resolveDocketException(docket.docketNumber, resolveNote); onChanged() }} className={`${btnPrimary} !px-3 !py-1.5 text-xs`}>Resolve</button>
              </div>
            </div>
          )}

          <ol className="flex items-start">
            {DOCKET_LIFECYCLE.map((s, i) => {
              const done = i <= stepIdx
              return (
                <li key={s} className="relative flex flex-1 flex-col items-center text-center">
                  {i > 0 && <span className={`absolute left-[-50%] top-[7px] h-0.5 w-full ${i <= stepIdx ? 'bg-brand-orange' : 'bg-slate-200'}`} />}
                  <span className={`relative z-10 h-4 w-4 rounded-full border-2 ${done ? 'border-brand-orange bg-brand-orange' : 'border-slate-300 bg-white'} ${i === stepIdx ? 'ring-4 ring-brand-orange/20' : ''}`} />
                  <span className={`mt-1.5 px-0.5 text-[10px] leading-tight ${done ? 'font-medium text-slate-700' : 'text-slate-400'}`}>{DOCKET_STATUS_LABEL[s].replace('At Destination Hub', 'At Dest. Hub')}</span>
                </li>
              )
            })}
          </ol>

          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consignee</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{docket.consignee?.name || '—'}</p>
            <p className="text-xs text-slate-500">{[docket.consignee?.city, docket.consignee?.pincode].filter(Boolean).join(' · ')}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-slate-400">{k}</dt>
                <dd className={`text-sm ${k === 'Delivery by' && edd.late ? 'font-medium text-rose-600' : 'text-slate-800'}`}>{v}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">E-way bill</p>
              {ewb.kind === 'has' && <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-800">{ewb.bill.ewayBillNo}</p>}
              {ewb.kind === 'needed' && <p className="mt-0.5 text-sm text-amber-700">Needed — invoice above ₹50,000</p>}
              {ewb.kind === 'na' && <p className="mt-0.5 text-sm text-slate-500">Not required</p>}
            </div>
            {ewb.kind !== 'na' && (
              <Link to="/docket-module/eway-bill" className="text-xs font-medium text-brand-orange-dark hover:underline">
                {ewb.kind === 'has' ? 'Open console' : 'Generate'}
              </Link>
            )}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Packages ({docket.awbNumbers.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {docket.awbNumbers.map((a) => <span key={a} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] tabular-nums text-slate-600">{a}</span>)}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">History</p>
            <ol className="space-y-2.5 border-l border-slate-200 pl-4">
              {[...(docket.history ?? [])].reverse().map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300" />
                  <p className="font-medium text-slate-700">{h.label}</p>
                  <p className="text-xs text-slate-400">{when(h.at)}{h.note ? ` · ${h.note}` : ''}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 px-5 py-4">
          {exOpen && canRaise && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <select className={`${inputCls} w-full py-1.5 text-xs`} value={exType} onChange={(e) => setExType(e.target.value)}>
                {EXCEPTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input className={`${inputCls} w-full py-1.5 text-xs`} placeholder="Note (optional)" value={exNote} onChange={(e) => setExNote(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setExOpen(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="button" onClick={() => { raiseDocketException(docket.docketNumber, { type: exType, note: exNote }); setExOpen(false); setExNote(''); onChanged() }} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">Raise exception</button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onPrint} className={btnSecondary}>
              <Icon name="invoice" className="h-4 w-4" />
              View / Print
            </button>
            {docket.status === DOCKET_STATUS.PENDING && (
              <button type="button" onClick={() => { markDocketReadyForTrip(docket.docketNumber); onChanged() }} className={btnPrimary}>
                <Icon name="approve" className="h-4 w-4" />
                Ready for Trip
              </button>
            )}
            {canRaise && !exOpen && (
              <button type="button" onClick={() => setExOpen(true)} className={`${btnSecondary} ml-auto hover:!text-rose-600`}>
                <Icon name="flag" className="h-4 w-4" />
                Raise exception
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

// ───────────────────────────── Page ─────────────────────────────
const DATE_RANGES = [
  ['', 'Any time'],
  ['1', 'Last 24 hours'],
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
]
const SORTS = [
  ['new', 'Newest first'],
  ['old', 'Oldest first'],
  ['edd', 'Delivery date'],
  ['wt', 'Heaviest first'],
]

// A docket is waiting on labels until every package has one (system-printed or pre-printed stock).
const labelsOf = (d) => packagesOfDocket(d.docketNumber).length

export default function DocketDashboard() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const [params] = useSearchParams()
  const landed = params.get('docket') ?? '' // arriving from Create Docket lands on that docket
  const all = DOCKETS_SEED
  const pendingLabel = (d) => labelsOf(d) < (Number(d.awbCount) || 1)
  const [tab, setTab] = useState(() => {
    const d = landed && all.find((x) => x.docketNumber === landed)
    return d && pendingLabel(d) ? 'labels' : 'active'
  })
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState(landed)
  const [more, setMore] = useState(false)
  const [flag, setFlag] = useState('') // '' | 'delayed' | 'aged' | 'ewb'
  const [client, setClient] = useState('')
  const [hub, setHub] = useState('')
  const [pay, setPay] = useState('')
  const [range, setRange] = useState('')
  const [sort, setSort] = useState('new')
  const [selected, setSelected] = useState(() => new Set())
  const [openNo, setOpenNo] = useState(null)
  const [printing, setPrinting] = useState(null)
  const [labelFor, setLabelFor] = useState(null)

  const now = Date.now()
  const bills = listEwayBills()
  const open = all.find((d) => d.docketNumber === openNo) ?? null

  const isDelayed = (d) => d.status !== DOCKET_STATUS.DELIVERED && d.edd < now
  const isAged = (d) => d.status === DOCKET_STATUS.PENDING && now - d.createdTs > 24 * HOUR
  const needsEwb = (d) => d.status !== DOCKET_STATUS.DELIVERED && ewayInfo(d, bills).kind === 'needed'
  const clients = [...new Set(all.map((d) => d.clientName))].sort()
  const hubs = [...new Set(all.map((d) => d.dropMiniHubName).filter(Boolean))].sort()

  const waiting = all.filter(pendingLabel)
  const active = all.filter((d) => !pendingLabel(d))
  const pool = tab === 'labels' ? waiting : active

  const q = query.trim().toLowerCase()
  const rows = useMemo(() => {
    const list = pool.filter((d) => {
      if (tab === 'active' && status !== 'all' && d.status !== status) return false
      if (flag === 'delayed' && !isDelayed(d)) return false
      if (flag === 'aged' && !isAged(d)) return false
      if (flag === 'ewb' && !needsEwb(d)) return false
      if (client && d.clientName !== client) return false
      if (hub && d.dropMiniHubName !== hub) return false
      if (pay && d.paymentTerm !== pay) return false
      if (range && now - d.createdTs > Number(range) * 24 * HOUR) return false
      if (!q) return true
      return [d.docketNumber, d.pickupId, d.clientName, d.consignee?.name, d.consignee?.city, d.dropMiniHubName, d.tripId, ...d.awbNumbers].some((v) => String(v ?? '').toLowerCase().includes(q))
    })
    const by = { new: (a, b) => b.createdTs - a.createdTs, old: (a, b) => a.createdTs - b.createdTs, edd: (a, b) => a.edd - b.edd, wt: (a, b) => b.totalWeightKg - a.totalWeightKg }
    return list.sort(by[sort])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length, tab, status, flag, client, hub, pay, range, sort, q, bills.length, refreshKey(all)])
  const pg = usePagination(rows, 10)
  const moreActive = Boolean(flag || client || hub || pay || range)
  const filtersActive = Boolean(moreActive || q || (tab === 'active' && status !== 'all'))

  function clearAll() {
    setStatus('all'); setFlag(''); setClient(''); setHub(''); setPay(''); setRange(''); setQuery(''); setSelected(new Set())
  }
  const pageNos = pg.pageItems.map((d) => d.docketNumber)
  const allOnPageSelected = pageNos.length > 0 && pageNos.every((n) => selected.has(n))
  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      pageNos.forEach((n) => (allOnPageSelected ? next.delete(n) : next.add(n)))
      return next
    })
  }
  function toggle(no) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(no)) next.delete(no)
      else next.add(no)
      return next
    })
  }
  const selectedDockets = all.filter((d) => selected.has(d.docketNumber))
  const selectedPending = selectedDockets.filter((d) => d.status === DOCKET_STATUS.PENDING)

  function exportRows(list) {
    exportCSV(`dockets-${new Date().toISOString().slice(0, 10)}`, [
      { label: 'Docket No.', value: (d) => d.docketNumber },
      { label: 'Pickup ID', value: (d) => d.pickupId },
      { label: 'Client', value: (d) => d.clientName },
      { label: 'Origin', value: (d) => d.originCity ?? '' },
      { label: 'Consignee', value: (d) => d.consignee?.name ?? '' },
      { label: 'Destination', value: (d) => d.consignee?.city ?? '' },
      { label: 'Drop Mini Hub', value: (d) => d.dropMiniHubName ?? '' },
      { label: 'Packages', value: (d) => d.awbCount },
      { label: 'Labels assigned', value: (d) => labelsOf(d) },
      { label: 'Weight (kg)', value: (d) => d.totalWeightKg },
      { label: 'Payment', value: (d) => PAYMENT_TERM_LABEL[d.paymentTerm] ?? '' },
      { label: 'Status', value: (d) => DOCKET_STATUS_LABEL[d.status] },
      { label: 'Expected delivery', value: (d) => (d.edd ? when(d.edd) : '') },
      { label: 'Raised', value: (d) => (d.createdTs ? when(d.createdTs) : '') },
    ], list)
  }

  const statusCounts = active.reduce((c, d) => ({ ...c, [d.status]: (c[d.status] ?? 0) + 1 }), {})
  const flags = [
    ['delayed', 'Delayed', active.filter(isDelayed).length],
    ['aged', 'Pending > 24h', active.filter(isAged).length],
    ['ewb', 'E-way bill needed', active.filter(needsEwb).length],
  ]
  const tabs = [['labels', 'Pending Label Print', waiting.length], ['active', 'Active Dockets', active.length]]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Docket Dashboard</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportRows(rows)} className={btnSecondary}>
            <Icon name="download" className="h-4 w-4" />
            Export
          </button>
          <Link to="/docket-module/create-docket" className={btnPrimary}>
            <Icon name="plus" className="h-4 w-4" />
            Create Docket
          </Link>
        </div>
      </div>

      <div className="flex gap-6 border-b border-slate-200">
        {tabs.map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => { setTab(k); setSelected(new Set()); pg.setPage(1) }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${tab === k ? 'border-brand-orange text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {label}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tab === k ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docket, pickup, package, client or consignee…" className={`${inputCls} w-full pl-9`} />
        </div>
        {tab === 'active' && (
          <Select value={status === 'all' ? '' : status} onChange={(v) => setStatus(v || 'all')}>
            <option value="">All statuses · {active.length}</option>
            {DOCKET_LIFECYCLE.concat(DOCKET_STATUS.EXCEPTION).map((st) => <option key={st} value={st}>{DOCKET_STATUS_LABEL[st]} · {statusCounts[st] ?? 0}</option>)}
          </Select>
        )}
        <button type="button" onClick={() => setMore((m) => !m)} className={`${inputCls} inline-flex items-center gap-1.5 py-1.5 ${moreActive ? 'border-brand-orange/60 text-brand-orange-dark' : ''}`}>
          More filters{moreActive ? ' •' : ''}
          <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${more ? 'rotate-180' : ''}`} />
        </button>
        {filtersActive && <button type="button" onClick={clearAll} className="text-xs font-medium text-slate-500 hover:text-slate-700">Clear</button>}
      </div>

      {more && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <Select value={client} onChange={setClient}>
            <option value="">All clients</option>
            {clients.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select value={hub} onChange={setHub}>
            <option value="">All drop hubs</option>
            {hubs.map((h) => <option key={h}>{h}</option>)}
          </Select>
          <Select value={pay} onChange={setPay}>
            <option value="">Any payment</option>
            {Object.entries(PAYMENT_TERM_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select value={range} onChange={setRange}>
            {DATE_RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select value="" onChange={setSort} className="!border-slate-200 !text-slate-700">
            <option value="">Sort: {SORTS.find(([k]) => k === sort)?.[1]}</option>
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          {tab === 'active' && (
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              {flags.map(([key, label, n]) => (
                <button key={key} type="button" onClick={() => setFlag(flag === key ? '' : key)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${flag === key ? 'border-brand-orange bg-brand-orange text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  {label} · {n}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      {tab === 'active' && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-slate-700">{selected.size} selected</span>
          {selectedPending.length > 0 && (
            <button type="button" onClick={() => { selectedPending.forEach((d) => markDocketReadyForTrip(d.docketNumber)); setSelected(new Set()); refresh() }} className="rounded-lg bg-brand-orange px-3 py-1 text-xs font-medium text-white hover:bg-brand-orange-dark">
              Mark {selectedPending.length} ready for trip
            </button>
          )}
          <button type="button" onClick={() => exportRows(selectedDockets)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Export selected</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">Clear selection</button>
        </div>
      )}

      <div className={`overflow-x-auto ${card}`}>
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-600">{tab === 'labels' && !filtersActive ? 'Every docket has its labels.' : 'No dockets match.'}</p>
            {filtersActive && <button type="button" onClick={clearAll} className="mt-2 text-xs font-medium text-brand-orange-dark hover:underline">Clear filters</button>}
          </div>
        ) : tab === 'labels' ? (
          <table className="w-full">
            <thead>
              <tr>{['Docket', 'Client', 'Consignee', 'Packages', 'Labels', ''].map((h, i) => <th key={i} className={`${th} ${i === 0 ? 'pl-5' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {pg.pageItems.map((d) => {
                const n = Number(d.awbCount) || 1
                const have = labelsOf(d)
                return (
                  <tr key={d.docketNumber} className={rowCls}>
                    <td className={`${td} pl-5`}>
                      <p className="font-medium tabular-nums text-slate-900">{fmtDocket(d.docketNumber)}</p>
                      <p className="text-[11px] text-slate-400">{d.pickupId} · {d.createdAt}</p>
                    </td>
                    <td className={td}>{d.clientName}</td>
                    <td className={`${td} max-w-[220px]`}>
                      <p className="truncate">{d.consignee?.name || <span className="text-slate-300">—</span>}</p>
                      <p className="text-[11px] text-slate-400">{d.consignee?.city}</p>
                    </td>
                    <td className={`${td} tabular-nums`}>{n}</td>
                    <td className={td}><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${have ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{have} of {n}</span></td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setLabelFor(d.docketNumber)} className={`${btnPrimary} !px-3 !py-1.5 text-xs`}>Print / assign labels</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={`${th} w-10 pl-4`}>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40" />
                </th>
                {['Docket', 'Client', 'Consignee', 'Pkgs · Weight', 'Delivery', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pg.pageItems.map((d) => {
                const edd = eddInfo(d, now)
                return (
                  <tr key={d.docketNumber} onClick={() => setOpenNo(d.docketNumber)} className={`${rowCls} cursor-pointer ${selected.has(d.docketNumber) ? 'bg-brand-orange/5' : ''}`}>
                    <td className={`${td} pl-4`} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(d.docketNumber)} onChange={() => toggle(d.docketNumber)} className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40" />
                    </td>
                    <td className={td}>
                      <p className="font-medium tabular-nums text-slate-900">{fmtDocket(d.docketNumber)}</p>
                      <p className="text-[11px] text-slate-400">{d.pickupId} · {d.createdAt}</p>
                    </td>
                    <td className={td}>{d.clientName}</td>
                    <td className={`${td} max-w-[220px]`}>
                      <p className="truncate">{d.consignee?.name || <span className="text-slate-300">—</span>}</p>
                      <p className="text-[11px] text-slate-400">{d.originCity || '—'} → {d.consignee?.city || '—'}</p>
                    </td>
                    <td className={`${td} tabular-nums`}>{d.awbCount} · {d.totalWeightKg} kg</td>
                    <td className={`${td} ${edd.late ? 'font-medium text-rose-600' : ''}`}>{edd.label}</td>
                    <td className={td}><StatusBadge status={d.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 0 && <Pagination pg={pg} noun="dockets" />}

      {labelFor && (() => {
        const d = all.find((x) => x.docketNumber === labelFor)
        return d ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setLabelFor(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl space-y-3 rounded-2xl bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Labels · Docket <span className="tabular-nums">{fmtDocket(d.docketNumber)}</span></p>
                <button type="button" onClick={() => setLabelFor(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Icon name="close" className="h-4 w-4" /></button>
              </div>
              <DocketLabelsPanel docket={d} packages={Number(d.awbCount) || 1} onChange={refresh} />
            </div>
          </div>
        ) : null
      })()}

      {open && (
        <DocketDrawer
          key={open.docketNumber}
          docket={open}
          bills={bills}
          onClose={() => setOpenNo(null)}
          onChanged={refresh}
          onPrint={() => setPrinting(open)}
        />
      )}
      {printing && <DocketSheetModal docket={printing} onClose={() => setPrinting(null)} />}
    </div>
  )
}

// Dockets are mutated in place (see data/dockets.js), so the memoised list
// needs a cheap fingerprint that changes whenever any of them does.
function refreshKey(list) {
  return list.map((d) => `${d.docketNumber}:${d.status}`).join('|')
}

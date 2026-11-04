import BackButton from '../../components/BackButton.jsx'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { card, thCls, tdCls, rowCls, pill } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { seriesState, SERIES_LOW_AT, SERIES_BLOCKS, blockOfNumber, consumedSeries, consumedInSeries } from '../../data/docketSeries.js'
import { DOCKETS_SEED, MODE_LABEL, peekNextDocketNumber } from '../../data/dockets.js'
import { fmtDocket } from '../../data/docketNumber.js'

const th = thCls.replace('px-6', 'px-3')
const td = tdCls.replace('px-6', 'px-3')
const overlaps = (r, lo, hi) => r.from <= hi && r.to >= lo
const searchBox = 'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40'

// Clients that hold an assigned series. One that's about to run out is flagged
// right in its row — if nobody assigns more, Automatic numbering takes over.
function ClientSeries({ query }) {
  const rows = useMemo(
    () => ACTIVE_CLIENTS_SEED.map((client) => ({ client, s: seriesState(client.id) })).filter((r) => r.s.assigned),
    [],
  )
  const q = query.trim()
  const digits = q.replace(/\D/g, '')
  const numeric = digits.length > 0 && /^[\d\s]+$/.test(q)
  const lo = numeric ? Number(digits.padEnd(10, '0')) : 0
  const hi = numeric ? Number(digits.padEnd(10, '9')) : 0
  const shown = rows.filter(({ client, s }) => {
    if (!q) return true
    if (numeric) return s.ranges.some((r) => overlaps(r, lo, hi))
    const t = q.toLowerCase()
    return client.name.toLowerCase().includes(t) || s.ranges.some((r) => blockOfNumber(r.from)?.assigned.toLowerCase().includes(t))
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Client Assigned Series</h2>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[48rem]">
          <thead>
            <tr>
              <th className={th}>Client</th>
              <th className={th}>Mode</th>
              <th className={th}>Series</th>
              <th className={th}>Left</th>
              <th className={th}>Next docket</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ client, s }) => {
              const about = s.low
              const multiMode = new Set(s.ranges.map((r) => blockOfNumber(r.from)?.assigned)).size > 1
              const done = s.exhausted
              return (
                <tr key={client.id} className={`${rowCls} align-top`}>
                  <td className={`${td} font-medium text-slate-800`}>{client.name}</td>
                  <td className={td}>{[...new Set(s.ranges.map((r) => blockOfNumber(r.from)?.assigned ?? '—'))].join(', ') || '—'}</td>
                  <td className={`${td} whitespace-normal`}>
                    {s.ranges.length ? (
                      <ul className="space-y-0.5 font-mono text-xs">
                        {s.ranges.map((r) => (
                          <li key={r.id} className={r.status === 'exhausted' ? 'text-slate-300 line-through' : 'text-slate-700'}>{multiMode && <span className="mr-2 font-sans text-[10px] font-medium uppercase text-slate-400">{blockOfNumber(r.from)?.assigned}</span>}{fmtDocket(r.from)} – {fmtDocket(r.to)}</li>
                        ))}
                      </ul>
                    ) : <span className="text-xs text-red-500">No valid series</span>}
                  </td>
                  <td className={`${td} tabular-nums`}>{s.remaining.toLocaleString('en-IN')}</td>
                  <td className={`${td} font-mono text-xs text-slate-700`}>{s.next ? fmtDocket(s.next) : '—'}</td>
                  <td className={`${td} whitespace-normal`}>
                    {done || about ? (
                      <div className="max-w-[16rem] space-y-1">
                        <span className={`${pill} !py-0.5 ${done ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>{done ? 'Consumed' : `<${SERIES_LOW_AT} series left`}</span>
                        <p className="text-[11px] leading-snug text-slate-500">
                          {done ? 'Automatic numbering is in use.' : 'Assign more, or Automatic will be used by default.'}{' '}
                          <Link to={`/client-module/client-configuration?client=${client.id}&tab=booking-tracking`} className="font-medium text-brand-orange-dark hover:underline">Assign</Link>
                        </p>
                      </div>
                    ) : <span className={`${pill} !py-0.5 bg-emerald-50 text-emerald-700`}>Active</span>}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">{rows.length === 0 ? 'No client has an assigned series yet — assign one in Client Configuration. Automatic numbering is used until then.' : 'No client series match.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const seriesOf = (docketNumber) => {
  const n = Number(docketNumber)
  const client = ACTIVE_CLIENTS_SEED.find((c) => seriesState(c.id).ranges.some((r) => n >= r.from && n <= r.to))
  return { mode: blockOfNumber(docketNumber)?.assigned ?? '—', owner: client ? client.name : 'Automatic' }
}

function ResultLine({ l }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
      <span className="font-mono font-semibold tracking-wider text-slate-900">{fmtDocket(l.number)}</span>
      {l.consumed ? (
        <>
          <span className={`${pill} !py-0.5 bg-slate-100 text-slate-600`}>Consumed</span>
          <span className="text-slate-600">{l.parts.join('  ·  ')}</span>
        </>
      ) : (
        <>
          <span className={`${pill} !py-0.5 bg-emerald-50 text-emerald-700`}>Not consumed yet</span>
          <span className="text-slate-600">Mode: {l.mode}</span>
          <span className="text-slate-400">{l.client ? `Client: ${l.client}` : 'No client assigned'}</span>
        </>
      )}
    </p>
  )
}

// Typing a docket number answers one thing, live: is it consumed, and if not,
// which mode and client it is set aside for.
function DocketResults({ query }) {
  const q = query.replace(/\D/g, '')
  if (!q || !/^[\d\s]+$/.test(query.trim())) return null
  const hits = DOCKETS_SEED.filter((d) => String(d.docketNumber).includes(q)).slice(0, 5)
  const lines = hits.map((d) => ({
    key: d.docketNumber, number: d.docketNumber, consumed: true,
    parts: [d.clientName, d.pickupId, MODE_LABEL[d.mode] ?? 'Surface'],
  }))
  // A full number that hasn't been issued: show where it sits.
  if (lines.length === 0 && q.length === 10) {
    const ser = seriesOf(q)
    const used = consumedInSeries(q)
    if (used) lines.push({ key: q, number: q, consumed: true, parts: [ser.owner, 'Assigned series', ser.mode] })
    else lines.push({ key: q, number: q, consumed: false, mode: ser.mode, client: ser.owner === 'Automatic' ? null : ser.owner })
  }
  if (lines.length === 0) return <div className={`${card} px-4 py-4 text-sm text-slate-400`}>No consumed docket starts with “{q}”.</div>
  return (
    <div className={`${card} divide-y divide-slate-100`}>
      {lines.map((l) => <ResultLine key={l.key} l={l} />)}
    </div>
  )
}

// What has already been used, up to the end of yesterday — per mode and per
// owner (a client's own series, or Automatic): the span of numbers consumed and
// how many dockets that is. Today's dockets aren't in it yet.
function ConsumedSeries({ query }) {
  const rows = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const groups = new Map()
    DOCKETS_SEED.filter((d) => (d.createdTs ?? 0) < startOfToday).forEach((d) => {
      const owner = seriesOf(d.docketNumber).owner
      const mode = MODE_LABEL[d.mode] ?? 'Surface'
      const key = `${owner}|${mode}`
      const n = Number(d.docketNumber)
      const g = groups.get(key) ?? { key, owner, mode, from: n, to: n, count: 0, last: 0 }
      g.from = Math.min(g.from, n); g.to = Math.max(g.to, n); g.count++; g.last = Math.max(g.last, d.createdTs)
      groups.set(key, g)
    })
    consumedSeries().filter((c) => c.last < startOfToday).forEach((c) => {
      const owner = ACTIVE_CLIENTS_SEED.find((x) => x.id === c.clientId)?.name ?? c.clientId
      groups.set(`${owner}|${c.from}`, { key: `${owner}|${c.from}`, owner, mode: blockOfNumber(c.from)?.assigned ?? '—', from: Number(c.from), to: Number(c.to), count: c.count, last: c.last })
    })
    return [...groups.values()].sort((a, b) => b.last - a.last)
  }, [])
  const q = query.trim()
  const digits = q.replace(/\D/g, '')
  const numeric = digits.length > 0 && /^[\d\s]+$/.test(q)
  const lo = numeric ? Number(digits.padEnd(10, '0')) : 0
  const hi = numeric ? Number(digits.padEnd(10, '9')) : 0
  const t = q.toLowerCase()
  const shown = rows.filter((r) => !q || (numeric ? overlaps(r, lo, hi) : r.owner.toLowerCase().includes(t) || r.mode.toLowerCase().includes(t)))
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Consumed Series <span className="font-normal text-slate-400">· up to yesterday, {new Date(Date.now() - 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></h2>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[40rem]">
          <thead>
            <tr>
              <th className={th}>Mode</th>
              <th className={th}>Used by</th>
              <th className={th}>Consumed series</th>
              <th className={`${th} text-right`}>Dockets</th>
              <th className={th}>Last consumed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className={rowCls}>
                <td className={td}>{r.mode}</td>
                <td className={`${td} font-medium text-slate-800`}>{r.owner}</td>
                <td className={`${td} font-mono text-xs text-slate-700`}>{fmtDocket(r.from)} – {fmtDocket(r.to)}</td>
                <td className={`${td} text-right tabular-nums`}>{r.count}</td>
                <td className={td}>{new Date(r.last).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">Nothing consumed yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// The search box with a suggestion dropdown — one real example of every case
// (consumed, not consumed with and without a client, clients in each state,
// modes), so it can be tried by clicking. Typing narrows it live.
function buildSuggestions() {
  const out = []
  const issued = DOCKETS_SEED.find((d) => d.status) ?? DOCKETS_SEED[0]
  const clients = ACTIVE_CLIENTS_SEED.map((c) => ({ c, s: seriesState(c.id) })).filter((x) => x.s.assigned)
  const used = consumedSeries()[0]
  const free = clients.find((x) => x.s.next)
  out.push({ key: 'd1', group: 'Dockets', query: String(issued.docketNumber), number: issued.docketNumber, tag: 'Consumed', rest: `${issued.clientName} · ${issued.pickupId}` })
  if (used) out.push({ key: 'd2', group: 'Dockets', query: String(used.to), number: used.to, tag: 'Consumed', rest: `${ACTIVE_CLIENTS_SEED.find((x) => x.id === used.clientId)?.name} · assigned series` })
  if (free) out.push({ key: 'd3', group: 'Dockets', query: free.s.next, number: free.s.next, tag: 'Not consumed yet', rest: `${blockOfNumber(free.s.next)?.assigned} · ${free.c.name}` })
  const auto = peekNextDocketNumber()
  out.push({ key: 'd4', group: 'Dockets', query: String(auto), number: auto, tag: 'Not consumed yet', rest: `${blockOfNumber(auto)?.assigned} · No client assigned` })
  return out
}

function SearchBox({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const items = useMemo(buildSuggestions, [open])
  const t = value.trim().toLowerCase()
  const digits = value.replace(/\D/g, '')
  const shown = !t ? items : items.filter((i) => (digits && String(i.number).includes(digits)))
  const groups = ['Dockets'].map((g) => [g, shown.filter((i) => i.group === g)]).filter(([, l]) => l.length)
  return (
    <div ref={ref} className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Search a docket number"
        aria-label="Search docket series"
        className={searchBox}
        autoComplete="off"
      />
      {open && groups.length > 0 && (
        <div className={`${card} absolute left-0 right-0 top-full z-30 mt-1.5 max-h-96 overflow-y-auto p-1.5`}>
          {groups.map(([g, list]) => (
            <div key={g}>
              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
              {list.map((i) => (
                <button key={i.key} type="button" onMouseDown={(e) => { e.preventDefault(); onChange(i.query); setOpen(false) }} className="flex w-full flex-wrap items-center gap-x-3 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-50">
                  <span className="font-mono font-semibold tracking-wider text-slate-900">{fmtDocket(i.number)}</span>
                  {i.tag && <span className={`${pill} !py-0 text-[11px] ${i.tag === 'Consumed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{i.tag}</span>}
                  <span className="text-xs text-slate-400">{i.rest}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocketSeries() {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const digits = q.replace(/\D/g, '')
  const numeric = digits.length > 0 && /^[\d\s]+$/.test(q)
  const lo = numeric ? Number(digits.padEnd(10, '0')) : 0
  const hi = numeric ? Number(digits.padEnd(10, '9')) : 0
  const t = q.toLowerCase()
  const flatBlocks = SERIES_BLOCKS.flatMap((b) => b.divisions ?? [b])
  const blockHit = (b) => !!q && (numeric ? overlaps(b, lo, hi) : b.assigned.toLowerCase().includes(t))
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <BackButton />
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Docket Series</h1>
        <SearchBox value={query} onChange={setQuery} />
        {q && <DocketResults query={query} />}
      </div>

      <ClientSeries query={query} />
      <ConsumedSeries query={query} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Series by Mode Type</h2>
        <div className={`${card} overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Series block</th>
                <th className={th}>Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {flatBlocks.map((b) => (
                <tr key={b.id} className={`${rowCls} ${blockHit(b) ? 'bg-brand-orange/5' : ''}`}>
                  <td className={`${td} font-mono text-[13px] text-slate-800`}>{fmtDocket(b.from)} – {fmtDocket(b.to)}</td>
                  <td className={`${td} font-medium text-slate-800`}>{b.assigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

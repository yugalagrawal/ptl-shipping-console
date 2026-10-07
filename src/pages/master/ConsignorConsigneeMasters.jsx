import { useMemo, useState } from 'react'
import { card, pillActive, pillInactive, thCls, tdCls, rowCls } from '../../components/ui.js'
import { ACTIVE_CLIENTS_SEED, PENDING_CLIENTS_SEED } from '../../data/clients.js'
import { getAllConsignors } from '../../data/consignors.js'
import { getAllConsignees } from '../../data/consignees.js'

// Master Module > Consignor-Consignee Masters — read-only roll-up of every
// consignor / consignee mapped to a client (added per client under Client
// Configuration > Consignor & Consignee). Same in-memory stores, no backend.
const TABS = [
  { key: 'consignor', label: 'Consignors', load: getAllConsignors },
  { key: 'consignee', label: 'Consignees', load: getAllConsignees },
]

export default function ConsignorConsigneeMasters() {
  const [tab, setTab] = useState('consignor')
  const [search, setSearch] = useState('')
  const clientName = useMemo(
    () => Object.fromEntries([...PENDING_CLIENTS_SEED, ...ACTIVE_CLIENTS_SEED].map((c) => [c.id, c.name])),
    [],
  )
  const rows = useMemo(() => TABS.find((t) => t.key === tab).load(), [tab])
  const q = search.trim().toLowerCase()
  const shown = q
    ? rows.filter((r) => [r.partyName, r.company, r.city, r.pincode, r.pocName, clientName[r.clientId]].some((v) => v?.toLowerCase().includes(q)))
    : rows

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Consignor-Consignee Masters</h1>
      <p className="mt-1 text-sm text-slate-500">Every consignor and consignee mapped to a client. Read-only — add or edit them under Client Configuration.</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tab === t.key ? pillActive : pillInactive}>
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, client, city, pincode…"
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>
      <div className={`${card} mt-4 overflow-x-auto`}>
        <table className="w-full">
          <thead>
            <tr>
              {['Name', 'Company', 'Client', 'Address', 'City', 'State', 'Pincode', 'POC'].map((h) => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={rowCls}>
                <td className={`${tdCls} font-medium text-slate-800`}>{r.partyName}</td>
                <td className={tdCls}>{r.company || '—'}</td>
                <td className={tdCls}>{clientName[r.clientId] ?? r.clientId}</td>
                <td className={`${tdCls} max-w-[260px] truncate`}>{r.address || '—'}</td>
                <td className={tdCls}>{r.city || '—'}</td>
                <td className={tdCls}>{r.state || '—'}</td>
                <td className={tdCls}>{r.pincode || '—'}</td>
                <td className={tdCls}>{[r.pocName, r.pocPhone].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            {rows.length === 0 ? `No ${tab}s mapped to any client yet.` : 'No matches.'}
          </div>
        )}
      </div>
    </div>
  )
}

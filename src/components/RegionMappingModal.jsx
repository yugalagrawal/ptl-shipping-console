import { useState } from 'react'
import Icon from './Icon.jsx'
import CreateNew from './CreateNew.jsx'
import { RowEditor, RowSummary } from './HubServiceabilityModal.jsx'
import indiaShape from '../data/indiaStatePaths.json'
import { REGIONS, REGION_COLORS } from '../data/logistics.js'
import { STATES } from '../data/geography.js'
import { emptyCoverageRow } from '../data/hubServiceability.js'

const EXTRA_COLORS = ['#f43f5e', '#8b5cf6', '#0d9488', '#d97706', '#64748b']
const ALL_STATES = STATES.map((s) => s.name).sort((a, b) => a.localeCompare(b))

export function tint(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Mini India map for the selected Region: a State/UT the Region owns
// entirely is filled solid, one it only partly covers (City Include or
// Exclude) is filled light — recomputed live from the rows being edited.
export function MiniMap({ rows, color }) {
  const full = new Set(rows.filter((r) => r.state && r.cityMode === 'all').map((r) => r.state))
  const part = new Set(rows.filter((r) => r.state && r.cityMode !== 'all').map((r) => r.state))
  return (
    <svg viewBox={indiaShape.viewBox} className="h-auto w-full" role="img" aria-label="Region coverage map">
      {indiaShape.paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          stroke="#cbd5e1"
          strokeWidth="0.6"
          fill={full.has(p.name) ? tint(color, 0.75) : part.has(p.name) ? tint(color, 0.3) : '#f1f5f9'}
        />
      ))}
    </svg>
  )
}

export function Chip({ children, color, muted }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${muted ? 'text-red-700 line-through decoration-red-300' : ''}`}
      style={muted ? { background: 'rgb(254 226 226 / 0.7)' } : { background: tint(color, 0.14), color: 'rgb(30 41 59)' }}
    >
      {children}
    </span>
  )
}

// One State/UT's coverage, read as a sentence made of real names: "Entire
// state", "Only [Howrah]", or "Entire state except [Chennai]". Region
// Mapping stops at City — no Pincode/Locality level.
// A row of chips capped at the first `limit`, then a "+N more" toggle that
// expands in place (and "Show less" to collapse) so a long list never
// stretches the card.
function ChipList({ items, color, muted, limit = 3 }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, limit)
  return (
    <>
      {shown.map((c) => <Chip key={c} color={color} muted={muted}>{c}</Chip>)}
      {items.length > limit && (
        <button type="button" onClick={() => setAll((v) => !v)} className="rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
          {all ? 'Show less' : `+${items.length - limit} more`}
        </button>
      )}
    </>
  )
}

export function CoverageCard({ row, color, actions }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 bg-white p-3.5" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{row.state}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {row.cityMode === 'all' && <Chip color={color}>Entire state</Chip>}
          {row.cityMode === 'include' && (<><span className="text-xs text-slate-400">Only</span><ChipList items={row.cities} color={color} /></>)}
          {row.cityMode === 'exclude' && (<><span className="text-xs text-slate-400">Entire state except</span><ChipList items={row.cities} muted /></>)}
        </div>
        {[
          ['Pincodes', row.pincodeMode, row.pincodes],
          ['Localities', row.localityMode, row.localities],
        ].filter(([, mode]) => mode !== 'all').map(([label, mode, items]) => (
          <div key={label} className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400">{label}: {mode === 'include' ? 'only' : 'all except'}</span>
            <ChipList items={items} color={color} muted={mode === 'exclude'} />
          </div>
        ))}
      </div>
      {actions}
    </div>
  )
}

// Region Mapping — what State/UT (and, per State, which Cities/Pincodes/
// Localities via All/Include/Exclude) each Region covers. Left: the 13
// Regions; right: the selected Region's coverage rows, edited with the
// exact same row editor a Hub's Serviceability uses. A State that another
// Region already owns outright (City = All) is left out of the State picker
// so two Regions can't both claim the whole of it; partial claims (a metro
// Include here, "Rest of" Exclude there) are fine. `mapping` is keyed by
// Region name; edits are held locally until Save.
export default function RegionMappingModal({ mapping, onSave, onClose, readOnly }) {
  const color = (name) => REGION_COLORS[name] || '#64748b'
  const [draft, setDraft] = useState(mapping)
  const [regions, setRegions] = useState(() => [...REGIONS])
  const [region, setRegion] = useState(REGIONS[0].name)
  const [editingId, setEditingId] = useState(null)

  const rows = draft[region]?.rows ?? []
  const def = regions.find((r) => r.name === region)?.definition

  const ownedElsewhere = new Set(
    Object.entries(draft)
      .filter(([name]) => name !== region)
      .flatMap(([, cov]) => cov.rows.filter((r) => r.cityMode === 'all' && r.pincodeMode === 'all').map((r) => r.state))
  )
  const usedHere = new Set(rows.filter((r) => r.id !== editingId).map((r) => r.state).filter(Boolean))
  const stateOptions = ALL_STATES.filter((s) => !ownedElsewhere.has(s) && !usedHere.has(s))

  function setRows(next) {
    setDraft((prev) => ({ ...prev, [region]: { rows: next } }))
  }
  function addRow() {
    const row = emptyCoverageRow()
    setRows([...rows, row])
    setEditingId(row.id)
  }
  function selectRegion(name) {
    setRegion(name)
    setEditingId(null)
  }
  function createRegion(raw) {
    const name = raw.trim()
    if (!name || regions.some((r) => r.name.toLowerCase() === name.toLowerCase())) return
    setRegions((prev) => [...prev, { name, definition: '' }])
    setDraft((prev) => ({ ...prev, [name]: { rows: [] } }))
    selectRegion(name)
  }
  function done() {
    // Persist any Regions created here into the shared list so the rest of
    // Location Master (Region dropdown, filters, map colours) sees them.
    regions.forEach((r) => {
      if (!REGIONS.some((x) => x.name === r.name)) {
        REGIONS.push(r)
        REGION_COLORS[r.name] = EXTRA_COLORS[(REGIONS.length - 14) % EXTRA_COLORS.length]
      }
    })
    onSave(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, { rows: v.rows.filter((r) => r.state) }])))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Region Mapping</h3>
          <button type="button" onClick={readOnly ? onClose : done} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-52 shrink-0 flex-col border-r border-slate-100">
          <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {regions.map((r) => {
              const n = draft[r.name]?.rows.filter((x) => x.state).length ?? 0
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => selectRegion(r.name)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${region === r.name ? 'bg-brand-orange/10 font-semibold text-brand-orange-dark' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: color(r.name) }} />{r.name}</span>
                  <span className="text-[11px] font-medium text-slate-400">{n}</span>
                </button>
              )
            })}
          </div>
          {!readOnly && <CreateNew label="Create New Region" placeholder="Region name" onCreate={createRegion} />}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-5 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="mb-3">
                <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <span className="h-3 w-3 rounded-full" style={{ background: color(region) }} />
                  {region}
                </h4>
                {def && <p className="mt-0.5 text-xs text-slate-500">{def}</p>}
              </div>

              {rows.length === 0 && (
                <p className="text-sm text-slate-400">{readOnly ? 'No coverage mapped yet.' : 'No coverage mapped yet — add a State below.'}</p>
              )}
              {rows.map((row) =>
                editingId === row.id ? (
                  <RowEditor
                    key={row.id}
                    row={row}
                    cityOnly
                    onChange={(next) => setRows(rows.map((r) => (r.id === row.id ? next : r)))}
                    stateOptions={row.state ? [...new Set([row.state, ...stateOptions])].sort((a, b) => a.localeCompare(b)) : stateOptions}
                  />
                ) : (
                  <CoverageCard
                    key={row.id}
                    row={row}
                    color={color(region)}
                    actions={!readOnly && (
                      <div className="flex shrink-0 items-center gap-3 pt-0.5">
                        <button type="button" onClick={() => setEditingId(row.id)} className="text-slate-400 hover:text-slate-700">
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => { setRows(rows.filter((r) => r.id !== row.id)); if (editingId === row.id) setEditingId(null) }} className="text-slate-400 hover:text-red-500">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  />
                )
              )}

              {!readOnly && (
                <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Icon name="plus" className="h-3.5 w-3.5" /> Add State
                </button>
              )}
            </div>

            <div className="lg:w-64 lg:shrink-0">
              <div className="sticky top-0 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <MiniMap rows={rows} color={color(region)} />
                <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: tint(color(region), 0.75) }} />Entire state</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: tint(color(region), 0.3) }} />Partly</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          {readOnly ? (
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Close</button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={done} className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark">Save</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

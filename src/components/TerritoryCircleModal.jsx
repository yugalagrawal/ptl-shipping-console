import { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import CreateNew from './CreateNew.jsx'
import MultiSelect from './MultiSelect.jsx'
import Pagination, { usePagination } from './Pagination.jsx'
import { RowEditor } from './HubServiceabilityModal.jsx'
import { CoverageCard, MiniMap, tint } from './RegionMappingModal.jsx'
import { STATES } from '../data/geography.js'
import { emptyCoverageRow } from '../data/hubServiceability.js'

const ALL_STATES = STATES.map((s) => s.name).sort((a, b) => a.localeCompare(b))
const TERRITORY_COLOR = '#8b5cf6'
const CIRCLE_COLOR = '#0d9488'

const inputCls = 'min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40'
const addBtn = 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40'

// Searchable, paginated list used as the left pane of both tabs.
function ListPane({ items, selectedId, onSelect, search, onSearch, placeholder, footer, renderItem, noun }) {
  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((i) => !q || i.label.toLowerCase().includes(q)), [items, q])
  const pg = usePagination(filtered, 10)
  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-slate-100">
      <div className="border-b border-slate-100 p-2">
        <input value={search} onChange={(e) => { onSearch(e.target.value); pg.setPage(1) }} placeholder={placeholder} className={`${inputCls} w-full`} />
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {pg.pageItems.map((i) => (
          <button key={i.id} type="button" onClick={() => onSelect(i.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedId === i.id ? 'bg-brand-orange/10 font-semibold text-brand-orange-dark' : 'text-slate-700 hover:bg-slate-50'}`}>
            {renderItem(i)}
          </button>
        ))}
        {filtered.length === 0 && <p className="px-2 py-3 text-xs text-slate-400">No {noun} found.</p>}
      </div>
      <Pagination pg={pg} compact />
      {footer}
    </div>
  )
}

// Territory / Circle Mapping. Two tabs:
//   Circle Mapping — every Circle and its coverage: State > City > Pincode >
//     Locality, each level All / Include / Exclude (same editor as Hub
//     Serviceability).
//   Territory — a Territory is only a named group of Circles, so this tab
//     lists each Territory and the Circles inside it.
// Both lists are searchable and paginated. Edits are held locally until
// Save; `readOnly` hides every edit control.
export default function TerritoryCircleModal({ mapping, onSave, onClose, readOnly }) {
  const [draft, setDraft] = useState(mapping)
  const [tab, setTab] = useState('circle')
  const [circleId, setCircleId] = useState(() => Object.keys(mapping.circles)[0])
  const [territoryId, setTerritoryId] = useState(mapping.territories[0]?.id)
  const [circleSearch, setCircleSearch] = useState('')
  const [territorySearch, setTerritorySearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const territoryOf = (cid) => draft.territories.find((t) => t.circleIds.includes(cid))
  const circles = useMemo(() => Object.values(draft.circles).sort((a, b) => a.name.localeCompare(b.name)), [draft.circles])
  const unassigned = circles.filter((c) => !territoryOf(c.id))

  const circle = draft.circles[circleId]
  const territory = draft.territories.find((t) => t.id === territoryId)

  function setCircleRows(rows) {
    setDraft((d) => ({ ...d, circles: { ...d.circles, [circleId]: { ...d.circles[circleId], rows } } }))
  }
  function addCircle(raw) {
    const name = raw.trim()
    if (!name || draft.circles[name]) return
    setDraft((d) => ({ ...d, circles: { ...d.circles, [name]: { id: name, name, rows: [] } } }))
    setCircleId(name)
    setEditingId(null)
  }
  function deleteCircle(id) {
    setDraft((d) => {
      const { [id]: _drop, ...rest } = d.circles
      return { circles: rest, territories: d.territories.map((t) => ({ ...t, circleIds: t.circleIds.filter((c) => c !== id) })) }
    })
    setCircleId(circles.find((c) => c.id !== id)?.id)
  }
  function addTerritory(raw) {
    const name = raw.trim()
    if (!name || draft.territories.some((t) => t.name.toLowerCase() === name.toLowerCase())) return
    const t = { id: `t-${Date.now()}`, name, circleIds: [] }
    setDraft((d) => ({ ...d, territories: [...d.territories, t].sort((a, b) => a.name.localeCompare(b.name)) }))
    setTerritoryId(t.id)
  }
  function deleteTerritory(id) {
    setDraft((d) => ({ ...d, territories: d.territories.filter((t) => t.id !== id) }))
    setTerritoryId(draft.territories.find((t) => t.id !== id)?.id)
  }
  function setTerritoryCircles(id, circleIds) {
    setDraft((d) => {
      // A circle can belong to only one territory — drop any that another
      // territory already holds.
      const taken = new Set(d.territories.filter((t) => t.id !== id).flatMap((t) => t.circleIds))
      const clean = circleIds.filter((c) => !taken.has(c))
      return { ...d, territories: d.territories.map((t) => (t.id === id ? { ...t, circleIds: clean } : t)) }
    })
  }
  function done() {
    onSave({ ...draft, circles: Object.fromEntries(Object.entries(draft.circles).map(([k, c]) => [k, { ...c, rows: c.rows.filter((r) => r.state) }])) })
    onClose()
  }

  const rows = circle?.rows ?? []
  const usedStates = new Set(rows.filter((r) => r.id !== editingId).map((r) => r.state).filter(Boolean))
  const stateOptions = ALL_STATES.filter((s) => !usedStates.has(s))

  const circleItems = circles.map((c) => ({ id: c.id, label: c.name, sub: territoryOf(c.id)?.name }))
  const territoryItems = draft.territories.map((t) => ({ id: t.id, label: t.name, count: t.circleIds.length }))


  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-slate-900">Territory / Circle Mapping</h3>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
              {[['circle', 'Circle Mapping'], ['territory', 'Territory']].map(([k, label]) => (
                <button key={k} type="button" onClick={() => { setTab(k); setEditingId(null) }} className={`rounded-lg px-4 py-1 transition ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={readOnly ? onClose : done} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {tab === 'circle' ? (
            <ListPane
              items={circleItems}
              selectedId={circleId}
              onSelect={(id) => { setCircleId(id); setEditingId(null) }}
              search={circleSearch}
              onSearch={setCircleSearch}
              placeholder="Search circles…"
              noun="circles"
              renderItem={(i) => (<><span className="block truncate">{i.label}</span><span className="block truncate text-[11px] font-normal text-slate-400">{i.sub ?? 'No territory'}</span></>)}
              footer={!readOnly && <CreateNew label="Create New Circle" placeholder="Circle name" onCreate={addCircle} />}
            />
          ) : (
            <ListPane
              items={territoryItems}
              selectedId={territoryId}
              onSelect={setTerritoryId}
              search={territorySearch}
              onSearch={setTerritorySearch}
              placeholder="Search territories…"
              noun="territories"
              renderItem={(i) => (<span className="flex items-center justify-between gap-2"><span className="truncate">{i.label}</span><span className="text-[11px] font-medium text-slate-400">{i.count}</span></span>)}
              footer={!readOnly && <CreateNew label="Create New Territory" placeholder="Territory name" onCreate={addTerritory} />}
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-5 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-2.5">
              {tab === 'circle' && circle && (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        <span className="h-3 w-3 rounded-full" style={{ background: CIRCLE_COLOR }} />
                        {circle.name}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {territoryOf(circle.id) ? <>In <span className="font-medium text-violet-600">{territoryOf(circle.id).name}</span></> : 'Not in any territory'} · State &gt; City &gt; Pincode &gt; Locality
                      </p>
                    </div>
                    {!readOnly && <button type="button" onClick={() => deleteCircle(circle.id)} className="text-slate-400 hover:text-red-500" title="Delete circle"><Icon name="trash" className="h-4 w-4" /></button>}
                  </div>

                  {rows.length === 0 && <p className="text-sm text-slate-400">{readOnly ? 'No coverage mapped yet.' : 'No coverage mapped yet — add a State below.'}</p>}
                  {rows.map((row) =>
                    editingId === row.id ? (
                      <RowEditor
                        key={row.id}
                        row={row}
                        onChange={(next) => setCircleRows(rows.map((r) => (r.id === row.id ? next : r)))}
                        stateOptions={row.state ? [...new Set([row.state, ...stateOptions])].sort((a, b) => a.localeCompare(b)) : stateOptions}
                      />
                    ) : (
                      <CoverageCard
                        key={row.id}
                        row={row}
                        color={CIRCLE_COLOR}
                        actions={!readOnly && (
                          <div className="flex shrink-0 items-center gap-3 pt-0.5">
                            <button type="button" onClick={() => setEditingId(row.id)} className="text-slate-400 hover:text-slate-700"><Icon name="edit" className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setCircleRows(rows.filter((r) => r.id !== row.id))} className="text-slate-400 hover:text-red-500"><Icon name="trash" className="h-4 w-4" /></button>
                          </div>
                        )}
                      />
                    )
                  )}
                  {!readOnly && (
                    <button type="button" onClick={() => { const r = emptyCoverageRow(); setCircleRows([...rows, r]); setEditingId(r.id) }} className={addBtn}>
                      <Icon name="plus" className="h-3.5 w-3.5" /> Add State
                    </button>
                  )}
                </>
              )}

              {tab === 'territory' && territory && (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        <span className="h-3 w-3 rounded-full" style={{ background: TERRITORY_COLOR }} />
                        {territory.name}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">{territory.circleIds.length} circle{territory.circleIds.length === 1 ? '' : 's'}</p>
                    </div>
                    {!readOnly && territory.circleIds.length === 0 && (
                      <button type="button" onClick={() => deleteTerritory(territory.id)} className="text-slate-400 hover:text-red-500" title="Delete territory"><Icon name="trash" className="h-4 w-4" /></button>
                    )}
                  </div>

                  <TerritoryCircles
                    territory={territory}
                    circles={draft.circles}
                    unassigned={unassigned}
                    readOnly={readOnly}
                    onChange={(ids) => setTerritoryCircles(territory.id, ids)}
                    onOpenCircle={(id) => { setCircleId(id); setTab('circle'); setEditingId(null) }}
                  />
                </>
              )}
            </div>

            {tab === 'circle' && <div className="lg:w-64 lg:shrink-0">
              <div className="sticky top-0 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <MiniMap rows={rows} color={CIRCLE_COLOR} />
                <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: tint(CIRCLE_COLOR, 0.75) }} />Entire state</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: tint(CIRCLE_COLOR, 0.3) }} />Partly</span>
                </div>
              </div>
            </div>}
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

// The Circles inside one Territory (paginated), plus — for editors — a
// checklist of Circles not yet in any Territory to add. A Circle belongs to
// exactly one Territory, so only unassigned ones are offered; removing a
// Circle here just un-groups it (its own coverage is untouched).
function TerritoryCircles({ territory, circles, unassigned, readOnly, onChange, onOpenCircle }) {
  const items = territory.circleIds.map((id) => circles[id]).filter(Boolean)
  const pg = usePagination(items, 10)
  // Only circles not in some OTHER territory are selectable, so a circle
  // can never end up in two territories.
  const selectable = [...new Set([...territory.circleIds, ...unassigned.map((c) => c.id)])].sort((a, b) => a.localeCompare(b))
  const blocked = Object.keys(circles).length - selectable.length

  return (
    <>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white">
        {pg.pageItems.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <button type="button" onClick={() => onOpenCircle(c.id)} className="truncate text-left text-sm font-medium text-slate-800 hover:text-teal-700" title="Open in Circle Mapping">{c.name}</button>
            {!readOnly && (
              <button type="button" onClick={() => onChange(territory.circleIds.filter((id) => id !== c.id))} className="shrink-0 text-slate-400 hover:text-red-500" title="Remove from territory"><Icon name="close" className="h-4 w-4" /></button>
            )}
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="text-sm text-slate-400">No circles in this territory yet.</p>}
      <Pagination pg={pg} compact />

      {!readOnly && (
        <div className="max-w-sm pt-1">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Add Circles</span>
          <MultiSelect
            options={selectable}
            selected={territory.circleIds}
            onChange={onChange}
            placeholder="Select circles…"
            noun="circle"
          />
          {blocked > 0 && (
            <p className="mt-1.5 text-[11px] text-slate-400">{blocked} other circle{blocked === 1 ? '' : 's'} already belong to a different territory and can't be added — a circle can be in only one territory.</p>
          )}
        </div>
      )}
    </>
  )
}

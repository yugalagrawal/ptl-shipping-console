import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { Shell, RegionMappingModal } from './ClientRegionFlow.jsx'
import { RATE_CARDS } from '../data/standardRateCards.js'
import { REGIONS, buildStandardRegionsFromSheet } from '../data/geoMaster.js'
import { freshRegionId } from '../data/regionMapping.js'

// "Pick from Standard Rate Cards" flow:
//   Choose a rate card  ->  Set rates (flat discount + per-cell edits)
//   (+ read-only region mapping, reachable from Set rates)
// Regions come from the Location Master, so they are viewable but not
// editable here — only the prices change for this client.

const round2 = (n) => Math.round(n * 100) / 100
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(round2(n)))
const cardRange = (card) => {
  const all = card.grid.flat()
  return `₹${Math.min(...all)}–₹${Math.max(...all)}/kg`
}

function PickCard({ onBack, onClose, onContinue, preselectCode }) {
  const [code, setCode] = useState(RATE_CARDS.find((c) => c.code === preselectCode)?.code ?? (RATE_CARDS.length === 1 ? RATE_CARDS[0].code : ''))
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = RATE_CARDS.filter((c) => !query || `${c.name} ${c.code} ${c.note}`.toLowerCase().includes(query))
  return (
    <Shell wide="max-w-md" title="Choose a rate card" onClose={onClose}>
      <div className="px-5 pt-4">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or code…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-orange/40"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {query ? `${list.length} of ${RATE_CARDS.length} rate cards` : `${RATE_CARDS.length} rate card${RATE_CARDS.length === 1 ? '' : 's'}`} · you can add a discount and change single prices next
        </p>
      </div>
      <div className="max-h-[300px] min-h-[96px] space-y-2 overflow-y-auto px-5 py-3">
        {list.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">No rate card matches “{q.trim()}”.</p>}
        {list.map((c) => {
          const on = c.code === code
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setCode(c.code)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange/40' : 'border-slate-200 hover:border-brand-orange/40'}`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-brand-orange' : 'border-slate-300'}`}>{on && <span className="h-2 w-2 rounded-full bg-brand-orange" />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{c.name}</span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500">{c.code}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {c.note} · {REGIONS.length} regions · {cardRange(c)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <span className="truncate text-xs text-slate-400">{code ? `Selected: ${RATE_CARDS.find((c) => c.code === code)?.name}` : 'Pick a card to continue'}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Back
          </button>
          <button type="button" disabled={!code} onClick={() => onContinue(RATE_CARDS.find((c) => c.code === code))} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark disabled:opacity-50">
            Continue
          </button>
        </div>
      </div>
    </Shell>
  )
}

function SetRates({ card, discount, setDiscount, edits, setEdits, onBack, onClose, onSave, onViewMapping }) {
  const [hover, setHover] = useState(null) // [o, c]
  const d = Math.min(100, Math.max(0, Number(discount) || 0))
  const base = (o, c) => round2(card.grid[o][c] * (1 - d / 100))
  const editedCount = Object.keys(edits).length

  function setCell(o, c, raw) {
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return
    setEdits((prev) => {
      const next = { ...prev }
      const k = `${o}|${c}`
      if (raw === '' || (raw !== '.' && Number(raw) === base(o, c) && !raw.endsWith('.'))) delete next[k]
      else next[k] = raw
      return next
    })
  }
  function move(o, c, e) {
    const el = e.target
    let to = null
    if (e.key === 'ArrowDown' || e.key === 'Enter') to = [o + 1, c]
    else if (e.key === 'ArrowUp') to = [o - 1, c]
    else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length) to = [o, c + 1]
    else if (e.key === 'ArrowLeft' && el.selectionStart === 0) to = [o, c - 1]
    if (to) {
      const next = document.getElementById(`rc-${to[0]}-${to[1]}`)
      if (next) {
        e.preventDefault()
        next.focus()
      }
    }
  }

  const lane = hover ? { from: REGIONS[hover[0]].name, to: REGIONS[hover[1]].name, std: card.grid[hover[0]][hover[1]], now: edits[`${hover[0]}|${hover[1]}`] ?? base(hover[0], hover[1]), edited: `${hover[0]}|${hover[1]}` in edits } : null

  return (
    <Shell wide="max-w-5xl" title={`Set rates · ${card.name}`} onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Apply a flat discount to all cells</span>
            <span className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : String(Math.min(100, Math.max(0, Number(e.target.value) || 0))))}
                placeholder="0"
                className="w-24 rounded-xl border border-slate-200 py-2 pl-3 pr-7 text-sm tabular-nums focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </span>
            {[5, 10, 15].map((v) => (
              <button key={v} type="button" onClick={() => setDiscount(Number(discount) === v ? '' : String(v))} className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${Number(discount) === v ? 'border-brand-orange bg-brand-orange/5 text-brand-orange-dark' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                {v}%
              </button>
            ))}
          </div>
          <button type="button" onClick={onViewMapping} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Icon name="search" className="h-3.5 w-3.5" />
            View region mapping
          </button>
        </div>

        <div className="mb-0 mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-brand-orange bg-brand-orange/10" />
            Edited by you
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-50" />
            Within the same region
          </span>
        </div>
        <div className="mt-3 flex min-h-[28px] items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
          {lane ? (
            <span className="text-slate-700">
              <span className="font-semibold">{lane.from}</span> → <span className="font-semibold">{lane.to}</span> · ₹{fmt(Number(lane.now) || 0)}/kg
              {lane.edited ? <span className="ml-2 text-brand-orange-dark">edited · card price ₹{fmt(lane.std)}</span> : d > 0 ? <span className="ml-2 text-slate-400">card price ₹{fmt(lane.std)}</span> : null}
            </span>
          ) : (
            <span className="text-slate-400">Click a price to change it. Arrow keys move between cells. Rows are origin, columns are destination · ₹/kg.</span>
          )}
          {editedCount > 0 && (
            <span className="shrink-0 text-slate-500">
              {editedCount} edited ·{' '}
              <button type="button" onClick={() => setEdits({})} className="font-semibold text-brand-orange-dark hover:underline">
                Reset
              </button>
            </span>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed border-collapse text-xs" onMouseLeave={() => setHover(null)}>
            <colgroup>
              <col style={{ width: 92 }} />
              {REGIONS.map((r) => (
                <col key={r.code} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-slate-400">From ↓ To →</th>
                {REGIONS.map((r, ci) => (
                  <th key={r.code} title={r.name} className={`px-0.5 py-1.5 text-center text-[10px] font-semibold leading-tight ${hover?.[1] === ci ? 'text-brand-orange-dark' : 'text-slate-500'}`}>
                    {r.name.replace(/ (\d)$/, '\n$1').split('\n').map((t, i) => (
                      <span key={i} className="block">
                        {t}
                      </span>
                    ))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((o, oi) => (
                <tr key={o.code} className="border-t border-slate-100">
                  <th className={`whitespace-nowrap px-3 py-0 text-left text-xs font-semibold ${hover?.[0] === oi ? 'bg-brand-orange/10 text-brand-orange-dark' : 'bg-slate-50 text-slate-700'}`}>{o.name}</th>
                  {REGIONS.map((dst, ci) => {
                    const k = `${oi}|${ci}`
                    const edited = k in edits
                    const val = edited ? edits[k] : fmt(base(oi, ci))
                    const same = oi === ci
                    return (
                      <td key={dst.code} className="p-[2px]" onMouseEnter={() => setHover([oi, ci])}>
                        <input
                          id={`rc-${oi}-${ci}`}
                          type="text"
                          inputMode="decimal"
                          value={val}
                          onFocus={(e) => {
                            e.target.select()
                            setHover([oi, ci])
                          }}
                          onChange={(e) => setCell(oi, ci, e.target.value)}
                          onKeyDown={(e) => move(oi, ci, e)}
                          onBlur={() => {
                            if (edited && (edits[k] === '' || edits[k] === '.')) setCell(oi, ci, '')
                          }}
                                          className={`h-8 w-full rounded-md text-center text-xs tabular-nums transition-shadow focus:outline focus:outline-2 focus:outline-brand-orange ${
                            edited ? 'border border-brand-orange bg-brand-orange/10 font-semibold text-brand-orange-dark' : same ? 'border border-slate-300 bg-slate-50 font-semibold text-slate-900' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Back
        </button>
        <button type="button" onClick={() => onSave({ card, discount: d, discountRaw: discount, edits, edited: editedCount })} className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-orange-dark">
          Save pricing
        </button>
      </div>
    </Shell>
  )
}

// step: '' | 'pick' | 'rates' | 'map'
export default function ClientRateCardFlow({ step, setStep, onBackToSources, onSave, initial, preselectCode }) {
  const [card, setCard] = useState(null)
  const [discount, setDiscount] = useState('')
  const [edits, setEdits] = useState({}) // 'o|d' -> value
  // Re-opening a saved pricing resumes it on Set rates with its discount and edits.
  useEffect(() => {
    if (initial) {
      setCard(RATE_CARDS.find((c) => c.code === initial.cardCode) ?? null)
      setDiscount(initial.discountRaw ?? '')
      setEdits(initial.edits ?? {})
    }
  }, [initial])
  const regions = useMemo(() => buildStandardRegionsFromSheet(freshRegionId), [])
  if (!step) return null
  const close = () => setStep('')
  if (step === 'pick')
    return (
      <PickCard
        preselectCode={preselectCode}
        onClose={close}
        onBack={() => {
          close()
          onBackToSources()
        }}
        onContinue={(c) => {
          if (c.code !== card?.code) {
            setDiscount('')
            setEdits({})
          }
          setCard(c)
          setStep('rates')
        }}
      />
    )
  if (step === 'map')
    return <RegionMappingModal name={card?.name ?? 'General'} regions={regions} setRegions={() => {}} readOnly onCancel={() => setStep('rates')} onSave={() => setStep('rates')} />
  return (
    <SetRates
      card={card}
      discount={discount}
      setDiscount={setDiscount}
      edits={edits}
      setEdits={setEdits}
      onClose={close}
      onBack={() => (initial ? setStep('') : setStep('pick'))}
      onViewMapping={() => setStep('map')}
      onSave={(r) => {
        onSave(r)
        setDiscount('')
        setEdits({})
        close()
      }}
    />
  )
}

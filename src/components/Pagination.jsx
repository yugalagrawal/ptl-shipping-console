import { useEffect, useMemo, useState } from 'react'

export const PAGE_SIZES = [10, 25, 50, 100]

// Client-side pagination for a long list. Page is clamped whenever the
// list shrinks (search / filter / delete), so it never points past the end.
export function usePagination(items, defaultSize = 25) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultSize)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const safePage = Math.min(page, pages)
  const pageItems = useMemo(() => items.slice((safePage - 1) * pageSize, safePage * pageSize), [items, safePage, pageSize])
  return {
    pageItems, page: safePage, pages, pageSize, total: items.length,
    setPage,
    setPageSize: (n) => { setPageSize(n); setPage(1) },
  }
}

function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const set = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1])
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  return list.flatMap((n, i) => (i > 0 && n - list[i - 1] > 1 ? ['…', n] : [n]))
}

// Footer bar: "Showing 1–25 of 1,240", rows-per-page, and page buttons.
// `compact` drops the rows-per-page picker (used inside small side lists).
export default function Pagination({ pg, compact, noun = 'rows' }) {
  const { page, pages, pageSize, total, setPage, setPageSize } = pg
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const btn = 'min-w-[2rem] rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40'
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 ${compact ? 'px-2 py-2' : 'px-4 py-3'} text-xs text-slate-500`}>
      <span>{compact ? `${from}–${to} of ${total.toLocaleString()}` : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} ${noun}`}</span>
      {!compact && (
        <label className="flex items-center gap-1.5">
          Rows per page
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs">
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
      <div className="ml-auto flex items-center gap-0.5">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className={`${btn} text-slate-600 hover:bg-slate-100`}>Prev</button>
        {!compact && pageWindow(page, pages).map((n, i) =>
          n === '…' ? <span key={`e${i}`} className="px-1 text-slate-400">…</span> : (
            <button key={n} type="button" onClick={() => setPage(n)} className={`${btn} ${n === page ? 'bg-brand-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{n}</button>
          )
        )}
        {compact && <span className="px-2">{page}/{pages}</span>}
        <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className={`${btn} text-slate-600 hover:bg-slate-100`}>Next</button>
      </div>
    </div>
  )
}

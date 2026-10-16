import Icon from './Icon.jsx'
import { useState } from 'react'
import DocketSheet, { CopyPicker } from './DocketSheet.jsx'
import { COPY_OPTIONS } from './docketSheetHtml.js'
import { btnPrimary } from './ui.js'
import { printDocketSheet } from '../pages/docket/docketPrintSheet.js'
import { fmtDocket } from '../data/docketNumber.js'

// Modal chrome around DocketSheet (the actual sheet — see that file for the
// visual layout rationale) — used to view an already-generated docket
// (Docket Dashboard, and Create Docket's own post-generate "View & print").
export default function DocketSheetModal({ docket, onClose }) {
  const [copies, setCopies] = useState(COPY_OPTIONS.slice(0, 2))
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Docket {fmtDocket(docket.docketNumber)}</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => printDocketSheet(docket, copies)} disabled={!copies.length} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}>
              <Icon name="invoice" className="h-4 w-4" />
              Print
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-5 py-2.5"><CopyPicker value={copies} onChange={setCopies} /></div>

        <div className="overflow-auto bg-slate-100 p-5">
          <DocketSheet docket={docket} copy={copies[0]} />
        </div>
      </div>
    </div>
  )
}

import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

// Small Yes/No confirmation modal for a mutating action (delete, overwrite
// an edit, …) — portaled to <body> so it always centers over the whole
// viewport regardless of where the trigger sits (e.g. inside a scrolling
// table).
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Yes', cancelLabel = 'No', danger = false, onConfirm, onCancel }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-red-500' : 'bg-brand-orange/10 text-brand-orange-dark'}`}>
            <Icon name={danger ? 'trash' : 'edit'} className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-orange hover:bg-brand-orange-dark'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

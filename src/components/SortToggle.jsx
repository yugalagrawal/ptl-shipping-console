const SORT_OPTIONS = [
  { value: 'recent', label: 'Recents' },
  { value: 'alpha', label: 'Alphabetical' },
]

// Shared Recents/Alphabetical toggle — used by any client list page that
// needs the same two sort modes (My Clients, Client Configuration, …).
export default function SortToggle({ sortMode, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            sortMode === opt.value ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

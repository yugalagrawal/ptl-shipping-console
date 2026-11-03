import Icon from '../components/Icon.jsx'

export default function Dashboard() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-12 text-center shadow-soft ring-1 ring-slate-200/70">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand-orange">
          <Icon name="dashboard" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">This is User's Birdview (Landing Page)</h1>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
          Coming soon
        </span>
      </div>
    </div>
  )
}

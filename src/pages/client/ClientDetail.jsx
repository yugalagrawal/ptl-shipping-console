import { Link, useParams } from 'react-router-dom'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import ClientOnboardingSummary from '../../components/ClientOnboardingSummary.jsx'
import ClientPricingPanel from '../../components/ClientPricingPanel.jsx'
import { card } from '../../components/ui.js'
import { TIER_BADGE } from '../../data/pricing.js'
import { ACTIVE_CLIENTS_SEED } from '../../data/clients.js'
import { groupById } from '../../data/groups.js'

// Full-page detail view for one activated client — a dedicated route rather
// than an expanding row, since it needs to show both onboarding details and
// pricing at once (too much to fit inline in the list). Pricing is read-only
// here by design: once a client clears both Sales and Finance approval its
// rate card is locked — a "Price revision request" flow for already-active
// clients is a separate future feature, not editing in place.
export default function ClientDetail() {
  const { clientId } = useParams()
  const client = ACTIVE_CLIENTS_SEED.find((c) => c.id === clientId)

  if (!client) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link to="/client-module/active-clients" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to My Clients
        </Link>
        <div className={`p-8 text-center text-sm text-slate-400 ${card}`}>No client found for "{clientId}".</div>
      </div>
    )
  }

  const group = groupById(client.groupId)

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <Link to="/client-module/active-clients" className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to My Clients
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={client.name} size="md" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">{client.name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${TIER_BADGE[client.tier] ?? 'bg-slate-100 text-slate-600'}`}>
                {client.tier}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {client.city}, {client.state} · GSTIN {client.gstin} · Onboarded {client.onboardedOn}
              {group && <> · {group.name}</>}
            </p>
          </div>
        </div>
      </div>

      <div className={`space-y-5 p-5 ${card}`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Onboarding details</h2>
        <ClientOnboardingSummary client={client} />
      </div>

      <div className={`overflow-hidden ${card}`}>
        <h2 className="p-5 pb-0 text-sm font-semibold uppercase tracking-wide text-slate-400">Pricing</h2>
        <ClientPricingPanel client={client} readOnly />
      </div>
    </div>
  )
}

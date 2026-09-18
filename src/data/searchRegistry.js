// Static master-search index. Every entry carries `permissionKey` — the same
// key checked against a logged-in user's `permissions` list (data/users.js).
// `permissionKey: null` means visible to everyone. Items are never filtered
// out of results for lack of permission — MasterSearch shows them dimmed
// and locked instead, so people can discover what exists even if they can't
// open it yet.

export const KIND_ORDER = ['nav', 'tab', 'logic', 'action']

export const KIND_LABELS = {
  nav: 'Pages',
  tab: 'Sections',
  logic: 'Logic Engine',
  action: 'Actions',
}

export const KIND_BADGE = {
  nav: { label: 'Page', className: 'bg-slate-100 text-slate-500' },
  tab: { label: 'Section', className: 'bg-sky-50 text-sky-600' },
  logic: { label: 'Rule', className: 'bg-violet-50 text-violet-600' },
  action: { label: 'Action', className: 'bg-brand-orange/10 text-brand-orange-dark' },
}

export const SEARCH_REGISTRY = [
  // ---- Pages (top-level nav) ----
  { id: 'nav-dashboard', kind: 'nav', title: 'Birdview', subtitle: 'Live network overview', path: '/', permissionKey: 'dashboard', icon: 'dashboard' },
  { id: 'nav-logic', kind: 'nav', title: 'Logic Engine', subtitle: 'The rules that steer every other module', path: '/logic-engine', permissionKey: 'logic-engine', icon: 'logic' },
  { id: 'tab-access-management', kind: 'tab', title: 'Access Management', subtitle: 'User Module — roles, function-level permissions and city access for the LT Team login', path: '/user-module/access-management', permissionKey: 'access-management', icon: 'shield' },
  { id: 'tab-user-relations', kind: 'tab', title: 'User Management', subtitle: 'User Module — map reportees to managers and delegate access', path: '/user-module/user-relations', permissionKey: 'user-relations', icon: 'onboarding' },
  { id: 'tab-my-profile', kind: 'tab', title: 'My Profile', subtitle: 'User Module — your own identity, reporting line and access', path: '/user-module/my-profile', permissionKey: null, icon: 'user' },
  { id: 'nav-system-info', kind: 'nav', title: 'System Info', subtitle: 'Read-only reference — how every module connects', path: '/system-info', permissionKey: 'system-info', icon: 'info' },

  // ---- Sections (sub-pages under Client Module / Trip / Finance Management) ----
  { id: 'tab-client-onboarding', kind: 'tab', title: 'Client Onboarding', subtitle: 'Client Module — create, draft and activate new clients', path: '/client-module/onboarding', permissionKey: 'client-onboarding', icon: 'onboarding' },
  { id: 'tab-client-approvals', kind: 'tab', title: 'Client Approvals', subtitle: 'Client Module — review and approve pricing before a client goes active', path: '/client-module/approvals', permissionKey: 'client-approvals', icon: 'approve' },
  { id: 'tab-client-directory', kind: 'tab', title: 'My Clients', subtitle: 'Client Module — roster of activated clients ready to book against', path: '/client-module/active-clients', permissionKey: 'client-directory', icon: 'building' },
  { id: 'tab-client-pricing-configuration', kind: 'tab', title: 'Client Pricing', subtitle: 'Client Module — standard rate card and pricing configuration', path: '/client-module/pricing-configuration', permissionKey: 'client-pricing-configuration', icon: 'grid' },
  { id: 'tab-client-configuration', kind: 'tab', title: 'Client Configuration', subtitle: 'Client Module — per-client configuration, coming soon', path: '/client-module/client-configuration', permissionKey: 'client-configuration', icon: 'settings' },
  { id: 'tab-client-email-logs', kind: 'tab', title: 'Client Email Logs', subtitle: 'Client Module — search a client to read their full email conversation', path: '/client-module/email-logs', permissionKey: 'client-email-logs', icon: 'mail' },
  { id: 'tab-client-prospects', kind: 'tab', title: 'Client Prospects', subtitle: 'Client Module — sales exec lead registration, pipeline tracking and conversion metrics', path: '/client-module/prospects', permissionKey: 'client-prospects', icon: 'tag' },
  { id: 'tab-create-order', kind: 'tab', title: 'Create Pickup', subtitle: 'Pickup Module — book a pickup, generate its AWB, and schedule pickup', path: '/order-module/create-order', permissionKey: 'create-order', icon: 'order' },
  { id: 'tab-my-orders', kind: 'tab', title: 'Pickup Dashboard', subtitle: 'Pickup Module — search, filter and act on every pickup across the network', path: '/order-module/my-orders', permissionKey: 'my-orders', icon: 'grid' },
  { id: 'tab-prs', kind: 'tab', title: 'PRS (Pickup Run Sheet)', subtitle: 'Pickup Module — generate and track the pickup run sheet for field executives', path: '/order-module/prs', permissionKey: 'prs', icon: 'grid' },
  { id: 'tab-create-docket', kind: 'tab', title: 'Create Docket', subtitle: 'Docket Module — coming soon', path: '/docket-module/create-docket', permissionKey: 'create-docket', icon: 'invoice' },
  { id: 'tab-docket-dashboard', kind: 'tab', title: 'Docket Dashboard', subtitle: 'Docket Module — coming soon', path: '/docket-module/dashboard', permissionKey: 'docket-dashboard', icon: 'grid' },
  { id: 'tab-routing-simulator', kind: 'tab', title: 'Routing Simulator', subtitle: 'Trip Module — aggregate orders by lane and build multi-leg trips', path: '/trip-management/routing-simulator', permissionKey: 'routing-simulator', icon: 'route' },
  { id: 'tab-tracking', kind: 'tab', title: 'Trip Tracking', subtitle: 'Trip Module — live manifest, vehicle location and exception alerts', path: '/trip-management/tracking', permissionKey: 'trip-tracking', icon: 'tracking' },
  { id: 'tab-past-trips', kind: 'tab', title: 'Past Trips', subtitle: 'Trip Module — completed manifests, POD and trip-level history', path: '/trip-management/past-trips', permissionKey: 'past-trips', icon: 'history' },
  { id: 'tab-trip-analytics', kind: 'tab', title: 'Trip Analytics', subtitle: 'Trip Module — on-time %, utilization, turnaround by lane and vendor', path: '/trip-management/analytics', permissionKey: 'trip-analytics', icon: 'analytics' },
  { id: 'tab-fleet-roster', kind: 'tab', title: 'Fleet & Vendor Roster', subtitle: 'Supply & Fleet Module — vendor fleet, owned assets, drivers and compliance', path: '/supply-fleet-module/fleet-roster', permissionKey: 'fleet-roster', icon: 'truck' },
  { id: 'tab-truck-assignment', kind: 'tab', title: 'Truck Assignment', subtitle: 'Supply & Fleet Module — auto-match trucks to pending AWBs', path: '/supply-fleet-module/truck-assignment', permissionKey: 'truck-assignment', icon: 'swap' },
  { id: 'nav-warehouse-hub-ops', kind: 'nav', title: 'Warehouse & Hub Ops', subtitle: 'Pallet allotment, barcode/QR scanning and hub-level sorting logs', path: '/warehouse-hub-ops', permissionKey: 'warehouse-hub-ops', icon: 'warehouse' },
  { id: 'tab-route-cost-simulator', kind: 'tab', title: 'Route & Cost Simulator', subtitle: 'Network Simulator — pull hub/vehicle/service levers and see cost & transit', path: '/network-simulator/route-cost', permissionKey: 'route-cost-simulator', icon: 'route' },
  { id: 'tab-freight-calculator', kind: 'tab', title: 'Freight Calculator', subtitle: 'Network Simulator — estimate freight for any lane, tier and weight', path: '/network-simulator/freight-calculator', permissionKey: 'freight-calculator', icon: 'calculator' },
  { id: 'tab-mis', kind: 'tab', title: 'MIS', subtitle: 'Finance Management — freight cost allocation and margin, rolled up', path: '/finance-management/mis', permissionKey: 'mis', icon: 'mis' },
  { id: 'tab-invoicing', kind: 'tab', title: 'Invoicing', subtitle: 'Finance Management — client billing, invoice generation and dispatch', path: '/finance-management/invoicing', permissionKey: 'invoicing', icon: 'invoice' },
  { id: 'tab-collections', kind: 'tab', title: 'Collections', subtitle: 'Finance Management — receivables ageing and collection follow-up', path: '/finance-management/collections', permissionKey: 'collections', icon: 'collections' },
  { id: 'tab-finance-analytics', kind: 'tab', title: 'Finance Analytics', subtitle: 'Finance Management — revenue, margin and DSO trends over time', path: '/finance-management/analytics', permissionKey: 'finance-analytics', icon: 'analytics' },

  // ---- Logic Engine concepts (no route of their own — all land on Logic Engine) ----
  { id: 'logic-client-attrs', kind: 'logic', title: 'Client Attributes', subtitle: 'Tiering, SLAs and special handling rules per client', path: '/logic-engine', permissionKey: 'logic-engine', icon: 'tag' },
  { id: 'logic-supply-demand', kind: 'logic', title: 'Supply-Demand', subtitle: 'Matching available capacity to booked demand by lane', path: '/logic-engine', permissionKey: 'logic-engine', icon: 'swap' },
  { id: 'logic-route-planning', kind: 'logic', title: 'Route Planning', subtitle: 'Hub network, lane sequencing and consolidation logic', path: '/logic-engine', permissionKey: 'logic-engine', icon: 'route' },
  { id: 'logic-prioritization', kind: 'logic', title: 'Prioritization', subtitle: 'What ships first when capacity is short', path: '/logic-engine', permissionKey: 'logic-engine', icon: 'flag' },

  // ---- Actions ----
  { id: 'action-new-client', kind: 'action', title: 'Create new client', subtitle: 'Start onboarding a client in the Client Module', path: '/client-module/onboarding/new', permissionKey: 'client-onboarding', icon: 'plus' },
  { id: 'action-new-order', kind: 'action', title: 'New pickup', subtitle: 'Start a booking in Pickup Module — Create Pickup', path: '/order-module/create-order', permissionKey: 'create-order', icon: 'plus' },
  { id: 'action-logout', kind: 'action', title: 'Log out', subtitle: 'End this session', path: null, permissionKey: null, icon: 'logout', run: 'logout' },
]

export function canAccess(item, can) {
  return item.permissionKey == null || can(item.permissionKey)
}

export function matchItem(item, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.title.toLowerCase().includes(q) ||
    (item.subtitle || '').toLowerCase().includes(q) ||
    item.kind.toLowerCase().includes(q) ||
    (item.permissionKey || '').toLowerCase().includes(q)
  )
}

// Nav + module map. `key` values double as permission keys checked against
// the logged-in user's `permissions` list (see data/users.js).

export const MODULES = [
  {
    key: 'dashboard',
    label: 'Birdview',
    to: '/',
    end: true,
    icon: 'dashboard',
  },
  {
    key: 'client-module',
    label: 'Client Module',
    icon: 'building',
    tagline: 'Client master data, KYC, tiering, rate cards & lane setup.',
    children: [
      { key: 'client-onboarding', label: 'Client Onboarding', to: '/client-module/onboarding', icon: 'onboarding', tagline: 'Create, draft and activate new clients.' },
      { key: 'client-approvals', label: 'Client Approvals', to: '/client-module/approvals', icon: 'approve', tagline: 'Review and approve pricing before a client goes active.' },
      { key: 'client-directory', label: 'My Clients', to: '/client-module/active-clients', icon: 'building', tagline: 'Roster of activated clients ready to book against.' },
      { key: 'client-pricing-configuration', label: 'Client Pricing', to: '/client-module/pricing-configuration', icon: 'grid', tagline: 'Standard rate card and pricing configuration for every client.' },
      { key: 'client-configuration', label: 'Client Configuration', to: '/client-module/client-configuration', icon: 'settings', tagline: 'Per-client configuration — coming soon.' },
      { key: 'client-email-logs', label: 'Client Email Logs', to: '/client-module/email-logs', icon: 'mail', tagline: 'Search a client to read their full email conversation, sorted by date.' },
      { key: 'client-prospects', label: 'Client Prospects', to: '/client-module/prospects', icon: 'tag', tagline: 'Sales exec lead registration, pipeline tracking and conversion metrics.' },
    ],
  },
  {
    key: 'partner-module',
    label: 'Partner Module',
    icon: 'partner',
    tagline: 'Onboard and manage the Agents, Co-loaders, Franchise and 3rd Party partners that work with us.',
    children: [
      { key: 'partner-onboarding', label: 'Partner Onboarding', to: '/partner-module/onboarding', icon: 'onboarding', tagline: 'Onboard a new Agent, Co-loader, Franchise or 3rd Party.' },
      { key: 'partner-approvals', label: 'Partner Approvals', to: '/partner-module/approvals', icon: 'approve', tagline: 'Review and approve a partner before they go live.' },
      { key: 'my-partners', label: 'My Partners', to: '/partner-module/my-partners', icon: 'building', tagline: 'Every onboarded partner, in one list.' },
      { key: 'partner-configuration', label: 'Partner Configuration', to: '/partner-module/configuration', icon: 'grid', tagline: 'Standard terms and configuration for every partner.' },
      { key: 'partner-email-logs', label: 'Partner Email Logs', to: '/partner-module/email-logs', icon: 'mail', tagline: 'Search a partner to read their full email conversation, sorted by date.' },
      { key: 'partner-prospects', label: 'Partner Prospects', to: '/partner-module/prospects', icon: 'tag', tagline: 'Supply exec lead registration, pipeline tracking and conversion metrics.' },
    ],
  },
  {
    key: 'order-module',
    label: 'Pickup Module',
    icon: 'order',
    tagline: 'Pickup intake and pickup tracking for the PTL network.',
    children: [
      { key: 'create-order', label: 'Create Pickup', to: '/order-module/create-order', icon: 'order', tagline: 'Book a pickup, generate its AWB, and schedule pickup.' },
      { key: 'my-orders', label: 'Pickup Dashboard', to: '/order-module/my-orders', icon: 'grid', tagline: 'Search, filter and act on every pickup across the network.' },
      { key: 'prs', label: 'PRS (Pickup Run Sheet)', to: '/order-module/prs', icon: 'grid', tagline: 'Generate and track the pickup run sheet for field executives.' },
    ],
  },
  {
    key: 'docket-module',
    label: 'Docket Module',
    icon: 'invoice',
    tagline: 'Docket creation and tracking for the PTL network.',
    children: [
      { key: 'create-docket', label: 'Create Docket', to: '/docket-module/create-docket', icon: 'invoice', tagline: 'Manually raise a docket for a pickup — for ops use.' },
      { key: 'docket-dashboard', label: 'Docket Dashboard', to: '/docket-module/dashboard', icon: 'grid', tagline: 'Track dockets raised from pickups, ready for trip.' },
      { key: 'eway-bill', label: 'E-way Bill Console', to: '/docket-module/eway-bill', icon: 'file', tagline: 'Generate, fetch and update e-way bills for clients and consignors.' },
      { key: 'docket-series', label: 'Docket Series', to: '/docket-module/docket-series', icon: 'invoice', tagline: 'Docket number series per client — ranges, usage and what is next.' },
      { key: 'package-series', label: 'Package Series', to: '/docket-module/package-series', icon: 'tag', tagline: '12-digit parcel barcodes — automated and stock labels mapped to dockets.' },
    ],
  },
  {
    key: 'trip-management',
    label: 'Trip Module',
    icon: 'trip',
    tagline: 'Order aggregation, multi-leg trip construction, and execution tracking.',
    children: [
      { key: 'routing-simulator', label: 'Routing Simulator', to: '/trip-management/routing-simulator', icon: 'route', tagline: 'Aggregate orders by lane and build multi-leg (FM/MM/LM) trips.' },
      { key: 'trip-tracking', label: 'Trip Tracking', to: '/trip-management/tracking', icon: 'tracking', tagline: 'Live manifest, vehicle location and exception alerts.' },
      { key: 'past-trips', label: 'Past Trips', to: '/trip-management/past-trips', icon: 'history', tagline: 'Completed manifests, POD and trip-level history.' },
      { key: 'trip-analytics', label: 'Analytics', to: '/trip-management/analytics', icon: 'analytics', tagline: 'On-time %, utilization, turnaround by lane and vendor.' },
      { key: 'trip-ops-overview', label: 'Trip Ops · Overview', to: '/trip-management/trip-ops/overview', icon: 'grid', tagline: 'Trip Ops 1A — stage counts, docket stock at hubs and hand-off from pickups.' },
      { key: 'trip-route-pricing', label: 'Route & Pricing', to: '/trip-management/trip-ops/route-pricing', icon: 'route', tagline: 'Plan the hub-to-hub route, pick a lane and price the trip.' },
      { key: 'trip-vehicle', label: 'Vehicle Assign', to: '/trip-management/trip-ops/vehicle-assign', icon: 'trip', tagline: 'Assign vehicle, drivers and THC with document validation.' },
      { key: 'trip-manifest', label: 'Manifest · To-Fro', to: '/trip-management/trip-ops/manifest', icon: 'file', tagline: 'Build the to-fro manifest from docket stock at the hub.' },
      { key: 'trip-cewb', label: 'CEWB', to: '/trip-management/trip-ops/cewb', icon: 'invoice', tagline: 'Consolidated e-way bill for the manifest.' },
      { key: 'trip-scan', label: 'Multi-stop Scan → Descan', to: '/trip-management/trip-ops/scan-descan', icon: 'tracking', tagline: 'Scan at origin, descan at each pit-stop.' },
      { key: 'trip-arrival', label: 'Final Hub Arrival', to: '/trip-management/trip-ops/final-arrival', icon: 'history', tagline: 'Arrive at the final hub, reconcile and close the trip.' },
    ],
  },
  {
    key: 'supply-fleet-module',
    label: 'Supply & Fleet Module',
    icon: 'supply',
    tagline: 'Vendor fleet, owned assets, drivers and truck-to-AWB assignment.',
    children: [
      { key: 'fleet-roster', label: 'Fleet & Vendor Roster', to: '/supply-fleet-module/fleet-roster', icon: 'truck', tagline: 'Vendor fleet, owned assets, independent drivers and compliance.' },
      { key: 'truck-assignment', label: 'Truck Assignment', to: '/supply-fleet-module/truck-assignment', icon: 'swap', tagline: 'Auto-match trucks to pending AWBs by volumetric utilization.' },
    ],
  },
  {
    key: 'warehouse-module',
    label: 'Warehouse Module',
    icon: 'warehouse',
    tagline: 'Hub operations and the warehouse cost ledger.',
    children: [
      { key: 'warehouse-hub-ops', label: 'Ops', to: '/warehouse-module/ops', icon: 'warehouse', tagline: 'Pallet allotment, barcode/QR scanning and hub-level sorting logs.' },
      { key: 'hub-cost-ledger', label: 'Warehouse Cost Ledger', to: '/warehouse-module/hub-cost-ledger', icon: 'calculator', tagline: 'Log fixed and variable warehouse costs — the source of Level 2 Cost.' },
    ],
  },
  {
    key: 'network-simulator',
    label: 'Network Simulator',
    icon: 'route',
    tagline: 'Hub-and-spoke network simulation and a standalone freight calculator.',
    children: [
      { key: 'route-cost-simulator', label: 'Route & Cost Simulator', to: '/network-simulator/route-cost', icon: 'route', tagline: 'Pull network levers — hub routing, vehicle type, service level — and see cost & transit time.' },
      { key: 'freight-calculator', label: 'Freight Calculator', to: '/network-simulator/freight-calculator', icon: 'calculator', tagline: 'Estimate freight for any lane, tier and weight — no order required.' },
    ],
  },
  {
    key: 'finance-management',
    label: 'Finance Management',
    icon: 'finance',
    tagline: 'Cost allocation, billing and collections, LR by LR.',
    children: [
      { key: 'mis', label: 'MIS', to: '/finance-management/mis', icon: 'mis', tagline: 'Freight cost allocation and margin, rolled up for management.' },
      { key: 'invoicing', label: 'Invoicing', to: '/finance-management/invoicing', icon: 'invoice', tagline: 'Client billing, invoice generation and dispatch.' },
      { key: 'collections', label: 'Collections', to: '/finance-management/collections', icon: 'collections', tagline: 'Receivables ageing and collection follow-up.' },
      { key: 'finance-analytics', label: 'Analytics', to: '/finance-management/analytics', icon: 'analytics', tagline: 'Revenue, margin and DSO trends over time.' },
    ],
  },
  {
    key: 'costing-module',
    label: 'Costing Module',
    icon: 'costing',
    tagline: 'Cost-to-serve across the network — where it is incurred, how it tracks to budget, and where it is heading.',
    children: [
      { key: 'costing-concept', label: 'Concept 1', to: '/costing-module/concept', icon: 'info', tagline: 'What Costing means in FLOW — the concept, in plain words.' },
      { key: 'costing-method-2', label: 'Concept 2', to: '/costing-module/method-2', icon: 'calculator', tagline: 'Concept 2.' },
      { key: 'costing-method-3', label: 'Level 1 Cost', to: '/costing-module/method-3', icon: 'calculator', tagline: 'Level 1 — transport cost to docket.' },
      { key: 'hub-cost-method', label: 'Level 2 Cost', to: '/costing-module/hub-cost', icon: 'calculator', tagline: 'Level 2 — warehouse cost to docket.' },
      { key: 'net-cost', label: 'Level 3 Cost', to: '/costing-module/net-cost', icon: 'calculator', tagline: 'Everything not attributed in Level 1 or Level 2 — fully loaded cost.' },
      { key: 'finance-dashboard', label: 'Finance Dashboard', to: '/costing-module/finance-dashboard', icon: 'analytics', tagline: 'Gross revenue to Level 3 margin — trends, lanes, clients, hubs and insights.' },
      { key: 'cost-overview', label: 'Cost Overview', to: '/costing-module/overview', icon: 'analytics', tagline: 'Network cost by head, region, hub, lane and client — with budget variance and alerts.' },
      { key: 'cost-forecast', label: 'Forecast & What-if', to: '/costing-module/forecast', icon: 'calculator', tagline: 'Six-month cost forecast and scenario levers — diesel, volume, vendor rates, productivity.' },
    ],
  },
  {
    key: 'master-module',
    label: 'Master Module',
    icon: 'settings',
    tagline: 'Shared reference data — geography and logistics masters used across every other module.',
    children: [
      { key: 'geography-master', label: 'Geography Master', to: '/master-module/geography-master', icon: 'route', tagline: 'Geography Master — coming soon.' },
      { key: 'logistics-master', label: 'Location Master', to: '/master-module/logistics-master', icon: 'grid', tagline: 'Location Master — coming soon.' },
      { key: 'mapping-ladder', label: 'Logistics Ladder', to: '/master-module/mapping-ladder', icon: 'search', tagline: 'Search any State, City, Region, Hub… and see its full mapping across Geography + Logistics.' },
      { key: 'consignor-consignee-master', label: 'Consignor/Consignee', to: '/master-module/consignor-consignee-master', icon: 'user', tagline: 'Every consignor and consignee mapped across all clients, in one place.' },
      { key: 'box-master', label: 'Box Master', to: '/master-module/box-master', icon: 'grid', tagline: 'Standard carton sizes used to size pickups and dockets.' },
    ],
  },
  {
    key: 'logic-engine',
    label: 'Logic Engine',
    to: '/logic-engine',
    icon: 'logic',
    tagline: 'The rules that steer every other module.',
    children: [
      { key: 'client-attributes', label: 'Client Attributes', icon: 'tag', tagline: 'Tiering, SLAs and special handling rules per client.' },
      { key: 'supply-demand', label: 'Supply-Demand', icon: 'swap', tagline: 'Matching available capacity to booked demand by lane.' },
      { key: 'route-planning', label: 'Route Planning', icon: 'route', tagline: 'Hub network, lane sequencing and consolidation logic.' },
      { key: 'prioritization', label: 'Prioritization', icon: 'flag', tagline: 'What ships first when capacity is short.' },
    ],
  },
]

export const ADMIN_MODULE = {
  key: 'user-module',
  label: 'User Module',
  icon: 'shield',
  tagline: 'Roles, permissions and manager-delegated access for the LT Team login.',
  children: [
    {
      key: 'access-management',
      label: 'Access Management',
      to: '/user-module/access-management',
      icon: 'shield',
      tagline: 'Roles, function-level permissions and city access for the LT Team login.',
    },
    {
      key: 'user-relations',
      label: 'User Management',
      to: '/user-module/user-relations',
      icon: 'onboarding',
      tagline: "Map reportees to managers; managers can delegate from their own access.",
    },
    {
      key: 'my-profile',
      label: 'My Profile',
      to: '/user-module/my-profile',
      icon: 'user',
      tagline: 'Your own identity, reporting line and access — view-only except a couple of contact fields.',
    },
  ],
}

// A read-only reference page — not an operational module in its own right,
// so it's kept as its own flat sidebar entry (rendered below User Module,
// see Sidebar.jsx) rather than folded into any group above.
export const SYSTEM_INFO_MODULE = {
  key: 'system-info',
  label: 'System Info',
  to: '/system-info',
  icon: 'info',
  tagline: 'How every module connects — a read-only reference, not a working screen.',
}

export function findModuleByKey(key) {
  for (const m of MODULES) {
    if (m.key === key) return m
    if (m.children) {
      const child = m.children.find((c) => c.key === key)
      if (child) return child
    }
  }
  if (ADMIN_MODULE.key === key) return ADMIN_MODULE
  const adminChild = ADMIN_MODULE.children.find((c) => c.key === key)
  if (adminChild) return adminChild
  if (SYSTEM_INFO_MODULE.key === key) return SYSTEM_INFO_MODULE
  return null
}

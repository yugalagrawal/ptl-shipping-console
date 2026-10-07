// Function-level permission catalog for the User Module (Roles & Permissions).
// Displayed in Access Management as "Tasks" now — "Function" was repurposed
// for the new department field below (DEPARTMENTS/ROLE_DEPARTMENT). Internal
// names here (FUNCTIONS, ROLE_DEFAULTS, hasFunction, etc.) are unchanged to
// avoid rippling the rename through every call site — this is a UI label
// change only, same discipline as the earlier Dashboard→Birdview rename.
//
// A "function" (Task, in the UI) is `<module-key>.<verb>` — module-key matches the same keys
// used for sidebar gating in data/modules.js, just split into view/manage
// where a page has a real create/edit/approve action worth gating separately
// from plain viewing. Read-only pages (analytics, tracking, history) only
// get a `.view` function.
//
// Roles are fixed presets for now (Yugal: "will create role buckets later,
// for now you make on your own") — a role is just a named bundle of function
// ids, same as LT-Console's roleDefaults. Not independently CRUD-able yet.
//
// Geographic access is a second, independent scoping dimension layered on
// top of functions (same as LT-Console): a user with an empty list at any
// tier has unrestricted access across every value at that tier; a non-empty
// list restricts them to those values only. It's a 4-tier network hierarchy,
// broadest to narrowest (renamed and restructured 2026-08-14, per Yugal):
//   Region (multi-state, e.g. "West 1" — was called "Zone") > Zone (one Hub
//   + every Branch that reports to it, e.g. "Bhiwandi Hub" and its branches)
//   > Hub (the one cross-dock facility inside that Zone, exposed as its own
//   checkbox for flexibility even though today it's 1:1 with its Zone) >
//   Mini Hub (the real leaf-level satellite/last-mile facility). "Branch" is
//   NOT a stored 5th tier — it's a UI-only grouping header inside the Mini
//   Hub dropdown (`BranchMiniHubDropdown` in AccessManagement.jsx), with its
//   own master checkbox: checking "Mundka Branch" checks every Mini Hub
//   under it in one go, and each Mini Hub can still be individually
//   unchecked afterward. The old City grouping layer was dropped earlier —
//   a Hub's Branches are a flat list, not grouped by city. Each tier's
//   dropdown narrows to whatever's selected above it; picking a broader
//   tier auto-checks everything under it (down to Mini Hub), and clearing a
//   broader pick auto-drops the narrower picks that only made sense under
//   it — see the toggle* cascades in AccessManagement.jsx. First rough pass,
//   flagged for refinement.

export const MODULE_ORDER = ['Birdview', 'Client Module', 'Partner Module', 'Pickup Module', 'Docket Module', 'Trip Module', 'Supply & Fleet Module', 'Warehouse & Hub Ops', 'Network Simulator', 'Finance Management', 'Costing Module', 'Master Module', 'Logic Engine', 'Admin', 'System Info']

export const FUNCTIONS = [
  { id: 'dashboard.view', label: 'View', module: 'Birdview' },

  { id: 'client-onboarding.view', label: 'View', module: 'Client Module' },
  { id: 'client-onboarding.manage', label: 'Create / edit drafts', module: 'Client Module' },
  { id: 'client-approvals.view', label: 'View', module: 'Client Module' },
  { id: 'client-approvals.manage-onboarding', label: 'Approve onboarding details (Sales)', module: 'Client Module' },
  { id: 'client-approvals.manage', label: 'Approve pricing (Finance)', module: 'Client Module' },
  { id: 'client-directory.view', label: 'View', module: 'Client Module' },
  { id: 'client-directory.manage', label: 'Edit pricing', module: 'Client Module' },
  { id: 'client-pricing-configuration.view', label: 'View', module: 'Client Module' },
  { id: 'client-configuration.view', label: 'View', module: 'Client Module' },
  { id: 'client-configuration.manage', label: 'Edit configuration (Sales)', module: 'Client Module' },
  { id: 'client-email-logs.view', label: 'View', module: 'Client Module' },
  { id: 'client-prospects.view', label: 'View', module: 'Client Module' },

  { id: 'partner-onboarding.view', label: 'View', module: 'Partner Module' },
  { id: 'partner-onboarding.manage', label: 'Onboard / edit partners', module: 'Partner Module' },
  { id: 'partner-approvals.view', label: 'View', module: 'Partner Module' },
  { id: 'partner-approvals.manage', label: 'Approve partners', module: 'Partner Module' },
  { id: 'my-partners.view', label: 'View', module: 'Partner Module' },
  { id: 'partner-configuration.view', label: 'View', module: 'Partner Module' },
  { id: 'partner-email-logs.view', label: 'View', module: 'Partner Module' },
  { id: 'partner-prospects.view', label: 'View', module: 'Partner Module' },

  { id: 'create-order.view', label: 'View', module: 'Pickup Module' },
  { id: 'create-order.manage', label: 'Create / edit orders', module: 'Pickup Module' },
  { id: 'my-orders.view', label: 'View', module: 'Pickup Module' },
  { id: 'prs.view', label: 'View', module: 'Pickup Module' },

  { id: 'create-docket.view', label: 'View', module: 'Docket Module' },
  { id: 'create-docket.manage', label: 'Create dockets', module: 'Docket Module' },
  { id: 'docket-dashboard.view', label: 'View', module: 'Docket Module' },
  { id: 'eway-bill.view', label: 'View', module: 'Docket Module' },
  { id: 'eway-bill.manage', label: 'Create & update e-way bills', module: 'Docket Module' },

  { id: 'routing-simulator.view', label: 'View', module: 'Trip Module' },
  { id: 'routing-simulator.manage', label: 'Build & confirm trips', module: 'Trip Module' },
  { id: 'trip-tracking.view', label: 'View', module: 'Trip Module' },
  { id: 'past-trips.view', label: 'View', module: 'Trip Module' },
  { id: 'trip-analytics.view', label: 'View', module: 'Trip Module' },

  { id: 'fleet-roster.view', label: 'View', module: 'Supply & Fleet Module' },
  { id: 'fleet-roster.manage', label: 'Onboard / edit fleet & drivers', module: 'Supply & Fleet Module' },
  { id: 'truck-assignment.view', label: 'View', module: 'Supply & Fleet Module' },
  { id: 'truck-assignment.manage', label: 'Assign / reassign trucks', module: 'Supply & Fleet Module' },

  { id: 'warehouse-hub-ops.view', label: 'View', module: 'Warehouse & Hub Ops' },

  { id: 'route-cost-simulator.view', label: 'View', module: 'Network Simulator' },
  { id: 'freight-calculator.view', label: 'View', module: 'Network Simulator' },

  { id: 'mis.view', label: 'View', module: 'Finance Management' },
  { id: 'invoicing.view', label: 'View', module: 'Finance Management' },
  { id: 'invoicing.manage', label: 'Generate / dispatch', module: 'Finance Management' },
  { id: 'collections.view', label: 'View', module: 'Finance Management' },
  { id: 'collections.manage', label: 'Record follow-up', module: 'Finance Management' },
  { id: 'finance-analytics.view', label: 'View', module: 'Finance Management' },

  { id: 'cost-overview.view', label: 'View', module: 'Costing Module' },
  { id: 'cost-forecast.view', label: 'View', module: 'Costing Module' },

  { id: 'geography-master.view', label: 'View', module: 'Master Module' },
  { id: 'geography-master.manage', label: 'Add / edit geography mapping', module: 'Master Module' },
  { id: 'logistics-master.view', label: 'View', module: 'Master Module' },
  { id: 'logistics-master.manage', label: 'Add / edit location mapping', module: 'Master Module' },
  { id: 'mapping-ladder.view', label: 'View', module: 'Master Module' },
  { id: 'mapping-ladder.manage', label: 'Edit the underlying geography / logistics row', module: 'Master Module' },
  { id: 'consignor-consignee-master.view', label: 'View', module: 'Master Module' },
  { id: 'consignor-consignee-master.manage', label: 'Create parties / change client mapping', module: 'Master Module' },

  { id: 'logic-engine.view', label: 'View', module: 'Logic Engine' },
  { id: 'logic-engine.manage', label: 'Edit rules', module: 'Logic Engine' },

  { id: 'access-management.manage', label: 'Manage roles, permissions & city access', module: 'Admin' },
  { id: 'user-relations.manage', label: 'Manage manager mapping (org-wide)', module: 'Admin' },

  // Read-only reference page — granted to every LT Team role by default
  // (added explicitly below to each named role, not just Super Admin/Read
  // Only) since it's harmless system documentation, not an operational
  // permission.
  { id: 'system-info.view', label: 'View', module: 'System Info' },
]

// Shared Access Level vocabulary (Read Only / Edit / Approve / Create) — one
// list reused by every Task instead of each task inventing its own verb.
export const ACCESS_LEVELS = ['Read Only', 'Edit', 'Approve', 'Create']

// Access Management's "Tasks" section is organized by PAGE, not by raw
// FUNCTIONS id — Yugal's correction: the earlier version listed every id as
// its own row (several identically-labeled "View" checkboxes with no
// grouping), which read as confused rather than dense. Each RAW_TASKS entry
// is one page; `levels` declares whichever real FUNCTIONS id already existed
// for that page (e.g. Read Only → `.view`), and `withAllLevels` below fills
// in a synthesized id (`<task.id>.<slug>`) for every level a page didn't
// already have — per Yugal's explicit ask, every task shows the same 4
// pills (Read Only/Edit/Approve/Create), independently selectable, not just
// whichever verbs happened to exist in the old catalog. The synthesized ids
// are net-new and not yet read by any real gate elsewhere in the app (e.g.
// there's no actual "Approve" action on Birdview) — they exist so the UI is
// uniform now; wiring real behavior to them is a future step if it's ever
// needed.
//
// Client Approvals is the one deliberate exception to "one task per page":
// it stays two Tasks (Onboarding / Pricing) because those are genuinely
// independent approval stages gated by different ids today (Sales Admin
// only ever gets `.manage-onboarding`, Finance Admin only ever gets
// `.manage`) — collapsing them into one task would erase that split.
const RAW_TASKS = [
  { id: 'dashboard', label: 'Birdview', module: 'Birdview', levels: { 'Read Only': 'dashboard.view' } },

  { id: 'client-onboarding', label: 'Client Onboarding', module: 'Client Module', levels: { 'Read Only': 'client-onboarding.view', 'Create': 'client-onboarding.manage' } },
  { id: 'client-approvals-onboarding', label: 'Client Approvals — Onboarding', module: 'Client Module', levels: { 'Read Only': 'client-approvals.view', 'Approve': 'client-approvals.manage-onboarding' } },
  { id: 'client-approvals-pricing', label: 'Client Approvals — Pricing', module: 'Client Module', levels: { 'Read Only': 'client-approvals.view', 'Approve': 'client-approvals.manage' } },
  { id: 'client-directory', label: 'My Clients', module: 'Client Module', levels: { 'Read Only': 'client-directory.view', 'Edit': 'client-directory.manage' } },
  { id: 'client-pricing-configuration', label: 'Client Pricing', module: 'Client Module', levels: { 'Read Only': 'client-pricing-configuration.view' } },
  { id: 'client-configuration', label: 'Client Configuration', module: 'Client Module', levels: { 'Read Only': 'client-configuration.view', 'Edit': 'client-configuration.manage' } },
  { id: 'client-email-logs', label: 'Client Email Logs', module: 'Client Module', levels: { 'Read Only': 'client-email-logs.view' } },
  { id: 'client-prospects', label: 'Client Prospects', module: 'Client Module', levels: { 'Read Only': 'client-prospects.view' } },

  { id: 'partner-onboarding', label: 'Partner Onboarding', module: 'Partner Module', levels: { 'Read Only': 'partner-onboarding.view', 'Create': 'partner-onboarding.manage' } },
  { id: 'partner-approvals', label: 'Partner Approvals', module: 'Partner Module', levels: { 'Read Only': 'partner-approvals.view', 'Approve': 'partner-approvals.manage' } },
  { id: 'my-partners', label: 'My Partners', module: 'Partner Module', levels: { 'Read Only': 'my-partners.view' } },
  { id: 'partner-configuration', label: 'Partner Configuration', module: 'Partner Module', levels: { 'Read Only': 'partner-configuration.view' } },
  { id: 'partner-email-logs', label: 'Partner Email Logs', module: 'Partner Module', levels: { 'Read Only': 'partner-email-logs.view' } },
  { id: 'partner-prospects', label: 'Partner Prospects', module: 'Partner Module', levels: { 'Read Only': 'partner-prospects.view' } },

  { id: 'create-order', label: 'Create Pickup', module: 'Pickup Module', levels: { 'Read Only': 'create-order.view', 'Create': 'create-order.manage' } },
  { id: 'my-orders', label: 'Pickup Dashboard', module: 'Pickup Module', levels: { 'Read Only': 'my-orders.view' } },
  { id: 'prs', label: 'PRS (Pickup Run Sheet)', module: 'Pickup Module', levels: { 'Read Only': 'prs.view' } },

  { id: 'create-docket', label: 'Create Docket', module: 'Docket Module', levels: { 'Read Only': 'create-docket.view', 'Create': 'create-docket.manage' } },
  { id: 'docket-dashboard', label: 'Docket Dashboard', module: 'Docket Module', levels: { 'Read Only': 'docket-dashboard.view' } },
  { id: 'eway-bill', label: 'E-way Bill Console', module: 'Docket Module', levels: { 'Read Only': 'eway-bill.view', 'Create': 'eway-bill.manage' } },

  { id: 'routing-simulator', label: 'Routing Simulator', module: 'Trip Module', levels: { 'Read Only': 'routing-simulator.view', 'Create': 'routing-simulator.manage' } },
  { id: 'trip-tracking', label: 'Trip Tracking', module: 'Trip Module', levels: { 'Read Only': 'trip-tracking.view' } },
  { id: 'past-trips', label: 'Past Trips', module: 'Trip Module', levels: { 'Read Only': 'past-trips.view' } },
  { id: 'trip-analytics', label: 'Analytics', module: 'Trip Module', levels: { 'Read Only': 'trip-analytics.view' } },

  { id: 'fleet-roster', label: 'Fleet & Vendor Roster', module: 'Supply & Fleet Module', levels: { 'Read Only': 'fleet-roster.view', 'Create': 'fleet-roster.manage' } },
  { id: 'truck-assignment', label: 'Truck Assignment', module: 'Supply & Fleet Module', levels: { 'Read Only': 'truck-assignment.view', 'Edit': 'truck-assignment.manage' } },

  { id: 'warehouse-hub-ops', label: 'Warehouse & Hub Ops', module: 'Warehouse & Hub Ops', levels: { 'Read Only': 'warehouse-hub-ops.view' } },

  { id: 'route-cost-simulator', label: 'Route & Cost Simulator', module: 'Network Simulator', levels: { 'Read Only': 'route-cost-simulator.view' } },
  { id: 'freight-calculator', label: 'Freight Calculator', module: 'Network Simulator', levels: { 'Read Only': 'freight-calculator.view' } },

  { id: 'mis', label: 'MIS', module: 'Finance Management', levels: { 'Read Only': 'mis.view' } },
  { id: 'invoicing', label: 'Invoicing', module: 'Finance Management', levels: { 'Read Only': 'invoicing.view', 'Create': 'invoicing.manage' } },
  { id: 'collections', label: 'Collections', module: 'Finance Management', levels: { 'Read Only': 'collections.view', 'Edit': 'collections.manage' } },
  { id: 'finance-analytics', label: 'Analytics', module: 'Finance Management', levels: { 'Read Only': 'finance-analytics.view' } },

  { id: 'cost-overview', label: 'Cost Overview', module: 'Costing Module', levels: { 'Read Only': 'cost-overview.view' } },
  { id: 'cost-forecast', label: 'Forecast & What-if', module: 'Costing Module', levels: { 'Read Only': 'cost-forecast.view' } },

  { id: 'geography-master', label: 'Geography Master', module: 'Master Module', levels: { 'Read Only': 'geography-master.view', 'Edit': 'geography-master.manage' } },
  { id: 'logistics-master', label: 'Location Master', module: 'Master Module', levels: { 'Read Only': 'logistics-master.view', 'Edit': 'logistics-master.manage' } },
  { id: 'mapping-ladder', label: 'Logistics Ladder', module: 'Master Module', levels: { 'Read Only': 'mapping-ladder.view', 'Edit': 'mapping-ladder.manage' } },
  { id: 'consignor-consignee-master', label: 'Consignor/Consignee', module: 'Master Module', levels: { 'Read Only': 'consignor-consignee-master.view', 'Edit': 'consignor-consignee-master.manage' } },

  { id: 'logic-engine', label: 'Logic Engine', module: 'Logic Engine', levels: { 'Read Only': 'logic-engine.view', 'Edit': 'logic-engine.manage' } },

  { id: 'access-management', label: 'Access Management', module: 'Admin', levels: { 'Edit': 'access-management.manage' } },
  { id: 'user-relations', label: 'User Management', module: 'Admin', levels: { 'Edit': 'user-relations.manage' } },

  { id: 'system-info', label: 'System Info', module: 'System Info', levels: { 'Read Only': 'system-info.view' } },
]

const LEVEL_SLUG = { 'Read Only': 'view', 'Edit': 'edit', 'Approve': 'approve', 'Create': 'create' }

export const TASKS = RAW_TASKS.map((task) => {
  const levels = { ...task.levels }
  for (const level of ACCESS_LEVELS) {
    if (!levels[level]) levels[level] = `${task.id}.${LEVEL_SLUG[level]}`
  }
  return { ...task, levels }
})

export const TASKS_BY_MODULE = MODULE_ORDER.map((moduleName) => ({
  module: moduleName,
  tasks: TASKS.filter((t) => t.module === moduleName),
})).filter((g) => g.tasks.length)

// Every task now carries all 4 levels (real id or synthesized), so deriving
// the full id catalog and the "Read Only" subset from TASKS instead of the
// old FUNCTIONS-only filter picks up the synthesized ids too — otherwise
// Super Admin (`ALL_FUNCTION_IDS`) and Tech Executive (`ALL_VIEW_IDS`) would show
// the new Edit/Approve/Create pills as unchecked even where they should be
// "everything"/"every view", by construction.
const ALL_FUNCTION_IDS = [...new Set([...FUNCTIONS.map((f) => f.id), ...TASKS.flatMap((t) => Object.values(t.levels))])]
const ALL_VIEW_IDS = TASKS.map((t) => t.levels['Read Only'])

export const ROLE_DEFAULTS = {
  'Super Admin': ALL_FUNCTION_IDS,
  'Ops Manager': [
    'dashboard.view',
    'client-onboarding.view', 'client-onboarding.manage',
    'client-approvals.view', 'client-approvals.manage-onboarding', 'client-approvals.manage',
    'client-directory.view', 'client-directory.manage',
    'client-pricing-configuration.view', 'client-configuration.view', 'client-configuration.manage',
    'client-email-logs.view',
    'partner-onboarding.view', 'partner-onboarding.manage',
    'partner-approvals.view', 'partner-approvals.manage',
    'my-partners.view', 'partner-configuration.view', 'partner-email-logs.view',
    'create-order.view', 'create-order.manage', 'my-orders.view',
    'routing-simulator.view', 'routing-simulator.manage',
    'trip-tracking.view', 'past-trips.view', 'trip-analytics.view',
    'fleet-roster.view', 'fleet-roster.manage', 'truck-assignment.view', 'truck-assignment.manage',
    'warehouse-hub-ops.view',
    'route-cost-simulator.view', 'freight-calculator.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  'Finance Manager': [
    'dashboard.view',
    'mis.view',
    'invoicing.view', 'invoicing.manage',
    'collections.view', 'collections.manage',
    'finance-analytics.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  'Client Success': [
    'dashboard.view',
    'client-onboarding.view',
    'client-directory.view',
    'client-email-logs.view',
    'create-order.view', 'my-orders.view',
    'trip-tracking.view', 'past-trips.view',
    'route-cost-simulator.view', 'freight-calculator.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  // Onboards new clients (the New Client wizard) — no approvals access.
  'Sales Executive': [
    'client-onboarding.view', 'client-onboarding.manage',
    'client-directory.view',
    'client-email-logs.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  // Stage 1 of Client Approvals — reviews everything except Billing &
  // Pricing (identity, GSTIN, KYC completeness), then hands off to Finance
  // Admin. Deliberately does NOT get 'client-approvals.manage' (pricing
  // approval) — that's Finance Admin's alone. Also owns Client Configuration
  // (the per-client operational settings, not pricing) — a client lands
  // there the moment KYC is submitted, and Sales Admin is who checks/edits
  // it from then on, active or still pending.
  'Sales Admin': [
    'dashboard.view',
    'client-approvals.view', 'client-approvals.manage-onboarding',
    'client-directory.view',
    'client-configuration.view', 'client-configuration.manage',
    'client-email-logs.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  // Stage 2 of Client Approvals — reviews the zone matrix + additional
  // charges once Sales Admin has cleared a client, and is the one who
  // actually activates it.
  'Finance Admin': [
    'dashboard.view',
    'client-approvals.view', 'client-approvals.manage',
    'client-directory.view',
    'client-pricing-configuration.view', 'client-configuration.view',
    'client-email-logs.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  // Renamed from "Read Only" (Yugal's explicit ask) — same view-only default
  // access, just a role name that reads as a real job title.
  'Tech Executive': ALL_VIEW_IDS,

  // Onboards new partners (the New Partner wizard) — no approvals access.
  // Mirrors Sales Executive's own scope in Client Module.
  'Supply Executive': [
    'dashboard.view',
    'partner-onboarding.view', 'partner-onboarding.manage',
    'my-partners.view',
    'partner-email-logs.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],
  // Single-stage Partner Approvals — reviews and activates a partner (no
  // separate pricing sign-off yet, unlike Client Approvals' Sales/Finance
  // split). Also owns Partner Configuration once that's built.
  'Supply Admin': [
    'dashboard.view',
    'partner-approvals.view', 'partner-approvals.manage',
    'my-partners.view',
    'partner-configuration.view',
    'partner-email-logs.view',
    'geography-master.view', 'logistics-master.view', 'mapping-ladder.view', 'consignor-consignee-master.view',
    'system-info.view',
  ],

  // External Partners presets — non-LT-Team identity kinds (see `parentEmail`
  // on data/users.js LT_USER) that will eventually log in as their own
  // account under a parent, not as an internal reportee. No such login flow
  // exists yet, so these are provisional/best-guess defaults (view-only,
  // scoped to what an outside party plausibly needs to see) — flagged for
  // Yugal to refine once the real agent/co-loader/franchise workflows exist.
  'Agent': ['create-order.view', 'my-orders.view', 'trip-tracking.view', 'system-info.view'],
  'Coloader': ['my-orders.view', 'trip-tracking.view', 'past-trips.view', 'system-info.view'],
  'Franchise': ['client-directory.view', 'my-orders.view', 'trip-tracking.view', 'system-info.view'],
}

export const ROLE_NAMES = Object.keys(ROLE_DEFAULTS)

// Access Management's new top-level "Function" field (Yugal's term for
// department — not to be confused with the permission-catalog entries above,
// which the UI now calls "Task" instead; see FUNCTIONS/ROLE_DEFAULTS naming
// note below). Picking a Function narrows which Role Presets are offered,
// since every role belongs to exactly one department. A person can sit in
// more than one Function at once (multi-select) — Role Presets then shows
// the union of roles across every selected department.
export const DEPARTMENTS = ['Operations', 'Sales', 'Finance', 'Supply', 'Tech', 'External Partners']

export const ROLE_DEPARTMENT = {
  'Super Admin': 'Tech',
  'Ops Manager': 'Operations',
  'Finance Manager': 'Finance',
  'Client Success': 'Operations',
  'Sales Executive': 'Sales',
  'Sales Admin': 'Sales',
  'Finance Admin': 'Finance',
  'Supply Executive': 'Supply',
  'Supply Admin': 'Supply',
  'Tech Executive': 'Tech',
  'Agent': 'External Partners',
  'Coloader': 'External Partners',
  'Franchise': 'External Partners',
}

export function rolesForDepartments(departments) {
  return ROLE_NAMES.filter((r) => departments.includes(ROLE_DEPARTMENT[r]))
}

// Region access reuses the same 13 lane/pricing zones from data/pricing.js
// (e.g. "West 1", "South 2") rather than inventing a second regional master
// list — a Regional Head's access footprint is the same "West 1" that the
// rate card and lane pricing already speak in. Renamed from "Zone" (Yugal's
// correction — "Zone" now means something narrower, see NETWORK_ZONES
// below) — the underlying export name stays `ZONES` (unchanged from
// pricing.js, and pricing.js's own "zone" vocabulary is out of scope here) —
// this is a UI-label-only rename, same discipline as Function/Task earlier.
// Every region now has at least one hub (Yugal: "make them long lists with
// variety") — the earlier deliberate empty states in North 3/South 4/East
// 2/both North East regions were filled in with real-sounding facilities
// rather than kept sparse, since a short list was the actual complaint here.
export { ZONES } from './pricing.js'

// City→Branch master data — kept under its original name/shape (`CITIES`,
// `CITY_BRANCHES`) since `NewClient.jsx`'s Billing Info "centralised
// payment" cascade (a different, finance-ops use of "branch") also reads
// from these directly. Individual facility names reverted from "X Mini Hub"
// back to "X Branch" (undoing the 2026-08-11 rename) per Yugal's new
// Region/Zone/Hub/Branch terminology — Branch is once again the leaf name.
// The alternate name "Mini-Hub" is surfaced once, on the section label
// itself ("Branch (Mini-Hub) Access" in AccessManagement.jsx) rather than
// repeated on every individual branch string — Yugal's correction after an
// earlier pass baked it into each item. Expanded from 15 cities/~12 branches
// to 30 cities/~65 branches for variety — the 15 new cities exist only here
// (not added to NewClient.jsx's own `CITY_TO_STATE` map, so they won't show
// up in the unrelated Billing "centralised payment" city dropdown — a small,
// deliberate scope boundary, not an oversight).
export const CITIES = [
  'Mumbai', 'New Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad',
  'Jaipur', 'Gurugram', 'Noida', 'Kochi', 'Chandigarh', 'Bhubaneswar', 'Ranchi',
  'Karnal', 'Panipat', 'Ludhiana', 'Lucknow', 'Kanpur', 'Surat', 'Nagpur', 'Indore',
  'Sriperumbudur', 'Thiruvananthapuram', 'Coimbatore', 'Visakhapatnam', 'Patna', 'Agartala', 'Guwahati',
]

export const CITY_BRANCHES = {
  'Mumbai': ['Andheri Branch', 'Kurla Branch', 'Bhandup Branch'],
  'New Delhi': ['Mundka Branch', 'Narela Branch'],
  'Gurugram': ['Udyog Vihar Branch', 'Manesar Branch', 'Sohna Road Branch'],
  'Noida': ['Sector 63 Branch', 'Greater Noida Branch', 'Sector 18 Branch'],
  'Bengaluru': ['Whitefield Branch', 'Electronic City Branch', 'Yeshwanthpur Branch'],
  'Chennai': ['Guindy Branch', 'Perungudi Branch', 'Tambaram Branch'],
  'Kolkata': ['Park Circus Branch', 'Howrah Branch', 'Salt Lake Branch'],
  'Hyderabad': ['LB Nagar Branch', 'Kukatpally Branch', 'Gachibowli Branch'],
  'Pune': ['Hadapsar Branch', 'Hinjewadi Branch', 'Wakad Branch'],
  'Ahmedabad': ['Naroda Branch', 'Bopal Branch', 'Maninagar Branch'],
  'Jaipur': ['Vishwakarma Branch', 'Malviya Nagar Branch', 'Vaishali Nagar Branch'],
  'Kochi': ['Edapally Branch', 'Kakkanad Branch', 'Aluva Branch'],
  'Chandigarh': ['Manimajra Branch', 'Zirakpur Branch'],
  'Bhubaneswar': ['Patia Branch', 'Chandrasekharpur Branch'],
  'Ranchi': ['Kanke Branch', 'Namkum Branch'],
  'Karnal': ['Sector 12 Branch', 'Kunjpura Road Branch'],
  'Panipat': ['G.T. Road Branch', 'Sanoli Road Branch'],
  'Ludhiana': ['Ferozepur Road Branch', 'Dugri Branch'],
  'Lucknow': ['Gomti Nagar Branch', 'Aliganj Branch'],
  'Kanpur': ['Civil Lines Branch', 'Kidwai Nagar Branch'],
  'Surat': ['Udhna Branch', 'Adajan Branch'],
  'Nagpur': ['Hingna Branch', 'Kalamna Branch'],
  'Indore': ['Rau Branch', 'Bhawarkuan Branch'],
  'Sriperumbudur': ['Oragadam Branch', 'Sunguvarchatram Branch'],
  'Thiruvananthapuram': ['Technopark Branch', 'Peroorkada Branch'],
  'Coimbatore': ['Peelamedu Branch', 'Saravanampatti Branch'],
  'Visakhapatnam': ['Gajuwaka Branch', 'Madhurawada Branch'],
  'Patna': ['Kankarbagh Branch', 'Boring Road Branch'],
  'Agartala': ['Airport Road Branch', 'Battala Branch'],
  'Guwahati': ['Fancy Bazar Branch', 'Beltola Branch'],
}

// The real cross-dock facilities, still keyed by their own Hub name and
// tagged with the Region (old "Zone") they sit in — same source data as
// before, just no longer exported as the access-scoping tier itself
// (NETWORK_ZONES below derives from it instead). Expanded from 13 hubs
// spanning 8 of the 13 regions to 27 hubs spanning all 13. `zoneName` is a
// distinct identity for the Zone tier, named after the area it serves
// rather than the Hub facility — Yugal's correction: Zone Access was
// literally showing the Hub's own name (e.g. "Okhla Hub"), which both
// leaked the word "Hub" into a different tier and meant Zone and Hub read
// as the same name twice. Genuinely different strings now (e.g. Zone
// "Delhi NCR Zone" vs Hub "Okhla Hub"), not just a suffix swap on the same
// base word.
const HUBS = [
  { hub: 'Okhla Hub', zoneName: 'Delhi NCR Zone', zone: 'North 1', cities: ['New Delhi', 'Gurugram', 'Noida'] },
  { hub: 'Karnal Hub', zoneName: 'Karnal-Panipat Zone', zone: 'North 1', cities: ['Karnal', 'Panipat'] },
  { hub: 'Sitapura Hub', zoneName: 'Jaipur Zone', zone: 'North 2', cities: ['Jaipur'] },
  { hub: 'Industrial Area Hub', zoneName: 'Chandigarh Zone', zone: 'North 2', cities: ['Chandigarh'] },
  { hub: 'Focal Point Hub', zoneName: 'Ludhiana Zone', zone: 'North 2', cities: ['Ludhiana'] },
  { hub: 'Amausi Hub', zoneName: 'Lucknow Zone', zone: 'North 3', cities: ['Lucknow'] },
  { hub: 'Kalyanpur Hub', zoneName: 'Kanpur Zone', zone: 'North 3', cities: ['Kanpur'] },
  { hub: 'Bhiwandi Hub', zoneName: 'Mumbai Zone', zone: 'West 1', cities: ['Mumbai'] },
  { hub: 'Vatva Hub', zoneName: 'Ahmedabad Zone', zone: 'West 1', cities: ['Ahmedabad'] },
  { hub: 'Sachin Hub', zoneName: 'Surat Zone', zone: 'West 1', cities: ['Surat'] },
  { hub: 'Chakan Hub', zoneName: 'Pune Zone', zone: 'West 2', cities: ['Pune'] },
  { hub: 'Butibori Hub', zoneName: 'Nagpur Zone', zone: 'West 2', cities: ['Nagpur'] },
  { hub: 'Pithampur Hub', zoneName: 'Indore Zone', zone: 'West 2', cities: ['Indore'] },
  { hub: 'Peenya Hub', zoneName: 'Bengaluru Zone', zone: 'South 1', cities: ['Bengaluru'] },
  { hub: 'Balanagar Hub', zoneName: 'Hyderabad Zone', zone: 'South 1', cities: ['Hyderabad'] },
  { hub: 'Ambattur Hub', zoneName: 'Chennai Zone', zone: 'South 2', cities: ['Chennai'] },
  { hub: 'Sriperumbudur Hub', zoneName: 'Sriperumbudur Zone', zone: 'South 2', cities: ['Sriperumbudur'] },
  { hub: 'Kalamassery Hub', zoneName: 'Kochi Zone', zone: 'South 3', cities: ['Kochi'] },
  { hub: 'Kazhakkoottam Hub', zoneName: 'Thiruvananthapuram Zone', zone: 'South 3', cities: ['Thiruvananthapuram'] },
  { hub: 'Ondipudur Hub', zoneName: 'Coimbatore Zone', zone: 'South 4', cities: ['Coimbatore'] },
  { hub: 'Duvvada Hub', zoneName: 'Visakhapatnam Zone', zone: 'South 4', cities: ['Visakhapatnam'] },
  { hub: 'Dankuni Hub', zoneName: 'Kolkata Zone', zone: 'East 1', cities: ['Kolkata'] },
  { hub: 'Ratu Road Hub', zoneName: 'Ranchi Zone', zone: 'East 1', cities: ['Ranchi'] },
  { hub: 'Rasulgarh Hub', zoneName: 'Bhubaneswar Zone', zone: 'East 1', cities: ['Bhubaneswar'] },
  { hub: 'Patliputra Hub', zoneName: 'Patna Zone', zone: 'East 2', cities: ['Patna'] },
  { hub: 'Agartala Hub', zoneName: 'Agartala Zone', zone: 'North East 1', cities: ['Agartala'] },
  { hub: 'Amingaon Hub', zoneName: 'Guwahati Zone', zone: 'North East', cities: ['Guwahati'] },
]

// NEW meaning of "Zone", per Yugal: "a network of 1 Hub + n mini hubs that
// report to that main hub" — i.e. a Zone is a Hub-and-its-Branches cluster,
// not a broad lane/pricing region anymore (that's now "Region" above). Every
// Zone maps to exactly one Hub, with Branches flattened straight off it
// (dropping the old City grouping layer entirely; a Hub's Branches are just
// the union of every city it serves). Rough template, flagged for
// refinement: the 1:1 Zone↔Hub mapping makes the separate Hub checkbox tier
// below somewhat redundant today — kept anyway per Yugal's explicit ask for
// that flexibility, in case a Zone ever aggregates more than one Hub later.
export const NETWORK_ZONES = HUBS.map((h) => ({
  zone: h.zoneName,
  region: h.zone,
  hub: h.hub,
  branches: h.cities.flatMap((c) => CITY_BRANCHES[c] || []),
}))

// Zone options scoped to the given regions — falls back to every zone when
// no region is selected yet (mirrors "empty = unrestricted").
export function zonesForRegions(regions) {
  const scope = regions?.length ? NETWORK_ZONES.filter((z) => regions.includes(z.region)) : NETWORK_ZONES
  return scope.map((z) => ({ region: z.region, zone: z.zone }))
}

// Hub options scoped to the given zones — trivial today (1 Hub per Zone) but
// kept as its own function so a future many-Hubs-per-Zone model only needs
// to change this, not every call site.
export function hubsForZones(zones) {
  const scope = zones?.length ? NETWORK_ZONES.filter((z) => zones.includes(z.zone)) : NETWORK_ZONES
  return scope.map((z) => ({ zone: z.zone, hub: z.hub }))
}

// Branch options scoped to the given hubs — falls back to every branch
// across every zone when no hub is selected yet. Branch itself isn't a
// stored selection (see BRANCH_MINI_HUBS below) — this just lists which
// Branch headers the Mini Hub dropdown should render.
export function branchesForHubs(hubs) {
  const scope = hubs?.length ? NETWORK_ZONES.filter((z) => hubs.includes(z.hub)) : NETWORK_ZONES
  return scope.flatMap((z) => z.branches.map((branch) => ({ hub: z.hub, branch })))
}

// Mini Hub — the real leaf-level facility, per Yugal: "give it like a header
// Mundka Branch and then Mini Hubs within it." Two per Branch, named off the
// Branch's own name (globally unique by construction, same as before) but
// no longer suffixed "Mini Hub 1"/"Mini Hub 2" on every single one — Yugal's
// correction: that template read as the exact same two names repeated
// across all 71 branches. Cycles through a small pool of varied, real
// logistics-facility descriptors instead (deliberately none of them "Hub",
// for the same reason Zone dropped it above) so neighboring branches don't
// all show an identical pair. Placeholder count/names for this rough pass,
// not meant to be an exact facility census.
const MINI_HUB_DESCRIPTOR_PAIRS = [
  ['Depot', 'Yard'],
  ['Godown', 'Warehouse'],
  ['Stockpoint', 'Transit Point'],
  ['Collection Center', 'Distribution Point'],
  ['Loading Point', 'Dock'],
]

export const BRANCH_MINI_HUBS = Object.fromEntries(
  Object.values(CITY_BRANCHES).flat().map((branch, i) => {
    const base = branch.replace(/ Branch$/, '')
    const [a, b] = MINI_HUB_DESCRIPTOR_PAIRS[i % MINI_HUB_DESCRIPTOR_PAIRS.length]
    return [branch, [`${base} ${a}`, `${base} ${b}`]]
  })
)

export function miniHubsForBranches(branches) {
  return branches.flatMap((branch) => (BRANCH_MINI_HUBS[branch] || []).map((miniHub) => ({ branch, miniHub })))
}

// Cascade helpers: given the regions/zones/hubs being *dropped*, return which
// narrower-tier values only made sense under them — used both to auto-prune
// a draft's finer picks when a broader one is cleared, and (new behavior,
// Yugal's ask) to auto-*add* the narrower picks when a broader one is
// checked, so picking a Zone visibly checks its Hub + every Mini Hub under
// it instead of just leaving them at an implicit "unrestricted" default —
// the checks still start unticked and can be unticked again individually
// afterward.
export function zonesUnderRegions(regions) {
  return NETWORK_ZONES.filter((z) => regions.includes(z.region)).map((z) => z.zone)
}
export function hubsUnderZones(zones) {
  return NETWORK_ZONES.filter((z) => zones.includes(z.zone)).map((z) => z.hub)
}
export function branchesUnderHubs(hubs) {
  return NETWORK_ZONES.filter((z) => hubs.includes(z.hub)).flatMap((z) => z.branches)
}
export function miniHubsUnderHubs(hubs) {
  return branchesUnderHubs(hubs).flatMap((branch) => BRANCH_MINI_HUBS[branch] || [])
}

// Geography Access — a second, separate scoping chain from Location access
// above. State > City > Pincode is a strict address hierarchy (1 city sits
// in exactly 1 state, 1 pincode sits in exactly 1 city, a city can have many
// pincodes) — same auto-cascade convention as Region > Zone > Hub > Mini Hub.
// Territory > Circle is a parallel, ops-defined grouping that cuts across
// that address hierarchy rather than nesting under it: a Circle is a named
// bundle of pincode/locality/area ranges (e.g. "which pincodes + localities
// this local ops team covers"), and a Territory is a group of Circles. The
// two chains are independent — picking a State doesn't touch Territory
// selections and vice versa. Every CITIES entry now has a state (extends the
// smaller 15-city map NewClient.jsx keeps for its own billing-address use).
export const CITY_TO_STATE = {
  Mumbai: 'Maharashtra',
  'New Delhi': 'Delhi',
  Bengaluru: 'Karnataka',
  Chennai: 'Tamil Nadu',
  Kolkata: 'West Bengal',
  Hyderabad: 'Telangana',
  Pune: 'Maharashtra',
  Ahmedabad: 'Gujarat',
  Jaipur: 'Rajasthan',
  Gurugram: 'Haryana',
  Noida: 'Uttar Pradesh',
  Kochi: 'Kerala',
  Chandigarh: 'Chandigarh',
  Bhubaneswar: 'Odisha',
  Ranchi: 'Jharkhand',
  Karnal: 'Haryana',
  Panipat: 'Haryana',
  Ludhiana: 'Punjab',
  Lucknow: 'Uttar Pradesh',
  Kanpur: 'Uttar Pradesh',
  Surat: 'Gujarat',
  Nagpur: 'Maharashtra',
  Indore: 'Madhya Pradesh',
  Sriperumbudur: 'Tamil Nadu',
  Thiruvananthapuram: 'Kerala',
  Coimbatore: 'Tamil Nadu',
  Visakhapatnam: 'Andhra Pradesh',
  Patna: 'Bihar',
  Agartala: 'Tripura',
  Guwahati: 'Assam',
}

export const STATES = [...new Set(Object.values(CITY_TO_STATE))].sort()

export const PINCODES_BY_CITY = {
  Mumbai: ['400001', '400070'],
  'New Delhi': ['110001', '110020'],
  Bengaluru: ['560001', '560068'],
  Chennai: ['600001', '600040'],
  Kolkata: ['700001', '700091'],
  Hyderabad: ['500001', '500081'],
  Pune: ['411001', '411045'],
  Ahmedabad: ['380001', '380015'],
  Jaipur: ['302001', '302017'],
  Gurugram: ['122001', '122018'],
  Noida: ['201301', '201304'],
  Kochi: ['682001', '682030'],
  Chandigarh: ['160001', '160022'],
  Bhubaneswar: ['751001', '751024'],
  Ranchi: ['834001', '834008'],
  Karnal: ['132001', '132117'],
  Panipat: ['132103', '132106'],
  Ludhiana: ['141001', '141008'],
  Lucknow: ['226001', '226010'],
  Kanpur: ['208001', '208012'],
  Surat: ['395001', '395007'],
  Nagpur: ['440001', '440010'],
  Indore: ['452001', '452010'],
  Sriperumbudur: ['602105', '602117'],
  Thiruvananthapuram: ['695001', '695014'],
  Coimbatore: ['641001', '641012'],
  Visakhapatnam: ['530001', '530016'],
  Patna: ['800001', '800014'],
  Agartala: ['799001', '799006'],
  Guwahati: ['781001', '781017'],
}

export function citiesForStates(states) {
  const entries = Object.entries(CITY_TO_STATE)
  const scope = states?.length ? entries.filter(([, state]) => states.includes(state)) : entries
  return scope.map(([city, state]) => ({ group: state, value: city }))
}

export function pincodesForCities(cities) {
  const scope = cities?.length ? cities : Object.keys(PINCODES_BY_CITY)
  return scope.flatMap((city) => (PINCODES_BY_CITY[city] || []).map((pincode) => ({ group: city, value: pincode })))
}

export function citiesUnderStates(states) {
  return Object.entries(CITY_TO_STATE).filter(([, state]) => states.includes(state)).map(([city]) => city)
}

export function pincodesUnderCities(cities) {
  return cities.flatMap((city) => PINCODES_BY_CITY[city] || [])
}

// Territory > Circle — rough first pass, 5 territories anchored on existing
// PTL hub cities, 3 Circles each. `range` is flavor text only (which
// pincodes/localities the Circle bundles) — not read by the cascade, which
// only needs the territory/circle names.
const RAW_CIRCLES = [
  { territory: 'Mumbai Metro Territory', circle: 'Fort-Colaba Circle', range: 'Pincodes 400001–400005 · Fort, Colaba, Nariman Point' },
  { territory: 'Mumbai Metro Territory', circle: 'Andheri-Bandra Circle', range: 'Pincodes 400050–400058 · Andheri, Bandra, Khar' },
  { territory: 'Mumbai Metro Territory', circle: 'Thane-Mulund Circle', range: 'Pincodes 400601–400608 · Thane, Mulund, Bhandup' },
  { territory: 'Delhi NCR Territory', circle: 'Connaught Place Circle', range: 'Pincodes 110001–110006 · CP, Karol Bagh, Paharganj' },
  { territory: 'Delhi NCR Territory', circle: 'Gurugram Cyber Hub Circle', range: 'Pincodes 122001–122018 · DLF Phase 1-5, Cyber Hub' },
  { territory: 'Delhi NCR Territory', circle: 'Noida Sector Circle', range: 'Pincodes 201301–201310 · Sector 15-63' },
  { territory: 'Bengaluru Territory', circle: 'Whitefield Circle', range: 'Pincodes 560066–560068 · Whitefield, ITPL' },
  { territory: 'Bengaluru Territory', circle: 'Koramangala-HSR Circle', range: 'Pincodes 560034–560102 · Koramangala, HSR Layout' },
  { territory: 'Bengaluru Territory', circle: 'Yeshwanthpur Circle', range: 'Pincodes 560022–560073 · Yeshwanthpur, Peenya' },
  { territory: 'Chennai Territory', circle: 'Guindy-Velachery Circle', range: 'Pincodes 600032–600042 · Guindy, Velachery' },
  { territory: 'Chennai Territory', circle: 'Anna Nagar Circle', range: 'Pincodes 600040–600102 · Anna Nagar, Kilpauk' },
  { territory: 'Chennai Territory', circle: 'Sriperumbudur Circle', range: 'Pincodes 602105–602117 · Sriperumbudur, Oragadam' },
  { territory: 'Kolkata Territory', circle: 'Park Circus Circle', range: 'Pincodes 700017–700039 · Park Circus, Ballygunge' },
  { territory: 'Kolkata Territory', circle: 'Salt Lake Circle', range: 'Pincodes 700091–700106 · Salt Lake, New Town' },
  { territory: 'Kolkata Territory', circle: 'Howrah Circle', range: 'Pincodes 711101–711109 · Howrah, Shibpur' },
]

export const TERRITORIES = [...new Set(RAW_CIRCLES.map((c) => c.territory))]
export const CIRCLES = RAW_CIRCLES

export function circlesForTerritories(territories) {
  const scope = territories?.length ? CIRCLES.filter((c) => territories.includes(c.territory)) : CIRCLES
  return scope.map((c) => ({ group: c.territory, value: c.circle }))
}

export function circlesUnderTerritories(territories) {
  return CIRCLES.filter((c) => territories.includes(c.territory)).map((c) => c.circle)
}

// User tags — a forward-looking classification, not wired into any
// permission check yet. The point is to label *who* someone is (by function
// today: LT Ops, LT Finance… ) on the same field that can later extend to
// classify client- and vendor-side identities too, once those get their own
// logins — so permission screens at every level can filter/scope by tag
// instead of only by role. Starter list — open-ended: whoever manages
// reporting structure can create a new one from the tag dropdown itself
// (see ensureUserTag below), so it's not really "fixed" the way ROLE_DEFAULTS
// still is.
export const USER_TAGS = ['LT Ops', 'LT Finance', 'LT Admin', 'LT Sales', 'Client', 'Vendor']

// Resolves a typed tag name to the catalog: reuses an existing tag on a
// case-insensitive match (so "sales" doesn't create a near-duplicate of "LT
// Sales"), otherwise appends it to USER_TAGS in place so every other tag
// dropdown offers it from then on. Returns the canonical string to apply.
export function ensureUserTag(name) {
  const trimmed = name.trim()
  if (!trimmed) return null
  const existing = USER_TAGS.find((t) => t.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  USER_TAGS.push(trimmed)
  return trimmed
}

export function functionsForRoles(roleNames) {
  const set = new Set()
  roleNames.forEach((r) => (ROLE_DEFAULTS[r] || []).forEach((id) => set.add(id)))
  return [...set]
}

// Effective function ids for a user: an explicit override fully replaces the
// role-derived set (not merged) — same rule as LT-Console. No override means
// "just follow whatever the applied roles grant." A manager's delegated
// grants (User Relations) are always additive on top of that, capped at the
// time they were granted to whatever the manager themselves could see.
export function effectiveFunctions(user) {
  const base = user.functionOverrides ?? functionsForRoles(user.roles ?? [])
  const delegated = user.delegatedFunctions ?? []
  return [...new Set([...base, ...delegated])]
}

// Collapses function ids back down to the flat module-key permission list
// that Sidebar.jsx / ProtectedLayout / searchRegistry already gate on, so
// none of that existing gating code needs to change.
export function moduleKeysFromFunctions(functionIds) {
  return [...new Set(functionIds.map((id) => id.split('.')[0]))]
}

// Demo identities only — no real auth. Lets the login screen demonstrate
// email-level permissioning for LT Team without a backend.
//
// `roles` are the applied User Module > Access Management role presets
// (data/permissions.js); `functionOverrides` is null unless an admin has
// fine-tuned this user's functions past their role defaults, in which case
// it fully replaces the role-derived set. Location access is a 4-tier chain
// — `regions` > `zones` > `hubs` > `miniHubs` (data/permissions.js,
// renamed/restructured 2026-08-14). "Branch" is a UI-only grouping header
// inside the Mini Hub dropdown (each Branch groups 2 Mini Hubs) — not its
// own stored tier, so there's no separate `branches` field. Empty at any
// tier means unrestricted at that tier; a non-empty list restricts to those
// values, further narrowed by whatever the tiers below it apply.
//
// Geography Access (added 2026-08-14) is a second, independent scoping
// section below Location access — same "empty = unrestricted, narrower
// prunes/cascades under broader" rules, just two separate chains: `states` >
// `cities` > `pincodes` (a strict address hierarchy) and `territories` >
// `circles` (an ops-defined grouping of pincode/locality/area ranges that
// doesn't nest under state/city). See data/permissions.js for the master
// lists and cascade helpers.
//
// `managerEmail` is this person's manager for the User Module > User
// Relations org mapping (null = no manager / top of hierarchy).
// `delegatedFunctions` are functions their manager has personally granted
// them via User Relations — always additive on top of role-derived access,
// capped at whatever the manager could see themselves at grant time.
// `tags` are the old User Relations classification labels
// (data/permissions.js USER_TAGS) — metadata only, shown read-only on My
// Profile; no longer editable from User Management, which now edits
// `products` instead (see below).
// `products` are which internal apps this login can use (FLOW, Hub
// App, Scan Tool, …) — set at creation and editable from User Management's
// search panel; metadata only for now, not read by any permission check.
// `firstName`/`lastName`/`mobile` are identity/contact details shown in
// Access Management once a user is selected — split from `name` (kept as-is
// for display everywhere else, e.g. Avatar/Sidebar/greeting) rather than
// touching every existing `.name` usage in the app.
//
// `parentEmail` is a second, separate-from-`managerEmail` relationship for
// a future non-LT-Team identity kind (agents/co-loaders) whose account sits
// under a parent account rather than under an internal reporting manager —
// null for every current LT Team user since none of them are that kind.
//
// `departments` is the new Access Management "Function" field (Operations /
// Sales / Finance / Tech / External Partners) — multi-select department tags
// that narrow which Role Presets are offered for this user
// (data/permissions.js ROLE_DEPARTMENT/rolesForDepartments). Seeded to match
// each user's existing role so nothing changes for them; not itself read by
// any permission check.
// `phoneVerified` drives the OTP-verified tick shown next to Phone number in
// Access Management — Karan is deliberately left unverified as the one
// negative-state example, everyone else defaults to verified.

export const LT_USERS = [
  {
    email: 'priya.sharma@letstransport.team',
    name: 'Priya Sharma',
    firstName: 'Priya',
    lastName: 'Sharma',
    mobile: '+919811100001',
    parentEmail: null,
    departments: ['Tech'],
    phoneVerified: true,
    roleLabel: 'Everything Access',
    roles: ['Super Admin'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: null,
    delegatedFunctions: [],
    tags: ['LT Admin'],
    products: [],
  },
  {
    email: 'rahul.mehta@letstransport.team',
    name: 'Rahul Mehta',
    firstName: 'Rahul',
    lastName: 'Mehta',
    mobile: '+919811100002',
    parentEmail: null,
    departments: ['Finance'],
    phoneVerified: true,
    roleLabel: 'Finance Manager',
    roles: ['Finance Manager'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: 'priya.sharma@letstransport.team',
    delegatedFunctions: [],
    tags: ['LT Finance'],
    products: [],
  },
  {
    email: 'admin@letstransport.team',
    name: 'Admin',
    firstName: 'Admin',
    lastName: 'User',
    mobile: '+919811100003',
    parentEmail: null,
    departments: ['Tech'],
    phoneVerified: true,
    roleLabel: 'Super Admin',
    roles: ['Super Admin'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: null,
    delegatedFunctions: [],
    tags: ['LT Admin'],
    products: [],
  },
  {
    email: 'karan.verma@letstransport.team',
    name: 'Karan Verma',
    firstName: 'Karan',
    lastName: 'Verma',
    mobile: '+919811100004',
    parentEmail: null,
    departments: ['Finance'],
    phoneVerified: false,
    roleLabel: 'Collections Executive',
    roles: [],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: 'rahul.mehta@letstransport.team',
    delegatedFunctions: [],
    tags: ['LT Ops'],
    products: [],
  },
  {
    email: 'sonal.kapoor@letstransport.team',
    name: 'Sonal Kapoor',
    firstName: 'Sonal',
    lastName: 'Kapoor',
    mobile: '+919811100005',
    parentEmail: null,
    departments: ['Sales'],
    phoneVerified: true,
    roleLabel: 'Sales Executive',
    roles: ['Sales Executive'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: null,
    delegatedFunctions: [],
    tags: ['LT Sales'],
    products: [],
  },
  {
    email: 'arjun.nair@letstransport.team',
    name: 'Arjun Nair',
    firstName: 'Arjun',
    lastName: 'Nair',
    mobile: '+919811100006',
    parentEmail: null,
    departments: ['Sales'],
    phoneVerified: true,
    roleLabel: 'Sales Admin',
    roles: ['Sales Admin'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: null,
    delegatedFunctions: [],
    tags: ['LT Sales'],
    products: [],
  },
  {
    email: 'neha.iyer@letstransport.team',
    name: 'Neha Iyer',
    firstName: 'Neha',
    lastName: 'Iyer',
    mobile: '+919811100007',
    parentEmail: null,
    departments: ['Finance'],
    phoneVerified: true,
    roleLabel: 'Finance Admin',
    roles: ['Finance Admin'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: 'rahul.mehta@letstransport.team',
    delegatedFunctions: [],
    tags: ['LT Finance'],
    products: [],
  },
  {
    email: 'meera.krishnan@letstransport.team',
    name: 'Meera Krishnan',
    firstName: 'Meera',
    lastName: 'Krishnan',
    mobile: '+919811100008',
    parentEmail: null,
    departments: ['Supply'],
    phoneVerified: true,
    roleLabel: 'Supply Executive',
    roles: ['Supply Executive'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: null,
    delegatedFunctions: [],
    tags: ['LT Ops'],
    products: [],
  },
  {
    email: 'vikram.rao@letstransport.team',
    name: 'Vikram Rao',
    firstName: 'Vikram',
    lastName: 'Rao',
    mobile: '+919811100009',
    parentEmail: null,
    departments: ['Supply'],
    phoneVerified: true,
    roleLabel: 'Supply Admin',
    roles: ['Supply Admin'],
    functionOverrides: null,
    regions: [],
    zones: [],
    hubs: [],
    miniHubs: [],
    states: [],
    cities: [],
    pincodes: [],
    territories: [],
    circles: [],
    managerEmail: null,
    delegatedFunctions: [],
    tags: ['LT Ops'],
    products: [],
  },
]

export const CLIENT_USERS = [
  { email: 'ops@oriflame.com', name: 'Oriflame', contact: 'Anita Rao' },
  { email: 'logistics@nykaa.com', name: 'Nykaa', contact: 'Karan Sethi' },
  { email: 'scm@lenskart.com', name: 'Lenskart', contact: 'Divya Nair' },
]

export const CLIENT_PERMISSIONS = ['dashboard', 'create-order', 'my-orders', 'trip-tracking', 'past-trips', 'invoicing']

// Agents, Co-loaders, Franchise and 3rd Party orgs (see data/partners.js) —
// their login sits under the org, not an internal LT reporting line (see
// `parentEmail` above). Permission set is a placeholder mirroring the client
// persona's shape until Partner-side access is actually spec'd: partners
// execute trips and get invoiced but don't book orders, so create-order/
// my-orders are left out.
export const PARTNER_USERS = [
  { email: 'ops@speedex.com', name: 'Speedex Logistics', contact: 'Rakesh Iyer' },
  { email: 'contact@bhiwandicargo.in', name: 'Bhiwandi Cargo Movers', contact: 'Suresh Patil' },
  { email: 'admin@nairfreight.com', name: 'Nair Freight Franchise', contact: 'Anitha Nair' },
]

export const PARTNER_PERMISSIONS = ['dashboard', 'trip-tracking', 'past-trips', 'invoicing']

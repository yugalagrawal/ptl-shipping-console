import { PARTNERS } from './partners.js'
import { ACTIVE_CLIENTS_SEED } from './clients.js'

// Partner + Client organisations a login can sit under (`parentEmail` on a
// data/users.js record). Clients don't all carry a contact email in the demo
// data, so those fall back to ops@<client>.com as a placeholder.
export const ORG_CATALOG = [
  ...PARTNERS.map((p) => ({ name: p.organisationName, email: p.orgEmail, type: 'Partner' })),
  ...ACTIVE_CLIENTS_SEED.map((c) => ({
    name: c.name,
    email: c.details?.contact?.pocEmail || c.details?.contact?.opsEmail || `ops@${c.id}.com`,
    type: 'Client',
  })),
]

// Shared store behind the Consignor and Consignee masters. A party is one
// global record carrying `clientIds` — the clients it's mapped to — so it
// can be managed centrally (Master Module > Consignor/Consignee) and still
// show up per client in Client Configuration. Plain mutable module store,
// same convention as CLIENT_CONFIG_STORE — no backend here.
export function createPartyStore(prefix, seed = []) {
  let seq = 1
  const parties = []

  const store = {
    forClient: (clientId) => parties.filter((p) => p.clientIds.includes(clientId)),
    all: () => parties,
    create(data) {
      const row = { clientIds: [], ...data, id: `${prefix}-${seq++}` }
      parties.push(row)
      return row
    },
    update(id, updates) {
      const i = parties.findIndex((p) => p.id === id)
      if (i >= 0) parties[i] = { ...parties[i], ...updates }
    },
    // Client Configuration "Add": a new party mapped to just that client.
    addForClient(clientId, data) {
      return this.create({ ...data, clientIds: [clientId] })
    },
    // Client Configuration "Remove": unmaps from that client only; the
    // party itself stays in the master.
    unmapFromClient(clientId, id) {
      const p = parties.find((x) => x.id === id)
      if (p) this.update(id, { clientIds: p.clientIds.filter((c) => c !== clientId) })
    },
  }
  seed.forEach((row, i) => store.create({ ...row, sites: row.sites.map((st, j) => ({ ...st, id: `${prefix}-seed-${i}-${j}` })) }))
  return store
}

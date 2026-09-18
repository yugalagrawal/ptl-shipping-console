// Warehouse & Hub Ops — pallet allotment, barcode/QR scanning and hub-level
// sorting logs. Scoped down to the concrete, buildable slice: a scan event
// log (the actual audit trail every other claim in this module rests on)
// plus a live per-hub pallet summary derived from it. Full pallet
// allotment UI (assigning specific AWBs to a specific physical pallet) is
// out of scope for this pass — the log is the real primitive; pallets are
// just a grouping of scans by hub, shown as a summary.

export const SCAN_EVENT_TYPES = ['Inward', 'Sorted', 'Loaded on Vehicle', 'Outward']

export const HUBS = [
  'Bhiwandi Hub', 'Okhla Hub', 'Peenya Hub', 'Ambattur Hub', 'Dankuni Hub',
  'Balanagar Hub', 'Chakan Hub', 'Vatva Hub',
]

let scanSeq = 8801
function generateScanId() {
  return `SCN-${scanSeq++}`
}

export const SCAN_EVENTS_SEED = []

function seedScan({ awbId, hub, eventType, timestamp, scannedBy }) {
  return { id: generateScanId(), awbId, hub, eventType, timestamp, scannedBy }
}

export function initScanEventsSeed(orders) {
  if (SCAN_EVENTS_SEED.length) return SCAN_EVENTS_SEED
  // Seed a plausible scan trail against whichever real AWBs already exist
  // in ORDERS_SEED, rather than inventing disconnected AWB numbers — so
  // this page reads as part of the same system, not a standalone demo.
  const sample = orders.slice(0, 4)
  const rows = []
  sample.forEach((o, i) => {
    const hub = HUBS[i % HUBS.length]
    rows.push(seedScan({ awbId: o.id, hub, eventType: 'Inward', timestamp: '2026-08-02, 09:1' + i + ' AM', scannedBy: 'Warehouse Scanner 1' }))
    if (i < 3) rows.push(seedScan({ awbId: o.id, hub, eventType: 'Sorted', timestamp: '2026-08-02, 11:0' + i + ' AM', scannedBy: 'Warehouse Scanner 2' }))
    if (i < 2) rows.push(seedScan({ awbId: o.id, hub, eventType: 'Loaded on Vehicle', timestamp: '2026-08-02, 02:1' + i + ' PM', scannedBy: 'Dock Supervisor' }))
  })
  SCAN_EVENTS_SEED.push(...rows)
  return SCAN_EVENTS_SEED
}

export function recordScan({ awbId, hub, eventType, scannedBy }) {
  const scan = seedScan({ awbId, hub, eventType, timestamp: 'Just now', scannedBy })
  SCAN_EVENTS_SEED.unshift(scan)
  return scan
}

// Per-hub summary — AWBs currently sitting at a hub with no later scan yet
// (i.e. their most recent event isn't "Loaded on Vehicle" or "Outward"),
// the "what's on the floor right now" view a pallet/sort operation needs.
export function hubFloorSummary(scans) {
  const latestByAwb = new Map()
  scans.forEach((s) => {
    const existing = latestByAwb.get(s.awbId)
    if (!existing || s.id > existing.id) latestByAwb.set(s.awbId, s)
  })
  const byHub = new Map()
  latestByAwb.forEach((s) => {
    if (s.eventType === 'Loaded on Vehicle' || s.eventType === 'Outward') return
    if (!byHub.has(s.hub)) byHub.set(s.hub, [])
    byHub.get(s.hub).push(s)
  })
  return [...byHub.entries()].map(([hub, awbs]) => ({ hub, count: awbs.length, awbs }))
}

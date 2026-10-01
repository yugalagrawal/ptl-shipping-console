// Share a docket — Web Share API when the browser offers it (mobile Safari/
// Chrome, and some desktop browsers), copy-to-clipboard fallback everywhere
// else. No backend to actually send anything through, so this is the
// honest ceiling for a prototype: a real build would also offer "email the
// PDF" via the same server-side render the print/PDF buttons describe.
// Returns 'shared' | 'copied' | 'cancelled' | 'failed' (+ `text`, the
// summary itself, on 'failed' — a browser that blocks both the Share API
// and clipboard-write permission still deserves to see what would've been
// shared, so the caller can fall back to showing/selecting it) so the
// caller can show the right toast.
export async function shareDocket(docket) {
  const text = `Docket ${docket.docketNumber} — ${docket.clientName} → ${docket.dropMiniHubName}` +
    (docket.consignee?.name ? ` · ${docket.consignee.name}` : '') +
    (docket.pricing?.total ? ` · ₹${docket.pricing.total.toLocaleString('en-IN')}` : '')

  if (navigator.share) {
    try {
      await navigator.share({ title: `Docket ${docket.docketNumber}`, text })
      return { status: 'shared', text }
    } catch (err) {
      if (err?.name === 'AbortError') return { status: 'cancelled', text }
      // Fall through to clipboard on any other Share API failure.
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return { status: 'copied', text }
  } catch {
    return { status: 'failed', text }
  }
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailField({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{value || '—'}</div>
    </div>
  )
}

function ReviewSection({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  )
}

// Documents were captured as raw File objects in the wizard (never uploaded
// anywhere real) — object-URL preview is the only "open it" a prototype can
// offer without a backend to fetch from. Mirrors ClientOnboardingSummary's
// own DocumentLink.
function DocumentLink({ label, file }) {
  if (!file) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="text-xs text-slate-400">Not uploaded</span>
      </div>
    )
  }
  return (
    <a
      href={URL.createObjectURL(file)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors hover:border-brand-orange/40"
    >
      <span className="text-slate-700">{label}</span>
      <span className="text-xs font-medium text-brand-orange-dark">View</span>
    </a>
  )
}

// Read-only rendering of everything a partner captured during onboarding
// (Partner/Contact/GSTIN/Billing/KYC) — Partner Approvals' Supply Admin
// review panel reads from `partner.details`, the same wizard snapshot shape
// NewPartner.jsx's handleNext() submits. Mirrors ClientOnboardingSummary.
// Partners seeded directly (never submitted through the wizard) have no
// `details`, so this falls back to a plain note instead of rendering empty
// sections.
export default function PartnerOnboardingSummary({ partner }) {
  const d = partner.details

  if (!d) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        No submitted details captured for this record — it was seeded directly, before this review flow existed.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <ReviewSection title="Partner details">
        <DetailField label="Partner type" value={d.partner.partnerType} />
        <DetailField label="Partner name" value={d.partner.partnerName} />
        <DetailField label="PAN card number" value={d.partner.pan} />
        <DetailField label="Partner payment type" value={d.partner.partnerPaymentType} />
        <DetailField label="Legal entity name" value={d.partner.legalName} />
        <DetailField label="Registered address" value={d.partner.address} />
        <DetailField label="Pincode" value={d.partner.pincode} />
        <DetailField label="City" value={d.partner.city} />
        <DetailField label="State" value={d.partner.state} />
      </ReviewSection>

      {(d.partner.bankAccountName || d.partner.bankAccountNumber || d.partner.ifscCode) && (
        <ReviewSection title="Bank details">
          <DetailField label="Account name" value={d.partner.bankAccountName} />
          <DetailField label="Account number" value={d.partner.bankAccountNumber} />
          <DetailField label="IFSC code" value={d.partner.ifscCode} />
        </ReviewSection>
      )}

      <ReviewSection title="Contact information">
        <DetailField label="Partner POC name" value={d.contact.pocName} />
        <DetailField label="POC mobile" value={d.contact.pocMobile ? `${d.contact.pocPhoneCode} ${d.contact.pocMobile}` : ''} />
        <DetailField label="POC email" value={d.contact.pocEmail} />
      </ReviewSection>

      <ReviewSection title="Billing info">
        <DetailField
          label="Contract duration"
          value={d.billing.contractStart && d.billing.contractEnd ? `${fmtDate(d.billing.contractStart)} – ${fmtDate(d.billing.contractEnd)}` : ''}
        />
        <DetailField label="Billing period" value={d.billing.billingPeriod} />
      </ReviewSection>

      {d.identifications?.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">GSTIN info</div>
          <div className="space-y-3">
            {d.identifications.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField label="GSTIN" value={row.idNumber} />
                  <DetailField label="State" value={row.state} />
                  <DetailField label="City" value={row.city} />
                  <DetailField label="Pincode" value={row.pincode} />
                  <DetailField label="Country" value={row.country} />
                  <DetailField label="Address" value={row.address} />
                </div>
                <div className="mt-2">
                  <DocumentLink label="GSTIN document" file={row.document} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          KYC documents ({partner.kycDocsCount}/{partner.kycDocsTotal} uploaded)
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {d.documents.map((doc) => (
            <DocumentLink key={doc.id} label={doc.type} file={doc.file} />
          ))}
        </div>
      </div>
    </div>
  )
}

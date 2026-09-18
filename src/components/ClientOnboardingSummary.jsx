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
// offer without a backend to fetch from.
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

// Read-only rendering of everything a client captured during onboarding
// (Company/Contact/Billing/Identification/KYC) — shared by Client Approvals'
// Sales Admin review panel and the full My Clients detail page, since both
// need to show the exact same wizard snapshot (`client.details`). Clients
// seeded directly (never submitted through the wizard) have no `details`,
// so this falls back to a plain note instead of rendering empty sections.
export default function ClientOnboardingSummary({ client }) {
  const d = client.details

  if (!d) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        No submitted details captured for this record — it was seeded directly, before this review flow existed.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <ReviewSection title="Company details">
        <DetailField label="Customer group" value={client.groupId} />
        <DetailField label="Legal entity name" value={d.company.legalName} />
        <DetailField label="Trade name" value={d.company.tradeName} />
        <DetailField label="PAN card number" value={d.company.pan} />
        <DetailField label="Organisation type" value={d.company.organisationType} />
        <DetailField label="Customer payment type" value={d.company.paymentType} />
        <DetailField label="Customer code" value={d.company.customerCode} />
        <DetailField label="Registered address" value={d.company.fullAddress} />
        <DetailField label="Pincode" value={d.company.pincode} />
        <DetailField label="City" value={d.company.city} />
        <DetailField label="State" value={d.company.state} />
        <DetailField label="Country" value={d.company.country} />
        {d.company.sacNumber && <DetailField label="SAC number" value={d.company.sacNumber} />}
        {d.company.hsnNumber && <DetailField label="HSN number" value={d.company.hsnNumber} />}
        {d.company.tanNumber && <DetailField label="TAN number" value={d.company.tanNumber} />}
        {d.company.msmeNumber && <DetailField label="MSME UDYAM number" value={d.company.msmeNumber} />}
      </ReviewSection>

      <ReviewSection title="Contact information">
        <DetailField label="Client POC name" value={d.contact.pocName} />
        <DetailField label="POC mobile" value={d.contact.pocMobile ? `${d.contact.phoneCode} ${d.contact.pocMobile}` : ''} />
        <DetailField label="POC email" value={d.contact.pocEmail} />
        <DetailField label="Ops email" value={d.contact.opsEmail} />
        <DetailField label="Finance email" value={d.contact.financeEmail} />
        <DetailField label="Sales person" value={d.contact.salesPerson} />
      </ReviewSection>

      <ReviewSection title="Billing info">
        <DetailField
          label="Contract duration"
          value={d.billing.contractStart && d.billing.contractEnd ? `${fmtDate(d.billing.contractStart)} – ${fmtDate(d.billing.contractEnd)}` : ''}
        />
        <DetailField label="Contract execution date" value={fmtDate(d.billing.contractExecutionDate)} />
        <DetailField label="Billing period" value={d.billing.billingPeriod} />
        <DetailField label="Bill print format" value={d.billing.billPrintFormat} />
        <DetailField label="Maximum credit limit" value={d.billing.creditLimit} />
        <DetailField
          label="Monthly Vol. Commitment/Expectation"
          value={d.billing.expectedVolumeKg ? `${d.billing.expectedVolumeKg} ${d.billing.volumeUnit}` : ''}
        />
        {d.billing.centralisedPayment && (
          <DetailField label="Centralised payment" value={`${d.billing.billingState} / ${d.billing.billingCity} / ${d.billing.billingBranch}`} />
        )}
        {d.billing.securityDeposit && (
          <DetailField
            label="Security deposit"
            value={`₹${d.billing.securityDepositAmount} · ${
              d.billing.securityDepositPaid === 'Yes' ? `Paid (${d.billing.depositPaymentType}, ${d.billing.depositReferenceNo})` : 'Not yet paid'
            }`}
          />
        )}
        {d.billing.taxExemption && <DetailField label="Tax exemption" value="Yes" />}
        {d.billing.fuelSurchargeExemption && <DetailField label="Fuel surcharge exemption" value="Yes" />}
        {d.billing.copyRatesEnabled && <DetailField label="Copied rates from" value={d.billing.copyRatesFrom} />}
      </ReviewSection>

      {(d.billing.bankAccountName || d.billing.bankAccountNumber || d.billing.bankBranch || d.billing.bankIfsc) && (
        <ReviewSection title="Client bank details">
          <DetailField label="Account name" value={d.billing.bankAccountName} />
          <DetailField label="Cash credit account number" value={d.billing.bankAccountNumber} />
          <DetailField label="Bank branch" value={d.billing.bankBranch} />
          <DetailField label="IFSC code" value={d.billing.bankIfsc} />
        </ReviewSection>
      )}

      {d.billing.billingDocuments?.some((doc) => doc.file) && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Billing documents</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.billing.billingDocuments.map((doc) => (
              <DocumentLink key={doc.id} label={doc.type} file={doc.file} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Identification info</div>
        <div className="space-y-3">
          {d.identifications.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField label="Type" value={row.idType} />
                <DetailField label="Number" value={row.idNumber} />
                <DetailField label="State" value={row.state} />
                <DetailField label="City" value={row.city} />
                <DetailField label="Pincode" value={row.pincode} />
                <DetailField label="Country" value={row.country} />
                <DetailField label="Address" value={row.address} />
              </div>
              <div className="mt-2">
                <DocumentLink label={`${row.idType} document`} file={row.document} />
              </div>
            </div>
          ))}
          <DocumentLink label="PAN card document" file={d.company.panDocument} />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          KYC documents ({client.kycDocsCount}/{client.kycDocsTotal} uploaded)
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {d.documents.map((doc) => (
            <DocumentLink key={doc.id} label={doc.type} file={doc.file ?? (doc.type === 'PAN Card' ? d.company.panDocument : null)} />
          ))}
        </div>
      </div>
    </div>
  )
}

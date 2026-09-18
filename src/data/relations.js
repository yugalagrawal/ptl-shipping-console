// Manager -> reportee org mapping. `managerEmail` lives on each LT_USER
// record (data/users.js) — this is the shared lookup helper so User
// Management doesn't reimplement "who reports to whom."

// True if `possibleReportEmail` is a direct or indirect report of
// `managerEmail` — used to stop the reporting-structure editor from letting
// someone pick their own report (or report-of-a-report) as their manager,
// which would create a cycle.
export function isReportOf(users, possibleReportEmail, managerEmail) {
  let current = users.find((u) => u.email === possibleReportEmail)
  let hops = 0
  while (current?.managerEmail && hops < users.length) {
    if (current.managerEmail === managerEmail) return true
    current = users.find((u) => u.email === current.managerEmail)
    hops++
  }
  return false
}

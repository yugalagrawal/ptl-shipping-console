const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  onboarding: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M18 8h3M19.5 6.5v3" />
    </>
  ),
  order: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  trip: (
    <>
      <rect x="2" y="8" width="13" height="8" rx="1.5" />
      <path d="M15 11h4l3 3v2h-7z" />
      <circle cx="6" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </>
  ),
  finance: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  logic: (
    <>
      <rect x="8" y="8" width="8" height="8" rx="1.2" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M19 5l-2.5 2.5M5 19l2.5-2.5M19 19l-2.5-2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  supply: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </>
  ),
  tracking: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2 20h20" />
    </>
  ),
  mis: (
    <>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M15 2v4h4" />
      <path d="M9 13l2 2 4-5" />
    </>
  ),
  invoice: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  collections: (
    <>
      <rect x="2.5" y="7" width="19" height="12" rx="2" />
      <path d="M2.5 7l3-4h13l3 4" />
      <circle cx="12" cy="13" r="2.5" />
    </>
  ),
  tag: (
    <>
      <path d="M20 12l-8 8-9-9V4h7z" />
      <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13M13 4l4 4-4 4" />
      <path d="M20 16H7M11 12l-4 4 4 4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5c0 6 12 3.5 12 9.5" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4h13l-3 4 3 4H6" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 1112 0c0 3.5 1 5 2 6H4c1-1 2-2.5 2-6z" />
      <path d="M10 19a2 2 0 004 0" />
    </>
  ),
  chevron: (
    <>
      <path d="M6 9l6 6 6-6" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H4V3h5" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  building: (
    <>
      <path d="M3 21V10l9-6 9 6v11" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  approve: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4.5a1 1 0 011-1h4a1 1 0 011 1V7" />
      <path d="M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  truck: (
    <>
      <rect x="1.5" y="7" width="12" height="9" rx="1.2" />
      <path d="M13.5 10h4l4 3.5V16h-8z" />
      <circle cx="5.5" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  warehouse: (
    <>
      <path d="M2 10.5L12 4l10 6.5V20H2z" />
      <path d="M7 20v-6h4v6M14 14h3v3h-3z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  partner: (
    <>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M7.5 6.5h9" />
      <circle cx="7.7" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.3" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.7" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.3" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.7" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.3" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  filter: (
    <>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  columns: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
    </>
  ),
}

export default function Icon({ name, className = 'h-[18px] w-[18px]', filled = false }) {
  const content = PATHS[name]
  if (!content) return null
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {content}
    </svg>
  )
}

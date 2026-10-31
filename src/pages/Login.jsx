import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LT_USERS, CLIENT_USERS, PARTNER_USERS } from '../data/users.js'
import { btnPrimary } from '../components/ui.js'
import Icon from '../components/Icon.jsx'
import flowLogo from '../assets/flow-logo.svg'

export default function Login() {
  const [persona, setPersona] = useState('lt')
  const [email, setEmail] = useState(LT_USERS[0].email)
  const [step, setStep] = useState('email')
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  const { loginAsLtUser, loginAsClient, loginAsPartner } = useAuth()

  const PERSONA_USERS = { lt: LT_USERS, client: CLIENT_USERS, partner: PARTNER_USERS }
  const options = PERSONA_USERS[persona]

  function handlePersonaChange(next) {
    setPersona(next)
    setEmail(PERSONA_USERS[next][0].email)
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    setCode('')
    setStep('code')
  }

  // Dummy authenticator step — UI context only, any 6 digits signs in.
  function handleSubmit(e) {
    e.preventDefault()
    if (code.length !== 6) return
    if (persona === 'lt') {
      loginAsLtUser(LT_USERS.find((u) => u.email === email))
    } else if (persona === 'partner') {
      loginAsPartner(PARTNER_USERS.find((u) => u.email === email))
    } else {
      loginAsClient(CLIENT_USERS.find((u) => u.email === email))
    }
    navigate('/user-module/my-profile')
  }

  const PERSONAS = [
    { id: 'lt', label: 'LT Team', icon: 'user' },
    { id: 'partner', label: 'Partner', icon: 'partner' },
    { id: 'client', label: 'Client', icon: 'building' },
  ]
  const selected = options.find((u) => u.email === email)

  return (
    <div className="flex min-h-screen bg-[#F6F7F9]">
      <div className="relative hidden w-[46%] min-w-[340px] flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light p-8 text-white md:flex lg:p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 60% 55%, black 0, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 60% 55%, black 0, transparent 70%)',
          }}
        />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-brand-orange/20 blur-3xl" />

        <div className="relative">
          <img src={flowLogo} alt="FLOW by LetsTransport" className="h-auto w-[150px]" />
          <p className="mt-3 text-sm font-medium tracking-wide text-slate-300">Freight &amp; Logistics Operating World</p>
        </div>

        <div className="relative">
          <h1 className="text-balance text-[30px] font-semibold leading-[1.1] lg:text-[38px] tracking-tight">
            Every shipment,
            <br />
            <span className="text-brand-orange-light">one flow.</span>
          </h1>
          <p className="mt-3 max-w-sm text-slate-300">Onboarding to delivery on one platform.</p>

          <svg viewBox="0 170 520 70" className="mt-8 w-full max-w-[520px]" aria-hidden="true">
            <defs>
              <path id="road" d="M-50 222 H570" />
            </defs>
            <line x1="0" y1="227" x2="520" y2="227" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 6" />
            <g>
              <g transform="translate(-42 -36) scale(0.9)">
                <rect x="1" y="5" width="58" height="29" rx="3.5" fill="#2A3F6E" stroke="rgba(255,255,255,0.25)" />
                <rect x="1" y="22" width="58" height="5" fill="#FB6B24" />
                <rect x="1" y="27" width="58" height="2.5" fill="#D94423" />
                <rect x="7" y="10" width="11" height="8" rx="2" fill="#FFFFFF" opacity="0.15" />
                <path d="M62 12h14.5c1.6 0 3 .8 3.9 2.1L88 25.5c.6.9.9 1.9.9 3V34H62z" fill="#FB6B24" />
                <path d="M66 15.5h9.4c.9 0 1.7.4 2.2 1.1l4.2 6.4H66z" fill="#1A2B4A" />
                <path d="M66 15.5h9.4c.9 0 1.7.4 2.2 1.1l.6.9H66z" fill="#FFFFFF" opacity="0.18" />
                <rect x="86" y="27" width="4" height="4" rx="1" fill="#FFE08A" />
                <rect x="58" y="30" width="32" height="4.5" rx="1.5" fill="#AD351A" />
                {[14, 34, 74].map((cx) => (
                  <g key={cx} transform={`translate(${cx} 36)`}>
                    <circle r="6.5" fill="#0B1424" />
                    <g>
                      <circle r="3.4" fill="#93A4C3" />
                      <path d="M0-3.4V3.4M-3.4 0H3.4" stroke="#0B1424" strokeWidth="1.2" />
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.6s" repeatCount="indefinite" />
                    </g>
                  </g>
                ))}
              </g>
              <animateMotion dur="8s" repeatCount="indefinite">
                <mpath href="#road" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="8s" repeatCount="indefinite" />
            </g>
          </svg>

        </div>

        <div className="relative grid grid-cols-3 gap-2 lg:gap-3">
          {[
            ['55k+', 'Truck Drivers'],
            ['200+', 'Enterprises Served'],
            ['15M+', 'Tonnes Moved'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 backdrop-blur-sm lg:px-4 lg:py-3">
              <div className="text-xl font-semibold tabular-nums text-white lg:text-2xl">{v}</div>
              <div className="mt-0.5 text-xs text-slate-300">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 md:hidden">
            <div className="inline-block rounded-2xl bg-brand-navy px-4 py-3">
              <img src={flowLogo} alt="FLOW by LetsTransport" className="h-auto w-[100px]" />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Freight &amp; Logistics Operating World</p>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-8px_rgb(15_23_42/0.10)] ring-1 ring-slate-200/70">
            {step === 'email' ? (
              <>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Sign in to FLOW</h2>
              <p className="mt-1 text-sm text-slate-500">Choose how you're accessing FLOW.</p>

              <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePersonaChange(p.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
                      persona === p.id ? 'bg-white text-brand-navy shadow-soft' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon name={p.icon} className={`h-3.5 w-3.5 ${persona === p.id ? 'text-brand-orange' : 'text-slate-400'}`} />
                    {p.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleEmailSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                  <div className="relative">
                    <Icon name="mail" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 transition-colors hover:border-slate-300 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20"
                    >
                      {options.map((u) => (
                        <option key={u.email} value={u.email}>
                          {u.email}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                  {selected && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[10px] font-semibold text-white">
                        {selected.name?.[0]}
                      </span>
                      <span className="font-medium text-slate-700">{selected.name}</span>
                      {selected.roleLabel && <span className="text-slate-400">· {selected.roleLabel}</span>}
                    </p>
                  )}
                </div>

                <button type="submit" className={`w-full ${btnPrimary}`}>
                  Continue
                </button>
              </form>
              </>
            ) : (
            <>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Authenticator code</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Enter the 6-digit code from Google Authenticator for <span className="font-semibold text-slate-700">{email}</span>.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-lg font-medium tracking-[0.5em] text-slate-800 transition-colors placeholder:text-slate-300 hover:border-slate-300 focus:border-brand-orange focus:outline focus:outline-2 focus:outline-brand-orange/20"
                  />
                </div>
                <button type="submit" disabled={code.length !== 6} className={`w-full ${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-orange`}>
                  Sign in
                </button>
              </form>

              <div className="mt-4 flex flex-col items-center gap-1 text-sm">
                <button type="button" className="rounded-lg px-2 py-1 text-slate-500 transition-colors hover:text-slate-800">
                  Other ways to sign in
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="rounded-lg px-2 py-1 text-slate-500 transition-colors hover:text-slate-800"
                >
                  Use a different email
                </button>
              </div>
            </>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">{step === 'email' ? 'Prototype build · pick any account, no password needed' : 'Prototype build · enter any 6 digits'}</p>
        </div>
      </div>
    </div>
  )
}

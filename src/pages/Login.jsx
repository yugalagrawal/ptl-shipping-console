import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LT_USERS, CLIENT_USERS, PARTNER_USERS } from '../data/users.js'
import { btnPrimary } from '../components/ui.js'
import Icon from '../components/Icon.jsx'
import ltLogo from '../assets/lt-logo.svg'

export default function Login() {
  const [persona, setPersona] = useState('lt')
  const [email, setEmail] = useState(LT_USERS[0].email)
  const navigate = useNavigate()
  const { loginAsLtUser, loginAsClient, loginAsPartner } = useAuth()

  const PERSONA_USERS = { lt: LT_USERS, client: CLIENT_USERS, partner: PARTNER_USERS }
  const options = PERSONA_USERS[persona]

  function handlePersonaChange(next) {
    setPersona(next)
    setEmail(PERSONA_USERS[next][0].email)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (persona === 'lt') {
      loginAsLtUser(LT_USERS.find((u) => u.email === email))
    } else if (persona === 'partner') {
      loginAsPartner(PARTNER_USERS.find((u) => u.email === email))
    } else {
      loginAsClient(CLIENT_USERS.find((u) => u.email === email))
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-navy p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-soft">
            <img src={ltLogo} alt="LetsTransport" className="h-full w-full" />
          </div>
          <div className="text-lg font-semibold tracking-tight">PTL Console</div>
        </div>

        <div className="relative space-y-5">
          <h1 className="max-w-sm text-[34px] font-semibold leading-tight tracking-tight">
            Deliveries made easy. Single platform for all your PTL operations.
          </h1>
          <p className="max-w-sm text-slate-300">
            One system for onboarding, orders, trips and finance — built ground-up for how LetsTransport's
            Part Truck Load network actually moves.
          </p>
        </div>

        <div className="relative flex gap-8 text-sm text-slate-400">
          <div>
            <div className="text-2xl font-semibold tabular-nums text-white">55k+</div>
            Truck Drivers
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums text-white">200+</div>
            Enterprises Served
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums text-white">15M+</div>
            Tonnes Moved
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#F6F7F9] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-soft">
              <img src={ltLogo} alt="LetsTransport" className="h-full w-full" />
            </div>
          </div>

          <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Choose how you're accessing PTL Console.</p>

          <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handlePersonaChange('lt')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                persona === 'lt' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              LT Team
            </button>
            <button
              type="button"
              onClick={() => handlePersonaChange('partner')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                persona === 'partner' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Partner
            </button>
            <button
              type="button"
              onClick={() => handlePersonaChange('client')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                persona === 'client' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Client
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                {persona === 'lt' ? 'Login as (demo)' : persona === 'partner' ? 'Partner account (demo)' : 'Client account (demo)'}
              </label>
              <div className="relative">
                <select
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
                >
                  {options.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name}
                      {u.roleLabel ? ` · ${u.roleLabel}` : ''}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              {persona === 'lt' && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Each LT email has its own module access — try switching users to see the sidebar change.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
              <input
                type="text"
                readOnly
                value={email}
                className="w-full rounded-xl bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
              <input
                type="password"
                defaultValue="demo-password"
                className="w-full rounded-xl bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40"
              />
            </div>

            <button type="submit" className={`w-full ${btnPrimary}`}>
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">Prototype build · no real authentication yet</p>
        </div>
      </div>
    </div>
  )
}

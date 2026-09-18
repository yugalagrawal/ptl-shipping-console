import { createContext, useContext, useState } from 'react'
import { CLIENT_PERMISSIONS, PARTNER_PERMISSIONS } from '../data/users.js'
import { effectiveFunctions, moduleKeysFromFunctions } from '../data/permissions.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  // LT Team users are permissioned at function level (roles + per-user
  // overrides, see data/permissions.js) — this collapses that down to the
  // flat module-key list every page already gates on via `can(key)`.
  function loginAsLtUser(ltUser) {
    const functions = effectiveFunctions(ltUser)
    setUser({
      persona: 'lt',
      ...ltUser,
      functions,
      permissions: moduleKeysFromFunctions(functions),
    })
  }

  function loginAsClient(clientUser) {
    setUser({ persona: 'client', ...clientUser, permissions: CLIENT_PERMISSIONS })
  }

  function loginAsPartner(partnerUser) {
    setUser({ persona: 'partner', ...partnerUser, permissions: PARTNER_PERMISSIONS })
  }

  function logout() {
    setUser(null)
  }

  function can(key) {
    return !!user?.permissions?.includes(key)
  }

  function hasFunction(id) {
    return !!user?.functions?.includes(id)
  }

  return (
    <AuthContext.Provider value={{ user, loginAsLtUser, loginAsClient, loginAsPartner, logout, can, hasFunction }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

import { useNavigate, useLocation } from 'react-router-dom'
import { T } from './ops/core.js'
import * as A from './ops/screensA.js'
import * as B from './ops/screensB.js'

// Trip Ops (1A) — ported from PrototypeUserModule_v8a. The screens are the
// prototype's own (plain createElement + a small pub/sub store in ops/core.js);
// this wrapper only bridges routing so T.go() navigates with react-router.
const SCREENS = {
  overview: A.Overview,
  'route-pricing': A.RoutePricing,
  'vehicle-assign': A.VehicleAssign,
  manifest: B.Manifest,
  cewb: B.Cewb,
  'scan-descan': B.ScanDescan,
  'final-arrival': B.Arrival,
}

export default function TripOps({ screen }) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  T.router = { navigate, pathname, search }
  const Screen = SCREENS[screen] ?? A.Overview
  return <Screen key={screen} />
}

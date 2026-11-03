import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'

// Goes back one step in the app; if the page was opened directly (no
// in-app history), falls back to the home dashboard.
export default function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location.key !== 'default'
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
      className="mb-2 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
    >
      <Icon name="arrow-left" className="h-3.5 w-3.5" />
      Back
    </button>
  )
}

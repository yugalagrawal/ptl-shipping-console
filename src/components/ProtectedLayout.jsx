import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function ProtectedLayout() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

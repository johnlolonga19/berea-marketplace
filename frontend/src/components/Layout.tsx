import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            Berea Marketplace
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link to="/listings/new" className="text-gray-700 hover:text-gray-950">
                  Sell an item
                </Link>
                <Link to="/my-listings" className="text-gray-700 hover:text-gray-950">
                  My listings
                </Link>
                <span className="text-gray-500">{user.full_name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-gray-950">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

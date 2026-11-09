import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUnreadCount } from '../lib/unread'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const unread = useUnreadCount(user !== null)

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleLogout() {
    closeMenu()
    logout()
    navigate('/')
  }

  const linkClass = 'text-gray-700 hover:text-gray-950'
  const buttonClass = 'rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700'

  // Rendered twice: inline on sm+ screens, stacked in a dropdown on phones.
  function navItems(mobile: boolean) {
    const itemClass = mobile ? `${linkClass} block py-2` : linkClass
    const btnClass = mobile ? `${buttonClass} mt-2 w-full text-center block` : buttonClass
    return user ? (
      <>
        <Link to="/listings/new" className={itemClass} onClick={closeMenu}>
          Sell an item
        </Link>
        <Link to="/my-listings" className={itemClass} onClick={closeMenu}>
          My listings
        </Link>
        <Link
          to="/messages"
          className={`${linkClass} ${mobile ? 'flex py-2' : 'inline-flex'} items-center gap-1.5`}
          onClick={closeMenu}
          aria-label={unread > 0 ? `Messages, ${unread} unread` : undefined}
        >
          Messages
          {unread > 0 && (
            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <span className={mobile ? 'block py-2 text-gray-500' : 'text-gray-500'}>
          {user.full_name}
        </span>
        <button type="button" onClick={handleLogout} className={btnClass}>
          Log out
        </button>
      </>
    ) : (
      <>
        <Link to="/login" className={itemClass} onClick={closeMenu}>
          Log in
        </Link>
        <Link to="/register" className={btnClass} onClick={closeMenu}>
          Sign up
        </Link>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="whitespace-nowrap text-lg font-bold" onClick={closeMenu}>
              Berea Marketplace
            </Link>
            <div className="hidden items-center gap-4 whitespace-nowrap text-sm md:flex">
              {navItems(false)}
            </div>
            <button
              type="button"
              className="relative rounded p-2 text-gray-700 hover:bg-gray-100 md:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
              {unread > 0 && !menuOpen && (
                <span
                  data-testid="menu-unread-dot"
                  className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600"
                />
              )}
            </button>
          </div>
          {menuOpen && (
            <div className="mt-3 border-t border-gray-200 pt-2 text-base md:hidden">
              {navItems(true)}
            </div>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

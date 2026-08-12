import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const demoUser = {
  id: 1,
  email: 'a@berea.edu',
  full_name: 'Alice',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('renders nothing while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
    verifyCode: vi.fn(),
      logout: vi.fn(),
    })

    const { container } = renderProtected()
    expect(container).toBeEmptyDOMElement()
  })

  it('redirects to /login when logged out', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
    verifyCode: vi.fn(),
      logout: vi.fn(),
    })

    renderProtected()
    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument())
  })

  it('renders the protected content when logged in', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: demoUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
    verifyCode: vi.fn(),
      logout: vi.fn(),
    })

    renderProtected()
    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument())
  })
})

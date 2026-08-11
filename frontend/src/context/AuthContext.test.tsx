import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { auth, ApiError } from '../lib/api'

vi.mock('../lib/api', () => ({
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}))

const demoUser = {
  id: 1,
  email: 'a@berea.edu',
  full_name: 'Alice',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

function TestConsumer() {
  const { user, loading, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login('a@berea.edu', 'pw')}>login</button>
      <button onClick={() => register('a@berea.edu', 'pw', 'Alice')}>register</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function renderConsumer() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  )
}

describe('AuthContext', () => {
  it('starts logged out with no stored token', async () => {
    renderConsumer()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(auth.me).not.toHaveBeenCalled()
  })

  it('restores the user from a stored token on mount', async () => {
    localStorage.setItem('access_token', 'tok')
    vi.mocked(auth.me).mockResolvedValue(demoUser)

    renderConsumer()

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@berea.edu'))
  })

  it('clears an invalid stored token', async () => {
    localStorage.setItem('access_token', 'bad')
    vi.mocked(auth.me).mockRejectedValue(new ApiError('unauthorized'))

    renderConsumer()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(localStorage.getItem('access_token')).toBeNull()
  })

  it('login stores the token and loads the user', async () => {
    vi.mocked(auth.login).mockResolvedValue('new-token')
    vi.mocked(auth.me).mockResolvedValue(demoUser)

    renderConsumer()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await userEvent.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@berea.edu'))
    expect(localStorage.getItem('access_token')).toBe('new-token')
  })

  it('register calls register then logs in', async () => {
    vi.mocked(auth.register).mockResolvedValue(demoUser)
    vi.mocked(auth.login).mockResolvedValue('tok2')
    vi.mocked(auth.me).mockResolvedValue(demoUser)

    renderConsumer()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await userEvent.click(screen.getByText('register'))

    expect(auth.register).toHaveBeenCalledWith({
      email: 'a@berea.edu',
      password: 'pw',
      full_name: 'Alice',
    })
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@berea.edu'))
  })

  it('logout clears the user and stored token', async () => {
    localStorage.setItem('access_token', 'tok')
    vi.mocked(auth.me).mockResolvedValue(demoUser)

    renderConsumer()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@berea.edu'))
    await userEvent.click(screen.getByText('logout'))

    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})

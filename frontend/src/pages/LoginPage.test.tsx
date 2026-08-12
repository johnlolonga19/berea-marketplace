import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

const navigateMock = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function mockAuth(login: (email: string, password: string) => Promise<void>) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    login,
    register: vi.fn(),
    verifyCode: vi.fn(),
    logout: vi.fn(),
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

async function submit(email = 'a@berea.edu', password = 'secretpass123') {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: /log in/i }))
}

describe('LoginPage', () => {
  it('logs in and navigates home on success', async () => {
    const login = vi.fn<(email: string, password: string) => Promise<void>>().mockResolvedValue(undefined)
    mockAuth(login)

    renderPage()
    await submit()

    await waitFor(() => expect(login).toHaveBeenCalledWith('a@berea.edu', 'secretpass123'))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('shows an error message on failed login without navigating', async () => {
    const login = vi.fn<(email: string, password: string) => Promise<void>>().mockRejectedValue(new ApiError('Incorrect email or password', 401))
    mockAuth(login)

    renderPage()
    await submit('a@berea.edu', 'wrong')

    await waitFor(() =>
      expect(screen.getByText('Incorrect email or password')).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument()
  })

  it('shows a verify-email link when login is blocked for an unverified account', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new ApiError('Please verify your email before logging in', 403))
    mockAuth(login)

    renderPage()
    await submit('unverified@berea.edu')

    await waitFor(() =>
      expect(screen.getByText('Please verify your email before logging in')).toBeInTheDocument(),
    )
    expect(screen.getByText('Verify your email')).toHaveAttribute(
      'href',
      '/verify-email?email=unverified%40berea.edu',
    )
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage'
import { useAuth } from '../context/AuthContext'
import { auth, ApiError } from '../lib/api'

const navigateMock = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  auth: { forgotPassword: vi.fn(), resetPassword: vi.fn() },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParams],
  }
})

function renderPage(login = vi.fn().mockResolvedValue(undefined)) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    login,
    register: vi.fn(),
    verifyCode: vi.fn(),
    logout: vi.fn(),
  })
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )
  return { login }
}

async function goToResetStep(user: ReturnType<typeof userEvent.setup>) {
  vi.mocked(auth.forgotPassword).mockResolvedValue(undefined)
  await user.type(screen.getByLabelText('Email'), 'alice@berea.edu')
  await user.click(screen.getByRole('button', { name: 'Send reset code' }))
  await screen.findByLabelText('Reset code')
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParams = new URLSearchParams()
  })

  it('pre-fills the email from the query string', () => {
    searchParams = new URLSearchParams({ email: 'bob@berea.edu' })
    renderPage()
    expect(screen.getByLabelText('Email')).toHaveValue('bob@berea.edu')
  })

  it('requests a code and moves to the reset step', async () => {
    const user = userEvent.setup()
    renderPage()
    await goToResetStep(user)
    expect(auth.forgotPassword).toHaveBeenCalledWith('alice@berea.edu')
    expect(screen.getByText(/we've sent it a 6-digit code/)).toBeInTheDocument()
  })

  it('resets the password, logs in, and navigates home', async () => {
    const user = userEvent.setup()
    const { login } = renderPage()
    await goToResetStep(user)
    vi.mocked(auth.resetPassword).mockResolvedValue(undefined)

    await user.type(screen.getByLabelText('Reset code'), '123456')
    await user.type(screen.getByLabelText('New password'), 'newpass123')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass123')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
    expect(auth.resetPassword).toHaveBeenCalledWith('alice@berea.edu', '123456', 'newpass123')
    expect(login).toHaveBeenCalledWith('alice@berea.edu', 'newpass123')
  })

  it('blocks submission when passwords do not match', async () => {
    const user = userEvent.setup()
    renderPage()
    await goToResetStep(user)

    await user.type(screen.getByLabelText('Reset code'), '123456')
    await user.type(screen.getByLabelText('New password'), 'newpass123')
    await user.type(screen.getByLabelText('Confirm new password'), 'different123')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })

  it('shows the server error for an invalid code', async () => {
    const user = userEvent.setup()
    renderPage()
    await goToResetStep(user)
    vi.mocked(auth.resetPassword).mockRejectedValue(new ApiError('Invalid or expired code', 400))

    await user.type(screen.getByLabelText('Reset code'), '000000')
    await user.type(screen.getByLabelText('New password'), 'newpass123')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass123')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('Invalid or expired code')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('can send another code from the reset step', async () => {
    const user = userEvent.setup()
    renderPage()
    await goToResetStep(user)
    await user.click(screen.getByRole('button', { name: "Didn't get a code? Send another" }))
    await waitFor(() => expect(auth.forgotPassword).toHaveBeenCalledTimes(2))
  })
})

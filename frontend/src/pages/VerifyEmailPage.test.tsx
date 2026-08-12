import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import VerifyEmailPage from './VerifyEmailPage'
import { useAuth } from '../context/AuthContext'
import { auth, ApiError } from '../lib/api'

const navigateMock = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  auth: { resendCode: vi.fn() },
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
    useSearchParams: () => [new URLSearchParams({ email: 'alice@berea.edu' })],
  }
})

function renderPage(verifyCode = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    verifyCode,
    logout: vi.fn(),
  })
  return render(
    <MemoryRouter>
      <VerifyEmailPage />
    </MemoryRouter>,
  )
}

describe('VerifyEmailPage', () => {
  it('pre-fills the email from the query string', () => {
    renderPage()
    expect(screen.getByLabelText('Email')).toHaveValue('alice@berea.edu')
  })

  it('verifies the code and navigates home on success', async () => {
    const verifyCode = vi.fn().mockResolvedValue(undefined)
    renderPage(verifyCode)

    await userEvent.type(screen.getByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() =>
      expect(verifyCode).toHaveBeenCalledWith('alice@berea.edu', '123456'),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('shows an error for an invalid code without navigating', async () => {
    const verifyCode = vi.fn().mockRejectedValue(new ApiError('Invalid or expired code', 400))
    renderPage(verifyCode)

    await userEvent.type(screen.getByLabelText('Verification code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() =>
      expect(screen.getByText('Invalid or expired code')).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('resends the code and shows a confirmation message', async () => {
    vi.mocked(auth.resendCode).mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /resend/i }))

    await waitFor(() => expect(auth.resendCode).toHaveBeenCalledWith('alice@berea.edu'))
    await waitFor(() =>
      expect(
        screen.getByText('If that email is registered and not yet verified, a new code has been sent.'),
      ).toBeInTheDocument(),
    )
  })
})

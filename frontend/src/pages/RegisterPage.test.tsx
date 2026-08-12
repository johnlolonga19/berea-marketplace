import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'
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

function mockAuth(
  register: (email: string, password: string, fullName: string) => Promise<void>,
) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    login: vi.fn(),
    register,
    verifyCode: vi.fn(),
    logout: vi.fn(),
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

async function fillForm(password = 'secretpass123', confirmPassword = 'secretpass123') {
  await userEvent.type(screen.getByLabelText('Full name'), 'Alice Student')
  await userEvent.type(screen.getByLabelText('Email'), 'alice@berea.edu')
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.type(screen.getByLabelText('Confirm password'), confirmPassword)
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
}

describe('RegisterPage', () => {
  it('registers and navigates to the verify-email page on success', async () => {
    const register = vi.fn<(email: string, password: string, fullName: string) => Promise<void>>().mockResolvedValue(undefined)
    mockAuth(register)

    renderPage()
    await fillForm()

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith('alice@berea.edu', 'secretpass123', 'Alice Student'),
    )
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/verify-email?email=alice%40berea.edu'),
    )
  })

  it('shows an error message on failed registration', async () => {
    const register = vi.fn<(email: string, password: string, fullName: string) => Promise<void>>().mockRejectedValue(new ApiError('Email already registered', 409))
    mockAuth(register)

    renderPage()
    await fillForm()

    await waitFor(() =>
      expect(screen.getByText('Email already registered')).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords without calling the API', async () => {
    const register = vi.fn<(email: string, password: string, fullName: string) => Promise<void>>()
    mockAuth(register)

    renderPage()
    await fillForm('secretpass123', 'differentpass456')

    await waitFor(() =>
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument(),
    )
    expect(register).not.toHaveBeenCalled()
  })
})

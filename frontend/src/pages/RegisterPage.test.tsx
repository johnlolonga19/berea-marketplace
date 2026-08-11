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

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  it('registers and navigates home on success', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    })

    renderPage()
    await userEvent.type(screen.getByLabelText('Full name'), 'Alice Student')
    await userEvent.type(screen.getByLabelText('Email'), 'alice@berea.edu')
    await userEvent.type(screen.getByLabelText('Password'), 'secretpass123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith('alice@berea.edu', 'secretpass123', 'Alice Student'),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('shows an error message on failed registration', async () => {
    const register = vi.fn().mockRejectedValue(new ApiError('Email already registered'))
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    })

    renderPage()
    await userEvent.type(screen.getByLabelText('Full name'), 'Alice Student')
    await userEvent.type(screen.getByLabelText('Email'), 'alice@berea.edu')
    await userEvent.type(screen.getByLabelText('Password'), 'secretpass123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() =>
      expect(screen.getByText('Email already registered')).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

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

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('logs in and navigates home on success', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    })

    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), 'a@berea.edu')
    await userEvent.type(screen.getByLabelText('Password'), 'secretpass123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('a@berea.edu', 'secretpass123'))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('shows an error message on failed login without navigating', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError('Incorrect email or password'))
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    })

    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), 'a@berea.edu')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() =>
      expect(screen.getByText('Incorrect email or password')).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from './Layout'
import { useAuth } from '../context/AuthContext'
import { conversations } from '../lib/api'
import { notifyUnreadChanged } from '../lib/unread'
import type { User } from '../types'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  conversations: { unreadCount: vi.fn() },
}))

const alice: User = {
  id: 1,
  email: 'alice@berea.edu',
  full_name: 'Alice',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
}

function renderLayout(user: User | null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    verifyCode: vi.fn(),
    logout: vi.fn(),
  })
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  )
}

describe('Layout unread badge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the unread conversation count next to Messages', async () => {
    vi.mocked(conversations.unreadCount).mockResolvedValue(3)
    renderLayout(alice)
    expect(await screen.findByRole('link', { name: 'Messages, 3 unread' })).toBeInTheDocument()
    expect(screen.getByTestId('menu-unread-dot')).toBeInTheDocument()
  })

  it('caps the badge at 9+', async () => {
    vi.mocked(conversations.unreadCount).mockResolvedValue(12)
    renderLayout(alice)
    expect(await screen.findByText('9+')).toBeInTheDocument()
  })

  it('shows no badge when everything is read', async () => {
    vi.mocked(conversations.unreadCount).mockResolvedValue(0)
    renderLayout(alice)
    await waitFor(() => expect(conversations.unreadCount).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument()
    expect(screen.queryByTestId('menu-unread-dot')).not.toBeInTheDocument()
  })

  it('does not fetch when logged out', () => {
    renderLayout(null)
    expect(conversations.unreadCount).not.toHaveBeenCalled()
  })

  it('refetches when notified that unread state changed', async () => {
    vi.mocked(conversations.unreadCount).mockResolvedValueOnce(2).mockResolvedValueOnce(0)
    renderLayout(alice)
    await screen.findByRole('link', { name: 'Messages, 2 unread' })

    act(() => notifyUnreadChanged())

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument(),
    )
    expect(conversations.unreadCount).toHaveBeenCalledTimes(2)
  })
})

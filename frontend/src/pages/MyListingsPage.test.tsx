import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MyListingsPage from './MyListingsPage'
import { listings as listingsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Listing, User } from '../types'

vi.mock('../lib/api', () => ({
  listings: { list: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function makeListing(overrides: Partial<Listing>): Listing {
  return {
    id: 1,
    title: 'Desk Lamp',
    description: 'Works great',
    price: '12.50',
    image_url: null,
    is_sold: false,
    owner_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mockUser(id: number): User {
  return { id, email: 'a@berea.edu', full_name: 'Alice', is_active: true, created_at: '2026-01-01' }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyListingsPage />
    </MemoryRouter>,
  )
}

describe('MyListingsPage', () => {
  it('shows only listings owned by the current user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser(1),
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(listingsApi.list).mockResolvedValue([
      makeListing({ id: 1, title: 'Mine', owner_id: 1 }),
      makeListing({ id: 2, title: 'Not mine', owner_id: 2 }),
    ])

    renderPage()

    await waitFor(() => expect(screen.getByText('Mine')).toBeInTheDocument())
    expect(screen.queryByText('Not mine')).not.toBeInTheDocument()
  })

  it('shows an empty state when the user has no listings', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser(1),
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(listingsApi.list).mockResolvedValue([makeListing({ id: 2, owner_id: 2 })])

    renderPage()

    await waitFor(() =>
      expect(screen.getByText("You haven't listed anything yet.")).toBeInTheDocument(),
    )
  })
})

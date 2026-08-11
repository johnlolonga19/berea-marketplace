import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'
import { listings } from '../lib/api'
import type { Listing } from '../types'

vi.mock('../lib/api', () => ({
  listings: { list: vi.fn() },
}))

const sample: Listing = {
  id: 1,
  title: 'Desk Lamp',
  description: 'Works great',
  price: '12.50',
  image_url: null,
  is_sold: false,
  owner_id: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('shows a loading state then the listings', async () => {
    vi.mocked(listings.list).mockResolvedValue([sample])
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Desk Lamp')).toBeInTheDocument())
  })

  it('shows an empty state when there are no listings', async () => {
    vi.mocked(listings.list).mockResolvedValue([])
    renderPage()
    await waitFor(() => expect(screen.getByText('No listings yet.')).toBeInTheDocument())
  })

  it('shows an error message if loading fails', async () => {
    vi.mocked(listings.list).mockRejectedValue(new Error('network error'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Could not load listings')).toBeInTheDocument())
  })
})

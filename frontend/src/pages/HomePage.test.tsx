import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('fetches with no filters on initial load', async () => {
    vi.mocked(listings.list).mockResolvedValue([sample])
    renderPage()
    await waitFor(() =>
      expect(listings.list).toHaveBeenCalledWith({
        q: undefined,
        min_price: undefined,
        max_price: undefined,
        is_sold: undefined,
      }),
    )
  })

  it('shows an empty state when there are no listings', async () => {
    vi.mocked(listings.list).mockResolvedValue([])
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No listings match your filters.')).toBeInTheDocument(),
    )
  })

  it('shows an error message if loading fails', async () => {
    vi.mocked(listings.list).mockRejectedValue(new Error('network error'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Could not load listings')).toBeInTheDocument())
  })

  it('debounces search input and passes it as q', async () => {
    vi.mocked(listings.list).mockResolvedValue([sample])
    renderPage()
    await waitFor(() => expect(listings.list).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByLabelText('Search'), 'lamp')

    await waitFor(() =>
      expect(listings.list).toHaveBeenLastCalledWith({
        q: 'lamp',
        min_price: undefined,
        max_price: undefined,
        is_sold: undefined,
      }),
    )
  })

  it('passes min and max price filters', async () => {
    vi.mocked(listings.list).mockResolvedValue([sample])
    renderPage()
    await waitFor(() => expect(listings.list).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByLabelText('Min price'), '10')
    await userEvent.type(screen.getByLabelText('Max price'), '100')

    await waitFor(() =>
      expect(listings.list).toHaveBeenLastCalledWith({
        q: undefined,
        min_price: '10',
        max_price: '100',
        is_sold: undefined,
      }),
    )
  })

  it('passes is_sold based on the status filter', async () => {
    vi.mocked(listings.list).mockResolvedValue([sample])
    renderPage()
    await waitFor(() => expect(listings.list).toHaveBeenCalledTimes(1))

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'sold')

    await waitFor(() =>
      expect(listings.list).toHaveBeenLastCalledWith({
        q: undefined,
        min_price: undefined,
        max_price: undefined,
        is_sold: true,
      }),
    )
  })
})

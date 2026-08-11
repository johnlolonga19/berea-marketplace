import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EditListingPage from './EditListingPage'
import { listings as listingsApi } from '../lib/api'
import type { Listing } from '../types'

const navigateMock = vi.fn()

vi.mock('../lib/api', () => ({
  listings: { get: vi.fn(), update: vi.fn() },
  uploads: { image: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ id: '1' }) }
})

const existing: Listing = {
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
      <EditListingPage />
    </MemoryRouter>,
  )
}

describe('EditListingPage', () => {
  it('shows an error when the listing cannot be loaded', async () => {
    vi.mocked(listingsApi.get).mockRejectedValue(new Error('404'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Listing not found')).toBeInTheDocument())
  })

  it('pre-fills the form and submits an update', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(existing)
    vi.mocked(listingsApi.update).mockResolvedValue({ ...existing, price: '15.00' })

    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Desk Lamp'))

    const priceInput = screen.getByLabelText('Price (USD)')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '15.00')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    // Native number inputs drop trailing zeros: "15.00" -> "15".
    await waitFor(() =>
      expect(listingsApi.update).toHaveBeenCalledWith(1, {
        title: 'Desk Lamp',
        description: 'Works great',
        price: '15',
        image_url: null,
      }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/listings/1'))
  })
})

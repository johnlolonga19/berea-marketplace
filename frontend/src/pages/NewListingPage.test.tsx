import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import NewListingPage from './NewListingPage'
import { listings as listingsApi } from '../lib/api'
import type { Listing } from '../types'

const navigateMock = vi.fn()

vi.mock('../lib/api', () => ({
  listings: { create: vi.fn() },
  uploads: { image: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const created: Listing = {
  id: 42,
  title: 'Desk Lamp',
  description: 'Works great',
  price: '12.50',
  image_url: null,
  is_sold: false,
  owner_id: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('NewListingPage', () => {
  it('creates a listing and navigates to its detail page', async () => {
    vi.mocked(listingsApi.create).mockResolvedValue(created)

    render(
      <MemoryRouter>
        <NewListingPage />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByLabelText('Title'), 'Desk Lamp')
    await userEvent.type(screen.getByLabelText('Description'), 'Works great')
    await userEvent.type(screen.getByLabelText('Price (USD)'), '12.50')
    await userEvent.click(screen.getByRole('button', { name: 'Create listing' }))

    // Native number inputs drop the trailing zero: "12.50" -> "12.5".
    await waitFor(() =>
      expect(listingsApi.create).toHaveBeenCalledWith({
        title: 'Desk Lamp',
        description: 'Works great',
        price: '12.5',
        image_url: null,
      }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/listings/42'))
  })
})

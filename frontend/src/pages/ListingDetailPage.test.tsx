import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ListingDetailPage from './ListingDetailPage'
import { listings as listingsApi, conversations as conversationsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Listing, User } from '../types'

const navigateMock = vi.fn()

vi.mock('../lib/api', () => ({
  listings: { get: vi.fn(), update: vi.fn(), remove: vi.fn() },
  conversations: { start: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ id: '1' }) }
})

const ownerListing: Listing = {
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

function asUser(id: number): User {
  return { id, email: `user${id}@berea.edu`, full_name: `User ${id}`, is_active: true, is_verified: true, created_at: '2026-01-01' }
}

function mockAuth(user: User | null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    verifyCode: vi.fn(),
    logout: vi.fn(),
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ListingDetailPage />
    </MemoryRouter>,
  )
}

describe('ListingDetailPage', () => {
  it('shows an error when the listing is not found', async () => {
    vi.mocked(listingsApi.get).mockRejectedValue(new Error('404'))
    mockAuth(null)
    renderPage()
    await waitFor(() => expect(screen.getByText('Listing not found')).toBeInTheDocument())
  })

  it('hides owner controls for a non-owner', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    mockAuth(asUser(2))
    renderPage()
    await waitFor(() => expect(screen.getByText('Desk Lamp')).toBeInTheDocument())
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('shows owner controls for the owner and toggles sold', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    vi.mocked(listingsApi.update).mockResolvedValue({ ...ownerListing, is_sold: true })
    mockAuth(asUser(1))
    renderPage()
    await waitFor(() => expect(screen.getByText('Mark as sold')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Mark as sold'))

    expect(listingsApi.update).toHaveBeenCalledWith(1, { is_sold: true })
    await waitFor(() => expect(screen.getByText('Mark as available')).toBeInTheDocument())
  })

  it('deletes the listing after confirmation and navigates to my-listings', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    vi.mocked(listingsApi.remove).mockResolvedValue(undefined)
    mockAuth(asUser(1))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage()
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Delete'))

    await waitFor(() => expect(listingsApi.remove).toHaveBeenCalledWith(1))
    expect(navigateMock).toHaveBeenCalledWith('/my-listings')
  })

  it('does not delete when the confirmation is cancelled', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    mockAuth(asUser(1))
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderPage()
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Delete'))

    expect(listingsApi.remove).not.toHaveBeenCalled()
  })

  it('owner does not see the message-seller form', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    mockAuth(asUser(1))
    renderPage()
    await waitFor(() => expect(screen.getByText('Desk Lamp')).toBeInTheDocument())
    expect(screen.queryByText('Message the seller')).not.toBeInTheDocument()
  })

  it('prompts logged-out visitors to log in instead of showing the form', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    mockAuth(null)
    renderPage()
    await waitFor(() => expect(screen.getByText('Desk Lamp')).toBeInTheDocument())
    expect(screen.queryByText('Message the seller')).not.toBeInTheDocument()
    expect(screen.getByText('to message the seller.')).toBeInTheDocument()
  })

  it('lets a non-owner send a message and navigates to the conversation', async () => {
    vi.mocked(listingsApi.get).mockResolvedValue(ownerListing)
    vi.mocked(conversationsApi.start).mockResolvedValue({
      id: 7,
      listing_id: 1,
      listing_title: 'Desk Lamp',
      buyer_id: 2,
      buyer_name: 'User 2',
      seller_id: 1,
      seller_name: 'User 1',
      created_at: '2026-01-01T00:00:00Z',
      messages: [],
    })
    mockAuth(asUser(2))

    renderPage()
    await waitFor(() => expect(screen.getByText('Message the seller')).toBeInTheDocument())

    await userEvent.type(screen.getByPlaceholderText('Is this still available?'), 'Still available?')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() =>
      expect(conversationsApi.start).toHaveBeenCalledWith(1, 'Still available?'),
    )
    expect(navigateMock).toHaveBeenCalledWith('/messages/7')
  })
})

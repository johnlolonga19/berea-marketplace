import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConversationPage, { CHAT_POLL_MS } from './ConversationPage'
import { conversations as conversationsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ConversationDetail, User } from '../types'

vi.mock('../lib/api', () => ({
  conversations: { get: vi.fn(), sendMessage: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: '1' }) }
})

const thread: ConversationDetail = {
  id: 1,
  listing_id: 10,
  listing_title: 'Desk Lamp',
  buyer_id: 2,
  buyer_name: 'Buyer Bob',
  seller_id: 1,
  seller_name: 'Seller Sam',
  created_at: '2026-01-01T00:00:00Z',
  messages: [
    { id: 1, conversation_id: 1, sender_id: 2, body: 'Is this available?', created_at: '2026-01-01T00:00:00Z' },
  ],
}

function asUser(id: number): User {
  return { id, email: `u${id}@berea.edu`, full_name: `User ${id}`, is_active: true, is_verified: true, created_at: '2026-01-01' }
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
      <ConversationPage />
    </MemoryRouter>,
  )
}

describe('ConversationPage', () => {
  it('shows an error when the conversation cannot be loaded', async () => {
    vi.mocked(conversationsApi.get).mockRejectedValue(new Error('404'))
    mockAuth(asUser(2))
    renderPage()
    await waitFor(() => expect(screen.getByText('Conversation not found')).toBeInTheDocument())
  })

  it('shows the seller as the other participant when viewing as the buyer', async () => {
    vi.mocked(conversationsApi.get).mockResolvedValue(thread)
    mockAuth(asUser(2))
    renderPage()
    await waitFor(() => expect(screen.getByText('Seller Sam')).toBeInTheDocument())
    expect(screen.getByText('Re: Desk Lamp')).toBeInTheDocument()
    expect(screen.getByText('Is this available?')).toBeInTheDocument()
  })

  it('shows the buyer as the other participant when viewing as the seller', async () => {
    vi.mocked(conversationsApi.get).mockResolvedValue(thread)
    mockAuth(asUser(1))
    renderPage()
    await waitFor(() => expect(screen.getByText('Buyer Bob')).toBeInTheDocument())
  })

  it('sends a reply and appends it to the thread', async () => {
    vi.mocked(conversationsApi.get).mockResolvedValue(thread)
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({
      id: 2,
      conversation_id: 1,
      sender_id: 1,
      body: 'Yes, still available!',
      created_at: '2026-01-01T00:05:00Z',
    })
    mockAuth(asUser(1))

    renderPage()
    await waitFor(() => expect(screen.getByText('Is this available?')).toBeInTheDocument())

    const input = screen.getByPlaceholderText('Type a message...')
    await userEvent.type(input, 'Yes, still available!')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(conversationsApi.sendMessage).toHaveBeenCalledWith(1, 'Yes, still available!'),
    )
    await waitFor(() => expect(screen.getByText('Yes, still available!')).toBeInTheDocument())
    expect(input).toHaveValue('')
  })

  describe('live updates', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })
    afterEach(() => vi.useRealTimers())

    const reply = {
      id: 2,
      conversation_id: 1,
      sender_id: 1,
      body: 'Yes, come by at 5',
      created_at: '2026-01-01T00:05:00Z',
    }

    it('shows a reply from the other person without reloading', async () => {
      vi.mocked(conversationsApi.get)
        .mockResolvedValueOnce(thread)
        .mockResolvedValue({ ...thread, messages: [...thread.messages, reply] })
      mockAuth(asUser(2))
      renderPage()
      await screen.findByText('Is this available?')
      expect(screen.queryByText('Yes, come by at 5')).not.toBeInTheDocument()

      await act(() => vi.advanceTimersByTimeAsync(CHAT_POLL_MS))

      expect(await screen.findByText('Yes, come by at 5')).toBeInTheDocument()
    })

    it('refreshes the nav badge only when new messages arrive', async () => {
      vi.mocked(conversationsApi.get).mockResolvedValue(thread)
      const onUnreadChanged = vi.fn()
      window.addEventListener('unread-changed', onUnreadChanged)
      mockAuth(asUser(2))
      renderPage()
      await screen.findByText('Is this available?')
      expect(onUnreadChanged).toHaveBeenCalledTimes(1) // initial open

      await act(() => vi.advanceTimersByTimeAsync(CHAT_POLL_MS * 2))
      expect(conversationsApi.get).toHaveBeenCalledTimes(3)
      expect(onUnreadChanged).toHaveBeenCalledTimes(1) // nothing new, no extra refetch
      window.removeEventListener('unread-changed', onUnreadChanged)
    })

    it('keeps showing the thread if a background poll fails', async () => {
      vi.mocked(conversationsApi.get)
        .mockResolvedValueOnce(thread)
        .mockRejectedValue(new Error('network'))
      mockAuth(asUser(2))
      renderPage()
      await screen.findByText('Is this available?')

      await act(() => vi.advanceTimersByTimeAsync(CHAT_POLL_MS))

      expect(screen.getByText('Is this available?')).toBeInTheDocument()
      expect(screen.queryByText('Conversation not found')).not.toBeInTheDocument()
    })
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MessagesPage from './MessagesPage'
import { conversations as conversationsApi } from '../lib/api'
import type { ConversationSummary } from '../types'

vi.mock('../lib/api', () => ({
  conversations: { list: vi.fn() },
}))

const sample: ConversationSummary = {
  id: 1,
  listing_id: 10,
  listing_title: 'Desk Lamp',
  other_user_id: 2,
  other_user_name: 'Bob',
  last_message: 'Is this still available?',
  last_message_at: '2026-01-01T00:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MessagesPage />
    </MemoryRouter>,
  )
}

describe('MessagesPage', () => {
  it('shows a loading state then the conversations', async () => {
    vi.mocked(conversationsApi.list).mockResolvedValue([sample])
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    expect(screen.getByText('Re: Desk Lamp')).toBeInTheDocument()
    expect(screen.getByText('Is this still available?')).toBeInTheDocument()
  })

  it('shows an empty state when there are no conversations', async () => {
    vi.mocked(conversationsApi.list).mockResolvedValue([])
    renderPage()
    await waitFor(() => expect(screen.getByText('No messages yet.')).toBeInTheDocument())
  })

  it('shows an error message if loading fails', async () => {
    vi.mocked(conversationsApi.list).mockRejectedValue(new Error('network error'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Could not load messages')).toBeInTheDocument())
  })

  it('links each conversation to its thread', async () => {
    vi.mocked(conversationsApi.list).mockResolvedValue([sample])
    renderPage()
    await waitFor(() => expect(screen.getByRole('link')).toHaveAttribute('href', '/messages/1'))
  })
})

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { conversations as conversationsApi } from '../lib/api'
import type { ConversationSummary } from '../types'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    conversationsApi
      .list()
      .then(setConversations)
      .catch(() => setError('Could not load messages'))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!conversations) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>
      {conversations.length === 0 ? (
        <p className="text-gray-500">No messages yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link to={`/messages/${c.id}`} className="block px-4 py-3 hover:bg-gray-50">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{c.other_user_name}</span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {new Date(c.last_message_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Re: {c.listing_title}</p>
                <p className="truncate text-sm text-gray-700">{c.last_message}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

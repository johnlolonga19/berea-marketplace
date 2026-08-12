import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { conversations as conversationsApi, ApiError } from '../lib/api'
import type { ConversationDetail } from '../types'
import { useAuth } from '../context/AuthContext'

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    conversationsApi
      .get(Number(id))
      .then(setConversation)
      .catch(() => setError('Conversation not found'))
  }, [id])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!conversation || !draft.trim()) return
    setSending(true)
    try {
      const message = await conversationsApi.sendMessage(conversation.id, draft.trim())
      setConversation({ ...conversation, messages: [...conversation.messages, message] })
      setDraft('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!conversation) return <p className="text-gray-500">Loading...</p>

  const otherUserName =
    user?.id === conversation.buyer_id ? conversation.seller_name : conversation.buyer_name

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">{otherUserName}</h1>
      <p className="mb-6 text-sm text-gray-500">Re: {conversation.listing_title}</p>

      <div className="flex flex-col gap-3">
        {conversation.messages.map((m) => {
          const isMine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                  isMine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.body}
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSend} className="mt-6 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}

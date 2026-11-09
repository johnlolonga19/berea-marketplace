import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { conversations as conversationsApi, ApiError } from '../lib/api'
import { notifyUnreadChanged } from '../lib/unread'
import type { ConversationDetail, Message } from '../types'
import { useAuth } from '../context/AuthContext'

/** How often an open thread checks for new messages. */
export const CHAT_POLL_MS = 4_000

const RECEIPT_LABELS = { sent: 'Sent', delivered: 'Delivered', read: 'Seen' } as const

/** Union by id, oldest first, so a poll and a just-sent message can't clobber each other. */
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Message ids we've already shown, so a poll can tell whether anything is new.
  const seenIds = useRef<Set<number>>(new Set())

  // Fetching the thread also marks it read on the server.
  const load = useCallback(
    (isInitial: boolean) => {
      conversationsApi
        .get(Number(id))
        .then((fresh) => {
          const hasNew = fresh.messages.some((m) => !seenIds.current.has(m.id))
          fresh.messages.forEach((m) => seenIds.current.add(m.id))
          // Always apply: even with no new messages, receipts (Delivered -> Seen) may have changed.
          setConversation((prev) =>
            prev && prev.id === fresh.id
              ? { ...fresh, messages: mergeMessages(prev.messages, fresh.messages) }
              : fresh,
          )
          // Keep the nav badge in sync; only worth a refetch when something arrived.
          if (isInitial || hasNew) notifyUnreadChanged()
        })
        .catch(() => {
          // A failed background poll shouldn't wipe out a thread that's already showing.
          if (isInitial) setError('Conversation not found')
        })
    },
    [id],
  )

  useEffect(() => {
    seenIds.current = new Set()
    load(true)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(false)
    }, CHAT_POLL_MS)
    const onFocus = () => load(false)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const messageCount = conversation?.messages.length ?? 0
  useEffect(() => {
    if (messageCount > 0) bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messageCount])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!conversation || !draft.trim()) return
    setSending(true)
    try {
      const message = await conversationsApi.sendMessage(conversation.id, draft.trim())
      seenIds.current.add(message.id)
      setConversation((prev) =>
        prev ? { ...prev, messages: mergeMessages(prev.messages, [message]) } : prev,
      )
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
  // Like most chat apps, only show the receipt under your most recent message.
  const lastMine = [...conversation.messages].reverse().find((m) => m.sender_id === user?.id)

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">{otherUserName}</h1>
      <p className="mb-6 text-sm text-gray-500">Re: {conversation.listing_title}</p>

      <div className="flex flex-col gap-3">
        {conversation.messages.map((m) => {
          const isMine = m.sender_id === user?.id
          const receipt = m.id === lastMine?.id && m.status ? RECEIPT_LABELS[m.status] : null
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                  isMine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.body}
              </div>
              {receipt && (
                <span
                  data-testid="receipt"
                  className={`mt-1 text-xs ${m.status === 'read' ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  {receipt}
                </span>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
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

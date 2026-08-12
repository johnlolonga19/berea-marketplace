import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listings as listingsApi, conversations as conversationsApi, ApiError } from '../lib/api'
import type { Listing } from '../types'
import { useAuth } from '../context/AuthContext'

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    listingsApi
      .get(Number(id))
      .then(setListing)
      .catch(() => setError('Listing not found'))
  }, [id])

  async function toggleSold() {
    if (!listing) return
    setBusy(true)
    try {
      setListing(await listingsApi.update(listing.id, { is_sold: !listing.is_sold }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!listing) return
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setBusy(true)
    try {
      await listingsApi.remove(listing.id)
      navigate('/my-listings')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault()
    if (!listing || !messageDraft.trim()) return
    setSendingMessage(true)
    try {
      const conversation = await conversationsApi.start(listing.id, messageDraft.trim())
      navigate(`/messages/${conversation.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSendingMessage(false)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!listing) return <p className="text-gray-500">Loading...</p>

  const isOwner = user?.id === listing.owner_id

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <span className="text-sm text-gray-400">No image</span>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <p className="mt-1 text-xl text-gray-700">${listing.price}</p>
        {listing.is_sold && (
          <span className="mt-2 inline-block rounded bg-gray-900 px-2 py-0.5 text-xs text-white">
            Sold
          </span>
        )}
        <p className="mt-4 whitespace-pre-wrap text-gray-800">{listing.description}</p>

        {isOwner && (
          <div className="mt-6 flex gap-2">
            <Link
              to={`/listings/${listing.id}/edit`}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={toggleSold}
              disabled={busy}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Mark as {listing.is_sold ? 'available' : 'sold'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}

        {!isOwner && user && (
          <form onSubmit={handleSendMessage} className="mt-6 flex flex-col gap-2">
            <label htmlFor="message-seller" className="text-sm font-medium">
              Message the seller
            </label>
            <textarea
              id="message-seller"
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              rows={3}
              placeholder="Is this still available?"
              className="rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={sendingMessage || !messageDraft.trim()}
              className="self-start rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {sendingMessage ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}

        {!isOwner && !user && (
          <p className="mt-6 text-sm text-gray-600">
            <Link to="/login" className="font-medium text-gray-900 underline">
              Log in
            </Link>{' '}
            to message the seller.
          </p>
        )}
      </div>
    </div>
  )
}

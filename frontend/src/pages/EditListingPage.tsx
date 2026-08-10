import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listings as listingsApi } from '../lib/api'
import type { Listing } from '../types'
import ListingForm from '../components/ListingForm'
import type { ListingFormValues } from '../components/ListingForm'

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listingsApi
      .get(Number(id))
      .then(setListing)
      .catch(() => setError('Listing not found'))
  }, [id])

  async function handleSubmit(values: ListingFormValues) {
    const updated = await listingsApi.update(Number(id), values)
    navigate(`/listings/${updated.id}`)
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!listing) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit listing</h1>
      <ListingForm submitLabel="Save changes" initial={listing} onSubmit={handleSubmit} />
    </div>
  )
}

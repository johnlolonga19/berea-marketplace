import { useEffect, useState } from 'react'
import { listings as listingsApi } from '../lib/api'
import type { Listing } from '../types'
import ListingCard from '../components/ListingCard'

export default function HomePage() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listingsApi
      .list()
      .then(setListings)
      .catch(() => setError('Could not load listings'))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!listings) return <p className="text-gray-500">Loading...</p>
  if (listings.length === 0) return <p className="text-gray-500">No listings yet.</p>

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}

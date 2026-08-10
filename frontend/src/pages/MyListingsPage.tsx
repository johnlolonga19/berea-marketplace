import { useEffect, useState } from 'react'
import { listings as listingsApi } from '../lib/api'
import type { Listing } from '../types'
import ListingCard from '../components/ListingCard'
import { useAuth } from '../context/AuthContext'

export default function MyListingsPage() {
  const { user } = useAuth()
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listingsApi
      .list()
      .then((all) => setListings(all.filter((l) => l.owner_id === user?.id)))
      .catch(() => setError('Could not load listings'))
  }, [user])

  if (error) return <p className="text-red-600">{error}</p>
  if (!listings) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My listings</h1>
      {listings.length === 0 ? (
        <p className="text-gray-500">You haven't listed anything yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}

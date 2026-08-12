import { useEffect, useState } from 'react'
import { listings as listingsApi } from '../lib/api'
import type { Listing } from '../types'
import ListingCard from '../components/ListingCard'

type StatusFilter = 'all' | 'available' | 'sold'

export default function HomePage() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  useEffect(() => {
    const timeout = setTimeout(() => {
      listingsApi
        .list({
          q: search.trim() || undefined,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          is_sold: status === 'all' ? undefined : status === 'sold',
        })
        .then(setListings)
        .catch(() => setError('Could not load listings'))
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, minPrice, maxPrice, status])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Min price
          <input
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-28 rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Max price
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-28 rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </label>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!error && !listings && <p className="text-gray-500">Loading...</p>}
      {!error && listings && listings.length === 0 && (
        <p className="text-gray-500">No listings match your filters.</p>
      )}
      {!error && listings && listings.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}

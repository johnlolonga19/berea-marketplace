import { Link } from 'react-router-dom'
import type { Listing } from '../types'

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="block overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-md"
    >
      <div className="flex aspect-square items-center justify-center bg-gray-100">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm text-gray-400">No image</span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium">{listing.title}</p>
        <p className="text-gray-700">${listing.price}</p>
        {listing.is_sold && (
          <span className="mt-1 inline-block rounded bg-gray-900 px-2 py-0.5 text-xs text-white">
            Sold
          </span>
        )}
      </div>
    </Link>
  )
}

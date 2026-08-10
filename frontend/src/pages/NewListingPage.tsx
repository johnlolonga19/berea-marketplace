import { useNavigate } from 'react-router-dom'
import { listings as listingsApi } from '../lib/api'
import ListingForm from '../components/ListingForm'
import type { ListingFormValues } from '../components/ListingForm'

export default function NewListingPage() {
  const navigate = useNavigate()

  async function handleSubmit(values: ListingFormValues) {
    const listing = await listingsApi.create(values)
    navigate(`/listings/${listing.id}`)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Sell an item</h1>
      <ListingForm submitLabel="Create listing" onSubmit={handleSubmit} />
    </div>
  )
}

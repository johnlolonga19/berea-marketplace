import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { uploads, ApiError } from '../lib/api'

export interface ListingFormValues {
  title: string
  description: string
  price: string
  image_url: string | null
}

interface Props {
  initial?: Partial<ListingFormValues>
  submitLabel: string
  onSubmit: (values: ListingFormValues) => Promise<void>
}

export default function ListingForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial?.price ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      setImageUrl(await uploads.image(file))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ title, description, price, image_url: imageUrl })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Price (USD)
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Photo
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
      </label>
      {uploading && <p className="text-sm text-gray-500">Uploading image...</p>}
      {imageUrl && <img src={imageUrl} alt="Preview" className="h-40 w-40 rounded object-cover" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || uploading}
        className="rounded bg-gray-900 px-3 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}

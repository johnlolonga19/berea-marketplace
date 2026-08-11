import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ListingCard from './ListingCard'
import type { Listing } from '../types'

const baseListing: Listing = {
  id: 1,
  title: 'Desk Lamp',
  description: 'Works great',
  price: '12.50',
  image_url: null,
  is_sold: false,
  owner_id: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderCard(listing: Listing) {
  return render(
    <MemoryRouter>
      <ListingCard listing={listing} />
    </MemoryRouter>,
  )
}

describe('ListingCard', () => {
  it('shows title, price, and a no-image placeholder', () => {
    renderCard(baseListing)
    expect(screen.getByText('Desk Lamp')).toBeInTheDocument()
    expect(screen.getByText('$12.50')).toBeInTheDocument()
    expect(screen.getByText('No image')).toBeInTheDocument()
    expect(screen.queryByText('Sold')).not.toBeInTheDocument()
  })

  it('renders the image when image_url is set', () => {
    renderCard({ ...baseListing, image_url: 'https://example.com/lamp.jpg' })
    expect(screen.getByRole('img', { name: 'Desk Lamp' })).toHaveAttribute(
      'src',
      'https://example.com/lamp.jpg',
    )
  })

  it('shows a Sold badge when is_sold is true', () => {
    renderCard({ ...baseListing, is_sold: true })
    expect(screen.getByText('Sold')).toBeInTheDocument()
  })

  it('links to the listing detail page', () => {
    renderCard(baseListing)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/listings/1')
  })
})

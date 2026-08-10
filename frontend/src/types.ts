export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface Listing {
  id: number
  title: string
  description: string
  price: string
  image_url: string | null
  is_sold: boolean
  owner_id: number
  created_at: string
  updated_at: string
}

export interface ListingInput {
  title: string
  description: string
  price: string
  image_url?: string | null
}

export interface ListingUpdateInput {
  title?: string
  description?: string
  price?: string
  image_url?: string | null
  is_sold?: boolean
}

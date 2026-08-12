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

export interface Message {
  id: number
  conversation_id: number
  sender_id: number
  body: string
  created_at: string
}

export interface ConversationDetail {
  id: number
  listing_id: number
  listing_title: string
  buyer_id: number
  buyer_name: string
  seller_id: number
  seller_name: string
  created_at: string
  messages: Message[]
}

export interface ConversationSummary {
  id: number
  listing_id: number
  listing_title: string
  other_user_id: number
  other_user_name: string
  last_message: string
  last_message_at: string
}

import type { Listing, ListingInput, ListingUpdateInput, User } from '../types'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join(', ')
    }
  }
  return fallback
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token')
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(extractErrorMessage(body, `Request failed (${res.status})`))
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export const auth = {
  async register(data: { email: string; password: string; full_name: string }): Promise<User> {
    return request<User>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
  },

  async login(email: string, password: string): Promise<string> {
    const body = new URLSearchParams({ username: email, password })
    const { access_token } = await request<{ access_token: string; token_type: string }>(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    )
    return access_token
  },

  async me(): Promise<User> {
    return request<User>('/auth/me')
  },
}

export interface ListingFilters {
  q?: string
  is_sold?: boolean
  min_price?: string
  max_price?: string
}

export const listings = {
  async list(params?: ListingFilters): Promise<Listing[]> {
    const query = new URLSearchParams()
    if (params?.q) query.set('q', params.q)
    if (params?.is_sold !== undefined) query.set('is_sold', String(params.is_sold))
    if (params?.min_price) query.set('min_price', params.min_price)
    if (params?.max_price) query.set('max_price', params.max_price)
    const qs = query.toString()
    return request<Listing[]>(`/listings${qs ? `?${qs}` : ''}`)
  },

  async get(id: number): Promise<Listing> {
    return request<Listing>(`/listings/${id}`)
  },

  async create(data: ListingInput): Promise<Listing> {
    return request<Listing>('/listings', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
  },

  async update(id: number, data: ListingUpdateInput): Promise<Listing> {
    return request<Listing>(`/listings/${id}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
  },

  async remove(id: number): Promise<void> {
    return request<void>(`/listings/${id}`, { method: 'DELETE' })
  },
}

export const uploads = {
  async image(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const { url } = await request<{ url: string }>('/uploads/image', {
      method: 'POST',
      body: formData,
    })
    return url
  },
}

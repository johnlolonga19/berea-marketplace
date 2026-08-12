import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ListingForm from './ListingForm'
import { uploads, ApiError } from '../lib/api'

vi.mock('../lib/api', () => ({
  uploads: { image: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

describe('ListingForm', () => {
  it('uploads a photo and shows a preview', async () => {
    vi.mocked(uploads.image).mockResolvedValue('https://res.cloudinary.com/demo/lamp.jpg')
    render(<ListingForm submitLabel="Create listing" onSubmit={vi.fn()} />)

    const file = new File(['fake'], 'lamp.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('Photo'), file)

    await waitFor(() =>
      expect(screen.getByAltText('Preview')).toHaveAttribute(
        'src',
        'https://res.cloudinary.com/demo/lamp.jpg',
      ),
    )
    expect(uploads.image).toHaveBeenCalledWith(file)
  })

  it('submits the filled-in form values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ListingForm submitLabel="Create listing" onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Title'), 'Desk Lamp')
    await userEvent.type(screen.getByLabelText('Description'), 'Works great')
    await userEvent.type(screen.getByLabelText('Price (USD)'), '12.50')
    await userEvent.click(screen.getByRole('button', { name: 'Create listing' }))

    // Native number inputs drop the trailing zero: "12.50" -> "12.5".
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Desk Lamp',
        description: 'Works great',
        price: '12.5',
        image_url: null,
      }),
    )
  })

  it('pre-fills fields from initial values', () => {
    render(
      <ListingForm
        submitLabel="Save changes"
        initial={{ title: 'Desk Lamp', description: 'Works great', price: '12.50', image_url: null }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Desk Lamp')
    expect(screen.getByLabelText('Description')).toHaveValue('Works great')
    expect(screen.getByLabelText('Price (USD)')).toHaveValue(12.5)
  })

  it('shows an error message if onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('Something broke', 500))
    render(<ListingForm submitLabel="Create listing" onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Title'), 'Desk Lamp')
    await userEvent.type(screen.getByLabelText('Description'), 'Works great')
    await userEvent.type(screen.getByLabelText('Price (USD)'), '12.50')
    await userEvent.click(screen.getByRole('button', { name: 'Create listing' }))

    await waitFor(() => expect(screen.getByText('Something broke')).toBeInTheDocument())
  })
})

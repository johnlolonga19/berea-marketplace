import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmailPage() {
  const { verifyCode } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await verifyCode(email, code)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!email) {
      setError('Enter your email first')
      return
    }
    setError(null)
    setInfo(null)
    setResending(true)
    try {
      await auth.resendCode(email)
      setInfo('If that email is registered and not yet verified, a new code has been sent.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">Verify your email</h1>
      <p className="mb-6 text-sm text-gray-600">
        Enter the 6-digit code we sent to your email.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Verification code
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="rounded border border-gray-300 px-3 py-2 tracking-widest"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-3 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="mt-4 text-sm font-medium text-gray-900 underline disabled:opacity-50"
      >
        {resending ? 'Sending...' : "Didn't get a code? Resend"}
      </button>
    </div>
  )
}

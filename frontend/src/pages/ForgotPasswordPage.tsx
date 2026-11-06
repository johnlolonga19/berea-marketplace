import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { auth, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const inputClass = 'rounded border border-gray-300 px-3 py-2'
const buttonClass =
  'rounded bg-gray-900 px-3 py-2 text-white hover:bg-gray-700 disabled:opacity-50'

export default function ForgotPasswordPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function sendCode() {
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await auth.forgotPassword(email)
      setStep('reset')
      setInfo(`If ${email} has an account, we've sent it a 6-digit code.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function handleRequest(e: FormEvent) {
    e.preventDefault()
    void sendCode()
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await auth.resetPassword(email, code, newPassword)
      await login(email, newPassword)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">Reset your password</h1>

      {step === 'email' ? (
        <>
          <p className="mb-6 text-sm text-gray-600">
            Enter your account email and we'll send you a code to reset your password.
          </p>
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className={buttonClass}>
              {submitting ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        </>
      ) : (
        <>
          {info && <p className="mb-6 text-sm text-green-700">{info}</p>}
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Reset code
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className={`${inputClass} tracking-widest`}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              New password
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Confirm new password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className={buttonClass}>
              {submitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={submitting}
            className="mt-4 text-sm font-medium text-gray-900 underline disabled:opacity-50"
          >
            Didn't get a code? Send another
          </button>
        </>
      )}

      <p className="mt-4 text-sm text-gray-600">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-gray-900 underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

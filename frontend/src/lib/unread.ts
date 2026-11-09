import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { conversations } from './api'

const EVENT = 'unread-changed'
const POLL_MS = 30_000

/** Tell the nav badge to refetch, e.g. after a conversation was opened (and so marked read). */
export function notifyUnreadChanged() {
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Unread conversation count for the logged-in user. Refetches on navigation,
 * when notifyUnreadChanged() fires, and every 30s while the tab is visible.
 */
export function useUnreadCount(enabled: boolean): number {
  const [count, setCount] = useState(0)
  const location = useLocation()

  const refresh = useCallback(() => {
    if (!enabled) return
    conversations
      .unreadCount()
      .then(setCount)
      .catch(() => {
        // Badge is best-effort; keep the last known value on network errors.
      })
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    refresh()
  }, [enabled, refresh, location.pathname])

  useEffect(() => {
    if (!enabled) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    window.addEventListener(EVENT, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, refresh])

  return count
}

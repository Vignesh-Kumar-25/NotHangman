import { useState, useEffect } from 'react'
import { signInGuest, onAuthChange } from '../firebase/auth'

export function useAuth() {
  const [uid, setUid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setUid(user.uid)
        setAuthError(null)
        setLoading(false)
      } else {
        try {
          const newUser = await signInGuest()
          setUid(newUser.uid)
          setAuthError(null)
        } catch (err) {
          console.error('Anonymous sign-in failed:', err)
          // auth/operation-not-allowed means Anonymous Auth is disabled in Firebase console
          const msg = err.code === 'auth/operation-not-allowed'
            ? 'Anonymous Authentication is not enabled. Go to Firebase Console → Authentication → Sign-in method → Anonymous → Enable.'
            : `Auth failed (${err.code ?? err.message}). Check your Firebase project settings.`
          setAuthError(msg)
        } finally {
          setLoading(false)
        }
      }
    })
    return unsubscribe
  }, [])

  return { uid, loading, authError }
}

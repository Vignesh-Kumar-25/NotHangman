import { useState, useEffect } from 'react'
import { signInGuest, onAuthChange } from '../firebase/auth'

export function useAuth() {
  const [uid, setUid] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setUid(user.uid)
        setLoading(false)
      } else {
        try {
          const newUser = await signInGuest()
          setUid(newUser.uid)
        } catch (err) {
          console.error('Anonymous sign-in failed:', err)
        } finally {
          setLoading(false)
        }
      }
    })
    return unsubscribe
  }, [])

  return { uid, loading }
}

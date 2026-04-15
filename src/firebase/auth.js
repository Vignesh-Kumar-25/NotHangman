import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from './config'

export async function signInGuest() {
  const credential = await signInAnonymously(auth)
  return credential.user
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser() {
  return auth.currentUser
}

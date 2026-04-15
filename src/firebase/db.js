import {
  ref,
  push,
  onValue,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database'
import { db } from './config'

// ── Chat ────────────────────────────────────────────────

export function sendChatMessage(roomCode, uid, username, avatarId, text) {
  const trimmed = text.trim().slice(0, 200)
  if (!trimmed) return
  push(ref(db, `rooms/${roomCode}/chat`), {
    uid,
    username,
    avatarId,
    text: trimmed,
    timestamp: serverTimestamp(),
  })
}

// ── Subscriptions ───────────────────────────────────────

export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  return onValue(roomRef, (snap) => callback(snap.val()))
}

export function subscribeToChatMessages(roomCode, callback) {
  const chatRef = query(
    ref(db, `rooms/${roomCode}/chat`),
    orderByChild('timestamp'),
    limitToLast(50)
  )
  return onValue(chatRef, (snap) => {
    const messages = []
    snap.forEach((child) => {
      messages.push({ id: child.key, ...child.val() })
    })
    callback(messages)
  })
}

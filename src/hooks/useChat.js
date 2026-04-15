import { useState, useEffect } from 'react'
import { subscribeToChatMessages } from '../firebase/db'

export function useChat(roomCode) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!roomCode) return
    const unsub = subscribeToChatMessages(roomCode, setMessages)
    return unsub
  }, [roomCode])

  return messages
}

import { useRef, useEffect, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { sendChatMessage } from '../../firebase/db'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import styles from './ChatPanel.module.css'

export default function ChatPanel({ roomCode, uid, username, avatarId }) {
  const messages = useChat(roomCode)
  const messagesEndRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const prevCountRef = useRef(null) // null = initial load not yet seen

  // Auto-scroll on new messages when open
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Track unread when closed
  useEffect(() => {
    // Skip the very first load so existing messages don't count as unread
    if (prevCountRef.current === null) {
      prevCountRef.current = messages.length
      return
    }
    if (!open && messages.length > prevCountRef.current) {
      setUnread((n) => n + (messages.length - prevCountRef.current))
    }
    prevCountRef.current = messages.length
  }, [messages.length, open])

  function handleOpen() {
    setOpen(true)
    setUnread(0)
  }

  function handleSend(text) {
    sendChatMessage(roomCode, uid, username, avatarId, text)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        className={[styles.toggleBtn, open ? styles.open : ''].join(' ')}
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label="Toggle chat"
      >
        💬{' '}
        {unread > 0 && !open ? (
          <span className={styles.badge}>{unread}</span>
        ) : (
          'Chat'
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Chat</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className={styles.messages}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} isMe={msg.uid === uid} />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput onSend={handleSend} />
        </div>
      )}
    </>
  )
}

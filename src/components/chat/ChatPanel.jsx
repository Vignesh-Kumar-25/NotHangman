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
  const [popup, setPopup] = useState(null)
  const prevCountRef = useRef(null)
  const popupTimerRef = useRef(null)

  // Auto-scroll on new messages when open
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Track unread when closed + show popup bubble
  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = messages.length
      return
    }
    if (messages.length > prevCountRef.current) {
      const latest = messages[messages.length - 1]
      if (!open && latest && latest.uid !== uid) {
        setUnread((n) => n + (messages.length - prevCountRef.current))
        setPopup({ username: latest.username, text: latest.text })
        clearTimeout(popupTimerRef.current)
        popupTimerRef.current = setTimeout(() => setPopup(null), 4000)
      }
    }
    prevCountRef.current = messages.length
  }, [messages.length, open, uid])

  function handleOpen() {
    setOpen(true)
    setUnread(0)
    setPopup(null)
    clearTimeout(popupTimerRef.current)
  }

  function handleSend(text) {
    sendChatMessage(roomCode, uid, username, avatarId, text)
  }

  return (
    <>
      {/* Chat popup bubble */}
      {popup && !open && (
        <div className={styles.popup} onClick={handleOpen}>
          <span className={styles.popupName}>{popup.username}</span>
          <span className={styles.popupText}>{popup.text}</span>
        </div>
      )}

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

import { useState, useEffect, useRef } from 'react'
import Avatar from '@/components/shared/Avatar'
import styles from './ScorePanel.module.css'

export default function ScorePanel({ players, playerOrder, currentTurnUid, uid, onKick, kickVotes, chatMessages }) {
  const [chatBubbles, setChatBubbles] = useState({})
  const prevMsgCountRef = useRef(null) // null = initial load not yet seen

  // Show brief chat bubble beside player name when they send a message
  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return
    // Skip initial load so existing messages don't pop up as bubbles
    if (prevMsgCountRef.current === null) {
      prevMsgCountRef.current = chatMessages.length
      return
    }
    if (chatMessages.length <= prevMsgCountRef.current) {
      prevMsgCountRef.current = chatMessages.length
      return
    }
    // Process new messages
    const newMsgs = chatMessages.slice(prevMsgCountRef.current)
    prevMsgCountRef.current = chatMessages.length

    for (const msg of newMsgs) {
      setChatBubbles((prev) => ({ ...prev, [msg.uid]: msg.text }))
      // Clear after 3 seconds
      const msgUid = msg.uid
      setTimeout(() => {
        setChatBubbles((prev) => {
          const next = { ...prev }
          delete next[msgUid]
          return next
        })
      }, 3000)
    }
  }, [chatMessages?.length, uid])

  const connectedCount = playerOrder.filter(
    (id) => players[id]?.connected !== false
  ).length

  return (
    <div className={styles.panel}>
      {playerOrder.map((id) => {
        const player = players[id]
        if (!player) return null
        const isActive = id === currentTurnUid
        const isMe = id === uid
        const disconnected = player.connected === false
        const votes = kickVotes?.[id] ? Object.keys(kickVotes[id]).length : 0

        return (
          <div
            key={id}
            className={[
              styles.row,
              isActive ? styles.active : '',
              disconnected ? styles.disconnected : '',
            ].join(' ')}
          >
            <Avatar avatarId={player.avatarId} size={28} />
            <span className={styles.name}>
              {player.username}
              {isMe && <span className={styles.you}> (you)</span>}
            </span>
            {chatBubbles[id] && (
              <span className={styles.chatCloud}>
                {chatBubbles[id].length > 25
                  ? chatBubbles[id].slice(0, 25) + '…'
                  : chatBubbles[id]}
              </span>
            )}
            <span className={styles.score}>{player.score ?? 0}</span>
            {!isMe && !disconnected && connectedCount > 2 && onKick && (
              <button
                className={styles.kickBtn}
                onClick={() => onKick(id)}
                title="Vote to kick"
              >
                {votes > 0 ? `${votes}` : '✕'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

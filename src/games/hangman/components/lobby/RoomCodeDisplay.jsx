import { useState } from 'react'
import styles from './RoomCodeDisplay.module.css'

export default function RoomCodeDisplay({ roomCode }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Room Code</p>
      <div className={styles.codeRow}>
        <span className={styles.code}>{roomCode}</span>
        <button className={styles.copyBtn} onClick={handleCopy} type="button">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className={styles.hint}>Share this code with friends to join</p>
    </div>
  )
}

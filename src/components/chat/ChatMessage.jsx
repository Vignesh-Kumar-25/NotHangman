import Avatar from '../shared/Avatar'
import styles from './ChatMessage.module.css'

export default function ChatMessage({ message, isMe }) {
  return (
    <div className={[styles.msg, isMe ? styles.me : ''].join(' ')}>
      {!isMe && <Avatar avatarId={message.avatarId} size={24} className={styles.avatar} />}
      <div className={styles.bubble}>
        {!isMe && <span className={styles.author}>{message.username}</span>}
        <p className={styles.text}>{message.text}</p>
      </div>
    </div>
  )
}

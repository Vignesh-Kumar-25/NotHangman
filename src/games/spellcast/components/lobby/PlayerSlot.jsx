import Avatar from '@/components/shared/Avatar'
import styles from './PlayerSlot.module.css'

export default function PlayerSlot({ player, isHost, isMe, onKick, kickVotes, canKick, chatBubble }) {
  return (
    <div className={[styles.slot, !player.connected ? styles.disconnected : ''].join(' ')}>
      <Avatar avatarId={player.avatarId} size={40} />
      <span className={styles.name}>
        {player.username}
        {isMe && <span className={styles.you}> (you)</span>}
      </span>
      {chatBubble && (
        <span className={styles.chatCloud}>
          {chatBubble.length > 35 ? chatBubble.slice(0, 35) + '…' : chatBubble}
        </span>
      )}
      {isHost && <span className={styles.hostBadge}>Host</span>}
      {!player.connected && <span className={styles.offlineBadge}>offline</span>}
      {canKick && !isMe && player.connected && (
        <button
          className={styles.kickBtn}
          onClick={() => onKick(player.uid)}
          title="Vote to kick"
        >
          {kickVotes > 0 ? `Kick (${kickVotes})` : 'Kick'}
        </button>
      )}
    </div>
  )
}

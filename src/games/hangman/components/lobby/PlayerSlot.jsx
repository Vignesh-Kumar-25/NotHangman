import Avatar from '@/components/shared/Avatar'
import styles from './PlayerSlot.module.css'

export default function PlayerSlot({ player, isHost, isMe }) {
  return (
    <div className={[styles.slot, !player.connected ? styles.disconnected : ''].join(' ')}>
      <Avatar avatarId={player.avatarId} size={40} />
      <span className={styles.name}>
        {player.username}
        {isMe && <span className={styles.you}> (you)</span>}
      </span>
      {isHost && <span className={styles.hostBadge}>Host</span>}
      {!player.connected && <span className={styles.offlineBadge}>offline</span>}
    </div>
  )
}

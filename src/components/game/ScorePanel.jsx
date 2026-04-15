import Avatar from '../shared/Avatar'
import styles from './ScorePanel.module.css'

export default function ScorePanel({ players, playerOrder, currentTurnUid, uid }) {
  return (
    <div className={styles.panel}>
      {playerOrder.map((id) => {
        const player = players[id]
        if (!player) return null
        const isActive = id === currentTurnUid
        const isMe = id === uid
        const disconnected = player.connected === false

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
            <span className={styles.score}>{player.score ?? 0}</span>
          </div>
        )
      })}
    </div>
  )
}

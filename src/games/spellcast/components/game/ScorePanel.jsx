import Avatar from '@/components/shared/Avatar'
import styles from './ScorePanel.module.css'

export default function ScorePanel({ players, playerOrder, currentTurnUid, uid }) {
  return (
    <div className={styles.panel}>
      {playerOrder.map((id) => {
        const p = players[id]
        if (!p) return null
        const isActive = id === currentTurnUid
        const isMe = id === uid
        return (
          <div
            key={id}
            className={[
              styles.player,
              isActive ? styles.active : '',
              p.connected === false ? styles.disconnected : '',
            ].join(' ')}
          >
            <div className={styles.avatar}>
              <Avatar avatarId={p.avatarId} size={28} />
            </div>
            <div className={styles.info}>
              <div className={styles.name}>
                {p.username}
                {isMe && <span className={styles.you}> (you)</span>}
              </div>
              <div className={styles.stats}>
                <span className={styles.score}>{p.score ?? 0} pts</span>
                <span className={styles.gems}>&#9670; {p.gems ?? 0}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { getColorHex } from '../../constants/vehicles'
import Avatar from '@/components/shared/Avatar'
import styles from './ScorePanel.module.css'

export default function ScorePanel({ players, playerOrder, uid, engineRef }) {
  const sorted = [...playerOrder]
    .filter((id) => players[id])
    .sort((a, b) => (players[b].score ?? 0) - (players[a].score ?? 0))

  const engine = engineRef?.current

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Scores</h3>
      <div className={styles.list}>
        {sorted.map((id) => {
          const player = players[id]
          const isMe = id === uid
          const color = getColorHex(player.vehicleColor)
          const enginePlayer = engine?.players?.get(id)
          const alive = enginePlayer ? enginePlayer.alive : true

          return (
            <div
              key={id}
              className={[styles.row, !alive ? styles.dead : '', isMe ? styles.me : ''].join(' ')}
            >
              <span className={styles.colorDot} style={{ backgroundColor: color }} />
              <Avatar avatarId={player.avatarId} size={24} />
              <span className={styles.name}>
                {player.username}
                {isMe && <span className={styles.you}> (you)</span>}
              </span>
              <span className={styles.score}>{player.score ?? 0}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

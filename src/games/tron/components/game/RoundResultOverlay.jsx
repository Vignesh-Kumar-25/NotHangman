import { getColorHex } from '../../constants/vehicles'
import styles from './RoundResultOverlay.module.css'

export default function RoundResultOverlay({ game, players }) {
  const roundResult = game?.roundResults?.[game.round]
  if (!roundResult) return null

  const winnerUid = roundResult.winnerUid
  const winner = winnerUid ? players[winnerUid] : null
  const kills = roundResult.kills || {}

  const killFeed = Object.entries(kills).map(([uid, data]) => {
    const victim = players[uid]
    const killerUid = data.killedBy
    const killer = killerUid && killerUid !== 'wall' && killerUid !== 'self'
      ? players[killerUid]
      : null

    let message
    if (killerUid === 'wall') {
      message = `${victim?.username || 'Player'} crashed into a wall`
    } else if (killerUid === uid) {
      message = `${victim?.username || 'Player'} crashed into themselves`
    } else if (killer) {
      message = `${victim?.username || 'Player'} hit ${killer.username}'s trail`
    } else {
      message = `${victim?.username || 'Player'} was eliminated`
    }

    return { uid, message }
  })

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {winner ? (
          <>
            <p className={styles.label}>Round {game.round} Winner</p>
            <p
              className={styles.winnerName}
              style={{ color: getColorHex(winner.vehicleColor) }}
            >
              {winner.username}
            </p>
          </>
        ) : (
          <>
            <p className={styles.label}>Round {game.round}</p>
            <p className={styles.winnerName}>Draw!</p>
          </>
        )}

        {killFeed.length > 0 && (
          <div className={styles.killFeed}>
            {killFeed.map((k) => (
              <p key={k.uid} className={styles.killLine}>{k.message}</p>
            ))}
          </div>
        )}

        <p className={styles.nextHint}>Next round starting soon...</p>
      </div>
    </div>
  )
}

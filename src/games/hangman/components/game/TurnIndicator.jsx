import Avatar from '@/components/shared/Avatar'
import styles from './TurnIndicator.module.css'

export default function TurnIndicator({ currentPlayer, isMyTurn }) {
  if (!currentPlayer) return null

  return (
    <div className={[styles.banner, isMyTurn ? styles.myTurn : ''].join(' ')}>
      <Avatar avatarId={currentPlayer.avatarId} size={32} />
      <span className={styles.text}>
        {isMyTurn ? "Your turn!" : `${currentPlayer.username}'s turn`}
      </span>
    </div>
  )
}

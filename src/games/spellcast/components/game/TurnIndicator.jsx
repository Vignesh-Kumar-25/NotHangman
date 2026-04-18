import styles from './TurnIndicator.module.css'

export default function TurnIndicator({ currentPlayer, isMyTurn }) {
  if (!currentPlayer) return null

  return (
    <span className={`${styles.indicator} ${isMyTurn ? styles.myTurn : ''}`}>
      {isMyTurn ? 'Your turn!' : `${currentPlayer.username}'s turn`}
    </span>
  )
}

import { canAfford } from '../../utils/gemUtils'
import { SHUFFLE_COST, SWAP_COST, HINT_COST } from '../../constants/gameConfig'
import styles from './GemPanel.module.css'

export default function GemPanel({ gems, isMyTurn, usedAbility, onShuffle, onSwap, onHint }) {
  const disabled = !isMyTurn || usedAbility !== null

  return (
    <div className={styles.panel}>
      <span className={styles.gemCount}>
        <span className={styles.gemIcon}>&#9670;</span>
        {gems} / 10
      </span>
      <button
        className={styles.abilityBtn}
        onClick={onShuffle}
        disabled={disabled || !canAfford(gems, SHUFFLE_COST)}
      >
        Shuffle<span className={styles.cost}>({SHUFFLE_COST})</span>
      </button>
      <button
        className={styles.abilityBtn}
        onClick={onSwap}
        disabled={disabled || !canAfford(gems, SWAP_COST)}
      >
        Swap<span className={styles.cost}>({SWAP_COST})</span>
      </button>
      <button
        className={styles.abilityBtn}
        onClick={onHint}
        disabled={disabled || !canAfford(gems, HINT_COST)}
      >
        Hint<span className={styles.cost}>({HINT_COST})</span>
      </button>
    </div>
  )
}

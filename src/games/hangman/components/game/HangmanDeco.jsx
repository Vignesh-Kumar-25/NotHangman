import styles from './HangmanDeco.module.css'

function StickMan({ className }) {
  return (
    <g className={className}>
      {/* Head */}
      <circle cx="0" cy="-38" r="8" className={styles.limb} fill="none" />
      {/* Body */}
      <line x1="0" y1="-30" x2="0" y2="0" className={styles.limb} />
      {/* Left arm */}
      <line x1="0" y1="-22" x2="-14" y2="-8" className={styles.armL} />
      {/* Right arm */}
      <line x1="0" y1="-22" x2="14" y2="-8" className={styles.armR} />
      {/* Left leg */}
      <line x1="0" y1="0" x2="-12" y2="20" className={styles.legL} />
      {/* Right leg */}
      <line x1="0" y1="0" x2="12" y2="20" className={styles.legR} />
    </g>
  )
}

export default function HangmanDeco() {
  return (
    <div className={styles.container}>
      <svg
        className={styles.svg}
        viewBox="0 0 200 90"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Floor line */}
        <line x1="10" y1="80" x2="190" y2="80" className={styles.floor} />

        {/* Three dancing stick figures */}
        <g transform="translate(50, 60)">
          <StickMan className={styles.dancer1} />
        </g>
        <g transform="translate(100, 60)">
          <StickMan className={styles.dancer2} />
        </g>
        <g transform="translate(150, 60)">
          <StickMan className={styles.dancer3} />
        </g>
      </svg>
    </div>
  )
}

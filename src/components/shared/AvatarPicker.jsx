import { AVATARS } from '../../constants/avatars'
import styles from './AvatarPicker.module.css'

export default function AvatarPicker({ selected, onChange }) {
  return (
    <div className={styles.picker}>
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          className={[styles.option, selected === avatar.id ? styles.selected : ''].join(' ')}
          onClick={() => onChange(avatar.id)}
          aria-label={`Select ${avatar.label} avatar`}
          title={avatar.label}
        >
          <img src={avatar.src} alt={avatar.label} width={48} height={48} />
        </button>
      ))}
    </div>
  )
}

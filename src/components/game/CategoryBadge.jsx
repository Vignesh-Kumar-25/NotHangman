import styles from './CategoryBadge.module.css'

const ICONS = { movies: '🎬', animals: '🐾', countries: '🌍' }

export default function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className={styles.badge}>
      {ICONS[category] || '?'} {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  )
}

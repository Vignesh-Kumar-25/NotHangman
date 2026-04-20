import styles from './CategoryBadge.module.css'

const ICONS = { movies: '🎬', animals: '🐾', countries: '🌍', anime: '⚔️', catchphrases: '💬', pokemon: '⚡', music: '🎵', famous_people: '⭐', places: '🗺️', food: '🍔' }

export default function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className={styles.badge}>
      {ICONS[category] || '?'} {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
    </span>
  )
}

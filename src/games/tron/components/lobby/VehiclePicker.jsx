import { VEHICLE_COLORS, VEHICLE_STYLES } from '../../constants/vehicles'
import styles from './VehiclePicker.module.css'

export default function VehiclePicker({ selectedColor, selectedStyle, onColorChange, onStyleChange }) {
  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <label className={styles.label}>Vehicle Color</label>
        <div className={styles.colorGrid}>
          {VEHICLE_COLORS.map((vc) => (
            <button
              key={vc.id}
              className={[styles.colorBtn, selectedColor === vc.id ? styles.selected : ''].join(' ')}
              style={{ backgroundColor: vc.hex, boxShadow: selectedColor === vc.id ? `0 0 12px ${vc.hex}` : 'none' }}
              onClick={() => onColorChange(vc.id)}
              title={vc.name}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Vehicle Shape</label>
        <div className={styles.styleGrid}>
          {VEHICLE_STYLES.map((vs) => (
            <button
              key={vs.id}
              className={[styles.styleBtn, selectedStyle === vs.id ? styles.selectedStyle : ''].join(' ')}
              onClick={() => onStyleChange(vs.id)}
              type="button"
            >
              {vs.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { VEHICLE_COLORS, VEHICLE_STYLES } from '../../constants/vehicles'
import styles from './VehiclePicker.module.css'

export default function VehiclePicker({
  selectedColor, selectedStyle,
  onColorChange, onStyleChange,
  disabledColors = new Set(),
}) {
  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <label className={styles.label}>Vehicle Color</label>
        <div className={styles.colorGrid}>
          {VEHICLE_COLORS.map((vc) => {
            const taken = disabledColors.has(vc.id)
            const isSelected = selectedColor === vc.id
            return (
              <button
                key={vc.id}
                className={[
                  styles.colorBtn,
                  isSelected ? styles.selected : '',
                  taken ? styles.taken : '',
                ].join(' ')}
                style={{
                  backgroundColor: vc.hex,
                  boxShadow: isSelected ? `0 0 12px ${vc.hex}` : 'none',
                }}
                onClick={() => !taken && onColorChange(vc.id)}
                title={taken ? `${vc.name} (taken)` : vc.name}
                type="button"
                disabled={taken}
              >
                {taken && <span className={styles.takenX}>&#10005;</span>}
              </button>
            )
          })}
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

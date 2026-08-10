import type { MetricChange } from './bodyTrend'
import styles from './ChangeSummary.module.css'

interface ChangeSummaryProps {
  readonly label: string
  readonly unit: string
  readonly change: MetricChange | null
  /**
   * 増えた方が望ましい項目か。除脂肪体重は増える方が良く、体重や体脂肪率は減る方が良い。
   * 良し悪しは決めつけず、向きの矢印だけを合わせる。
   */
  readonly isGainGood?: boolean
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

/** 期間のはじめと終わりを比べた変化を1項目ぶん出す。 */
export function ChangeSummary({ label, unit, change, isGainGood = false }: ChangeSummaryProps) {
  if (change === null) {
    return (
      <div className={styles.item}>
        <span className={styles.label}>{label}</span>
        <span className={styles.empty}>2回以上測ると出ます</span>
      </div>
    )
  }

  const arrow = change.delta === 0 ? '→' : change.delta > 0 ? '↑' : '↓'

  return (
    <div className={styles.item} data-testid={`change-${label}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        <span aria-hidden="true" className={isGainGood ? styles.gainGood : undefined}>
          {arrow}
        </span>
        {formatSigned(change.delta)} {unit}
      </span>
      {change.perWeek !== null && (
        <span className={styles.perWeek}>
          週 {formatSigned(change.perWeek)} {unit}
        </span>
      )}
      <span className={styles.range}>
        {change.first} → {change.last}
      </span>
    </div>
  )
}

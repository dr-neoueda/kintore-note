import { calcAchievementPercent } from '@/domain/nutritionTarget'
import type { Nutrition } from '@/domain/nutrition'
import type { NutritionTarget } from '@/domain/types'
import styles from './NutritionSummary.module.css'

interface NutritionSummaryProps {
  readonly total: Nutrition
  readonly target: NutritionTarget
  /** 体組成計で測った基礎代謝量。無ければ収支は出さない。 */
  readonly basalMetabolicRateKcal: number | null
  /** その日の運動による推定消費。 */
  readonly activeKcal: number
}

interface MacroRow {
  readonly label: string
  readonly actual: number
  readonly target: number
}

/** 帯が振り切れて見えなくならないよう、表示上の上限を設ける。 */
const MAX_BAR_PERCENT = 100

export function NutritionSummary({
  total,
  target,
  basalMetabolicRateKcal,
  activeKcal,
}: NutritionSummaryProps) {
  const kcalPercent = calcAchievementPercent(total.kcal, target.kcal)
  const remaining = target.kcal - total.kcal

  const macros: readonly MacroRow[] = [
    { label: 'たんぱく質', actual: total.protein, target: target.protein },
    { label: '脂質', actual: total.fat, target: target.fat },
    { label: '炭水化物', actual: total.carb, target: target.carb },
  ]

  return (
    <section className={styles.card} aria-label="今日の栄養">
      <div className={styles.kcalRow}>
        <div>
          <span className={styles.kcalValue} data-testid="total-kcal">
            {total.kcal}
          </span>
          <span className={styles.kcalTarget}> / {target.kcal} kcal</span>
        </div>
        <span className={styles.remaining}>
          {remaining >= 0 ? `あと ${remaining}` : `${-remaining} 超過`}
        </span>
      </div>

      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${Math.min(MAX_BAR_PERCENT, kcalPercent)}%` }}
        />
      </div>

      <dl className={styles.macros}>
        {macros.map(({ label, actual, target: goal }) => (
          <div key={label} className={styles.macro}>
            <dt className={styles.macroLabel}>{label}</dt>
            <dd className={styles.macroValue}>
              {actual}
              <span className={styles.macroTarget}> / {goal} g</span>
            </dd>
            <div className={styles.macroTrack}>
              <div
                className={styles.macroFill}
                style={{
                  width: `${Math.min(MAX_BAR_PERCENT, calcAchievementPercent(actual, goal))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>

      {basalMetabolicRateKcal !== null && (
        <div className={styles.balance}>
          <div className={styles.balanceRow}>
            <span>摂取</span>
            <span>{total.kcal} kcal</span>
          </div>
          <div className={styles.balanceRow}>
            <span>消費（基礎代謝 + 運動）</span>
            <span>
              {basalMetabolicRateKcal + activeKcal} kcal
            </span>
          </div>
          <div className={`${styles.balanceRow} ${styles.balanceTotal}`}>
            <span>収支</span>
            <span data-testid="energy-balance">
              {total.kcal - basalMetabolicRateKcal - activeKcal > 0 ? '+' : ''}
              {total.kcal - basalMetabolicRateKcal - activeKcal} kcal
            </span>
          </div>
          <p className={styles.balanceNote}>
            日常生活の活動量は含んでいません。目安として見てください。
          </p>
        </div>
      )}

      <p className={styles.salt}>食塩相当量 {total.salt} g</p>
    </section>
  )
}

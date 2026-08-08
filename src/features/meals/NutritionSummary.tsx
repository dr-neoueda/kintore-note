import { calcAchievementPercent } from '@/domain/nutritionTarget'
import type { Nutrition } from '@/domain/nutrition'
import type { NutritionTarget } from '@/domain/types'
import styles from './NutritionSummary.module.css'

interface NutritionSummaryProps {
  readonly total: Nutrition
  readonly target: NutritionTarget
}

interface MacroRow {
  readonly label: string
  readonly actual: number
  readonly target: number
}

/** 帯が振り切れて見えなくならないよう、表示上の上限を設ける。 */
const MAX_BAR_PERCENT = 100

export function NutritionSummary({ total, target }: NutritionSummaryProps) {
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

      <p className={styles.salt}>食塩相当量 {total.salt} g</p>
    </section>
  )
}

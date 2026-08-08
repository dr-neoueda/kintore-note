import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon } from '@/components/icons'
import { listAllMealEntries } from '@/data/repositories/mealRepository'
import { getSettings } from '@/data/repositories/settingsRepository'
import { formatDateLabelWithYear } from '@/domain/date'
import { DEFAULT_NUTRITION_TARGET } from '@/domain/nutritionTarget'
import { summarizeMealDays } from './mealDays'
import styles from './MealHistoryPage.module.css'

export function MealHistoryPage() {
  const entries = useLiveQuery(() => listAllMealEntries(), [])
  const settings = useLiveQuery(() => getSettings(), [])

  const days = useMemo(() => summarizeMealDays(entries ?? []), [entries])
  const target = settings?.nutritionTarget ?? DEFAULT_NUTRITION_TARGET

  return (
    <>
      <PageHeader
        title="食事の履歴"
        subtitle={days.length === 0 ? undefined : `${days.length} 日ぶんの記録`}
      />

      <div className={styles.content}>
        {entries === undefined && <p className="empty-state">読み込み中…</p>}

        {entries !== undefined && days.length === 0 && (
          <p className="empty-state">まだ記録がありません。</p>
        )}

        {days.map((day) => (
          <Link key={day.date} to={`/meals?date=${day.date}`} className={styles.item}>
            <div className={styles.main}>
              <div className={styles.date}>{formatDateLabelWithYear(day.date)}</div>
              <div className={styles.macros}>
                P{day.nutrition.protein} F{day.nutrition.fat} C{day.nutrition.carb}
              </div>
            </div>
            <div className={styles.stats}>
              <div className={styles.kcal}>{day.nutrition.kcal} kcal</div>
              <div className={styles.diff}>
                {day.nutrition.kcal <= target.kcal
                  ? `目標まで ${target.kcal - day.nutrition.kcal}`
                  : `${day.nutrition.kcal - target.kcal} 超過`}
              </div>
            </div>
            <span className={styles.chevron}>
              <ChevronRightIcon size={18} />
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

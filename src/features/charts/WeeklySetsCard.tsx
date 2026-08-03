import { useMemo } from 'react'
import { formatShortDateLabel, getWeekRange } from '@/domain/date'
import type { MuscleGroup } from '@/domain/types'
import { MUSCLE_GROUP_LABELS } from '@/domain/types'
import {
  WEEKLY_SET_TARGET_MAX,
  WEEKLY_SET_TARGET_MIN,
  countWorkingSetsByMuscleGroup,
} from '@/domain/weeklySets'
import { useExercises } from '@/hooks/useExercises'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import styles from './WeeklySetsCard.module.css'

/** その他は記録がある場合だけ出す。常に並べても判断材料にならないため。 */
const ALWAYS_SHOWN_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
]

/** 目盛りの上限。目安の上限を超えても棒が振り切れないよう少し余裕を持たせる。 */
const SCALE_HEADROOM = 4

/**
 * 今週の部位別セット数。
 *
 * 総挙上量(kg)は達成感の指標にはなるが、「次に何をすべきか」には使いにくい。
 * 部位ごとの週間セット数は、足りていない部位がそのまま次の行動になる。
 */
export function WeeklySetsCard() {
  const todayKey = useTodayKey()
  const { exerciseById } = useExercises()
  const { allSets, dateByWorkoutId } = useWorkoutHistory()

  const thisWeek = useMemo(() => getWeekRange(todayKey), [todayKey])
  const lastWeek = useMemo(() => getWeekRange(todayKey, 1), [todayKey])

  const thisWeekCounts = useMemo(
    () => countWorkingSetsByMuscleGroup(allSets, exerciseById, dateByWorkoutId, thisWeek),
    [allSets, exerciseById, dateByWorkoutId, thisWeek],
  )
  const lastWeekCounts = useMemo(
    () => countWorkingSetsByMuscleGroup(allSets, exerciseById, dateByWorkoutId, lastWeek),
    [allSets, exerciseById, dateByWorkoutId, lastWeek],
  )

  const visibleGroups = [
    ...ALWAYS_SHOWN_GROUPS,
    ...(thisWeekCounts.other > 0 || lastWeekCounts.other > 0
      ? (['other'] as const)
      : ([] as const)),
  ]

  const scaleMax = Math.max(
    WEEKLY_SET_TARGET_MAX + SCALE_HEADROOM,
    ...visibleGroups.map((group) => thisWeekCounts[group]),
  )
  const toPercent = (value: number) => `${Math.min(100, (value / scaleMax) * 100)}%`

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>今週の部位別セット数</h2>
      <p className={styles.range}>
        {formatShortDateLabel(thisWeek.fromDate)}〜{formatShortDateLabel(thisWeek.toDate)}
        （月曜はじまり）
      </p>

      <div className={styles.list}>
        {visibleGroups.map((group) => {
          const count = thisWeekCounts[group]
          const previousCount = lastWeekCounts[group]
          const isInTarget = count >= WEEKLY_SET_TARGET_MIN

          return (
            <div key={group} className={styles.row}>
              <span className={styles.name}>{MUSCLE_GROUP_LABELS[group]}</span>

              <span className={styles.barArea}>
                <span
                  className={styles.targetZone}
                  style={{
                    left: toPercent(WEEKLY_SET_TARGET_MIN),
                    width: toPercent(WEEKLY_SET_TARGET_MAX - WEEKLY_SET_TARGET_MIN),
                  }}
                />
                <span
                  className={isInTarget ? `${styles.fill} ${styles.fillInTarget}` : styles.fill}
                  style={{ width: toPercent(count) }}
                />
              </span>

              <span className={styles.count}>
                <span className={styles.countValue}>{count}</span>{' '}
                <span className={styles.previous}>({previousCount})</span>
              </span>
            </div>
          )
        })}
      </div>

      <p className={styles.legend}>
        数字は今週の本セット数（かっこ内は先週）。
        帯は筋肥大の目安とされる週{WEEKLY_SET_TARGET_MIN}〜{WEEKLY_SET_TARGET_MAX}
        セットの範囲です。
      </p>
    </section>
  )
}

import type { DateKey } from './date'
import { estimateOneRepMax } from './oneRepMax'
import type { DumbbellCount, WorkoutId, WorkoutSet } from './types'
import { calcTotalVolume } from './volume'
import { toVolumeInputs, type ExerciseMap } from './workoutStats'

export type WorkoutDateMap = ReadonlyMap<WorkoutId, DateKey>

export interface ExerciseProgressPoint {
  readonly date: DateKey
  readonly maxWeightKg: number
  readonly estimatedOneRepMaxKg: number | null
  readonly volumeKg: number
}

export interface VolumeHistoryPoint {
  readonly date: DateKey
  readonly volumeKg: number
}

/** ウォームアップを除いたセットを、実施日ごとにまとめる。 */
function groupWorkingSetsByDate(
  sets: readonly WorkoutSet[],
  dateByWorkoutId: WorkoutDateMap,
): Map<DateKey, WorkoutSet[]> {
  const grouped = new Map<DateKey, WorkoutSet[]>()

  for (const set of sets) {
    if (set.isWarmup) continue

    const date = dateByWorkoutId.get(set.workoutId)
    if (date === undefined) continue

    const current = grouped.get(date)
    if (current === undefined) grouped.set(date, [set])
    else current.push(set)
  }

  return grouped
}

function byDateAscending<T extends { date: DateKey }>(a: T, b: T): number {
  return a.date.localeCompare(b.date)
}

/** 1種目の推移（最大重量・推定1RM・ボリューム）を日付の昇順で返す。 */
export function buildExerciseProgress(
  sets: readonly WorkoutSet[],
  dumbbellCount: DumbbellCount,
  dateByWorkoutId: WorkoutDateMap,
): ExerciseProgressPoint[] {
  const grouped = groupWorkingSetsByDate(sets, dateByWorkoutId)

  return [...grouped.entries()]
    .map(([date, dateSets]) => ({
      date,
      maxWeightKg: Math.max(...dateSets.map((set) => set.weightKg)),
      estimatedOneRepMaxKg: dateSets.reduce<number | null>((best, set) => {
        const estimate = estimateOneRepMax(set.weightKg, set.reps)
        if (estimate === null) return best
        return best === null || estimate > best ? estimate : best
      }, null),
      volumeKg: calcTotalVolume(
        dateSets.map((set) => ({
          weightKg: set.weightKg,
          reps: set.reps,
          isWarmup: set.isWarmup,
          dumbbellCount,
        })),
      ),
    }))
    .sort(byDateAscending)
}

/** 全種目を合算した日ごとの総ボリュームを日付の昇順で返す。 */
export function buildVolumeHistory(
  sets: readonly WorkoutSet[],
  exerciseById: ExerciseMap,
  dateByWorkoutId: WorkoutDateMap,
): VolumeHistoryPoint[] {
  const grouped = groupWorkingSetsByDate(sets, dateByWorkoutId)

  return [...grouped.entries()]
    .map(([date, dateSets]) => ({
      date,
      volumeKg: calcTotalVolume(toVolumeInputs(dateSets, exerciseById)),
    }))
    .sort(byDateAscending)
}

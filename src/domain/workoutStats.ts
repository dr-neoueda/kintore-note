import type { Exercise, ExerciseId, WorkoutSet } from './types'
import { calcTotalVolume, type VolumeSetInput } from './volume'

export interface WorkoutSummary {
  readonly totalVolumeKg: number
  /** ウォームアップを除いたセット数。 */
  readonly workingSetCount: number
  readonly exerciseCount: number
}

export type ExerciseMap = ReadonlyMap<ExerciseId, Exercise>

/**
 * 保存済みのセットに種目情報を結合し、ボリューム計算用の入力に変換する。
 * 種目が引けない場合はダンベル1個として安全側に倒す。
 */
export function toVolumeInputs(
  sets: readonly WorkoutSet[],
  exerciseById: ExerciseMap,
): VolumeSetInput[] {
  return sets.map((set) => ({
    weightKg: set.weightKg,
    reps: set.reps,
    isWarmup: set.isWarmup,
    dumbbellCount: exerciseById.get(set.exerciseId)?.dumbbellCount ?? 1,
  }))
}

/** 1回のワークアウトの要約を返す。 */
export function summarizeWorkout(
  sets: readonly WorkoutSet[],
  exerciseById: ExerciseMap,
): WorkoutSummary {
  return {
    totalVolumeKg: calcTotalVolume(toVolumeInputs(sets, exerciseById)),
    workingSetCount: sets.filter((set) => !set.isWarmup).length,
    exerciseCount: new Set(sets.map((set) => set.exerciseId)).size,
  }
}

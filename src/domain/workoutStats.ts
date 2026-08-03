import type { WorkoutSet } from './types'

export interface WorkoutSummary {
  /** ウォームアップを除いたセット数。 */
  readonly workingSetCount: number
  readonly exerciseCount: number
}

/** 1回のワークアウトの要約を返す。 */
export function summarizeWorkout(sets: readonly WorkoutSet[]): WorkoutSummary {
  return {
    workingSetCount: sets.filter((set) => !set.isWarmup).length,
    exerciseCount: new Set(sets.map((set) => set.exerciseId)).size,
  }
}

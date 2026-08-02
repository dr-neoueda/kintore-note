import type { WorkoutSet } from '@/domain/types'

export interface SetFormValues {
  readonly weightKg: number
  readonly reps: number
  readonly rpe: number | null
  readonly isWarmup: boolean
}

/** 過去の記録が無いときの既定回数。 */
export const DEFAULT_REPS = 10

interface BuildInitialSetValuesParams {
  /** 編集対象のセット。新規追加なら null。 */
  readonly existingSet: WorkoutSet | null
  /** 今日のセッションで、その種目に既に記録済みのセット（並び順）。 */
  readonly setsInSession: readonly WorkoutSet[]
  /** 前回その種目を行ったセッションのセット（並び順）。 */
  readonly previousSets: readonly WorkoutSet[]
  readonly dumbbellStepsKg: readonly number[]
}

/**
 * セット入力の初期値を決める。
 *
 * 「毎回同じ数字を入力し直す」手間を無くすことが目的で、
 * 直前のセット → 前回セッション → 既定値、の順に引き継ぐ。
 * RPE とウォームアップ指定はセットごとに変わるため引き継がない。
 */
export function buildInitialSetValues({
  existingSet,
  setsInSession,
  previousSets,
  dumbbellStepsKg,
}: BuildInitialSetValuesParams): SetFormValues {
  if (existingSet !== null) {
    return {
      weightKg: existingSet.weightKg,
      reps: existingSet.reps,
      rpe: existingSet.rpe,
      isWarmup: existingSet.isWarmup,
    }
  }

  const lastInSession = setsInSession[setsInSession.length - 1]
  if (lastInSession !== undefined) {
    return {
      weightKg: lastInSession.weightKg,
      reps: lastInSession.reps,
      rpe: null,
      isWarmup: false,
    }
  }

  // ウォームアップから始まる記録が多いため、本セットを優先して引き継ぐ
  const referenceSet =
    previousSets.find((set) => !set.isWarmup) ?? previousSets[0]
  if (referenceSet !== undefined) {
    return {
      weightKg: referenceSet.weightKg,
      reps: referenceSet.reps,
      rpe: null,
      isWarmup: false,
    }
  }

  return {
    weightKg: dumbbellStepsKg[0] ?? 0,
    reps: DEFAULT_REPS,
    rpe: null,
    isWarmup: false,
  }
}

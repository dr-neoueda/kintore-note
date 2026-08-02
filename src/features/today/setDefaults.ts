import type { ProgressionSuggestion } from '@/domain/progression'
import type { WorkoutSet } from '@/domain/types'

export interface SetFormValues {
  readonly weightKg: number
  readonly reps: number
  readonly rpe: number | null
  readonly isWarmup: boolean
}

interface BuildInitialSetValuesParams {
  /** 編集対象のセット。新規追加なら null。 */
  readonly existingSet: WorkoutSet | null
  /** 今日のセッションで、その種目に既に記録済みのセット（並び順）。 */
  readonly setsInSession: readonly WorkoutSet[]
  /** 前回の実績から導いた今回の提案。 */
  readonly suggestion: ProgressionSuggestion
}

/** 保存済みのセットをフォームの値に変換する。編集時に使う。 */
export function toSetFormValues(set: WorkoutSet): SetFormValues {
  return {
    weightKg: set.weightKg,
    reps: set.reps,
    rpe: set.rpe,
    isWarmup: set.isWarmup,
  }
}

/**
 * セット入力の初期値を決める。
 *
 * 「毎回同じ数字を入力し直す」手間を無くすことが目的で、
 * 直前のセット → 今回の提案（ダブルプログレッション）、の順に引き継ぐ。
 * RPE とウォームアップ指定はセットごとに変わるため引き継がない。
 */
export function buildInitialSetValues({
  existingSet,
  setsInSession,
  suggestion,
}: BuildInitialSetValuesParams): SetFormValues {
  if (existingSet !== null) {
    return toSetFormValues(existingSet)
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

  return {
    weightKg: suggestion.weightKg,
    reps: suggestion.repsHint,
    rpe: null,
    isWarmup: false,
  }
}

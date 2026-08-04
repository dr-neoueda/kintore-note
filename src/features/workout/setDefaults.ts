import type { ProgressionSuggestion } from '@/domain/progression'
import { defaultRestTargetSec } from '@/domain/rest'
import type { WorkoutSet } from '@/domain/types'

export interface SetFormValues {
  readonly weightKg: number
  readonly reps: number
  readonly rpe: number | null
  readonly isWarmup: boolean
  /** このセットの後に取る休憩の目安（秒）。 */
  readonly restTargetSec: number
}

interface BuildInitialSetValuesParams {
  /** 編集対象のセット。新規追加なら null。 */
  readonly existingSet: WorkoutSet | null
  /** 今日のセッションで、その種目に既に記録済みのセット（並び順）。 */
  readonly setsInSession: readonly WorkoutSet[]
  /** 前回の実績から導いた今回の提案。 */
  readonly suggestion: ProgressionSuggestion
  /** 種目に設定された休憩の目安（秒）。 */
  readonly exerciseRestSec: number
}

/** 保存済みのセットをフォームの値に変換する。編集時に使う。 */
export function toSetFormValues(set: WorkoutSet, exerciseRestSec: number): SetFormValues {
  return {
    weightKg: set.weightKg,
    reps: set.reps,
    rpe: set.rpe,
    isWarmup: set.isWarmup,
    // 休憩の目安を持たない古いセットは、種目の設定で補う
    restTargetSec: set.restTargetSec ?? exerciseRestSec,
  }
}

/**
 * セット入力の初期値を決める。
 *
 * 「毎回同じ数字を入力し直す」手間を無くすことが目的で、
 * 直前のセット → 今回の提案（ダブルプログレッション）、の順に引き継ぐ。
 * RPE・ウォームアップ指定・休憩の目安はセットごとに変わるため引き継がない。
 */
export function buildInitialSetValues({
  existingSet,
  setsInSession,
  suggestion,
  exerciseRestSec,
}: BuildInitialSetValuesParams): SetFormValues {
  if (existingSet !== null) {
    return toSetFormValues(existingSet, exerciseRestSec)
  }

  const restTargetSec = defaultRestTargetSec(exerciseRestSec, false)
  const lastInSession = setsInSession[setsInSession.length - 1]
  if (lastInSession !== undefined) {
    return {
      weightKg: lastInSession.weightKg,
      reps: lastInSession.reps,
      rpe: null,
      isWarmup: false,
      restTargetSec,
    }
  }

  return {
    weightKg: suggestion.weightKg,
    reps: suggestion.repsHint,
    rpe: null,
    isWarmup: false,
    restTargetSec,
  }
}

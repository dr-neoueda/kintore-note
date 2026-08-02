import type { ProgressionTarget, WorkoutSet } from './types'
import { stepWeight } from './weight'

/** 筋肥大で一般的な 8〜12回 × 3セット を既定の目標にする。 */
export const DEFAULT_PROGRESSION_TARGET: ProgressionTarget = {
  repsMin: 8,
  repsMax: 12,
  sets: 3,
}

export type ProgressionAction = 'start' | 'hold' | 'increase'

export interface ProgressionSuggestion {
  readonly action: ProgressionAction
  /** 今回のセット入力に入れる重量。自重種目は 0。 */
  readonly weightKg: number
  /** 今回のセット入力に入れる回数の目安。 */
  readonly repsHint: number
  /** 前回の基準重量。記録が無ければ null。 */
  readonly previousWeightKg: number | null
  /** 前回、目標セット数ぶん全てで上限回数に達していたか。 */
  readonly hasReachedTarget: boolean
  /** 所有しているダンベルの最大段階に達していて、これ以上重くできない。 */
  readonly isAtHeaviestStep: boolean
}

export interface SuggestNextSessionParams {
  /** 前回その種目を行ったセッションのセット（ウォームアップを含んでよい）。 */
  readonly previousSets: readonly WorkoutSet[]
  readonly target: ProgressionTarget
  readonly dumbbellStepsKg: readonly number[]
  readonly isBodyweight: boolean
}

/** 入力された目標を、破綻しない値に整える。 */
export function normalizeProgressionTarget(target: ProgressionTarget): ProgressionTarget {
  const repsMax = Math.max(1, Math.round(target.repsMax))
  const repsMin = Math.min(repsMax, Math.max(1, Math.round(target.repsMin)))
  const sets = Math.max(1, Math.round(target.sets))

  return { repsMin, repsMax, sets }
}

/**
 * 次のセッションで扱う重量を提案する（ダブルプログレッション）。
 *
 * 「目標セット数ぶん全てで上限回数に達したら1段階上げる。そうでなければ据え置いて回数を伸ばす」
 * という判断を自動化する。可変式ダンベルは刻みが粗く、感覚で上げると潰れやすいため、
 * 上げる条件を明示的に固定している。
 */
export function suggestNextSession({
  previousSets,
  target,
  dumbbellStepsKg,
  isBodyweight,
}: SuggestNextSessionParams): ProgressionSuggestion {
  const workingSets = previousSets.filter((set) => !set.isWarmup)

  if (workingSets.length === 0) {
    return {
      action: 'start',
      weightKg: isBodyweight ? 0 : dumbbellStepsKg[0] ?? 0,
      repsHint: target.repsMin,
      previousWeightKg: null,
      hasReachedTarget: false,
      isAtHeaviestStep: false,
    }
  }

  // 最も重いセットを基準にする。軽い補助セットや落とした最終セットに引きずられないため。
  const topWeightKg = Math.max(...workingSets.map((set) => set.weightKg))
  const topSets = workingSets
    .filter((set) => set.weightKg === topWeightKg)
    .sort((a, b) => a.order - b.order)

  const hasReachedTarget =
    topSets.length >= target.sets && topSets.every((set) => set.reps >= target.repsMax)

  const heaviestStep = dumbbellStepsKg[dumbbellStepsKg.length - 1]
  const isAtHeaviestStep =
    !isBodyweight && heaviestStep !== undefined && topWeightKg >= heaviestStep

  // 据え置くときは、前回の1セット目を目安に「そこから回数を伸ばす」形にする
  const firstTopSetReps = topSets[0]?.reps ?? target.repsMin

  if (isBodyweight) {
    return {
      action: 'hold',
      weightKg: 0,
      repsHint: firstTopSetReps,
      previousWeightKg: topWeightKg,
      hasReachedTarget,
      isAtHeaviestStep: false,
    }
  }

  if (hasReachedTarget && !isAtHeaviestStep) {
    return {
      action: 'increase',
      weightKg: stepWeight(topWeightKg, 'up', dumbbellStepsKg),
      // 重量を上げた直後は回数が落ちるため、下限から仕切り直す
      repsHint: target.repsMin,
      previousWeightKg: topWeightKg,
      hasReachedTarget: true,
      isAtHeaviestStep: false,
    }
  }

  return {
    action: 'hold',
    weightKg: topWeightKg,
    repsHint: firstTopSetReps,
    previousWeightKg: topWeightKg,
    hasReachedTarget,
    isAtHeaviestStep,
  }
}

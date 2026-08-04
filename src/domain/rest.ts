/**
 * セットごとの休憩の目安。
 *
 * 種目の設定（部位ごとの既定値）を出発点にしつつ、
 * セット単位で上げ下げできるようにするための計算をまとめる。
 */

/**
 * ウォームアップ直後の休憩の既定値（秒）。
 * 限界近くまで追い込まないため筋も神経系も回復が早く、
 * 本セットと同じ2〜3分を空ける必要がない。
 */
export const WARMUP_REST_SEC = 60

/** ± ボタン1回あたりの秒数。 */
export const REST_STEP_SEC = 15

export const MIN_REST_SEC = 0

/** これ以上長い休憩は目安として意味を持たないため、上限にする。 */
export const MAX_REST_SEC = 10 * 60

/**
 * そのセットの後に取る休憩の既定値を返す。
 * ウォームアップでも、種目の設定の方が短ければそちらを尊重する。
 */
export function defaultRestTargetSec(exerciseRestSec: number, isWarmup: boolean): number {
  const clamped = clampRestSec(exerciseRestSec)
  return isWarmup ? Math.min(WARMUP_REST_SEC, clamped) : clamped
}

/** 休憩の目安を1段階だけ動かす。 */
export function stepRestTargetSec(current: number, direction: 'up' | 'down'): number {
  const delta = direction === 'up' ? REST_STEP_SEC : -REST_STEP_SEC
  return clampRestSec(current + delta)
}

function clampRestSec(seconds: number): number {
  return Math.min(MAX_REST_SEC, Math.max(MIN_REST_SEC, Math.round(seconds)))
}

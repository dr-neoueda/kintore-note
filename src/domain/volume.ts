import { roundTo, WEIGHT_DECIMALS } from './number'
import type { DumbbellCount } from './types'

/**
 * ボリューム計算に必要な最小限の入力。
 * 永続化の型（WorkoutSet / Exercise）から呼び出し側で組み立てる。
 */
export interface VolumeSetInput {
  /** ダンベル片手あたりの重量。 */
  readonly weightKg: number
  readonly reps: number
  readonly isWarmup: boolean
  readonly dumbbellCount: DumbbellCount
}

export interface TotalVolumeOptions {
  /** ウォームアップセットを合計に含めるか。既定では含めない。 */
  readonly includeWarmup?: boolean
}

/**
 * 1セットの総挙上重量を返す。
 * 両手にダンベルを持つ種目は片手重量の2倍で数える。
 */
export function calcSetVolume(set: VolumeSetInput): number {
  const weightKg = Math.max(0, set.weightKg)
  const reps = Math.max(0, set.reps)
  return roundTo(weightKg * reps * set.dumbbellCount, WEIGHT_DECIMALS)
}

/** 複数セットの総ボリュームを返す。 */
export function calcTotalVolume(
  sets: readonly VolumeSetInput[],
  options: TotalVolumeOptions = {},
): number {
  const { includeWarmup = false } = options
  const counted = includeWarmup ? sets : sets.filter((set) => !set.isWarmup)
  const total = counted.reduce((sum, set) => sum + calcSetVolume(set), 0)
  return roundTo(total, WEIGHT_DECIMALS)
}

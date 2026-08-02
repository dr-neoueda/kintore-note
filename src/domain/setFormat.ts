import { formatWeightKg } from './weight'

export interface SetSummaryInput {
  readonly weightKg: number
  readonly reps: number
}

/**
 * セット群を1行の要約文字列にする。
 * 「前回の記録」のように狭い幅へ収める用途を想定し、
 * 重量が揃っている場合は重量をまとめて回数だけを並べる。
 */
export function formatSetSummary(sets: readonly SetSummaryInput[]): string {
  const first = sets[0]
  if (first === undefined) return ''

  const isSameWeight = sets.every((set) => set.weightKg === first.weightKg)
  const repsText = sets.map((set) => set.reps).join(', ')

  if (isSameWeight && first.weightKg === 0) {
    return `${repsText} 回`
  }

  if (isSameWeight) {
    return `${formatWeightKg(first.weightKg)}kg × ${repsText}`
  }

  return sets
    .map((set) => `${formatWeightKg(set.weightKg)}kg×${set.reps}`)
    .join(' / ')
}

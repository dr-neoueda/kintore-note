import { formatWeightKg } from './weight'

export interface TemplateTargetInput {
  readonly targetSets: number
  readonly targetReps: number
  readonly targetWeightKg: number | null
}

/**
 * テンプレートの目標値を1行の文字列にする。
 * 記録画面の「11.5 kg × 10」と語順をそろえ、読み替えの負担を減らす。
 */
export function formatTemplateTarget(item: TemplateTargetInput): string {
  const repsAndSets = `${item.targetReps}回 × ${item.targetSets}セット`

  if (item.targetWeightKg === null || item.targetWeightKg <= 0) {
    return repsAndSets
  }

  return `${formatWeightKg(item.targetWeightKg)}kg × ${repsAndSets}`
}

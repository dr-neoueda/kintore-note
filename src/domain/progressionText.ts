import type { ProgressionSuggestion } from './progression'
import type { ProgressionTarget } from './types'
import { formatWeightKg, stepWeight } from './weight'

export interface ProgressionMessage {
  /** 一目で分かる結論。 */
  readonly headline: string
  /** 判断の根拠や次の条件。不要なら null。 */
  readonly detail: string | null
}

export interface DescribeProgressionParams {
  readonly suggestion: ProgressionSuggestion
  readonly target: ProgressionTarget
  readonly dumbbellStepsKg: readonly number[]
  readonly isBodyweight: boolean
}

/**
 * 提案を画面に出す文言へ変換する。
 * 「今回どうすればよいか」を先に、「なぜ／次の条件」を後に置く。
 */
export function describeProgression({
  suggestion,
  target,
  dumbbellStepsKg,
  isBodyweight,
}: DescribeProgressionParams): ProgressionMessage {
  const setsAndReps = `全${target.sets}セットで${target.repsMax}回`

  if (isBodyweight) {
    if (suggestion.action === 'start') {
      return { headline: `${target.repsMin}回から始めましょう`, detail: null }
    }
    if (suggestion.hasReachedTarget) {
      return { headline: '目標達成', detail: '回数をさらに伸ばしましょう' }
    }
    return { headline: '回数を伸ばす', detail: `${setsAndReps}を目指す` }
  }

  const weightText = `${formatWeightKg(suggestion.weightKg)}kg`

  if (suggestion.action === 'start') {
    return { headline: `${weightText} から始めましょう`, detail: null }
  }

  if (suggestion.action === 'increase') {
    return {
      headline: `${weightText} に上げる`,
      detail: `前回 ${setsAndReps}を達成`,
    }
  }

  if (suggestion.isAtHeaviestStep) {
    return {
      headline: `${weightText}（最大）`,
      detail: 'これ以上重くできないため、回数を伸ばしましょう',
    }
  }

  const nextWeightKg = stepWeight(suggestion.weightKg, 'up', dumbbellStepsKg)
  return {
    headline: `今回も ${weightText}`,
    detail: `${setsAndReps}できたら次は ${formatWeightKg(nextWeightKg)}kg`,
  }
}

import type { Food } from './food'
import { COMPOSITION_BASIS_GRAMS, scaleNutrition } from './nutrition'

/**
 * 成分表に載っていない調理法を、載っている食品から見積もった食品。
 *
 * 成分表は同じ食材でも一部の調理法しか収載していない。
 * 鶏むね肉には「生」と「焼き」はあるが「ゆで」が無く、
 * 茹でた胸肉を食べる人は、水分が抜けて2割ほど濃くなった実物と
 * 合わない値で記録することになる。
 *
 * そこで、収載されている近い食品の変化から見積もる。
 * 見積もりであることは画面にも出し、成分表そのままの値と混ぜない。
 */
export interface DerivedFoodSource {
  /** 元の食品番号と区別できる id。献立や記録はこの id で食品を指す。 */
  readonly id: string
  /** 見積もりの元にする成分表の食品番号。 */
  readonly baseId: string
  readonly name: string
  /**
   * この食品100gが、元の食品の何g分に当たるか。
   * 加熱で水分が抜けるぶん、調理後100gは生100gより多くの材料を含む。
   */
  readonly baseGramsPer100g: number
  /** どう見積もったか。画面に出す。 */
  readonly note: string
}

export const DERIVED_FOODS: readonly DerivedFoodSource[] = [
  {
    id: '11220y',
    baseId: '11220',
    name: '＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし ゆで',
    // ささみは 生98 → ゆで121 kcal（11227→11229）で、100gあたり1.23倍になる。
    // 同じ鶏の白身肉で脂も少なく、抜ける水分の割合が近いとみて同じ比率を当てる。
    baseGramsPer100g: 123,
    note: '成分表に「むね・ゆで」は無いため、同じ白身の「ささみ」の生→ゆで（98→121kcal）と同じだけ水分が抜けるとみて、生の値から見積もった値です。',
  },
]

/** 見積もりの食品を組み立てる。元の食品が見つからなければ作らない。 */
export function buildDerivedFood(source: DerivedFoodSource, base: Food): Food {
  return {
    id: source.id,
    name: source.name,
    group: base.group,
    basisGrams: COMPOSITION_BASIS_GRAMS,
    nutrition: scaleNutrition(
      base.nutrition,
      source.baseGramsPer100g,
      COMPOSITION_BASIS_GRAMS,
    ),
    isCustom: false,
    estimateNote: source.note,
  }
}

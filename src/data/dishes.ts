import type { FoodPortion } from '@/domain/commonFoods'
import type { Food } from '@/domain/food'
import { COMPOSITION_BASIS_GRAMS } from '@/domain/nutrition'

/**
 * 外食で食べる料理。
 *
 * 外食では食材ごとの量が分からない。「炒飯を食べた」しか分からないので、
 * 料理名で引ける表を用意する。
 *
 * 値は成分表の食材から積み上げて見積もっている（scripts/buildDishes.py）。
 * 数値を直接書かずレシピを残しているのは、あとから根拠を追えるようにするため。
 * 店による差は大きいので、目安であることを画面にも出す。
 */

interface RawDish {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly keywords: readonly string[]
  /** 1食分の重さ（g）。 */
  readonly servingGrams: number
  readonly portions: readonly FoodPortion[]
  /** 何をどれだけ積み上げたか。画面に出して根拠を示す。 */
  readonly recipe: string
  readonly kcal: number
  readonly protein: number
  readonly fat: number
  readonly carb: number
  readonly fiber: number
  readonly salt: number
}

interface RawDishFile {
  readonly dishes: readonly RawDish[]
}

/** 食品群として出す名前。この語で検索すると料理だけが並ぶ。 */
export const DISH_GROUP = '料理'

function toFood(raw: RawDish): Food {
  return {
    id: raw.id,
    name: raw.name,
    portions: raw.portions,
    searchTerms: raw.keywords,
    group: DISH_GROUP,
    basisGrams: COMPOSITION_BASIS_GRAMS,
    nutrition: {
      kcal: raw.kcal,
      protein: raw.protein,
      fat: raw.fat,
      carb: raw.carb,
      fiber: raw.fiber,
      salt: raw.salt,
    },
    isCustom: false,
    estimateNote:
      `${raw.recipe} から見積もった、1食${raw.servingGrams}gあたりの目安です。` +
      '店によって倍近く違うことがあります。',
  }
}

let cached: readonly Food[] | null = null

/** 料理を読み込む。2回目以降は読み込み済みのものを返す。 */
export async function loadDishes(): Promise<readonly Food[]> {
  if (cached !== null) return cached

  const loaded = await import('./dishes.json')
  const file = loaded.default as unknown as RawDishFile
  cached = file.dishes.map(toFood)
  return cached
}

import { findCommonFood } from '@/domain/commonFoods'
import { buildDerivedFood, DERIVED_FOODS } from '@/domain/derivedFoods'
import type { Food } from '@/domain/food'
import { COMPOSITION_BASIS_GRAMS } from '@/domain/nutrition'

/**
 * 日本食品標準成分表の収載食品。
 *
 * 出典: 文部科学省「日本食品標準成分表（八訂）増補2023年」
 * scripts/buildFoodDatabase.py で Excel から変換している。
 *
 * 400KB 超あるため、起動時ではなく食品を探す時に読み込む。
 * ビルド時に別チャンクへ分かれ、Service Worker が事前取得するので
 * オフラインでも使える。
 */

interface RawFood {
  readonly id: string
  readonly name: string
  readonly group: string
  readonly kcal: number
  readonly protein: number
  readonly fat: number
  readonly carb: number
  readonly fiber: number
  readonly salt: number
}

function toFood(raw: RawFood): Food {
  const common = findCommonFood(raw.id)

  return {
    id: raw.id,
    name: raw.name,
    ...(common === undefined ? {} : { portions: common.portions }),
    group: raw.group,
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
  }
}

/**
 * 成分表に無い調理法を、収載食品から見積もって足す。
 * 元にする食品が見つからなければ、当て推量の値を出さずに黙って落とす。
 */
function withDerivedFoods(foods: readonly Food[]): readonly Food[] {
  const byId = new Map(foods.map((food) => [food.id, food]))

  const derived = DERIVED_FOODS.flatMap((source) => {
    const base = byId.get(source.baseId)
    if (base === undefined) return []

    const food = buildDerivedFood(source, base)
    const common = findCommonFood(food.id)
    return [common === undefined ? food : { ...food, portions: common.portions }]
  })

  return [...foods, ...derived]
}

let cached: readonly Food[] | null = null

/** 成分表の食品を読み込む。2回目以降は読み込み済みのものを返す。 */
export async function loadCompositionFoods(): Promise<readonly Food[]> {
  if (cached !== null) return cached

  const loaded = await import('./foodComposition.json')
  cached = withDerivedFoods((loaded.default as readonly RawFood[]).map(toFood))
  return cached
}

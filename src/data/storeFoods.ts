import type { Food } from '@/domain/food'
import { COMPOSITION_BASIS_GRAMS } from '@/domain/nutrition'

/**
 * よく買う店の商品。
 *
 * 出典: Open Food Facts（ODbL）https://jp.openfoodfacts.org/
 * scripts/buildStoreFoods.py で取り出している。
 *
 * オンライン検索（「市販品も探す」）でも同じデータは引けるが、
 * 毎回買う店の商品は圏外でも出したいので同梱する。
 * 有志が登録するデータのため、値が違っていることがある。
 */

interface RawStoreFood {
  readonly id: string
  readonly name: string
  readonly kcal: number
  readonly protein: number
  readonly fat: number
  readonly carb: number
  readonly fiber: number
  readonly salt: number
}

interface RawStoreFoodFile {
  readonly store: string
  readonly foods: readonly RawStoreFood[]
}

/** 食品群として出す名前。この語で検索すると店の商品だけが並ぶ。 */
export const STORE_FOOD_GROUP = '業務スーパー'

/** 商品コードが成分表の食品番号とぶつからないようにする。 */
const STORE_FOOD_ID_PREFIX = 'store:'

function toFood(raw: RawStoreFood, store: string): Food {
  return {
    id: `${STORE_FOOD_ID_PREFIX}${raw.id}`,
    name: raw.name,
    group: store,
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

let cached: readonly Food[] | null = null

/** 店の商品を読み込む。2回目以降は読み込み済みのものを返す。 */
export async function loadStoreFoods(): Promise<readonly Food[]> {
  if (cached !== null) return cached

  const loaded = await import('./storeFoods.json')
  const file = loaded.default as unknown as RawStoreFoodFile
  cached = file.foods.map((raw) => toFood(raw, file.store))
  return cached
}

import type { Nutrition } from '@/domain/nutrition'

/**
 * 市販品を Open Food Facts から探す。
 *
 * 日本食品標準成分表には市販品と外食が収載されていない。
 * プロテインやサラダチキンのような商品はここで補う。
 *
 * 出典: Open Food Facts（ODbL）。有志が登録している開かれたデータベースで、
 * 値が欠けていたり誤っていることがある。取り込む前に画面で確認できるようにする。
 *
 * インターネットに繋がっているときだけ使える。成分表とマイ食品は
 * 端末内にあるため、繋がっていなくても記録は続けられる。
 */

const SEARCH_URL = 'https://jp.openfoodfacts.org/cgi/search.pl'

/** 1回に受け取る件数。多すぎても画面で選べない。 */
const PAGE_SIZE = 20

/** 応答が返らないときに待ち続けない。 */
const TIMEOUT_MS = 8000

/** 市販品の栄養成分表示は100g（または100ml）あたりで書かれている。 */
export const PACKAGED_BASIS_GRAMS = 100

export interface PackagedFood {
  /** 商品コード（バーコード）。 */
  readonly code: string
  readonly name: string
  readonly brand: string
  readonly nutrition: Nutrition
}

interface RawProduct {
  readonly code?: unknown
  readonly product_name?: unknown
  readonly product_name_ja?: unknown
  readonly brands?: unknown
  readonly nutriments?: Record<string, unknown>
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 表示に使える形だけを残す。名前かエネルギーが無いものは選んでも意味がない。 */
function toPackagedFood(raw: RawProduct): PackagedFood | null {
  const name = toText(raw.product_name_ja) || toText(raw.product_name)
  const code = toText(raw.code)
  const nutriments = raw.nutriments ?? {}
  const kcal = toNumber(nutriments['energy-kcal_100g'])

  if (name === '' || code === '' || kcal <= 0) return null

  return {
    code,
    name,
    brand: toText(raw.brands),
    nutrition: {
      kcal: Math.round(kcal),
      protein: Math.round(toNumber(nutriments['proteins_100g']) * 10) / 10,
      fat: Math.round(toNumber(nutriments['fat_100g']) * 10) / 10,
      carb: Math.round(toNumber(nutriments['carbohydrates_100g']) * 10) / 10,
      fiber: Math.round(toNumber(nutriments['fiber_100g']) * 10) / 10,
      salt: Math.round(toNumber(nutriments['salt_100g']) * 100) / 100,
    },
  }
}

/** ブランドを頭に付けた表示名。同じ商品名が並んだときに見分けられるようにする。 */
export function formatPackagedFoodName(food: PackagedFood): string {
  return food.brand === '' ? food.name : `${food.name}（${food.brand}）`
}

/**
 * 市販品を名前で探す。
 * 繋がらない・応答が壊れている場合は空を返し、記録の妨げにはしない。
 */
export async function searchPackagedFoods(keyword: string): Promise<PackagedFood[]> {
  const trimmed = keyword.trim()
  if (trimmed === '') return []

  const url = new URL(SEARCH_URL)
  url.searchParams.set('search_terms', trimmed)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', String(PAGE_SIZE))
  url.searchParams.set('fields', 'code,product_name,product_name_ja,brands,nutriments')

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) return []

    const body: unknown = await response.json()
    const products = (body as { products?: unknown }).products
    if (!Array.isArray(products)) return []

    return products
      .map((product) => toPackagedFood(product as RawProduct))
      .filter((food): food is PackagedFood => food !== null)
  } catch {
    // 圏外・時間切れ・応答の不備。市販品が出ないだけで、他は使える
    return []
  }
}

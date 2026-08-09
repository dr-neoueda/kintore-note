import { db } from '../db'
import type { Food } from '@/domain/food'
import type { Nutrition } from '@/domain/nutrition'
import type { CustomFood, CustomFoodId } from '@/domain/types'
import { requireNonEmpty, ValidationError } from '@/domain/validation'

/** マイ食品の id は、成分表の食品番号とぶつからないよう接頭辞を付ける。 */
export const CUSTOM_FOOD_ID_PREFIX = 'custom:'

export const MAX_BASIS_GRAMS = 5000

export interface NewCustomFood {
  readonly name: string
  /** 栄養価が何 g 分の値か。パッケージの「1食30g当たり」をそのまま入れられる。 */
  readonly basisGrams: number
  readonly nutrition: Nutrition
}

function requireValidBasis(basisGrams: number): number {
  if (!Number.isFinite(basisGrams) || basisGrams <= 0) {
    throw new ValidationError('基準の量は0より大きい数値で入力してください')
  }
  if (basisGrams > MAX_BASIS_GRAMS) {
    throw new ValidationError(`基準の量は${MAX_BASIS_GRAMS}g以下で入力してください`)
  }
  return basisGrams
}

/** マイ食品を作る。 */
export async function createCustomFood(input: NewCustomFood): Promise<CustomFoodId> {
  const name = requireNonEmpty(input.name, '食品名')
  const basisGrams = requireValidBasis(input.basisGrams)

  // 名前は一意。失敗する書き込みは liveQuery の楽観更新を壊すため、先に確認する
  const existing = await db.customFoods.where('name').equals(name).first()
  if (existing !== undefined) {
    throw new ValidationError('同じ名前のマイ食品が既にあります')
  }

  return db.customFoods.add({
    name,
    basisGrams,
    nutrition: input.nutrition,
    isArchived: false,
    createdAt: new Date().toISOString(),
  })
}

/**
 * 同じ名前があればそれを返し、無ければ作る。
 * 市販品を取り込むときに、同じ商品で行が増えないようにする。
 */
export async function findOrCreateCustomFood(input: NewCustomFood): Promise<CustomFood> {
  const name = requireNonEmpty(input.name, '食品名')

  const existing = await db.customFoods.where('name').equals(name).first()
  if (existing !== undefined) {
    // 隠していた食品を選び直したら、また使えるようにする
    if (existing.isArchived && existing.id !== undefined) {
      await db.customFoods.update(existing.id, { isArchived: false })
      return { ...existing, isArchived: false }
    }
    return existing
  }

  const id = await createCustomFood(input)
  return {
    id,
    name,
    basisGrams: input.basisGrams,
    nutrition: input.nutrition,
    isArchived: false,
    createdAt: new Date().toISOString(),
  }
}

export async function listActiveCustomFoods(): Promise<CustomFood[]> {
  const all = await db.customFoods.toArray()
  return all.filter((food) => !food.isArchived).sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

export async function listAllCustomFoods(): Promise<CustomFood[]> {
  return db.customFoods.toArray()
}

export async function setCustomFoodArchived(
  id: CustomFoodId,
  isArchived: boolean,
): Promise<void> {
  await db.customFoods.update(id, { isArchived })
}

export async function updateCustomFood(
  id: CustomFoodId,
  patch: Partial<NewCustomFood>,
): Promise<void> {
  const next: Partial<CustomFood> = {
    ...(patch.name !== undefined ? { name: requireNonEmpty(patch.name, '食品名') } : {}),
    ...(patch.basisGrams !== undefined
      ? { basisGrams: requireValidBasis(patch.basisGrams) }
      : {}),
    ...(patch.nutrition !== undefined ? { nutrition: patch.nutrition } : {}),
  }

  await db.customFoods.update(id, next)
}

/** マイ食品を、成分表の食品と同じ形にする。 */
export function toFood(custom: CustomFood): Food {
  return {
    id: `${CUSTOM_FOOD_ID_PREFIX}${custom.id ?? 0}`,
    name: custom.name,
    group: 'マイ食品',
    basisGrams: custom.basisGrams,
    nutrition: custom.nutrition,
    isCustom: true,
  }
}

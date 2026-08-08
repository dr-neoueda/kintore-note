import { db } from '../db'
import { isValidDateKey, type DateKey } from '@/domain/date'
import type { Nutrition } from '@/domain/nutrition'
import type { MealEntry, MealEntryId, MealType } from '@/domain/types'
import { requireNonEmpty, ValidationError } from '@/domain/validation'

/** 1度に記録できる量の上限（g）。桁を打ち間違えた記録を残さないため。 */
export const MAX_MEAL_GRAMS = 5000

export interface NewMealEntry {
  readonly date: DateKey
  readonly mealType: MealType
  readonly foodId: string
  readonly foodName: string
  readonly grams: number
  readonly nutrition: Nutrition
  readonly recordedAt: string
}

export interface MealEntryPatch {
  readonly grams?: number
  readonly nutrition?: Nutrition
  readonly mealType?: MealType
}

function requireValidGrams(grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new ValidationError('量は0より大きい数値で入力してください')
  }
  if (grams > MAX_MEAL_GRAMS) {
    throw new ValidationError(`量は${MAX_MEAL_GRAMS}g以下で入力してください`)
  }
  return grams
}

/** 食べたものを記録する。並び順は同じ日・同じ区分の中で自動採番する。 */
export async function addMealEntry(input: NewMealEntry): Promise<MealEntryId> {
  if (!isValidDateKey(input.date)) {
    throw new ValidationError('日付の形式が正しくありません')
  }
  const foodName = requireNonEmpty(input.foodName, '食品名')
  const grams = requireValidGrams(input.grams)

  return db.transaction('rw', db.meals, async () => {
    const sameDay = await db.meals
      .where('[date+mealType]')
      .equals([input.date, input.mealType])
      .toArray()
    const nextOrder = sameDay.reduce((max, entry) => Math.max(max, entry.order), 0) + 1

    return db.meals.add({ ...input, foodName, grams, order: nextOrder })
  })
}

/** その日の記録を、区分と並び順で返す。 */
export async function listMealEntriesByDate(date: DateKey): Promise<MealEntry[]> {
  const entries = await db.meals.where('date').equals(date).toArray()
  return entries.sort((a, b) => a.order - b.order)
}

export async function updateMealEntry(
  id: MealEntryId,
  patch: MealEntryPatch,
): Promise<void> {
  if (patch.grams !== undefined) requireValidGrams(patch.grams)
  await db.meals.update(id, patch)
}

export async function deleteMealEntry(id: MealEntryId): Promise<void> {
  await db.meals.delete(id)
}

/** バックアップと集計で使う、全期間の記録。 */
export async function listAllMealEntries(): Promise<MealEntry[]> {
  return db.meals.toArray()
}

/**
 * よく記録している食品を、多い順に返す。
 * 毎日同じものを食べることが多く、検索し直すのは手間になるため。
 */
export async function listFrequentFoods(limit: number): Promise<
  readonly { readonly foodId: string; readonly foodName: string; readonly count: number }[]
> {
  const entries = await db.meals.toArray()

  const countByFood = new Map<string, { foodName: string; count: number }>()
  for (const entry of entries) {
    const current = countByFood.get(entry.foodId)
    if (current === undefined) {
      countByFood.set(entry.foodId, { foodName: entry.foodName, count: 1 })
    } else {
      current.count += 1
      // 名前が変わっている場合は新しい方を採る
      current.foodName = entry.foodName
    }
  }

  return [...countByFood.entries()]
    .map(([foodId, { foodName, count }]) => ({ foodId, foodName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

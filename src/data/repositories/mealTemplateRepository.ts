import { db } from '../db'
import type { MealTemplate, MealTemplateId, MealTemplateItem, MealType } from '@/domain/types'
import { requireNonEmpty } from '@/domain/validation'

export interface NewMealTemplate {
  readonly name: string
  readonly mealType: MealType
  readonly items: readonly MealTemplateItem[]
}

export type MealTemplatePatch = Partial<Omit<MealTemplate, 'id'>>

/** 献立を作る。並び順は自動採番する。 */
export async function createMealTemplate(input: NewMealTemplate): Promise<MealTemplateId> {
  const name = requireNonEmpty(input.name, '献立の名前')

  return db.transaction('rw', db.mealTemplates, async () => {
    const existing = await db.mealTemplates.toArray()
    const nextOrder = existing.reduce((max, template) => Math.max(max, template.order), 0) + 1

    return db.mealTemplates.add({
      name,
      mealType: input.mealType,
      items: input.items,
      order: nextOrder,
    })
  })
}

export async function getMealTemplate(id: MealTemplateId): Promise<MealTemplate | undefined> {
  return db.mealTemplates.get(id)
}

export async function listMealTemplates(): Promise<MealTemplate[]> {
  return db.mealTemplates.orderBy('order').toArray()
}

export async function updateMealTemplate(
  id: MealTemplateId,
  patch: MealTemplatePatch,
): Promise<void> {
  const next: MealTemplatePatch = {
    ...patch,
    ...(patch.name !== undefined ? { name: requireNonEmpty(patch.name, '献立の名前') } : {}),
  }
  await db.mealTemplates.update(id, next)
}

export async function deleteMealTemplate(id: MealTemplateId): Promise<void> {
  await db.mealTemplates.delete(id)
}

export async function listAllMealTemplates(): Promise<MealTemplate[]> {
  return db.mealTemplates.toArray()
}

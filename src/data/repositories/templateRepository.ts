import { db } from '../db'
import type { TemplateId, TemplateItem, WorkoutTemplate } from '@/domain/types'
import { requireNonEmpty } from '@/domain/validation'

export interface NewWorkoutTemplate {
  readonly name: string
  readonly note: string
  readonly items: readonly TemplateItem[]
}

export type WorkoutTemplatePatch = Partial<Omit<WorkoutTemplate, 'id'>>

/** テンプレートを作成する。並び順は自動採番する。 */
export async function createTemplate(input: NewWorkoutTemplate): Promise<TemplateId> {
  const name = requireNonEmpty(input.name, 'テンプレート名')

  return db.transaction('rw', db.templates, async () => {
    const existing = await db.templates.toArray()
    const nextOrder = existing.reduce((max, template) => Math.max(max, template.order), 0) + 1

    return db.templates.add({
      name,
      note: input.note,
      items: input.items,
      order: nextOrder,
    })
  })
}

export async function getTemplate(id: TemplateId): Promise<WorkoutTemplate | undefined> {
  return db.templates.get(id)
}

/** テンプレートを並び順の昇順で返す。 */
export async function listTemplates(): Promise<WorkoutTemplate[]> {
  return db.templates.orderBy('order').toArray()
}

export async function updateTemplate(
  id: TemplateId,
  patch: WorkoutTemplatePatch,
): Promise<void> {
  const changes: WorkoutTemplatePatch = patch.name === undefined
    ? patch
    : { ...patch, name: requireNonEmpty(patch.name, 'テンプレート名') }

  await db.templates.update(id, changes)
}

export async function deleteTemplate(id: TemplateId): Promise<void> {
  await db.templates.delete(id)
}

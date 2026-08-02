import { db } from '../db'
import { DEFAULT_PROGRESSION_TARGET, normalizeProgressionTarget } from '@/domain/progression'
import { SETTINGS_ID, type AppSettings } from '@/domain/types'
import { DEFAULT_DUMBBELL_STEPS_KG } from '@/domain/weight'

export const DEFAULT_REST_SEC = 90
export const DEFAULT_BACKUP_REMINDER_DAYS = 14

export type SettingsPatch = Partial<Omit<AppSettings, 'id'>>

function createDefaultSettings(): AppSettings {
  return {
    id: SETTINGS_ID,
    dumbbellStepsKg: [...DEFAULT_DUMBBELL_STEPS_KG],
    defaultRestSec: DEFAULT_REST_SEC,
    lastBackupAt: null,
    backupReminderDays: DEFAULT_BACKUP_REMINDER_DAYS,
    defaultTarget: { ...DEFAULT_PROGRESSION_TARGET },
  }
}

/** 重複と非正の値を除き、昇順に整列した段階リストを返す。 */
function normalizeDumbbellSteps(steps: readonly number[]): number[] {
  const valid = steps.filter((step) => Number.isFinite(step) && step > 0)
  return [...new Set(valid)].sort((a, b) => a - b)
}

/** 設定を取得する。未保存なら既定値を作成して返す。 */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(SETTINGS_ID)
  // 項目を追加したあとの古いレコードでも欠けを既定値で補えるようにする
  if (existing) return { ...createDefaultSettings(), ...existing }

  const defaults = createDefaultSettings()
  await db.settings.put(defaults)
  return defaults
}

/** 設定の一部を更新し、更新後の設定を返す。 */
export async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
  const current = await getSettings()

  const next: AppSettings = {
    ...current,
    ...patch,
    id: SETTINGS_ID,
    dumbbellStepsKg: patch.dumbbellStepsKg
      ? normalizeDumbbellSteps(patch.dumbbellStepsKg)
      : current.dumbbellStepsKg,
    defaultTarget: patch.defaultTarget
      ? normalizeProgressionTarget(patch.defaultTarget)
      : current.defaultTarget,
  }

  await db.settings.put(next)
  return next
}

/** 最終バックアップ日時を記録する。 */
export async function markBackedUp(atIso: string): Promise<AppSettings> {
  return updateSettings({ lastBackupAt: atIso })
}

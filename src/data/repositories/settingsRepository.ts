import { db } from '../db'
import { DEFAULT_REST_SEC_BY_MUSCLE_GROUP } from '@/domain/muscle'
import { SETTINGS_ID, type AppSettings, type MuscleGroup } from '@/domain/types'
import { DEFAULT_DUMBBELL_STEPS_KG } from '@/domain/weight'

export const DEFAULT_BACKUP_REMINDER_DAYS = 14

/** 休憩時間として受け付ける上限（秒）。 */
const MAX_REST_SEC = 60 * 30

export type SettingsPatch = Partial<Omit<AppSettings, 'id'>>

function createDefaultSettings(): AppSettings {
  return {
    id: SETTINGS_ID,
    dumbbellStepsKg: [...DEFAULT_DUMBBELL_STEPS_KG],
    lastBackupAt: null,
    backupReminderDays: DEFAULT_BACKUP_REMINDER_DAYS,
    restSecByMuscleGroup: { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP },
  }
}

/** 0未満や極端に長い値を、扱える範囲の整数に整える。 */
function normalizeRestSecByMuscleGroup(
  restSecByMuscleGroup: Readonly<Record<MuscleGroup, number>>,
): Record<MuscleGroup, number> {
  const normalized = { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP }

  for (const [group, seconds] of Object.entries(restSecByMuscleGroup)) {
    if (!Number.isFinite(seconds)) continue
    normalized[group as MuscleGroup] = Math.min(MAX_REST_SEC, Math.max(0, Math.round(seconds)))
  }

  return normalized
}

/** 重複と非正の値を除き、昇順に整列した段階リストを返す。 */
function normalizeDumbbellSteps(steps: readonly number[]): number[] {
  const valid = steps.filter((step) => Number.isFinite(step) && step > 0)
  return [...new Set(valid)].sort((a, b) => a - b)
}

/** 既定の設定を作る。復元時にレコードが無い場合の補完にも使う。 */
export function buildDefaultSettings(): AppSettings {
  return createDefaultSettings()
}

/**
 * 設定を読み出す。
 *
 * **書き込みを行わない。** liveQuery は querier を読み取り専用トランザクションで
 * 実行するため、ここで書き込むと ReadOnlyError になり画面全体がクラッシュする。
 * 未保存の場合は既定値をその場で返すだけにして、保存は ensureSettings に任せる。
 * 項目を追加したあとの古いレコードでも、欠けを既定値で補う。
 */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(SETTINGS_ID)
  return existing ? { ...createDefaultSettings(), ...existing } : createDefaultSettings()
}

/** 起動時に呼び、設定レコードが無ければ既定値を保存する。 */
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(SETTINGS_ID)
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
    restSecByMuscleGroup: patch.restSecByMuscleGroup
      ? normalizeRestSecByMuscleGroup(patch.restSecByMuscleGroup)
      : current.restSecByMuscleGroup,
  }

  await db.settings.put(next)
  return next
}

/** 最終バックアップ日時を記録する。 */
export async function markBackedUp(atIso: string): Promise<AppSettings> {
  return updateSettings({ lastBackupAt: atIso })
}

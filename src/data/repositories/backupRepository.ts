import { db } from '../db'
import { buildDefaultSettings } from './settingsRepository'
import type { BackupData } from '@/domain/backup'
import { SETTINGS_ID } from '@/domain/types'

/** 全テーブルを読み出してバックアップ用のデータにまとめる。 */
export async function collectBackupData(): Promise<BackupData> {
  const [exercises, workouts, sets, templates, settings] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
    db.templates.toArray(),
    db.settings.get(SETTINGS_ID),
  ])

  return { exercises, workouts, sets, templates, settings: settings ?? null }
}

/**
 * バックアップの内容で全データを置き換える。
 * 部分的に取り込むと ID の整合性が壊れるため、トランザクション内で全消去してから入れ直す。
 */
export async function replaceAllData(data: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    db.exercises,
    db.workouts,
    db.sets,
    db.templates,
    db.settings,
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.sets.clear(),
        db.templates.clear(),
        db.settings.clear(),
      ])

      await db.exercises.bulkAdd([...data.exercises])
      await db.workouts.bulkAdd([...data.workouts])
      await db.sets.bulkAdd([...data.sets])
      await db.templates.bulkAdd([...data.templates])
      // 設定を持たないバックアップでも、レコードが無い状態にはしない
      await db.settings.put(
        data.settings === null
          ? buildDefaultSettings()
          : { ...buildDefaultSettings(), ...data.settings, id: SETTINGS_ID },
      )
    },
  )
}

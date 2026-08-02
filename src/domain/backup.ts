import type {
  AppSettings,
  Exercise,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from './types'
import { ValidationError } from './validation'

export const BACKUP_APP_ID = 'kintore-note'
export const BACKUP_FORMAT_VERSION = 1

export interface BackupData {
  readonly exercises: readonly Exercise[]
  readonly workouts: readonly Workout[]
  readonly sets: readonly WorkoutSet[]
  readonly templates: readonly WorkoutTemplate[]
  readonly settings: AppSettings | null
}

export interface BackupFile {
  readonly app: typeof BACKUP_APP_ID
  readonly version: number
  readonly exportedAt: string
  readonly data: BackupData
}

const REQUIRED_TABLES = ['exercises', 'workouts', 'sets', 'templates'] as const

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export function createBackupFile(data: BackupData, exportedAt: string): BackupFile {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_FORMAT_VERSION,
    exportedAt,
    data,
  }
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 書き出したバックアップを読み戻す。
 * 外部から渡されるファイルなので、取り込む前にここで全て検査する。
 */
export function parseBackup(json: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new ValidationError('ファイルの形式が正しくありません（JSON として読めません）')
  }

  if (!isRecord(parsed)) {
    throw new ValidationError('ファイルの形式が正しくありません')
  }

  if (parsed.app !== BACKUP_APP_ID) {
    throw new ValidationError('このアプリのバックアップファイルではありません')
  }

  const version = parsed.version
  if (typeof version !== 'number' || version > BACKUP_FORMAT_VERSION) {
    throw new ValidationError(
      'このバックアップは新しい形式です。アプリを更新してから取り込んでください',
    )
  }

  const data = parsed.data
  if (!isRecord(data)) {
    throw new ValidationError('バックアップの中身が読み取れません')
  }

  for (const table of REQUIRED_TABLES) {
    if (!Array.isArray(data[table])) {
      throw new ValidationError(`バックアップに「${table}」のデータが含まれていません`)
    }
  }

  return {
    app: BACKUP_APP_ID,
    version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    data: {
      exercises: data.exercises as Exercise[],
      workouts: data.workouts as Workout[],
      sets: data.sets as WorkoutSet[],
      templates: data.templates as WorkoutTemplate[],
      settings: isRecord(data.settings) ? (data.settings as unknown as AppSettings) : null,
    },
  }
}

/**
 * 最後のバックアップから指定日数以上経過しているか。
 * ブラウザのストレージは端末側の都合で消える可能性があるため、
 * 定期的な書き出しを促すのに使う。
 */
export function isBackupOverdue(
  lastBackupAt: string | null,
  reminderDays: number,
  nowMs: number,
): boolean {
  if (lastBackupAt === null) return true

  const lastMs = Date.parse(lastBackupAt)
  if (Number.isNaN(lastMs)) return true

  return nowMs - lastMs > reminderDays * MILLISECONDS_PER_DAY
}

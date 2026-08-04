import {
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from './muscle'
import { normalizeProgressionTarget } from './progression'
import type {
  AppSettings,
  DumbbellCount,
  EquipmentType,
  Exercise,
  MuscleArchitecture,
  MuscleGroup,
  ProgressionTarget,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from './types'
import { ValidationError } from './validation'

const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'other',
]
const EQUIPMENT_TYPES: readonly EquipmentType[] = ['dumbbell', 'bodyweight', 'other']
const ARCHITECTURES: readonly MuscleArchitecture[] = ['parallel', 'pennate']

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

function isProgressionTarget(value: unknown): value is ProgressionTarget {
  if (!isRecord(value)) return false
  return (
    typeof value.repsMin === 'number' &&
    typeof value.repsMax === 'number' &&
    typeof value.sets === 'number'
  )
}

/**
 * 取り込んだ種目を現在の形に整える。
 *
 * 項目を増やす前に書き出したバックアップには新しい項目が無く、
 * そのまま保存すると画面側が `target.repsMin` などを触った時点で落ちる。
 * 取り込みの入口でここを埋めておく。
 */
function normalizeExercise(raw: Exercise): Exercise {
  const source = raw as unknown as Record<string, unknown>

  const muscleGroup = MUSCLE_GROUPS.includes(source.muscleGroup as MuscleGroup)
    ? (source.muscleGroup as MuscleGroup)
    : 'other'
  const equipment = EQUIPMENT_TYPES.includes(source.equipment as EquipmentType)
    ? (source.equipment as EquipmentType)
    : 'other'
  const name = typeof source.name === 'string' ? source.name : ''
  const muscleArchitecture = ARCHITECTURES.includes(
    source.muscleArchitecture as MuscleArchitecture,
  )
    ? (source.muscleArchitecture as MuscleArchitecture)
    : resolveArchitecture(name, muscleGroup)

  return {
    ...raw,
    name,
    muscleGroup,
    equipment,
    dumbbellCount: (source.dumbbellCount === 1 ? 1 : 2) as DumbbellCount,
    muscleArchitecture,
    target: isProgressionTarget(source.target)
      ? normalizeProgressionTarget(source.target)
      : defaultTargetForArchitecture(muscleArchitecture),
    restSec:
      typeof source.restSec === 'number' && source.restSec >= 0
        ? source.restSec
        : defaultRestSecForMuscleGroup(muscleGroup),
    referenceUrl: typeof source.referenceUrl === 'string' ? source.referenceUrl : null,
    isArchived: source.isArchived === true,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : '',
  }
}

function normalizeWorkout(raw: Workout): Workout {
  const source = raw as unknown as Record<string, unknown>

  return {
    ...raw,
    note: typeof source.note === 'string' ? source.note : '',
    bodyWeightKg: typeof source.bodyWeightKg === 'number' ? source.bodyWeightKg : null,
    finishedAt: typeof source.finishedAt === 'string' ? source.finishedAt : null,
  }
}

function normalizeSet(raw: WorkoutSet): WorkoutSet {
  const source = raw as unknown as Record<string, unknown>

  return {
    ...raw,
    rpe: typeof source.rpe === 'number' ? source.rpe : null,
    restSec: typeof source.restSec === 'number' ? source.restSec : null,
    restTargetSec: typeof source.restTargetSec === 'number' ? source.restTargetSec : null,
    isWarmup: source.isWarmup === true,
  }
}

function normalizeTemplate(raw: WorkoutTemplate): WorkoutTemplate {
  const source = raw as unknown as Record<string, unknown>

  return {
    ...raw,
    note: typeof source.note === 'string' ? source.note : '',
    items: Array.isArray(source.items) ? raw.items : [],
  }
}

/**
 * 取り込んだデータを現在の形に整える。
 * 古い形式のバックアップや手で編集されたファイルでも、そのまま保存できる状態にする。
 */
export function normalizeBackupData(data: BackupData): BackupData {
  return {
    exercises: data.exercises.map(normalizeExercise),
    workouts: data.workouts.map(normalizeWorkout),
    sets: data.sets.map(normalizeSet),
    templates: data.templates.map(normalizeTemplate),
    settings: data.settings,
  }
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
    // 取り込んだ値は境界でここだけ整える。以降の層は現在の形だけを扱えばよい
    data: normalizeBackupData({
      exercises: data.exercises as Exercise[],
      workouts: data.workouts as Workout[],
      sets: data.sets as WorkoutSet[],
      templates: data.templates as WorkoutTemplate[],
      settings: isRecord(data.settings) ? (data.settings as unknown as AppSettings) : null,
    }),
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

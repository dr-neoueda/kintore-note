import {
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from './muscle'
import { normalizeProgressionTarget } from './progression'
import type {
  BodyMeasurement,
  CardioSession,
  CustomFood,
  MealEntry,
  MealTemplate,
  MealType,
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
import { MUSCLE_GROUPS } from './types'
import {
  CARDIO_ACTIVITIES,
  CARDIO_INTENSITIES,
  type CardioActivity,
  type CardioIntensity,
} from './cardio'
import type { Nutrition } from './nutrition'
import { MEAL_TYPES } from './types'
import { ValidationError } from './validation'

const EQUIPMENT_TYPES: readonly EquipmentType[] = ['dumbbell', 'bodyweight', 'other']
const ARCHITECTURES: readonly MuscleArchitecture[] = ['parallel', 'pennate']

export const BACKUP_APP_ID = 'kintore-note'
export const BACKUP_FORMAT_VERSION = 1

export interface BackupData {
  readonly exercises: readonly Exercise[]
  readonly workouts: readonly Workout[]
  readonly sets: readonly WorkoutSet[]
  readonly templates: readonly WorkoutTemplate[]
  readonly meals: readonly MealEntry[]
  readonly customFoods: readonly CustomFood[]
  readonly mealTemplates: readonly MealTemplate[]
  readonly measurements: readonly BodyMeasurement[]
  readonly cardioSessions: readonly CardioSession[]
  readonly settings: AppSettings | null
}

/**
 * 取り込む側のデータ。
 * 食事とマイ食品は後から足した項目なので、古いバックアップには入っていない。
 */
export type IncomingBackupData = Omit<
  BackupData,
  'meals' | 'customFoods' | 'mealTemplates' | 'measurements' | 'cardioSessions'
> & {
  readonly meals?: readonly MealEntry[]
  readonly customFoods?: readonly CustomFood[]
  readonly mealTemplates?: readonly MealTemplate[]
  readonly measurements?: readonly BodyMeasurement[]
  readonly cardioSessions?: readonly CardioSession[]
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

const EMPTY_NUTRITION_FALLBACK: Nutrition = {
  kcal: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  fiber: 0,
  salt: 0,
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeNutrition(source: unknown): Nutrition {
  if (source === null || typeof source !== 'object') return EMPTY_NUTRITION_FALLBACK
  const raw = source as Record<string, unknown>

  return {
    kcal: toNumber(raw.kcal),
    protein: toNumber(raw.protein),
    fat: toNumber(raw.fat),
    carb: toNumber(raw.carb),
    fiber: toNumber(raw.fiber),
    salt: toNumber(raw.salt),
  }
}

function normalizeMealEntry(raw: MealEntry): MealEntry {
  const source = raw as unknown as Record<string, unknown>
  const mealType = MEAL_TYPES.includes(source.mealType as MealType)
    ? (source.mealType as MealType)
    : 'snack'

  return {
    ...raw,
    mealType,
    foodId: typeof source.foodId === 'string' ? source.foodId : '',
    foodName: typeof source.foodName === 'string' ? source.foodName : '（不明な食品）',
    grams: Math.max(0, toNumber(source.grams)),
    nutrition: normalizeNutrition(source.nutrition),
    order: Math.max(0, toNumber(source.order)),
  }
}

function normalizeCustomFood(raw: CustomFood): CustomFood {
  const source = raw as unknown as Record<string, unknown>

  return {
    ...raw,
    name: typeof source.name === 'string' ? source.name : '',
    basisGrams: Math.max(1, toNumber(source.basisGrams, 100)),
    nutrition: normalizeNutrition(source.nutrition),
    isArchived: source.isArchived === true,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : '',
  }
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeMeasurement(raw: BodyMeasurement): BodyMeasurement {
  const source = raw as unknown as Record<string, unknown>

  return {
    ...raw,
    weightKg: Math.max(0, toNumber(source.weightKg)),
    bodyFatPercent: toNumberOrNull(source.bodyFatPercent),
    muscleMassKg: toNumberOrNull(source.muscleMassKg),
    visceralFatLevel: toNumberOrNull(source.visceralFatLevel),
    basalMetabolicRateKcal: toNumberOrNull(source.basalMetabolicRateKcal),
    recordedAt: typeof source.recordedAt === 'string' ? source.recordedAt : '',
  }
}

function normalizeCardioSession(raw: CardioSession): CardioSession {
  const source = raw as unknown as Record<string, unknown>
  const activity = CARDIO_ACTIVITIES.includes(source.activity as CardioActivity)
    ? (source.activity as CardioActivity)
    : 'running'

  const intensity = CARDIO_INTENSITIES.includes(source.intensity as CardioIntensity)
    ? (source.intensity as CardioIntensity)
    : null

  return {
    ...raw,
    activity,
    distanceKm: Math.max(0, toNumber(source.distanceKm)),
    durationSec: Math.max(0, toNumber(source.durationSec)),
    intensity,
    note: typeof source.note === 'string' ? source.note : '',
    recordedAt: typeof source.recordedAt === 'string' ? source.recordedAt : '',
  }
}

function normalizeMealTemplate(raw: MealTemplate): MealTemplate {
  const source = raw as unknown as Record<string, unknown>

  // 「入れる区分」は持たなくなった。古いバックアップの値は落とす
  const { mealType: _obsoleteMealType, ...rest } = source as { mealType?: unknown }

  return {
    ...(rest as unknown as MealTemplate),
    name: typeof source.name === 'string' ? source.name : '',
    order: Math.max(0, toNumber(source.order)),
    items: Array.isArray(source.items)
      ? raw.items.map((item) => ({
          foodId: typeof item.foodId === 'string' ? item.foodId : '',
          foodName: typeof item.foodName === 'string' ? item.foodName : '（不明な食品）',
          grams: Math.max(0, toNumber(item.grams)),
          nutrition: normalizeNutrition(item.nutrition),
        }))
      : [],
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
 * 体重は v8 より前、ワークアウトに載せていた。
 * 古いバックアップをそのまま入れると、アプリが読む先（measurements）に
 * 何も入らず、記録した体重が消えたように見える。取り込みの入口で移す。
 */
function migrateWorkoutWeights(
  workouts: readonly Workout[],
  measurements: readonly BodyMeasurement[],
): BodyMeasurement[] {
  const recordedDates = new Set(measurements.map((measurement) => measurement.date))

  return workouts
    .filter(
      (workout) =>
        typeof workout.bodyWeightKg === 'number' &&
        workout.bodyWeightKg > 0 &&
        !recordedDates.has(workout.date),
    )
    .map((workout) => ({
      date: workout.date,
      weightKg: workout.bodyWeightKg as number,
      bodyFatPercent: null,
      muscleMassKg: null,
      visceralFatLevel: null,
      basalMetabolicRateKcal: null,
      recordedAt: workout.startedAt === '' ? `${workout.date}T12:00:00.000Z` : workout.startedAt,
    }))
}

/**
 * 取り込んだデータを現在の形に整える。
 * 古い形式のバックアップや手で編集されたファイルでも、そのまま保存できる状態にする。
 */
export function normalizeBackupData(data: IncomingBackupData): BackupData {
  const workouts = data.workouts.map(normalizeWorkout)
  const measurements = (data.measurements ?? []).map(normalizeMeasurement)

  return {
    exercises: data.exercises.map(normalizeExercise),
    workouts,
    sets: data.sets.map(normalizeSet),
    templates: data.templates.map(normalizeTemplate),
    // 食事の記録は後から足した項目のため、持たないバックアップがある
    meals: (data.meals ?? []).map(normalizeMealEntry),
    customFoods: (data.customFoods ?? []).map(normalizeCustomFood),
    mealTemplates: (data.mealTemplates ?? []).map(normalizeMealTemplate),
    measurements: [...measurements, ...migrateWorkoutWeights(workouts, measurements)],
    cardioSessions: (data.cardioSessions ?? []).map(normalizeCardioSession),
    settings: data.settings,
  }
}

/**
 * 書き出したバックアップを読み戻す。
 * 外部から渡されるファイルなので、取り込む前にここで全て検査する。
 */
/** 後から足したテーブル。古いファイルには無いので、無ければ undefined を返す。 */
function optionalArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined
}

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
    // 取り込んだ値は境界でここだけ整える。以降の層は現在の形だけを扱えばよい。
    // 後から足した項目は、古いファイルだと存在しないため undefined を許す
    data: normalizeBackupData({
      exercises: data.exercises as Exercise[],
      workouts: data.workouts as Workout[],
      sets: data.sets as WorkoutSet[],
      templates: data.templates as WorkoutTemplate[],
      meals: optionalArray<MealEntry>(data.meals),
      customFoods: optionalArray<CustomFood>(data.customFoods),
      mealTemplates: optionalArray<MealTemplate>(data.mealTemplates),
      measurements: optionalArray<BodyMeasurement>(data.measurements),
      cardioSessions: optionalArray<CardioSession>(data.cardioSessions),
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

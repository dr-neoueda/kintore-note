/**
 * アプリ全体で共有するドメイン型。
 * 保存は IndexedDB (Dexie) だが、この層は永続化の詳細を知らない。
 */

export type ExerciseId = number
export type WorkoutId = number
export type SetId = number
export type TemplateId = number

/**
 * その種目で同時に使うダンベルの数。ボリューム計算の倍率になる。
 * 両手に1個ずつ持つプレス系は 2、片手ずつ行うロウや両手で1個を持つプルオーバーは 1。
 * 自重種目は重量が0なので 1 とする。
 */
export type DumbbellCount = 1 | 2

export type EquipmentType = 'dumbbell' | 'bodyweight' | 'other'

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'other'

export const MUSCLE_GROUP_LABELS: Readonly<Record<MuscleGroup, string>> = {
  chest: '胸',
  back: '背中',
  shoulders: '肩',
  arms: '腕',
  legs: '脚',
  core: '体幹',
  other: 'その他',
}

export const EQUIPMENT_LABELS: Readonly<Record<EquipmentType, string>> = {
  dumbbell: 'ダンベル',
  bodyweight: '自重',
  other: 'その他',
}

/**
 * 重量を上げる判断に使う目標。
 * 「回数で伸ばし、上限に達したら重量を1段階上げる」ダブルプログレッションの基準になる。
 */
export interface ProgressionTarget {
  /** 重量を上げた直後に落ち込む想定の下限回数。 */
  readonly repsMin: number
  /** 全セットでこの回数に達したら重量を上げる。 */
  readonly repsMax: number
  /** 判定の対象になる本セット数。 */
  readonly sets: number
}

/** 種目マスタ。 */
export interface Exercise {
  readonly id?: ExerciseId
  readonly name: string
  readonly muscleGroup: MuscleGroup
  readonly equipment: EquipmentType
  readonly dumbbellCount: DumbbellCount
  /** 種目ごとの目標。未設定の古いデータは移行時に既定値で埋める。 */
  readonly target: ProgressionTarget
  readonly isArchived: boolean
  readonly createdAt: string
}

/** 1日のトレーニングセッション。 */
export interface Workout {
  readonly id?: WorkoutId
  /** 'YYYY-MM-DD' 形式のローカル日付。 */
  readonly date: string
  readonly note: string
  readonly bodyWeightKg: number | null
  readonly startedAt: string
  readonly finishedAt: string | null
}

/** 1セットの記録。重量は「ダンベル片手あたり」で保持する。 */
export interface WorkoutSet {
  readonly id?: SetId
  readonly workoutId: WorkoutId
  readonly exerciseId: ExerciseId
  /** 同一ワークアウト内での並び順。 */
  readonly order: number
  readonly weightKg: number
  readonly reps: number
  /** 主観的なキツさ 1〜10。未入力なら null。 */
  readonly rpe: number | null
  /** 直前のセットからの休憩秒数。未計測なら null。 */
  readonly restSec: number | null
  readonly isWarmup: boolean
  readonly recordedAt: string
}

/** テンプレートに含まれる1種目分の予定。 */
export interface TemplateItem {
  readonly exerciseId: ExerciseId
  readonly targetSets: number
  readonly targetReps: number
  readonly targetWeightKg: number | null
}

/** 「胸の日」などの定型メニュー。 */
export interface WorkoutTemplate {
  readonly id?: TemplateId
  readonly name: string
  readonly note: string
  readonly order: number
  readonly items: readonly TemplateItem[]
}

/** 設定は単一レコードとして保持する。 */
export const SETTINGS_ID = 1 as const

export interface AppSettings {
  readonly id: typeof SETTINGS_ID
  /** 可変式ダンベルで実際に設定できる重量の段階（kg・昇順）。 */
  readonly dumbbellStepsKg: readonly number[]
  readonly defaultRestSec: number
  readonly lastBackupAt: string | null
  /** この日数を超えてバックアップしていなければ警告する。 */
  readonly backupReminderDays: number
  /** 新しく作る種目に適用する目標の初期値。 */
  readonly defaultTarget: ProgressionTarget
}

export const RPE_MIN = 1
export const RPE_MAX = 10

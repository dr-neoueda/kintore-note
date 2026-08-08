/**
 * アプリ全体で共有するドメイン型。
 * 保存は IndexedDB (Dexie) だが、この層は永続化の詳細を知らない。
 */
import type { CardioActivity } from './cardio'
import type { Nutrition } from './nutrition'

export type ExerciseId = number
export type WorkoutId = number
export type SetId = number
export type TemplateId = number

/**
 * その種目で同時に使うダンベルの数。記録する重量はダンベル1個あたりなので、
 * 「片手ずつ」か「両手に1個ずつ」かを持っておく。
 * 両手に1個ずつ持つプレス系は 2、片手ずつ行うロウや両手で1個を持つプルオーバーは 1。
 * 自重種目は重量が0なので 1 とする。
 */
export type DumbbellCount = 1 | 2

export type EquipmentType = 'dumbbell' | 'bodyweight' | 'other'

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'other'

/**
 * 筋線維の走行による分類。既定の回数レンジを決めるのに使う。
 * - 平行筋（紡錘状筋）: 線維が腱と平行。可動域が大きく、比較的高回数が向くとされる
 * - 羽状筋: 線維が腱に対して斜め。単位体積あたりの線維数が多く、高負荷・低回数が向くとされる
 */
export type MuscleArchitecture = 'parallel' | 'pennate'

export const MUSCLE_GROUP_LABELS: Readonly<Record<MuscleGroup, string>> = {
  chest: '胸',
  back: '背中',
  shoulders: '肩',
  arms: '腕',
  legs: '脚',
  core: '体幹',
  other: 'その他',
}

/** 保存できる部位。過去の記録が参照するため、使わなくなった部位もここには残す。 */
export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'other',
]

/**
 * 画面に出す部位と、その並び。
 *
 * 鍛えていない部位を並べても、選ぶときの邪魔になり、
 * 週間セット数では常に0の行が居座るだけになる。
 * MuscleGroup 自体からは外さない。外すと過去の記録の部位が解決できなくなる。
 */
export const DISPLAYED_MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'other',
]

export const MUSCLE_ARCHITECTURE_LABELS: Readonly<Record<MuscleArchitecture, string>> = {
  parallel: '平行筋',
  pennate: '羽状筋',
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
  /** 主に効かせる筋の構造。既定の回数レンジの根拠になる。 */
  readonly muscleArchitecture: MuscleArchitecture
  /** 種目ごとの目標。未設定の古いデータは移行時に既定値で埋める。 */
  readonly target: ProgressionTarget
  /** この種目のセット間休憩の目安（秒）。 */
  readonly restSec: number
  /** フォーム確認用の参照先。未設定なら種目名での YouTube 検索を使う。 */
  readonly referenceUrl: string | null
  readonly isArchived: boolean
  readonly createdAt: string
}

/** 種目 ID から種目を引くための索引。 */
export type ExerciseMap = ReadonlyMap<ExerciseId, Exercise>

/** 1日のトレーニングセッション。 */
export interface Workout {
  readonly id?: WorkoutId
  /** 'YYYY-MM-DD' 形式のローカル日付。 */
  readonly date: string
  readonly note: string
  /** v8 より前に記録した体重。以後は measurements に持つ。古いデータの互換のために残す。 */
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
  /** このセットの後に取る休憩の目安（秒）。未設定なら種目の設定を使う。 */
  readonly restTargetSec: number | null
  readonly isWarmup: boolean
  readonly recordedAt: string
}

export type MealEntryId = number
export type CustomFoodId = number

/** 1日の食事の区分。 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_TYPE_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
}

/** 食べたもの1件。 */
export interface MealEntry {
  readonly id?: MealEntryId
  /** 'YYYY-MM-DD' 形式のローカル日付。 */
  readonly date: string
  readonly mealType: MealType
  /** 成分表の食品番号、またはマイ食品の 'custom:<id>'。 */
  readonly foodId: string
  /** 記録した時点の食品名。あとで食品を消しても記録が読めるようにする。 */
  readonly foodName: string
  readonly grams: number
  /**
   * 食べた量ぶんの栄養価。
   * 成分表の改訂やマイ食品の修正で、過去の記録が書き換わらないようにする。
   */
  readonly nutrition: Nutrition
  /** 同じ日・同じ区分の中での並び順。 */
  readonly order: number
  readonly recordedAt: string
}

/** 成分表に無い食品（市販品・プロテインなど）を自分で登録したもの。 */
export interface CustomFood {
  readonly id?: CustomFoodId
  readonly name: string
  /** nutrition が何 g 分の値か。パッケージの「1食30g当たり」をそのまま入れられる。 */
  readonly basisGrams: number
  readonly nutrition: Nutrition
  readonly isArchived: boolean
  readonly createdAt: string
}

export type MeasurementId = number
export type CardioSessionId = number

/**
 * 体組成計で測った記録。1日1件。
 *
 * Bluetooth 連携はできないため、表示された数字を手で入れる前提。
 * 測っていない項目は null にでき、その項目だけグラフから外れる。
 */
export interface BodyMeasurement {
  readonly id?: MeasurementId
  /** 'YYYY-MM-DD' 形式のローカル日付。 */
  readonly date: string
  readonly weightKg: number
  readonly bodyFatPercent: number | null
  readonly muscleMassKg: number | null
  readonly visceralFatLevel: number | null
  /** 体組成計が出す基礎代謝量（kcal/日）。 */
  readonly basalMetabolicRateKcal: number | null
  readonly recordedAt: string
}

/** 有酸素運動1回の記録。 */
export interface CardioSession {
  readonly id?: CardioSessionId
  /** 'YYYY-MM-DD' 形式のローカル日付。 */
  readonly date: string
  readonly activity: CardioActivity
  readonly distanceKm: number
  readonly durationSec: number
  readonly note: string
  readonly recordedAt: string
}

export type MealTemplateId = number

/** 献立テンプレートに含まれる1品。 */
export interface MealTemplateItem {
  readonly foodId: string
  readonly foodName: string
  readonly grams: number
  /** この分量ぶんの栄養価。作った時点の値を持つ。 */
  readonly nutrition: Nutrition
}

/** よく食べる組み合わせ。まとめて1日の記録へ入れられる。 */
export interface MealTemplate {
  readonly id?: MealTemplateId
  readonly name: string
  /** 既定で入れる区分。入れるときに変えられる。 */
  readonly mealType: MealType
  readonly order: number
  readonly items: readonly MealTemplateItem[]
}

/** 1日の栄養の目標。 */
export interface NutritionTarget {
  readonly kcal: number
  readonly protein: number
  readonly fat: number
  readonly carb: number
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
  readonly lastBackupAt: string | null
  /** この日数を超えてバックアップしていなければ警告する。 */
  readonly backupReminderDays: number
  /** 部位ごとの既定の休憩秒数。新しく作る種目の初期値になる。 */
  readonly restSecByMuscleGroup: Readonly<Record<MuscleGroup, number>>
  /** 休憩が目標時間に達したら音で知らせる。有効な間は画面を点けたままにする。 */
  readonly isRestAlarmEnabled: boolean
  /** 1日の栄養の目標。 */
  readonly nutritionTarget: NutritionTarget
}

export const RPE_MIN = 1
export const RPE_MAX = 10

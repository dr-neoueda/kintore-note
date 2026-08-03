import { db } from './db'
import {
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from '@/domain/muscle'
import type { NewExercise } from './repositories/exerciseRepository'

/**
 * 初回起動時に投入する種目。
 * インクラインベンチと可変式ダンベルで実施できるものに絞っている。
 * dumbbellCount は「同時に使うダンベルの数」。
 */
export const SEED_EXERCISES: readonly NewExercise[] = [
  // 胸
  { name: 'インクラインダンベルプレス', muscleGroup: 'chest', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルベンチプレス', muscleGroup: 'chest', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'インクラインダンベルフライ', muscleGroup: 'chest', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルフライ', muscleGroup: 'chest', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルプルオーバー', muscleGroup: 'chest', equipment: 'dumbbell', dumbbellCount: 1 },
  { name: 'プッシュアップ', muscleGroup: 'chest', equipment: 'bodyweight', dumbbellCount: 1 },

  // 背中
  { name: 'ワンハンドダンベルロウ', muscleGroup: 'back', equipment: 'dumbbell', dumbbellCount: 1 },
  { name: 'ダンベルベントオーバーロウ', muscleGroup: 'back', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルデッドリフト', muscleGroup: 'back', equipment: 'dumbbell', dumbbellCount: 2 },

  // 肩
  { name: 'ダンベルショルダープレス', muscleGroup: 'shoulders', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'サイドレイズ', muscleGroup: 'shoulders', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'リアレイズ', muscleGroup: 'shoulders', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'フロントレイズ', muscleGroup: 'shoulders', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルシュラッグ', muscleGroup: 'shoulders', equipment: 'dumbbell', dumbbellCount: 2 },

  // 腕
  { name: 'ダンベルカール', muscleGroup: 'arms', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'インクラインダンベルカール', muscleGroup: 'arms', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ハンマーカール', muscleGroup: 'arms', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'コンセントレーションカール', muscleGroup: 'arms', equipment: 'dumbbell', dumbbellCount: 1 },
  { name: 'ダンベルフレンチプレス', muscleGroup: 'arms', equipment: 'dumbbell', dumbbellCount: 1 },
  { name: 'トライセプスキックバック', muscleGroup: 'arms', equipment: 'dumbbell', dumbbellCount: 1 },

  // 脚
  { name: 'ダンベルスクワット', muscleGroup: 'legs', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルランジ', muscleGroup: 'legs', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ブルガリアンスクワット', muscleGroup: 'legs', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'ダンベルルーマニアンデッドリフト', muscleGroup: 'legs', equipment: 'dumbbell', dumbbellCount: 2 },
  { name: 'カーフレイズ', muscleGroup: 'legs', equipment: 'dumbbell', dumbbellCount: 2 },

  // 体幹
  { name: 'プランク', muscleGroup: 'core', equipment: 'bodyweight', dumbbellCount: 1 },
  { name: 'クランチ', muscleGroup: 'core', equipment: 'bodyweight', dumbbellCount: 1 },
  { name: 'ダンベルサイドベンド', muscleGroup: 'core', equipment: 'dumbbell', dumbbellCount: 1 },
]

/**
 * 種目が1件も無ければ初期データを投入する。
 * 既にデータがある場合は何もしないため、毎回の起動で呼んでよい。
 */
export async function ensureSeeded(
  nowIso: string = new Date().toISOString(),
): Promise<boolean> {
  const count = await db.exercises.count()
  if (count > 0) return false

  await db.exercises.bulkAdd(
    SEED_EXERCISES.map((exercise) => {
      const muscleArchitecture = resolveArchitecture(exercise.name, exercise.muscleGroup)

      return {
        ...exercise,
        // 初期種目はすべて明示しているが、型としては省略可能なため既定値で埋める
        equipment: exercise.equipment ?? 'dumbbell',
        dumbbellCount: exercise.dumbbellCount ?? 2,
        muscleArchitecture,
        target: defaultTargetForArchitecture(muscleArchitecture),
        restSec: defaultRestSecForMuscleGroup(exercise.muscleGroup),
        referenceUrl: null,
        isArchived: false,
        createdAt: nowIso,
      }
    }),
  )
  return true
}

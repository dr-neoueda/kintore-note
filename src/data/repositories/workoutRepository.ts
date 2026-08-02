import { db } from '../db'
import type { DateKey } from '@/domain/date'
import { isValidDateKey } from '@/domain/date'
import type { Workout, WorkoutId } from '@/domain/types'
import { ValidationError } from '@/domain/validation'

export type WorkoutPatch = Partial<Omit<Workout, 'id' | 'date'>>

export async function getWorkout(id: WorkoutId): Promise<Workout | undefined> {
  return db.workouts.get(id)
}

export async function getWorkoutByDate(date: DateKey): Promise<Workout | undefined> {
  return db.workouts.where('date').equals(date).first()
}

/**
 * その日のワークアウトを取得する。無ければ作成する。
 * 1日1ワークアウトに束ねる設計のため、2回目以降は既存のものを返す。
 */
export async function getOrCreateWorkoutByDate(
  date: DateKey,
  nowIso: string,
): Promise<Workout> {
  if (!isValidDateKey(date)) {
    throw new ValidationError('日付の形式が正しくありません')
  }

  return db.transaction('rw', db.workouts, async () => {
    const existing = await getWorkoutByDate(date)
    if (existing) return existing

    const created: Workout = {
      date,
      note: '',
      bodyWeightKg: null,
      startedAt: nowIso,
      finishedAt: null,
    }
    const id = await db.workouts.add(created)
    return { ...created, id }
  })
}

/** 直近のワークアウトを日付の降順で返す。 */
export async function listRecentWorkouts(limit: number): Promise<Workout[]> {
  return db.workouts.orderBy('date').reverse().limit(limit).toArray()
}

export async function updateWorkout(id: WorkoutId, patch: WorkoutPatch): Promise<void> {
  await db.workouts.update(id, patch)
}

/** ワークアウトと、それに属するセットをまとめて削除する。 */
export async function deleteWorkout(id: WorkoutId): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

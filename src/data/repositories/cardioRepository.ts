import { db } from '../db'
import { usesDistance, type CardioActivity, type CardioIntensity } from '@/domain/cardio'
import { isValidDateKey, type DateKey } from '@/domain/date'
import type { CardioSession, CardioSessionId } from '@/domain/types'
import { ValidationError } from '@/domain/validation'

export const MAX_DISTANCE_KM = 500
export const MAX_DURATION_SEC = 24 * 60 * 60

export interface CardioInput {
  readonly activity: CardioActivity
  readonly distanceKm: number
  readonly durationSec: number
  readonly intensity: CardioIntensity | null
  readonly note: string
}

function validate(input: CardioInput): void {
  // 自重トレーニングは距離を持たない。時間だけで記録する
  if (usesDistance(input.activity)) {
    if (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0) {
      throw new ValidationError('距離は0より大きい数値で入力してください')
    }
    if (input.distanceKm > MAX_DISTANCE_KM) {
      throw new ValidationError(`距離は${MAX_DISTANCE_KM}km以下で入力してください`)
    }
  }
  if (!Number.isFinite(input.durationSec) || input.durationSec <= 0) {
    throw new ValidationError('時間は0より大きい値で入力してください')
  }
  if (input.durationSec > MAX_DURATION_SEC) {
    throw new ValidationError('時間は24時間以下で入力してください')
  }
}

export async function addCardioSession(
  date: DateKey,
  input: CardioInput,
  nowIso: string,
): Promise<CardioSessionId> {
  if (!isValidDateKey(date)) {
    throw new ValidationError('日付の形式が正しくありません')
  }
  validate(input)

  return db.cardioSessions.add({ date, ...input, recordedAt: nowIso })
}

export async function updateCardioSession(
  id: CardioSessionId,
  input: CardioInput,
): Promise<void> {
  validate(input)
  await db.cardioSessions.update(id, input)
}

export async function deleteCardioSession(id: CardioSessionId): Promise<void> {
  await db.cardioSessions.delete(id)
}

export async function listCardioSessionsByDate(date: DateKey): Promise<CardioSession[]> {
  const sessions = await db.cardioSessions.where('date').equals(date).toArray()
  return sessions.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export async function listAllCardioSessions(): Promise<CardioSession[]> {
  return db.cardioSessions.toArray()
}

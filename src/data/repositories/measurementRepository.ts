import { db } from '../db'
import { isValidDateKey, type DateKey } from '@/domain/date'
import type { BodyMeasurement, MeasurementId } from '@/domain/types'
import { ValidationError } from '@/domain/validation'

export const MAX_WEIGHT_KG = 500
export const MAX_BODY_FAT_PERCENT = 80

export interface MeasurementInput {
  readonly weightKg: number
  readonly bodyFatPercent: number | null
  readonly muscleMassKg: number | null
  readonly visceralFatLevel: number | null
  readonly basalMetabolicRateKcal: number | null
}

function requirePositiveOrNull(value: number | null, label: string, max: number): number | null {
  if (value === null) return null
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new ValidationError(`${label}は0〜${max}の範囲で入力してください`)
  }
  return value
}

/**
 * その日の体組成を記録する。1日1件で、既にあれば置き換える。
 * 朝晩で測り直しても行が増えないようにするため。
 */
export async function saveMeasurement(
  date: DateKey,
  input: MeasurementInput,
  nowIso: string,
): Promise<void> {
  if (!isValidDateKey(date)) {
    throw new ValidationError('日付の形式が正しくありません')
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > MAX_WEIGHT_KG) {
    throw new ValidationError(`体重は0〜${MAX_WEIGHT_KG}kgの範囲で入力してください`)
  }

  const next: BodyMeasurement = {
    date,
    weightKg: input.weightKg,
    bodyFatPercent: requirePositiveOrNull(
      input.bodyFatPercent,
      '体脂肪率',
      MAX_BODY_FAT_PERCENT,
    ),
    muscleMassKg: requirePositiveOrNull(input.muscleMassKg, '筋肉量', MAX_WEIGHT_KG),
    visceralFatLevel: requirePositiveOrNull(input.visceralFatLevel, '内臓脂肪レベル', 60),
    basalMetabolicRateKcal: requirePositiveOrNull(
      input.basalMetabolicRateKcal,
      '基礎代謝量',
      10000,
    ),
    recordedAt: nowIso,
  }

  await db.transaction('rw', db.measurements, async () => {
    const existing = await db.measurements.where('date').equals(date).first()
    if (existing?.id !== undefined) {
      await db.measurements.update(existing.id, next)
      return
    }
    await db.measurements.add(next)
  })
}

export async function getMeasurementByDate(
  date: DateKey,
): Promise<BodyMeasurement | undefined> {
  return db.measurements.where('date').equals(date).first()
}

/** 新しい日から順に返す。 */
export async function listMeasurements(): Promise<BodyMeasurement[]> {
  const all = await db.measurements.toArray()
  return all.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * その日以前で最も新しい体重を返す。
 * 消費エネルギーの計算に使うため、測っていない日でも直近の値で賄う。
 */
export async function findLatestWeightKg(date: DateKey): Promise<number | null> {
  const all = await db.measurements.toArray()
  const candidates = all
    .filter((measurement) => measurement.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))

  return candidates[0]?.weightKg ?? null
}

export async function deleteMeasurement(id: MeasurementId): Promise<void> {
  await db.measurements.delete(id)
}

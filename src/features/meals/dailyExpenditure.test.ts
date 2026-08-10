import { describe, test, expect } from 'vitest'
import type {
  BodyMeasurement,
  CardioSession,
  Workout,
  WorkoutId,
  WorkoutSet,
} from '@/domain/types'
import { buildDailyExpenditure } from './dailyExpenditure'

const workout = (id: number, date: string): Workout => ({
  id,
  date,
  note: '',
  bodyWeightKg: null,
  startedAt: `${date}T10:00:00.000Z`,
  finishedAt: null,
})

const set = (workoutId: number, date: string, minute: number): WorkoutSet => ({
  workoutId,
  exerciseId: 1,
  order: minute,
  weightKg: 10,
  reps: 10,
  rpe: null,
  restSec: null,
  restTargetSec: null,
  isWarmup: false,
  recordedAt: `${date}T10:${String(minute).padStart(2, '0')}:00.000Z`,
})

const cardio = (date: string, distanceKm = 5): CardioSession => ({
  date,
  activity: 'running',
  distanceKm,
  durationSec: 1800,
  intensity: null,
  note: '',
  recordedAt: `${date}T18:00:00.000Z`,
})

const measurement = (
  date: string,
  weightKg: number,
  basalMetabolicRateKcal: number | null = null,
): BodyMeasurement => ({
  date,
  weightKg,
  bodyFatPercent: null,
  muscleMassKg: null,
  visceralFatLevel: null,
  basalMetabolicRateKcal,
  recordedAt: `${date}T07:00:00.000Z`,
})

const build = (params: {
  workouts?: Workout[]
  sets?: [number, WorkoutSet[]][]
  cardioSessions?: CardioSession[]
  measurements?: BodyMeasurement[]
}) =>
  buildDailyExpenditure({
    workouts: params.workouts ?? [],
    setsByWorkoutId: new Map<WorkoutId, WorkoutSet[]>(params.sets ?? []),
    cardioSessions: params.cardioSessions ?? [],
    measurements: params.measurements ?? [],
  })

describe('buildDailyExpenditure', () => {
  test('筋トレと有酸素の消費を、その日の分として合計する', () => {
    // Arrange
    const days = build({
      workouts: [workout(1, '2026-08-10')],
      sets: [[1, [set(1, '2026-08-10', 0), set(1, '2026-08-10', 20)]]],
      cardioSessions: [cardio('2026-08-10')],
      measurements: [measurement('2026-08-10', 70)],
    })

    // Act
    const day = days.get('2026-08-10')

    // Assert
    expect(day?.strengthKcal).toBeGreaterThan(0)
    expect(day?.cardioKcal).toBeGreaterThan(0)
    expect(day?.totalKcal).toBe((day?.strengthKcal ?? 0) + (day?.cardioKcal ?? 0))
  })

  test('基礎代謝があれば合計に含める', () => {
    // Arrange
    const days = build({
      cardioSessions: [cardio('2026-08-10')],
      measurements: [measurement('2026-08-10', 70, 1600)],
    })

    // Act
    const day = days.get('2026-08-10')

    // Assert
    expect(day?.basalKcal).toBe(1600)
    expect(day?.hasBasal).toBe(true)
    expect(day?.totalKcal).toBe(1600 + (day?.cardioKcal ?? 0))
  })

  test('基礎代謝が無ければ運動ぶんだけにする', () => {
    // Arrange & Act
    const day = build({
      cardioSessions: [cardio('2026-08-10')],
      measurements: [measurement('2026-08-10', 70)],
    }).get('2026-08-10')

    // Assert
    expect(day?.hasBasal).toBe(false)
    expect(day?.basalKcal).toBe(0)
  })

  test('その日に測っていなければ、直近の体重を使う', () => {
    // Arrange: 8/1に測って、8/10に走った
    const day = build({
      cardioSessions: [cardio('2026-08-10')],
      measurements: [measurement('2026-08-01', 70, 1600)],
    }).get('2026-08-10')

    // Assert
    expect(day?.cardioKcal).toBeGreaterThan(0)
    expect(day?.basalKcal).toBe(1600)
  })

  test('測定より前の日には、後の測定を使わない', () => {
    // Arrange: 8/10に初めて測った。8/01の消費は出せない
    const day = build({
      cardioSessions: [cardio('2026-08-01')],
      measurements: [measurement('2026-08-10', 70, 1600)],
    }).get('2026-08-01')

    // Assert: 当て推量の数字は出さない
    expect(day?.cardioKcal).toBe(0)
    expect(day?.basalKcal).toBe(0)
  })

  test('体重を一度も測っていなければ0のままにする', () => {
    const day = build({ cardioSessions: [cardio('2026-08-10')] }).get('2026-08-10')

    expect(day?.totalKcal).toBe(0)
  })

  test('運動していなくても、基礎代謝だけの日を作る', () => {
    // Arrange & Act: 何もしなくても基礎代謝ぶんは消費している
    const day = build({ measurements: [measurement('2026-08-10', 70, 1600)] }).get('2026-08-10')

    // Assert
    expect(day?.totalKcal).toBe(1600)
  })

  test('記録が無ければ空', () => {
    expect(build({}).size).toBe(0)
  })
})

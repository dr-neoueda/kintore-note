import { describe, test, expect } from 'vitest'
import type { CardioSession, Workout, WorkoutId, WorkoutSet } from '@/domain/types'
import { buildTrainingDays, formatCardioSummary, sumCardioDistanceKm } from './trainingDays'

const workout = (id: number, date: string): Workout => ({
  id,
  date,
  note: '',
  bodyWeightKg: null,
  startedAt: `${date}T10:00:00.000Z`,
  finishedAt: null,
})

const set = (workoutId: number): WorkoutSet => ({
  workoutId,
  exerciseId: 1,
  order: 1,
  weightKg: 10,
  reps: 10,
  rpe: null,
  restSec: null,
  restTargetSec: null,
  isWarmup: false,
  recordedAt: '2026-08-10T10:00:00.000Z',
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

const setsByWorkoutId = (entries: readonly (readonly [number, WorkoutSet[]])[]) =>
  new Map<WorkoutId, WorkoutSet[]>(entries)

describe('buildTrainingDays', () => {
  test('有酸素運動だけの日も、運動した日として出す', () => {
    // Arrange & Act: 走っただけの日はワークアウトが作られない
    const days = buildTrainingDays({
      workouts: [],
      setsByWorkoutId: setsByWorkoutId([]),
      cardioSessions: [cardio('2026-08-10')],
    })

    // Assert
    expect(days).toHaveLength(1)
    expect(days[0]?.date).toBe('2026-08-10')
    expect(days[0]?.sets).toEqual([])
    expect(days[0]?.cardioSessions).toHaveLength(1)
  })

  test('筋トレだけの日も出す', () => {
    const days = buildTrainingDays({
      workouts: [workout(1, '2026-08-10')],
      setsByWorkoutId: setsByWorkoutId([[1, [set(1)]]]),
      cardioSessions: [],
    })

    expect(days).toHaveLength(1)
    expect(days[0]?.sets).toHaveLength(1)
  })

  test('同じ日に両方あれば1日にまとめる', () => {
    // Arrange & Act
    const days = buildTrainingDays({
      workouts: [workout(1, '2026-08-10')],
      setsByWorkoutId: setsByWorkoutId([[1, [set(1)]]]),
      cardioSessions: [cardio('2026-08-10')],
    })

    // Assert
    expect(days).toHaveLength(1)
    expect(days[0]?.sets).toHaveLength(1)
    expect(days[0]?.cardioSessions).toHaveLength(1)
  })

  test('新しい日から順に並べる', () => {
    const days = buildTrainingDays({
      workouts: [workout(1, '2026-08-08')],
      setsByWorkoutId: setsByWorkoutId([[1, []]]),
      cardioSessions: [cardio('2026-08-10'), cardio('2026-08-09')],
    })

    expect(days.map((day) => day.date)).toEqual(['2026-08-10', '2026-08-09', '2026-08-08'])
  })

  test('同じ日の有酸素運動をまとめる', () => {
    const days = buildTrainingDays({
      workouts: [],
      setsByWorkoutId: setsByWorkoutId([]),
      cardioSessions: [cardio('2026-08-10', 5), cardio('2026-08-10', 3)],
    })

    expect(days).toHaveLength(1)
    expect(days[0]?.cardioSessions).toHaveLength(2)
  })

  test('記録が無ければ空', () => {
    expect(
      buildTrainingDays({
        workouts: [],
        setsByWorkoutId: setsByWorkoutId([]),
        cardioSessions: [],
      }),
    ).toEqual([])
  })
})

describe('formatCardioSummary', () => {
  test('種類と距離を並べる', () => {
    expect(formatCardioSummary([cardio('2026-08-10', 5)])).toBe('ランニング 5km')
  })

  test('複数あれば、まとめて出す', () => {
    expect(formatCardioSummary([cardio('2026-08-10', 5), cardio('2026-08-10', 3)])).toBe(
      'ランニング 5km、ランニング 3km',
    )
  })

  test('無ければ空にする', () => {
    expect(formatCardioSummary([])).toBe('')
  })
})

describe('sumCardioDistanceKm', () => {
  test('距離を合計する', () => {
    expect(sumCardioDistanceKm([cardio('2026-08-10', 5), cardio('2026-08-10', 3.2)])).toBe(8.2)
  })

  test('無ければ0', () => {
    expect(sumCardioDistanceKm([])).toBe(0)
  })
})

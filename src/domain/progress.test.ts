import { describe, test, expect } from 'vitest'
import type { DateKey } from './date'
import { buildExerciseProgress, buildVolumeHistory } from './progress'
import type { Exercise, ExerciseId, WorkoutId, WorkoutSet } from './types'

const DATE_BY_WORKOUT = new Map<WorkoutId, DateKey>([
  [1, '2026-07-26'],
  [2, '2026-08-02'],
])

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  workoutId: 1,
  exerciseId: 1,
  order: 1,
  weightKg: 10,
  reps: 10,
  rpe: null,
  restSec: null,
  isWarmup: false,
  recordedAt: '2026-07-26T10:00:00.000Z',
  ...overrides,
})

describe('buildExerciseProgress', () => {
  test('セッションごとに最大重量とボリュームを集計する', () => {
    // Arrange
    const sets = [
      set({ workoutId: 1, weightKg: 10, reps: 10 }),
      set({ workoutId: 1, weightKg: 11.5, reps: 8 }),
      set({ workoutId: 2, weightKg: 13.5, reps: 6 }),
    ]

    // Act
    const points = buildExerciseProgress(sets, 2, DATE_BY_WORKOUT)

    // Assert
    expect(points).toHaveLength(2)
    expect(points[0]?.date).toBe('2026-07-26')
    expect(points[0]?.maxWeightKg).toBe(11.5)
    expect(points[0]?.volumeKg).toBe(384) // 10*10*2 + 11.5*8*2
    expect(points[1]?.maxWeightKg).toBe(13.5)
  })

  test('日付の昇順で返す', () => {
    // Arrange: 新しい方を先に渡す
    const sets = [set({ workoutId: 2 }), set({ workoutId: 1 })]

    // Act
    const points = buildExerciseProgress(sets, 1, DATE_BY_WORKOUT)

    // Assert
    expect(points.map((point) => point.date)).toEqual(['2026-07-26', '2026-08-02'])
  })

  test('ウォームアップは集計から除外する', () => {
    // Arrange
    const sets = [
      set({ workoutId: 1, weightKg: 24, reps: 5, isWarmup: true }),
      set({ workoutId: 1, weightKg: 10, reps: 10 }),
    ]

    // Act
    const points = buildExerciseProgress(sets, 1, DATE_BY_WORKOUT)

    // Assert: ウォームアップの24kgが最大重量にならない
    expect(points[0]?.maxWeightKg).toBe(10)
  })

  test('推定1RMはセッション内の最良値を採用する', () => {
    // Arrange: 10kg×10 → 13.3、 12kg×5 → 14.0
    const sets = [
      set({ workoutId: 1, weightKg: 10, reps: 10 }),
      set({ workoutId: 1, weightKg: 12, reps: 5 }),
    ]

    // Act
    const points = buildExerciseProgress(sets, 1, DATE_BY_WORKOUT)

    // Assert
    expect(points[0]?.estimatedOneRepMaxKg).toBe(14)
  })

  test('日付が引けないセットは無視する', () => {
    const sets = [set({ workoutId: 999 })]

    expect(buildExerciseProgress(sets, 1, DATE_BY_WORKOUT)).toEqual([])
  })

  test('セットが無ければ空配列を返す', () => {
    expect(buildExerciseProgress([], 1, DATE_BY_WORKOUT)).toEqual([])
  })
})

describe('buildVolumeHistory', () => {
  const exercises = new Map<ExerciseId, Exercise>([
    [
      1,
      {
        id: 1,
        name: '両手種目',
        muscleGroup: 'chest',
        equipment: 'dumbbell',
        dumbbellCount: 2,
        isArchived: false,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    [
      2,
      {
        id: 2,
        name: '片手種目',
        muscleGroup: 'back',
        equipment: 'dumbbell',
        dumbbellCount: 1,
        isArchived: false,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
  ])

  test('日ごとの総ボリュームを種目のダンベル数を考慮して集計する', () => {
    // Arrange
    const sets = [
      set({ workoutId: 1, exerciseId: 1, weightKg: 10, reps: 10 }), // 200
      set({ workoutId: 1, exerciseId: 2, weightKg: 10, reps: 10 }), // 100
      set({ workoutId: 2, exerciseId: 1, weightKg: 11.5, reps: 8 }), // 184
    ]

    // Act
    const points = buildVolumeHistory(sets, exercises, DATE_BY_WORKOUT)

    // Assert
    expect(points).toEqual([
      { date: '2026-07-26', volumeKg: 300 },
      { date: '2026-08-02', volumeKg: 184 },
    ])
  })

  test('セットが無ければ空配列を返す', () => {
    expect(buildVolumeHistory([], exercises, DATE_BY_WORKOUT)).toEqual([])
  })
})

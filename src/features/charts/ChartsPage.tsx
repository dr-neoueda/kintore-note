import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/PageHeader'
import { buildExerciseProgress, buildVolumeHistory } from '@/domain/progress'
import type { ExerciseId } from '@/domain/types'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useExercises } from '@/hooks/useExercises'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { CHART_PALETTES } from './chartPalette'
import styles from './ChartsPage.module.css'

const AXIS_FONT_SIZE = 10

/** 'YYYY-MM-DD' を軸表示用の 'M/D' にする。 */
function toAxisLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  if (month === undefined || day === undefined) return dateKey
  return `${Number(month)}/${Number(day)}`
}

/** 総ボリュームは4桁以上になるため、狭い軸に収まるよう千単位で丸める。 */
function formatVolumeTick(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`
  return String(value)
}

export function ChartsPage() {
  const { exerciseById, allExercises } = useExercises()
  const { allSets, dateByWorkoutId, isLoading } = useWorkoutHistory()
  const palette = CHART_PALETTES[useColorScheme()]

  const axisStyle = { fill: palette.axisText, fontSize: AXIS_FONT_SIZE }
  const tooltipStyle = {
    background: palette.tooltipBg,
    border: `1px solid ${palette.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: palette.tooltipText,
  }

  const [selectedExerciseId, setSelectedExerciseId] = useState<ExerciseId | null>(null)

  // 記録が1件でもある種目だけを選択肢に出す
  const recordedExercises = useMemo(() => {
    const recordedIds = new Set(allSets.map((set) => set.exerciseId))
    return allExercises.filter(
      (exercise) => exercise.id !== undefined && recordedIds.has(exercise.id),
    )
  }, [allSets, allExercises])

  const activeExerciseId = selectedExerciseId ?? recordedExercises[0]?.id ?? null
  const activeExercise =
    activeExerciseId === null ? undefined : exerciseById.get(activeExerciseId)

  const progress = useMemo(() => {
    if (activeExercise?.id === undefined) return []
    const exerciseSets = allSets.filter((set) => set.exerciseId === activeExercise.id)
    return buildExerciseProgress(exerciseSets, activeExercise.dumbbellCount, dateByWorkoutId)
  }, [activeExercise, allSets, dateByWorkoutId])

  const volumeHistory = useMemo(
    () => buildVolumeHistory(allSets, exerciseById, dateByWorkoutId),
    [allSets, exerciseById, dateByWorkoutId],
  )

  const bestWeight = progress.reduce((max, point) => Math.max(max, point.maxWeightKg), 0)
  const bestOneRepMax = progress.reduce(
    (max, point) => Math.max(max, point.estimatedOneRepMaxKg ?? 0),
    0,
  )

  const chartData = progress.map((point) => ({
    label: toAxisLabel(point.date),
    最大重量: point.maxWeightKg,
    推定1RM: point.estimatedOneRepMaxKg,
  }))

  const volumeData = volumeHistory.map((point) => ({
    label: toAxisLabel(point.date),
    ボリューム: point.volumeKg,
  }))

  if (isLoading) {
    return (
      <>
        <PageHeader title="グラフ" />
        <p className="empty-state">読み込み中…</p>
      </>
    )
  }

  if (recordedExercises.length === 0) {
    return (
      <>
        <PageHeader title="グラフ" />
        <p className="empty-state">
          記録が貯まるとここに推移が表示されます。
          <br />
          まずは今日のトレーニングを記録しましょう。
        </p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="グラフ" />

      <div className={styles.content}>
        <select
          value={activeExerciseId ?? ''}
          onChange={(event) => setSelectedExerciseId(Number(event.target.value))}
          aria-label="表示する種目"
        >
          {recordedExercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>重量の推移</h2>

          <div className={styles.best}>
            <div className={styles.bestMetric}>
              <div className={styles.bestValue}>{bestWeight} kg</div>
              <div className={styles.bestLabel}>自己ベスト重量</div>
            </div>
            <div className={styles.bestMetric}>
              <div className={styles.bestValue}>
                {bestOneRepMax > 0 ? `${bestOneRepMax} kg` : '—'}
              </div>
              <div className={styles.bestLabel}>推定1RMの最高</div>
            </div>
          </div>

          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
                <YAxis tick={axisStyle} stroke={palette.axis} width={40} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: palette.tooltipLabel }} />
                <Line
                  type="monotone"
                  dataKey="最大重量"
                  stroke={palette.maxWeight}
                  strokeWidth={2}
                  // 既定の白抜きの点は地色に紛れるため、線と同じ色で塗りつぶす
                  dot={{ r: 3, fill: palette.maxWeight, stroke: palette.maxWeight }}
                />
                <Line
                  type="monotone"
                  dataKey="推定1RM"
                  stroke={palette.oneRepMax}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span
                className={styles.swatch}
                style={{ background: palette.maxWeight }}
              />
              最大重量
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchDashed}`} />
              推定1RM
            </span>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>総ボリュームの推移（全種目）</h2>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
                <YAxis
                  tick={axisStyle}
                  stroke={palette.axis}
                  width={40}
                  tickFormatter={formatVolumeTick}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: palette.tooltipLabel }}
                  cursor={{ fill: palette.cursorFill }}
                />
                <Bar dataKey="ボリューム" fill={palette.volume} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </>
  )
}

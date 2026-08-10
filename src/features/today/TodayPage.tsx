import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BackupReminderBanner } from '@/components/BackupReminderBanner'
import { PageHeader } from '@/components/PageHeader'
import {
  listMeasurements,
  saveMeasurement,
} from '@/data/repositories/measurementRepository'
import { getSettings, updateSettings } from '@/data/repositories/settingsRepository'
import { listTemplates } from '@/data/repositories/templateRepository'
import { formatDateLabel, type DateKey } from '@/domain/date'
import { formatWeightKg } from '@/domain/weight'
import { useExercises } from '@/hooks/useExercises'
import { useLastSessions } from '@/hooks/useLastSessions'
import { useTodayKey } from '@/hooks/useTodayKey'
import { BodyMeasurementSheet } from '../body/BodyMeasurementSheet'
import { CardioSection } from '../cardio/CardioSection'
import { WorkoutEditorBody } from '../workout/WorkoutEditorBody'
import { useWorkoutEditor } from '../workout/useWorkoutEditor'
import { useDailyEnergy } from './useDailyEnergy'
import styles from './TodayPage.module.css'

export function TodayPage() {
  const todayKey = useTodayKey()
  const { activeExercises } = useExercises()
  const lastSessionByExercise = useLastSessions()

  const templates = useLiveQuery(() => listTemplates(), [])

  const editor = useWorkoutEditor({ dateKey: todayKey })
  const { workout, summary } = editor

  const energy = useDailyEnergy(todayKey, editor.sets)
  const [isMeasurementOpen, setIsMeasurementOpen] = useState(false)

  const settings = useLiveQuery(() => getSettings(), [])
  const measurements = useLiveQuery(() => listMeasurements(), [])
  const measuredDates = useMemo(
    () => new Set<DateKey>((measurements ?? []).map((entry) => entry.date)),
    [measurements],
  )

  const hasSections = editor.sectionExerciseIds.length > 0
  const hasTemplates = templates !== undefined && templates.length > 0

  return (
    <>
      <PageHeader title="ホーム" subtitle={formatDateLabel(todayKey)} />

      <div className={styles.content}>
        <BackupReminderBanner />

        <div className={styles.summary}>
          <div className={styles.metric}>
            <span className={styles.metricValue} data-testid="exercise-count">
              {summary.exerciseCount}
            </span>
            <span className={styles.metricLabel}>種目</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue} data-testid="set-count">
              {summary.workingSetCount}
            </span>
            <span className={styles.metricLabel}>セット</span>
          </div>
          {energy.activeKcal > 0 && (
            <div className={styles.metric}>
              <span className={styles.metricValue} data-testid="active-kcal">
                {energy.activeKcal}
              </span>
              <span className={styles.metricLabel}>kcal</span>
            </div>
          )}
        </div>

        <div className={styles.dailyButtons}>
          <button
            type="button"
            className={styles.noteButton}
            aria-label="体組成を記録"
            onClick={() => setIsMeasurementOpen(true)}
          >
            {energy.measurement === undefined ? (
              '体組成を記録'
            ) : (
              <span className={styles.noteValue}>
                {formatWeightKg(energy.measurement.weightKg)} kg
                {energy.measurement.bodyFatPercent !== null &&
                  ` · ${energy.measurement.bodyFatPercent}%`}
              </span>
            )}
          </button>
          <button
            type="button"
            className={styles.noteButton}
            aria-label="メモを記録"
            onClick={editor.openNote}
          >
            <span className={workout?.note ? styles.noteValue : undefined}>
              {workout?.note !== undefined && workout.note !== '' ? workout.note : 'メモ'}
            </span>
          </button>
        </div>

        {!hasSections && hasTemplates && (
          <>
            <span className={styles.sectionLabel}>メニューから始める</span>
            <div className={styles.templates}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={styles.templateChip}
                  onClick={() =>
                    editor.addExercises(template.items.map((item) => item.exerciseId))
                  }
                >
                  {template.name}
                </button>
              ))}
            </div>
          </>
        )}

        <WorkoutEditorBody
          editor={editor}
          activeExercises={activeExercises}
          showProgressionHints
          lastSessionByExercise={lastSessionByExercise}
          emptyMessage="種目を追加して、今日のトレーニングを記録しましょう。"
        />

        <CardioSection date={todayKey} weightKg={energy.weightKg} />
      </div>

      <BodyMeasurementSheet
        isOpen={isMeasurementOpen}
        todayKey={todayKey}
        measurement={energy.measurement}
        heightCm={settings?.heightCm ?? null}
        recordedDates={measuredDates}
        onClose={() => setIsMeasurementOpen(false)}
        onSubmit={(date, values) =>
          saveMeasurement(date, values, new Date().toISOString())
        }
        onChangeHeightCm={async (heightCm) => {
          await updateSettings({ heightCm })
        }}
      />

    </>
  )
}

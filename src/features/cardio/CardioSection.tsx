import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PlusIcon } from '@/components/icons'
import {
  addCardioSession,
  deleteCardioSession,
  listCardioSessionsByDate,
  updateCardioSession,
} from '@/data/repositories/cardioRepository'
import {
  CARDIO_ACTIVITY_LABELS,
  calcPaceSecPerKm,
  formatPace,
} from '@/domain/cardio'
import type { DateKey } from '@/domain/date'
import { formatDuration } from '@/domain/duration'
import { calcCardioEnergyKcal } from '@/domain/energyExpenditure'
import type { CardioSession } from '@/domain/types'
import { CardioSheet, type CardioValues } from './CardioSheet'
import styles from './CardioSection.module.css'

interface CardioSectionProps {
  readonly date: DateKey
  /** 消費エネルギーの推定に使う体重。 */
  readonly weightKg: number | null
}

/** その日の有酸素運動。ランニングは距離と時間を手で入れる。 */
export function CardioSection({ date, weightKg }: CardioSectionProps) {
  const sessions = useLiveQuery(() => listCardioSessionsByDate(date), [date])
  const [editing, setEditing] = useState<CardioSession | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const submit = async (values: CardioValues) => {
    if (editing?.id !== undefined) {
      await updateCardioSession(editing.id, values)
      return
    }
    await addCardioSession(date, values, new Date().toISOString())
  }

  const remove = async () => {
    if (editing?.id === undefined) return
    await deleteCardioSession(editing.id)
  }

  const close = () => {
    setEditing(null)
    setIsCreating(false)
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>有酸素運動</h2>
      </div>

      {(sessions ?? []).map((session) => {
        const kcal =
          weightKg === null
            ? null
            : calcCardioEnergyKcal(
                session.activity,
                session.distanceKm,
                session.durationSec,
                weightKg,
              )

        return (
          <button
            key={session.id}
            type="button"
            className={styles.item}
            onClick={() => setEditing(session)}
            aria-label={`${CARDIO_ACTIVITY_LABELS[session.activity]}の記録を編集`}
          >
            <span className={styles.itemMain}>
              <span className={styles.itemTitle}>
                {CARDIO_ACTIVITY_LABELS[session.activity]} {session.distanceKm} km
              </span>
              <span className={styles.itemDetail}>
                {formatDuration(session.durationSec)} ·{' '}
                {formatPace(calcPaceSecPerKm(session.distanceKm, session.durationSec))}/km
                {session.note !== '' && ` · ${session.note}`}
              </span>
            </span>
            {kcal !== null && <span className={styles.itemKcal}>{kcal} kcal</span>}
          </button>
        )
      })}

      <button type="button" className={styles.addButton} onClick={() => setIsCreating(true)}>
        <PlusIcon size={18} />
        ランニングなどを記録
      </button>

      {(isCreating || editing !== null) && (
        <CardioSheet
          isOpen
          session={editing}
          weightKg={weightKg}
          onClose={close}
          onSubmit={submit}
          {...(editing !== null ? { onDelete: remove } : {})}
        />
      )}
    </section>
  )
}

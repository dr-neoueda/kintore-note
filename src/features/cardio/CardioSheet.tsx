import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { TrashIcon } from '@/components/icons'
import {
  CARDIO_ACTIVITIES,
  CARDIO_ACTIVITY_LABELS,
  calcPaceSecPerKm,
  calcSpeedKmh,
  formatPace,
  type CardioActivity,
} from '@/domain/cardio'
import { formatDuration } from '@/domain/duration'
import { calcCardioEnergyKcal } from '@/domain/energyExpenditure'
import type { CardioSession } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import styles from './CardioSheet.module.css'

export interface CardioValues {
  readonly activity: CardioActivity
  readonly distanceKm: number
  readonly durationSec: number
  readonly note: string
}

interface CardioSheetProps {
  readonly isOpen: boolean
  readonly session: CardioSession | null
  /** 消費エネルギーの推定に使う体重。記録が無ければ null。 */
  readonly weightKg: number | null
  readonly onClose: () => void
  readonly onSubmit: (values: CardioValues) => Promise<void>
  readonly onDelete?: () => Promise<void>
}

function toNumber(text: string): number {
  const value = Number(text.trim())
  return Number.isFinite(value) && value >= 0 ? value : 0
}

/**
 * ランニングなどを記録するシート。
 *
 * GPS による自動記録は行っていない。iOS の Web アプリは画面ロック中に
 * 位置情報を取得できず、途中の軌跡もスプリットも残せないため。
 * 距離と時間を入れれば、ペース・速度・推定消費エネルギーは自動で出す。
 */
export function CardioSheet({
  isOpen,
  session,
  weightKg,
  onClose,
  onSubmit,
  onDelete,
}: CardioSheetProps) {
  const [activity, setActivity] = useState<CardioActivity>(session?.activity ?? 'running')
  const [distanceText, setDistanceText] = useState(
    session === null ? '' : String(session.distanceKm),
  )
  const [minutesText, setMinutesText] = useState(
    session === null ? '' : String(Math.floor(session.durationSec / 60)),
  )
  const [secondsText, setSecondsText] = useState(
    session === null ? '' : String(session.durationSec % 60),
  )
  const [note, setNote] = useState(session?.note ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useResetOnOpen(isOpen, () => {
    setActivity(session?.activity ?? 'running')
    setDistanceText(session === null ? '' : String(session.distanceKm))
    setMinutesText(session === null ? '' : String(Math.floor(session.durationSec / 60)))
    setSecondsText(session === null ? '' : String(session.durationSec % 60))
    setNote(session?.note ?? '')
    setErrorMessage(null)
  })

  const distanceKm = toNumber(distanceText)
  const durationSec = toNumber(minutesText) * 60 + toNumber(secondsText)

  const paceSecPerKm = calcPaceSecPerKm(distanceKm, durationSec)
  const speedKmh = calcSpeedKmh(distanceKm, durationSec)
  const kcal = weightKg === null ? null : calcCardioEnergyKcal(activity, distanceKm, durationSec, weightKg)

  const handleSubmit = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSubmit({ activity, distanceKm, durationSec, note: note.trim() })
      onClose()
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError ? cause.message : '保存できませんでした',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (onDelete === undefined) return
    setIsSaving(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setErrorMessage('削除できませんでした')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      title={session === null ? '有酸素運動を記録' : '有酸素運動を編集'}
      onClose={onClose}
      footer={
        <div className={styles.footerActions}>
          {onDelete !== undefined && (
            <button
              type="button"
              className={`btn btn-danger ${styles.deleteButton}`}
              onClick={handleDelete}
              disabled={isSaving}
              aria-label="この記録を削除"
            >
              <TrashIcon size={20} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {session === null ? '記録する' : '更新する'}
          </button>
        </div>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>種類</span>
          <div className={styles.chips}>
            {CARDIO_ACTIVITIES.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  activity === option ? `${styles.chip} ${styles.chipSelected}` : styles.chip
                }
                onClick={() => setActivity(option)}
                aria-pressed={activity === option}
              >
                {CARDIO_ACTIVITY_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cardio-distance">
            距離
          </label>
          <div className={styles.inlineField}>
            <input
              id="cardio-distance"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="5.0"
              value={distanceText}
              onChange={(event) => setDistanceText(event.target.value)}
            />
            <span className={styles.unit}>km</span>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>時間</span>
          <div className={styles.durationRow}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="30"
              aria-label="時間（分）"
              value={minutesText}
              onChange={(event) => setMinutesText(event.target.value)}
            />
            <span className={styles.unit}>分</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              placeholder="0"
              aria-label="時間（秒）"
              value={secondsText}
              onChange={(event) => setSecondsText(event.target.value)}
            />
            <span className={styles.unit}>秒</span>
          </div>
        </div>

        <dl className={styles.derived}>
          <div>
            <dt>ペース</dt>
            <dd data-testid="cardio-pace">{formatPace(paceSecPerKm)} /km</dd>
          </div>
          <div>
            <dt>速度</dt>
            <dd>{speedKmh} km/h</dd>
          </div>
          <div>
            <dt>推定消費</dt>
            <dd data-testid="cardio-kcal">{kcal === null ? '—' : `${kcal} kcal`}</dd>
          </div>
          <div>
            <dt>時間</dt>
            <dd>{formatDuration(durationSec)}</dd>
          </div>
        </dl>

        {weightKg === null && (
          <p className={styles.note}>
            消費エネルギーは体重から計算します。「体組成を記録」で体重を入れると出せます。
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cardio-note">
            メモ
          </label>
          <input
            id="cardio-note"
            type="text"
            placeholder="コースや体感など"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}
      </div>
    </Sheet>
  )
}

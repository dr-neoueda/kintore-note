import { useRef, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { getMeasurementByDate } from '@/data/repositories/measurementRepository'
import { calcBmi, calcLeanBodyMassKg } from '@/domain/bodyComposition'
import { formatDateLabelWithYear, type DateKey } from '@/domain/date'
import type { BodyMeasurement } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import { MonthCalendar } from '../history/MonthCalendar'
import styles from './BodyMeasurementSheet.module.css'

export interface BodyMeasurementValues {
  readonly weightKg: number
  readonly bodyFatPercent: number | null
  readonly muscleMassKg: number | null
  readonly visceralFatLevel: number | null
  readonly basalMetabolicRateKcal: number | null
}

interface BodyMeasurementSheetProps {
  readonly isOpen: boolean
  /** 開いたときに記録する日。ここから過去の日にも移せる。 */
  readonly todayKey: DateKey
  readonly measurement: BodyMeasurement | undefined
  /** 身長は日々変わらないので設定として持ち、測定とは別に保存する。 */
  readonly heightCm: number | null
  readonly recordedDates: ReadonlySet<DateKey>
  readonly onClose: () => void
  readonly onSubmit: (date: DateKey, values: BodyMeasurementValues) => Promise<void>
  readonly onChangeHeightCm: (heightCm: number | null) => Promise<void>
}

interface FieldDefinition {
  readonly key: keyof BodyMeasurementValues
  readonly label: string
  readonly unit: string
  readonly placeholder: string
  readonly step: string
}

/** 体組成計が出す代表的な項目。体重以外は測っていなければ空でよい。 */
const FIELDS: readonly FieldDefinition[] = [
  { key: 'weightKg', label: '体重', unit: 'kg', placeholder: '70.0', step: '0.1' },
  { key: 'bodyFatPercent', label: '体脂肪率', unit: '%', placeholder: '15.0', step: '0.1' },
  { key: 'muscleMassKg', label: '筋肉量', unit: 'kg', placeholder: '55.0', step: '0.1' },
  {
    key: 'visceralFatLevel',
    label: '内臓脂肪レベル',
    unit: '',
    placeholder: '5',
    step: '0.5',
  },
  {
    key: 'basalMetabolicRateKcal',
    label: '基礎代謝量',
    unit: 'kcal',
    placeholder: '1600',
    step: '1',
  },
]

type Texts = Readonly<Record<keyof BodyMeasurementValues, string>>

const EMPTY_TEXTS: Texts = {
  weightKg: '',
  bodyFatPercent: '',
  muscleMassKg: '',
  visceralFatLevel: '',
  basalMetabolicRateKcal: '',
}

function toTexts(measurement: BodyMeasurement | undefined): Texts {
  if (measurement === undefined) return EMPTY_TEXTS

  const show = (value: number | null) => (value === null ? '' : String(value))
  return {
    weightKg: show(measurement.weightKg),
    bodyFatPercent: show(measurement.bodyFatPercent),
    muscleMassKg: show(measurement.muscleMassKg),
    visceralFatLevel: show(measurement.visceralFatLevel),
    basalMetabolicRateKcal: show(measurement.basalMetabolicRateKcal),
  }
}

function toOptionalNumber(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/**
 * 体組成計の測定値を記録するシート。
 *
 * iOS Safari は Web Bluetooth に対応しておらず、体組成計と直接つなげない。
 * 表示された数字を写す前提で、入力欄の並びを体組成計の表示順に合わせている。
 *
 * 測り忘れた日や、アプリを入れる前の記録も入れられるよう、日付を選べるようにしている。
 */
export function BodyMeasurementSheet({
  isOpen,
  todayKey,
  measurement,
  heightCm,
  recordedDates,
  onClose,
  onSubmit,
  onChangeHeightCm,
}: BodyMeasurementSheetProps) {
  const [date, setDate] = useState<DateKey>(todayKey)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [texts, setTexts] = useState<Texts>(toTexts(measurement))
  const [heightText, setHeightText] = useState(heightCm === null ? '' : String(heightCm))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  /** 読み込み中に日を移されたとき、古い結果で上書きしないための番号。 */
  const loadTokenRef = useRef(0)

  useResetOnOpen(isOpen, () => {
    loadTokenRef.current += 1
    setDate(todayKey)
    setIsCalendarOpen(false)
    setTexts(toTexts(measurement))
    setHeightText(heightCm === null ? '' : String(heightCm))
    setErrorMessage(null)
  })

  const weightKg = Number(texts.weightKg)
  const bodyFatPercent = toOptionalNumber(texts.bodyFatPercent)
  const leanBodyMass = Number.isFinite(weightKg)
    ? calcLeanBodyMassKg(weightKg, bodyFatPercent)
    : null
  const bmi = Number.isFinite(weightKg)
    ? calcBmi(weightKg, toOptionalNumber(heightText))
    : null

  /**
   * 日を移したら、その日に既にある記録を読み込んで上書き入力にする。
   *
   * 入力欄を空にするのは読み込みを待たずに行う。待ってから消すと、
   * その間に打ち込んだ値が、後から届いた読み込み結果に消される。
   * 読み込み中に更に日を移されたときのために、最後の1件だけを反映する。
   */
  const handleSelectDate = async (next: DateKey) => {
    const token = loadTokenRef.current + 1
    loadTokenRef.current = token

    setIsCalendarOpen(false)
    setDate(next)
    setTexts(EMPTY_TEXTS)

    const existing = await getMeasurementByDate(next)
    if (existing === undefined || loadTokenRef.current !== token) return
    setTexts(toTexts(existing))
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onChangeHeightCm(toOptionalNumber(heightText))
      await onSubmit(date, {
        weightKg,
        bodyFatPercent,
        muscleMassKg: toOptionalNumber(texts.muscleMassKg),
        visceralFatLevel: toOptionalNumber(texts.visceralFatLevel),
        basalMetabolicRateKcal: toOptionalNumber(texts.basalMetabolicRateKcal),
      })
      onClose()
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError ? cause.message : '保存できませんでした',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      title="体組成を記録"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          保存する
        </button>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>日付</span>
          <button
            type="button"
            className={styles.dateButton}
            onClick={() => setIsCalendarOpen((current) => !current)}
          >
            <span data-testid="measurement-date">{formatDateLabelWithYear(date)}</span>
            <span className={styles.dateHint}>
              {isCalendarOpen ? '閉じる' : '別の日にする'}
            </span>
          </button>
        </div>

        {isCalendarOpen && (
          <MonthCalendar
            todayKey={todayKey}
            recordedDates={recordedDates}
            onSelect={handleSelectDate}
          />
        )}

        {FIELDS.map(({ key, label, unit, placeholder, step }) => (
          <div key={key} className={styles.field}>
            <label className={styles.label} htmlFor={`measurement-${key}`}>
              {label}
              {key !== 'weightKg' && <span className={styles.optional}>任意</span>}
            </label>
            <div className={styles.inlineField}>
              <input
                id={`measurement-${key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                placeholder={placeholder}
                value={texts[key]}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [key]: event.target.value }))
                }
              />
              <span className={styles.unit}>{unit}</span>
            </div>
          </div>
        ))}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="measurement-heightCm">
            身長
            <span className={styles.optional}>任意</span>
          </label>
          <div className={styles.inlineField}>
            <input
              id="measurement-heightCm"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="170.0"
              value={heightText}
              onChange={(event) => setHeightText(event.target.value)}
            />
            <span className={styles.unit}>cm</span>
          </div>
          <p className={styles.fieldNote}>
            一度入れれば次からも引き継ぎます。BMI を出すのに使います。
          </p>
        </div>

        {leanBodyMass !== null && (
          <p className={styles.derived}>
            除脂肪体重 <strong>{leanBodyMass} kg</strong>
            <span className={styles.derivedNote}>
              体重から脂肪を除いた重さです。筋量の増減はこちらの方が読み取りやすいです。
            </span>
          </p>
        )}

        {bmi !== null && (
          <p className={styles.derived} data-testid="measurement-bmi">
            BMI <strong>{bmi}</strong>
          </p>
        )}

        <p className={styles.note}>
          基礎代謝量を入れておくと、食事タブで「摂取 − 消費」の目安が出せます。
        </p>

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}
      </div>
    </Sheet>
  )
}

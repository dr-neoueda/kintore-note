import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon, WarningIcon } from '@/components/icons'
import { collectBackupData, replaceAllData } from '@/data/repositories/backupRepository'
import {
  getSettings,
  markBackedUp,
  updateSettings,
} from '@/data/repositories/settingsRepository'
import { countWorkouts } from '@/data/repositories/workoutRepository'
import {
  createBackupFile,
  isBackupOverdue,
  parseBackup,
  serializeBackup,
} from '@/domain/backup'
import { toDateKey } from '@/domain/date'
import { DEFAULT_REST_SEC_BY_MUSCLE_GROUP } from '@/domain/muscle'
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { formatWeightKg } from '@/domain/weight'
import { downloadTextFile } from './downloadFile'

const MUSCLE_GROUP_ORDER: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'other',
]
import styles from './SettingsPage.module.css'

type StatusKind = 'success' | 'error'

interface StatusMessage {
  readonly kind: StatusKind
  readonly text: string
}

/** 段階リストを編集用のテキストに変換する。 */
function stepsToText(steps: readonly number[]): string {
  return steps.map((step) => formatWeightKg(step)).join(', ')
}

/** 編集用テキストを段階リストに変換する。数値として読めない要素は捨てる。 */
function textToSteps(text: string): number[] {
  return text
    .split(/[,、\s]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
}

export function SettingsPage() {
  const settings = useLiveQuery(() => getSettings(), [])
  const workoutCount = useLiveQuery(() => countWorkouts(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stepsText, setStepsText] = useState('')
  const [restTexts, setRestTexts] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<StatusMessage | null>(null)

  useEffect(() => {
    if (settings === undefined) return
    setStepsText(stepsToText(settings.dumbbellStepsKg))
    setRestTexts(
      Object.fromEntries(
        MUSCLE_GROUP_ORDER.map((group) => [
          group,
          String(settings.restSecByMuscleGroup[group]),
        ]),
      ),
    )
  }, [settings])

  const handleSaveSteps = async () => {
    const steps = textToSteps(stepsText)
    if (steps.length === 0) {
      setStatus({ kind: 'error', text: '重量の段階を1つ以上入力してください' })
      return
    }

    const saved = await updateSettings({ dumbbellStepsKg: steps })
    setStepsText(stepsToText(saved.dumbbellStepsKg))
    setStatus({ kind: 'success', text: 'ダンベルの段階を保存しました' })
  }

  const handleSaveRest = async () => {
    const parsed = { ...DEFAULT_REST_SEC_BY_MUSCLE_GROUP }

    for (const group of MUSCLE_GROUP_ORDER) {
      const seconds = Number(restTexts[group])
      if (!Number.isFinite(seconds) || seconds < 0) {
        setStatus({ kind: 'error', text: '休憩時間は0以上の秒数で入力してください' })
        return
      }
      parsed[group] = Math.round(seconds)
    }

    await updateSettings({ restSecByMuscleGroup: parsed })
    setStatus({ kind: 'success', text: '部位ごとの休憩時間を保存しました' })
  }

  const handleExport = async () => {
    try {
      const data = await collectBackupData()
      const nowIso = new Date().toISOString()
      const file = createBackupFile(data, nowIso)

      downloadTextFile(
        `kintore-note-${toDateKey(new Date())}.json`,
        serializeBackup(file),
      )
      await markBackedUp(nowIso)
      setStatus({ kind: 'success', text: 'バックアップを書き出しました' })
    } catch {
      setStatus({ kind: 'error', text: 'バックアップを書き出せませんでした' })
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const backup = parseBackup(text)

      const isConfirmed = window.confirm(
        '現在のデータをすべて置き換えます。よろしいですか？\n（この操作は取り消せません）',
      )
      if (!isConfirmed) return

      await replaceAllData(backup.data)
      setStatus({ kind: 'success', text: 'バックアップを読み込みました' })
    } catch (cause) {
      setStatus({
        kind: 'error',
        text:
          cause instanceof ValidationError
            ? cause.message
            : 'バックアップを読み込めませんでした',
      })
    }
  }

  // 守るべきデータがまだ無い初回起動時に警告を出しても意味がないため、記録がある場合だけ促す
  const isOverdue =
    settings !== undefined &&
    (workoutCount ?? 0) > 0 &&
    isBackupOverdue(settings.lastBackupAt, settings.backupReminderDays, Date.now())

  return (
    <>
      <PageHeader title="設定" />

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ダンベルの重量段階</h2>
          <p className={styles.hint}>
            実際に設定できる重量をカンマ区切りで入力します。
            ここに入れた値だけが ＋ / − ボタンで選ばれます。
          </p>
          <input
            type="text"
            inputMode="decimal"
            value={stepsText}
            onChange={(event) => setStepsText(event.target.value)}
            aria-label="ダンベルの重量段階"
          />
          {settings !== undefined && (
            <div className={styles.stepPreview}>
              {settings.dumbbellStepsKg.map((step) => (
                <span key={step} className={styles.stepChip}>
                  {formatWeightKg(step)}
                </span>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-block" onClick={handleSaveSteps}>
            段階を保存
          </button>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>部位ごとの休憩時間</h2>
          <p className={styles.hint}>
            新しく作る種目に適用される既定値です（秒）。
            筋肥大を目的とした研究では、多関節・大筋群は2分以上とる方が
            総挙上量を保てるぶん有利とされています。単関節・小筋群は60〜90秒が目安です。
            既にある種目は各種目のカルテ画面から個別に変更できます。
          </p>

          <div className={styles.restGrid}>
            {MUSCLE_GROUP_ORDER.map((group) => (
              <div key={group} className={styles.restRow}>
                <label className={styles.restLabel} htmlFor={`rest-${group}`}>
                  {MUSCLE_GROUP_LABELS[group]}
                </label>
                <input
                  id={`rest-${group}`}
                  className={styles.restInput}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="15"
                  value={restTexts[group] ?? ''}
                  onChange={(event) =>
                    setRestTexts((current) => ({ ...current, [group]: event.target.value }))
                  }
                />
                <span className={styles.restUnit}>秒</span>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-block" onClick={handleSaveRest}>
            休憩時間を保存
          </button>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>回数レンジについて</h2>
          <p className={styles.hint}>
            回数の目標は、種目ごとの「筋の種類」から決まります。
            平行筋（紡錘状筋）は 10〜15回、羽状筋は 8〜12回 が既定です。
            種目ごとの変更はカルテ画面から行えます。
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>バックアップ</h2>

          {isOverdue && (
            <div className={styles.warning}>
              <span className={styles.warningIcon}>
                <WarningIcon size={18} />
              </span>
              <span>
                しばらくバックアップしていません。
                記録は端末内にのみ保存されているため、定期的に書き出して保管してください。
              </span>
            </div>
          )}

          <p className={styles.hint}>
            最終バックアップ：
            {settings?.lastBackupAt == null
              ? ' まだありません'
              : ` ${new Date(settings.lastBackupAt).toLocaleString('ja-JP')}`}
          </p>

          <button type="button" className="btn btn-primary btn-block" onClick={handleExport}>
            バックアップを書き出す
          </button>

          <button
            type="button"
            className="btn btn-block"
            onClick={() => fileInputRef.current?.click()}
          >
            バックアップから復元する
          </button>

          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file !== undefined) void handleImportFile(file)
              event.target.value = ''
            }}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>種目</h2>
          <Link to="/settings/exercises" className={styles.link}>
            種目を管理する
            <span className={styles.linkChevron}>
              <ChevronRightIcon size={18} />
            </span>
          </Link>
        </section>

        {status !== null && (
          <p
            className={`${styles.status} ${
              status.kind === 'success' ? styles.statusSuccess : styles.statusError
            }`}
            role="status"
          >
            {status.text}
          </p>
        )}

        <p className={styles.version}>筋トレノート</p>
      </div>
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  DEFAULT_REST_ALARM_DURATION_SEC,
  REST_ALARM_DURATION_OPTIONS,
} from '@/domain/restAlarm'
import { playRestAlarm } from '../workout/audioAlarm'
import {
  DEFAULT_NUTRITION_TARGET,
  normalizeNutritionTarget,
} from '@/domain/nutritionTarget'
import {
  DISPLAYED_MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type NutritionTarget,
} from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { formatWeightKg } from '@/domain/weight'
import {
  canShareFiles,
  chooseBackupTarget,
  detectBackupExportMode,
  exportBackup,
  getRememberedTargetName,
  shareBackupFile,
} from './backupExport'
import { downloadTextFile } from './downloadFile'

import styles from './SettingsPage.module.css'

type StatusKind = 'success' | 'error'

interface StatusMessage {
  readonly kind: StatusKind
  readonly text: string
}

type NutritionTargetTexts = Readonly<Record<keyof NutritionTarget, string>>

const NUTRITION_TARGET_FIELDS: readonly {
  readonly key: keyof NutritionTarget
  readonly label: string
  readonly unit: string
}[] = [
  { key: 'kcal', label: 'エネルギー', unit: 'kcal' },
  { key: 'protein', label: 'たんぱく質', unit: 'g' },
  { key: 'fat', label: '脂質', unit: 'g' },
  { key: 'carb', label: '炭水化物', unit: 'g' },
]

function toTargetTexts(target: NutritionTarget): NutritionTargetTexts {
  return {
    kcal: String(target.kcal),
    protein: String(target.protein),
    fat: String(target.fat),
    carb: String(target.carb),
  }
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
  const [targetTexts, setTargetTexts] = useState<NutritionTargetTexts>(
    toTargetTexts(DEFAULT_NUTRITION_TARGET),
  )
  const exportMode = useMemo(() => detectBackupExportMode(), [])
  const isShareAvailable = useMemo(() => canShareFiles(), [])

  /**
   * 共有シート用に、書き出す中身を先に用意しておく。
   *
   * iOS は「押したその場」でしか共有を許さない。押してからデータを集めると
   * 権限が切れて断られるため、画面を開いた時点で作っておく。
   */
  const [preparedBackup, setPreparedBackup] = useState<{
    fileName: string
    text: string
  } | null>(null)

  const prepareBackup = useCallback(async () => {
    try {
      const data = await collectBackupData()
      const nowIso = new Date().toISOString()
      setPreparedBackup({
        fileName: `kintore-note-${toDateKey(new Date())}.json`,
        text: serializeBackup(createBackupFile(data, nowIso)),
      })
    } catch {
      setPreparedBackup(null)
    }
  }, [])

  useEffect(() => {
    void prepareBackup()
  }, [prepareBackup])

  /** 共有シートを開く。await を挟まずに呼ぶ必要がある。 */
  const handleShare = () => {
    if (preparedBackup === null) {
      setStatus({ kind: 'error', text: 'バックアップを用意できませんでした' })
      return
    }

    const { fileName, text } = preparedBackup
    void shareBackupFile(fileName, text).then(async (isShared) => {
      if (!isShared) {
        // 共有を断られた場合でも、書き出せないままにはしない
        downloadTextFile(fileName, text)
      }
      await markBackedUp(new Date().toISOString())
      await prepareBackup()
      setStatus({ kind: 'success', text: 'バックアップを書き出しました' })
    })
  }
  const [targetName, setTargetName] = useState<string | null>(null)

  useEffect(() => {
    void getRememberedTargetName().then(setTargetName)
  }, [])

  const alarmDurationSec = settings?.restAlarmDurationSec ?? DEFAULT_REST_ALARM_DURATION_SEC
  const [status, setStatus] = useState<StatusMessage | null>(null)

  useEffect(() => {
    if (settings === undefined) return
    setStepsText(stepsToText(settings.dumbbellStepsKg))
    setTargetTexts(toTargetTexts(settings.nutritionTarget))
    setRestTexts(
      Object.fromEntries(
        DISPLAYED_MUSCLE_GROUPS.map((group) => [
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

  const handleToggleRestAlarm = async () => {
    const next = !(settings?.isRestAlarmEnabled ?? false)
    await updateSettings({ isRestAlarmEnabled: next })
    setStatus({
      kind: 'success',
      text: next ? '休憩終了の音を鳴らします' : '休憩終了の音を鳴らしません',
    })
  }

  const handleSaveRest = async () => {
    // 画面に出していない部位の値も、保存のたびに既定へ戻さないよう引き継ぐ
    const parsed = { ...(settings?.restSecByMuscleGroup ?? DEFAULT_REST_SEC_BY_MUSCLE_GROUP) }

    for (const group of DISPLAYED_MUSCLE_GROUPS) {
      const text = (restTexts[group] ?? '').trim()
      const seconds = Number(text)
      // 空欄は 0 と解釈されてしまうため、明示的に弾く
      if (text === '' || !Number.isFinite(seconds) || seconds < 0) {
        setStatus({ kind: 'error', text: '休憩時間は0以上の秒数で入力してください' })
        return
      }
      parsed[group] = Math.round(seconds)
    }

    await updateSettings({ restSecByMuscleGroup: parsed })
    setStatus({ kind: 'success', text: '部位ごとの休憩時間を保存しました' })
  }

  /** 選んだ長さをそのまま鳴らす。聞かずに秒数だけ選んでも判断できない。 */
  const handleSelectAlarmDuration = async (seconds: number) => {
    await updateSettings({ restAlarmDurationSec: seconds })
    await playRestAlarm(seconds)
  }

  const handleSaveNutritionTarget = async () => {
    const parsed = {
      kcal: Number(targetTexts.kcal),
      protein: Number(targetTexts.protein),
      fat: Number(targetTexts.fat),
      carb: Number(targetTexts.carb),
    }

    const hasInvalidValue = Object.values(parsed).some(
      (value) => !Number.isFinite(value) || value < 0,
    )
    if (hasInvalidValue) {
      setStatus({ kind: 'error', text: '栄養の目標は0以上の数値で入力してください' })
      return
    }

    const saved = await updateSettings({ nutritionTarget: normalizeNutritionTarget(parsed) })
    setTargetTexts(toTargetTexts(saved.nutritionTarget))
    setStatus({ kind: 'success', text: '栄養の目標を保存しました' })
  }

  const handleExport = async () => {
    try {
      const data = await collectBackupData()
      const nowIso = new Date().toISOString()
      const file = createBackupFile(data, nowIso)

      const result = await exportBackup(
        `kintore-note-${toDateKey(new Date())}.json`,
        serializeBackup(file),
      )

      await markBackedUp(nowIso)
      setTargetName(result.isRemembered ? result.fileName : null)
      setStatus({
        kind: 'success',
        text: result.isRemembered
          ? `${result.fileName} に書き出しました`
          : 'バックアップを書き出しました',
      })
    } catch (cause) {
      // 保存先の選択を取り消した場合は、失敗として騒がない
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setStatus({ kind: 'error', text: 'バックアップを書き出せませんでした' })
    }
  }

  const handleChangeTarget = async () => {
    try {
      const name = await chooseBackupTarget(`kintore-note-${toDateKey(new Date())}.json`)
      if (name === null) return

      setTargetName(name)
      setStatus({ kind: 'success', text: `保存先を ${name} にしました` })
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setStatus({ kind: 'error', text: '保存先を変更できませんでした' })
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
          <h2 className={styles.sectionTitle}>休憩終了の合図</h2>
          <p className={styles.hint}>
            休憩が目標時間に達したら音で知らせます。
            iOS の Web アプリは画面が消えると音を鳴らせないため、
            <strong>有効な間は休憩中だけ画面を点けたままにします</strong>
            （目標に達したら解除するので、電池の消費は最小限です）。
            他のアプリを見ている間は鳴りません。
          </p>
          <button
            type="button"
            className={
              settings?.isRestAlarmEnabled ?? false
                ? 'btn btn-primary btn-block'
                : 'btn btn-block'
            }
            onClick={handleToggleRestAlarm}
            aria-pressed={settings?.isRestAlarmEnabled ?? false}
          >
            {(settings?.isRestAlarmEnabled ?? false) ? '音で知らせる：オン' : '音で知らせる：オフ'}
          </button>

          {(settings?.isRestAlarmEnabled ?? false) && (
            <>
              <span className={styles.fieldLabel}>鳴らす長さ</span>
              <div className={styles.chips}>
                {REST_ALARM_DURATION_OPTIONS.map(({ seconds, label }) => (
                  <button
                    key={seconds}
                    type="button"
                    className={
                      alarmDurationSec === seconds
                        ? `${styles.chip} ${styles.chipSelected}`
                        : styles.chip
                    }
                    onClick={() => void handleSelectAlarmDuration(seconds)}
                    aria-pressed={alarmDurationSec === seconds}
                  >
                    {label}
                    <span className={styles.chipSub}>{seconds}秒</span>
                  </button>
                ))}
              </div>
              <p className={styles.hint}>
                選ぶとその場で鳴ります。長さは実際に聞いて決めてください。
              </p>
              <button
                type="button"
                className="btn btn-block"
                onClick={() => void playRestAlarm(alarmDurationSec)}
              >
                今の長さで鳴らす
              </button>
            </>
          )}
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
            {DISPLAYED_MUSCLE_GROUPS.map((group) => (
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
          <h2 className={styles.sectionTitle}>栄養の目標</h2>
          <p className={styles.hint}>
            食事タブで、その日の合計と比べる値です。
            体格も活動量も人によって違うため、既定値はあくまで出発点です。
          </p>

          <div className={styles.restGrid}>
            {NUTRITION_TARGET_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className={styles.restRow}>
                <label className={styles.restLabel} htmlFor={`target-${key}`}>
                  {label}
                </label>
                <input
                  id={`target-${key}`}
                  className={styles.restInput}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={targetTexts[key]}
                  onChange={(event) =>
                    setTargetTexts((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
                <span className={styles.restUnit}>{unit}</span>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-block" onClick={handleSaveNutritionTarget}>
            栄養の目標を保存
          </button>

          <Link to="/settings/custom-foods" className={styles.link}>
            マイ食品を管理する
            <span className={styles.linkChevron}>
              <ChevronRightIcon size={18} />
            </span>
          </Link>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>消費カロリーについて</h2>
          <p className={styles.hint}>
            体重をもとに「1.05 × METs × 時間 × 体重」で推定しています。体重の記録が無いと出せません。
          </p>
          <p className={styles.hint}>
            <strong>筋トレ</strong>は、セットの記録時刻から時間を、
            セット間の平均休憩から強度を決めます。
            休憩が長いほど 3.5、短いほど 6.0 METs に寄せます（2分半以上で3.5、45秒以下で6.0）。
            扱った重量は使っていません。重量から仕事量を出すには種目ごとの可動域を仮定する必要があり、
            METs の値には標準的な挙上仕事が既に含まれているためです。
          </p>
          <p className={styles.hint}>
            <strong>自重トレ</strong>は入力した時間と選んだ強度、
            <strong>ランニングなど</strong>は距離と時間から求めた速度を使います。
            いずれも運動後の代謝亢進と日常生活の活動量は含みません。目安として見てください。
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>食品成分データについて</h2>
          <p className={styles.hint}>
            食品の栄養価は「日本食品標準成分表（八訂）増補2023年」（文部科学省）から引用しています。
            可食部100gあたりの値で、未測定・微量の成分は0として扱います。
            市販品や外食は収載されていないため、食品を選ぶ画面の「市販品も探す」から
            Open Food Facts（ODbL・有志が登録している開かれたデータベース）を検索できます。
            こちらは値が違っていることもあるため、取り込んだあとマイ食品として直せます。
            インターネットに繋がっているときだけ使えます。
          </p>
          <p className={styles.hint}>
            業務スーパーの商品（169品）は、同じ Open Food Facts のデータから
            あらかじめ取り込んであります。こちらは圏外でも使えます。
            食品を選ぶ画面で「業務スーパー」と入力すると一覧になります。
          </p>
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

          {exportMode === 'remembered' && targetName !== null && (
            <p className={styles.hint}>
              保存先：{targetName}
              <br />
              「書き出す」を押すだけで、このファイルに上書きされます。
            </p>
          )}

          {exportMode === 'share' && (
            <p className={styles.hint}>
              このブラウザは保存先を覚えられないため、「書き出す」を押すと共有シートが開きます。
            </p>
          )}

          <button type="button" className="btn btn-primary btn-block" onClick={handleExport}>
            {exportMode === 'remembered' && targetName !== null
              ? '書き出す（保存先は選ばずに済みます）'
              : 'バックアップを書き出す'}
          </button>

          {isShareAvailable && (
            <button
              type="button"
              className="btn btn-block"
              onClick={handleShare}
              disabled={preparedBackup === null}
            >
              共有して保存（Google Drive など）
            </button>
          )}

          {exportMode === 'remembered' && targetName !== null && (
            <button type="button" className="btn btn-block" onClick={handleChangeTarget}>
              保存先を変更する
            </button>
          )}

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

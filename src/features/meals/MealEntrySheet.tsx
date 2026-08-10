import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { TrashIcon } from '@/components/icons'
import { countToGrams, findCountUnit, gramsToCount } from '@/domain/foodAmount'
import { formatFoodName, type Food } from '@/domain/food'
import { roundTo } from '@/domain/number'
import { scaleNutrition, type Nutrition } from '@/domain/nutrition'
import { ValidationError } from '@/domain/validation'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import styles from './MealEntrySheet.module.css'

interface MealEntrySheetProps {
  readonly isOpen: boolean
  readonly food: Food
  readonly initialGrams: number
  readonly isEditing: boolean
  readonly onClose: () => void
  readonly onSubmit: (grams: number, nutrition: Nutrition) => Promise<void>
  readonly onDelete?: () => Promise<void>
}

/** ± ボタン1回あたりの量（g）。 */
const GRAM_STEP = 10

/** ± ボタン1回あたりの個数。 */
const COUNT_STEP = 1

/** よく使う量。毎回打ち込まずに済むようにする。 */
const QUICK_GRAMS: readonly number[] = [50, 100, 150, 200]

/** よく使う個数。 */
const QUICK_COUNTS: readonly number[] = [1, 2, 3, 5]

/** 個数は半端も入れられるので、小数1桁まで持つ。 */
const COUNT_DECIMALS = 1

type UnitMode = 'count' | 'gram'

export function MealEntrySheet({
  isOpen,
  food,
  initialGrams,
  isEditing,
  onClose,
  onSubmit,
  onDelete,
}: MealEntrySheetProps) {
  /** 梅干しのように数えた方が早い食品は、分量から数え方を読み取る。 */
  const countUnit = useMemo(() => findCountUnit(food.portions), [food.portions])
  const defaultUnitMode: UnitMode = countUnit === null ? 'gram' : 'count'

  const toAmountText = (grams: number, mode: UnitMode): string =>
    mode === 'count' && countUnit !== null
      ? String(gramsToCount(grams, countUnit))
      : String(grams)

  /**
   * 新しく足すときは1つぶんから始める。
   * 既定の100gを個数に直すと「1.1本」のような半端から始まってしまう。
   */
  const initialAmountText = (): string =>
    !isEditing && defaultUnitMode === 'count'
      ? '1'
      : toAmountText(initialGrams, defaultUnitMode)

  const [unitMode, setUnitMode] = useState<UnitMode>(defaultUnitMode)
  const [amountText, setAmountText] = useState(initialAmountText)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useResetOnOpen(isOpen, () => {
    setUnitMode(defaultUnitMode)
    setAmountText(initialAmountText())
    setErrorMessage(null)
  })

  const amount = Number(amountText)
  const hasAmount = amountText.trim() !== '' && Number.isFinite(amount) && amount > 0

  const isCounting = unitMode === 'count' && countUnit !== null
  const grams = !hasAmount ? 0 : isCounting ? countToGrams(amount, countUnit) : amount
  const isValidGrams = grams > 0

  const nutrition = useMemo(
    () => scaleNutrition(food.nutrition, grams, food.basisGrams),
    [food, grams],
  )

  const changeAmount = (direction: number) => {
    const step = isCounting ? COUNT_STEP : GRAM_STEP
    const current = Number.isFinite(amount) ? amount : 0
    setAmountText(
      String(Math.max(0, roundTo(current + direction * step, COUNT_DECIMALS))),
    )
  }

  /** g と個数を行き来する。今入っている量はそのまま持ち越す。 */
  const toggleUnitMode = () => {
    if (countUnit === null) return
    const next: UnitMode = unitMode === 'count' ? 'gram' : 'count'
    setAmountText(toAmountText(grams, next))
    setUnitMode(next)
  }

  const handleSubmit = async () => {
    if (!isValidGrams) {
      setErrorMessage(
        isCounting
          ? '個数を0より大きい数値で入力してください'
          : '量を0より大きい数値で入力してください',
      )
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSubmit(grams, nutrition)
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
      title={food.isCustom ? food.name : formatFoodName(food.name)}
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
            {isEditing ? '更新する' : '記録する'}
          </button>
        </div>
      }
    >
      <div className={styles.form}>
        <div className={styles.amountField}>
          <label className={styles.label} htmlFor="meal-grams">
            量
          </label>
          <div className={styles.amountRow}>
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => changeAmount(-1)}
              aria-label="量を減らす"
            >
              −
            </button>
            <input
              id="meal-grams"
              type="number"
              inputMode="decimal"
              min={0}
              className={styles.amountInput}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
            {countUnit === null ? (
              <span className={styles.unit}>g</span>
            ) : (
              <button
                type="button"
                className={styles.unitButton}
                onClick={toggleUnitMode}
                aria-label={`単位を切り替える（今は${isCounting ? countUnit.label : 'g'}）`}
              >
                {isCounting ? countUnit.label : 'g'}
                <span aria-hidden="true">⇄</span>
              </button>
            )}
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => changeAmount(1)}
              aria-label="量を増やす"
            >
              ＋
            </button>
          </div>

          {isCounting && (
            <p className={styles.gramHint} data-testid="amount-grams">
              {grams} g
            </p>
          )}

          <div className={styles.quickRow}>
            {isCounting
              ? QUICK_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={styles.quickButton}
                    onClick={() => setAmountText(String(count))}
                  >
                    {count}
                    {countUnit.label}
                  </button>
                ))
              : (food.portions ?? []).map((portion) => (
                  <button
                    key={portion.label}
                    type="button"
                    className={`${styles.quickButton} ${styles.portionButton}`}
                    onClick={() => setAmountText(String(portion.grams))}
                  >
                    {portion.label}
                    <span className={styles.portionGrams}>{portion.grams}g</span>
                  </button>
                ))}
            {!isCounting &&
              [food.basisGrams, ...QUICK_GRAMS]
                .filter((value, index, all) => all.indexOf(value) === index)
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.quickButton}
                    onClick={() => setAmountText(String(value))}
                  >
                    {value}g
                  </button>
                ))}
          </div>
        </div>

        {food.estimateNote !== undefined && (
          <p className={styles.estimateNote}>{food.estimateNote}</p>
        )}

        <div className={styles.preview}>
          <div className={styles.kcal}>
            <span className={styles.kcalValue}>{nutrition.kcal}</span>
            <span className={styles.kcalUnit}>kcal</span>
          </div>
          <dl className={styles.macros}>
            <div>
              <dt>たんぱく質</dt>
              <dd>{nutrition.protein} g</dd>
            </div>
            <div>
              <dt>脂質</dt>
              <dd>{nutrition.fat} g</dd>
            </div>
            <div>
              <dt>炭水化物</dt>
              <dd>{nutrition.carb} g</dd>
            </div>
            <div>
              <dt>食塩相当量</dt>
              <dd>{nutrition.salt} g</dd>
            </div>
          </dl>
        </div>

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}
      </div>
    </Sheet>
  )
}

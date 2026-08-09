import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { TrashIcon } from '@/components/icons'
import { formatFoodName, type Food } from '@/domain/food'
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

/** よく使う量。毎回打ち込まずに済むようにする。 */
const QUICK_GRAMS: readonly number[] = [50, 100, 150, 200]

export function MealEntrySheet({
  isOpen,
  food,
  initialGrams,
  isEditing,
  onClose,
  onSubmit,
  onDelete,
}: MealEntrySheetProps) {
  const [gramsText, setGramsText] = useState(String(initialGrams))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useResetOnOpen(isOpen, () => {
    setGramsText(String(initialGrams))
    setErrorMessage(null)
  })

  const grams = Number(gramsText)
  const isValidGrams = gramsText.trim() !== '' && Number.isFinite(grams) && grams > 0

  const nutrition = useMemo(
    () => scaleNutrition(food.nutrition, isValidGrams ? grams : 0, food.basisGrams),
    [food, grams, isValidGrams],
  )

  const changeGrams = (delta: number) => {
    const current = Number.isFinite(grams) ? grams : 0
    setGramsText(String(Math.max(0, Math.round(current + delta))))
  }

  const handleSubmit = async () => {
    if (!isValidGrams) {
      setErrorMessage('量を0より大きい数値で入力してください')
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
              onClick={() => changeGrams(-GRAM_STEP)}
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
              value={gramsText}
              onChange={(event) => setGramsText(event.target.value)}
            />
            <span className={styles.unit}>g</span>
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => changeGrams(GRAM_STEP)}
              aria-label="量を増やす"
            >
              ＋
            </button>
          </div>
          <div className={styles.quickRow}>
            {(food.portions ?? []).map((portion) => (
              <button
                key={portion.label}
                type="button"
                className={`${styles.quickButton} ${styles.portionButton}`}
                onClick={() => setGramsText(String(portion.grams))}
              >
                {portion.label}
                <span className={styles.portionGrams}>{portion.grams}g</span>
              </button>
            ))}
            {[food.basisGrams, ...QUICK_GRAMS]
              .filter((value, index, all) => all.indexOf(value) === index)
              .map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.quickButton}
                  onClick={() => setGramsText(String(value))}
                >
                  {value}g
                </button>
              ))}
          </div>
        </div>

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

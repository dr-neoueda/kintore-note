import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import {
  CUSTOM_FOOD_ID_PREFIX,
  createCustomFood,
} from '@/data/repositories/customFoodRepository'
import type { Food } from '@/domain/food'
import type { Nutrition } from '@/domain/nutrition'
import { ValidationError } from '@/domain/validation'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import styles from './CreateCustomFoodSheet.module.css'

interface CreateCustomFoodSheetProps {
  readonly isOpen: boolean
  /** 検索していた語をそのまま名前の初期値にする。 */
  readonly initialName?: string
  readonly onClose: () => void
  /** 作ったものをそのまま記録できるよう、食品の形で返す。 */
  readonly onCreated: (food: Food) => void
}

interface NutrientField {
  readonly key: keyof Nutrition
  readonly label: string
  readonly unit: string
}

const NUTRIENT_FIELDS: readonly NutrientField[] = [
  { key: 'kcal', label: 'エネルギー', unit: 'kcal' },
  { key: 'protein', label: 'たんぱく質', unit: 'g' },
  { key: 'fat', label: '脂質', unit: 'g' },
  { key: 'carb', label: '炭水化物', unit: 'g' },
  { key: 'salt', label: '食塩相当量', unit: 'g' },
]

type NutrientTexts = Readonly<Record<keyof Nutrition, string>>

const EMPTY_TEXTS: NutrientTexts = {
  kcal: '',
  protein: '',
  fat: '',
  carb: '',
  fiber: '',
  salt: '',
}

function toNumber(text: string): number {
  const value = Number(text.trim())
  return Number.isFinite(value) && value >= 0 ? value : 0
}

/**
 * 成分表に無い食品を登録するシート。
 *
 * 市販品のパッケージは「1食(30g)当たり」のように書かれているため、
 * 基準の量を100g固定にせず、書いてある通りに入力できるようにする。
 */
export function CreateCustomFoodSheet({
  isOpen,
  initialName = '',
  onClose,
  onCreated,
}: CreateCustomFoodSheetProps) {
  const [name, setName] = useState(initialName)
  const [basisText, setBasisText] = useState('100')
  const [texts, setTexts] = useState<NutrientTexts>(EMPTY_TEXTS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useResetOnOpen(isOpen, () => {
    setName(initialName)
    setBasisText('100')
    setTexts(EMPTY_TEXTS)
    setErrorMessage(null)
  })

  const handleCreate = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const basisGrams = toNumber(basisText)
      const nutrition: Nutrition = {
        kcal: toNumber(texts.kcal),
        protein: toNumber(texts.protein),
        fat: toNumber(texts.fat),
        carb: toNumber(texts.carb),
        fiber: toNumber(texts.fiber),
        salt: toNumber(texts.salt),
      }

      const id = await createCustomFood({ name, basisGrams, nutrition })
      onCreated({
        id: `${CUSTOM_FOOD_ID_PREFIX}${id}`,
        name: name.trim(),
        group: 'マイ食品',
        basisGrams,
        nutrition,
        isCustom: true,
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
      title="マイ食品を作る"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleCreate}
          disabled={isSaving}
        >
          作成する
        </button>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="custom-food-name">
            食品名
          </label>
          <input
            id="custom-food-name"
            type="text"
            placeholder="例: ホエイプロテイン"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="custom-food-basis">
            栄養成分表示の基準量
          </label>
          <div className={styles.inlineField}>
            <input
              id="custom-food-basis"
              type="number"
              inputMode="decimal"
              min={1}
              value={basisText}
              onChange={(event) => setBasisText(event.target.value)}
            />
            <span className={styles.unit}>g</span>
          </div>
          <p className={styles.note}>
            パッケージの「1食（30g）当たり」なら 30 を入れて、その下に書かれた値をそのまま入力します。
          </p>
        </div>

        {NUTRIENT_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className={styles.field}>
            <label className={styles.label} htmlFor={`custom-food-${key}`}>
              {label}
            </label>
            <div className={styles.inlineField}>
              <input
                id={`custom-food-${key}`}
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={texts[key]}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [key]: event.target.value }))
                }
              />
              <span className={styles.unit}>{unit}</span>
            </div>
          </div>
        ))}

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}
      </div>
    </Sheet>
  )
}

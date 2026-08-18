import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlusIcon, TrashIcon } from '@/components/icons'
import {
  createMealTemplate,
  deleteMealTemplate,
  getMealTemplate,
  updateMealTemplate,
} from '@/data/repositories/mealTemplateRepository'
import type { Food } from '@/domain/food'
import { sumNutrition, type Nutrition } from '@/domain/nutrition'
import type { MealTemplateItem } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { CreateCustomFoodSheet } from './CreateCustomFoodSheet'
import { FoodPickerSheet } from './FoodPickerSheet'
import { MealEntrySheet } from './MealEntrySheet'
import styles from './MealTemplateEditorPage.module.css'

const DEFAULT_GRAMS = 100

/** 追加・編集で開いているシートの対象。 */
interface ItemTarget {
  readonly food: Food
  /** 既存の1品を編集しているなら、その位置。新規なら null。 */
  readonly index: number | null
}

export function MealTemplateEditorPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const isNew = templateId === 'new'

  const [name, setName] = useState('')
  const [items, setItems] = useState<readonly MealTemplateItem[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isMissing, setIsMissing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [itemTarget, setItemTarget] = useState<ItemTarget | null>(null)
  const [creatingName, setCreatingName] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || templateId === undefined) return

    let isActive = true
    void getMealTemplate(Number(templateId)).then((template) => {
      if (!isActive) return
      if (template === undefined) {
        setIsMissing(true)
      } else {
        setName(template.name)
        setItems(template.items)
      }
      setIsLoading(false)
    })

    return () => {
      isActive = false
    }
  }, [isNew, templateId])

  const total = sumNutrition(items.map((item) => item.nutrition))

  const submitItem = async (grams: number, nutrition: Nutrition) => {
    if (itemTarget === null) return

    const next: MealTemplateItem = {
      foodId: itemTarget.food.id,
      foodName: itemTarget.food.name,
      grams,
      nutrition,
    }

    setItems((current) =>
      itemTarget.index === null
        ? [...current, next]
        : current.map((item, index) => (index === itemTarget.index ? next : item)),
    )
  }

  const removeItem = async () => {
    if (itemTarget?.index === null || itemTarget === null) return
    setItems((current) => current.filter((_, index) => index !== itemTarget.index))
  }

  const handleSave = async () => {
    setErrorMessage(null)
    try {
      if (isNew) {
        await createMealTemplate({ name, items })
      } else if (templateId !== undefined) {
        await updateMealTemplate(Number(templateId), { name, items })
      }
      navigate('/meals/templates')
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError ? cause.message : '保存できませんでした',
      )
    }
  }

  const handleDelete = async () => {
    if (isNew || templateId === undefined) return
    if (!window.confirm('この献立を削除します。よろしいですか？')) return

    await deleteMealTemplate(Number(templateId))
    navigate('/meals/templates')
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="献立" showBack />
        <p className="empty-state">読み込み中…</p>
      </>
    )
  }

  if (isMissing) {
    return (
      <>
        <PageHeader title="献立" showBack />
        <p className="empty-state">この献立は見つかりませんでした。</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title={isNew ? '献立を作る' : '献立を編集'} showBack />

      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="meal-template-name">
            献立の名前
          </label>
          <input
            id="meal-template-name"
            type="text"
            placeholder="例: いつもの朝食"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>


        <div className={styles.items}>
          {items.map((item, index) => (
            <button
              key={`${item.foodId}-${index}`}
              type="button"
              className={styles.item}
              onClick={() =>
                setItemTarget({
                  food: {
                    id: item.foodId,
                    name: item.foodName,
                    group: '',
                    basisGrams: item.grams,
                    nutrition: item.nutrition,
                    isCustom: false,
                  },
                  index,
                })
              }
              aria-label={`${item.foodName}を編集`}
            >
              <span className={styles.itemName}>{item.foodName}</span>
              <span className={styles.itemMeta}>
                {item.grams} g · {item.nutrition.kcal} kcal
              </span>
            </button>
          ))}

          <button
            type="button"
            className={styles.addButton}
            onClick={() => setIsPickerOpen(true)}
          >
            <PlusIcon size={18} />
            食品を追加
          </button>
        </div>

        <div className={styles.total}>
          合計 {total.kcal} kcal · P{total.protein} F{total.fat} C{total.carb}
        </div>

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}

        <button type="button" className="btn btn-primary btn-block" onClick={handleSave}>
          保存する
        </button>

        {!isNew && (
          <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
            <TrashIcon size={18} />
            この献立を削除
          </button>
        )}
      </div>

      <FoodPickerSheet
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(food) => {
          setIsPickerOpen(false)
          setItemTarget({ food, index: null })
        }}
        onRequestCreate={(initialName) => setCreatingName(initialName)}
      />

      {itemTarget !== null && (
        <MealEntrySheet
          isOpen
          food={itemTarget.food}
          initialGrams={
            itemTarget.index === null
              ? DEFAULT_GRAMS
              : (items[itemTarget.index]?.grams ?? DEFAULT_GRAMS)
          }
          hasRememberedGrams={itemTarget.index !== null}
          isEditing={itemTarget.index !== null}
          onClose={() => setItemTarget(null)}
          onSubmit={submitItem}
          {...(itemTarget.index !== null ? { onDelete: removeItem } : {})}
        />
      )}

      <CreateCustomFoodSheet
        isOpen={creatingName !== null}
        initialName={creatingName ?? ''}
        onClose={() => setCreatingName(null)}
        onCreated={(food) => setItemTarget({ food, index: null })}
      />
    </>
  )
}

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon, CopyIcon, PlusIcon } from '@/components/icons'
import { getSettings } from '@/data/repositories/settingsRepository'
import {
  addMealEntry,
  deleteMealEntry,
  findLastGramsByFoodId,
  listMealEntriesByDate,
  updateMealEntry,
} from '@/data/repositories/mealRepository'
import { listMealTemplates } from '@/data/repositories/mealTemplateRepository'
import { listSetsByWorkout } from '@/data/repositories/setRepository'
import { getWorkoutByDate } from '@/data/repositories/workoutRepository'
import { useDailyEnergy } from '../today/useDailyEnergy'
import { addDaysToDateKey as shiftDate } from '@/domain/date'
import { addDaysToDateKey, isValidDateKey, formatDateLabel } from '@/domain/date'
import type { Food } from '@/domain/food'
import { sumNutrition, type Nutrition } from '@/domain/nutrition'
import { DEFAULT_NUTRITION_TARGET } from '@/domain/nutritionTarget'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  type MealEntry,
  type MealTemplate,
  type MealType,
} from '@/domain/types'
import { useTodayKey } from '@/hooks/useTodayKey'
import { CreateCustomFoodSheet } from './CreateCustomFoodSheet'
import { FoodPickerSheet } from './FoodPickerSheet'
import { MealEntrySheet } from './MealEntrySheet'
import { NutritionSummary } from './NutritionSummary'
import { useFoodCatalog } from './useFoodCatalog'
import styles from './MealsPage.module.css'

/** 記録の追加・編集で開いているシートの対象。 */
interface EntryTarget {
  /** シートを開くときに入れておく量（g）。 */
  readonly initialGrams: number
  /** その量が前回の記録から来ているか。既定値なら false。 */
  readonly hasRememberedGrams: boolean
  readonly mealType: MealType
  readonly food: Food
  readonly entry: MealEntry | null
}

/** 前に食べたことが無い食品の既定量。 */
const DEFAULT_GRAMS = 100

export function MealsPage() {
  const todayKey = useTodayKey()
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedDate = searchParams.get('date')
  const date =
    requestedDate !== null && isValidDateKey(requestedDate) && requestedDate <= todayKey
      ? requestedDate
      : todayKey

  /** 今日なら URL を汚さない。履歴から開いた日だけ ?date= を残す。 */
  const setDateKey = (next: string | null) => {
    if (next === null || next === todayKey) setSearchParams({}, { replace: true })
    else setSearchParams({ date: next }, { replace: true })
  }

  const settings = useLiveQuery(() => getSettings(), [])
  const entries = useLiveQuery(() => listMealEntriesByDate(date), [date])
  // 消費エネルギーの計算にその日のセットが要る
  const workoutSets = useLiveQuery(async () => {
    const workout = await getWorkoutByDate(date)
    return workout?.id === undefined ? [] : listSetsByWorkout(workout.id)
  }, [date])
  const { foods } = useFoodCatalog()

  const [pickerMealType, setPickerMealType] = useState<MealType | null>(null)
  const [entryTarget, setEntryTarget] = useState<EntryTarget | null>(null)
  const [creatingName, setCreatingName] = useState<string | null>(null)
  const [pendingMealType, setPendingMealType] = useState<MealType>('breakfast')

  const energy = useDailyEnergy(date, workoutSets ?? [])
  const templates = useLiveQuery(() => listMealTemplates(), [])
  const yesterday = shiftDate(date, -1)
  const yesterdayEntries = useLiveQuery(() => listMealEntriesByDate(yesterday), [yesterday])

  const entriesByType = useMemo(() => {
    const grouped = new Map<MealType, MealEntry[]>()
    for (const type of MEAL_TYPES) grouped.set(type, [])
    for (const entry of entries ?? []) grouped.get(entry.mealType)?.push(entry)
    return grouped
  }, [entries])

  const total = useMemo(
    () => sumNutrition((entries ?? []).map((entry) => entry.nutrition)),
    [entries],
  )

  const target = settings?.nutritionTarget ?? DEFAULT_NUTRITION_TARGET

  const openPicker = (mealType: MealType) => {
    setPendingMealType(mealType)
    setPickerMealType(mealType)
  }

  /**
   * 前に食べたことがあれば、その量から始める。
   * 毎朝20g飲むものを毎回100gから打ち直すのは手間になる。
   *
   * 量はシートを開く前に決める。開いたあとに届けても、
   * 入力欄は開いた時点の値で初期化されたあとで、反映されない。
   */
  const handleSelectFood = async (food: Food) => {
    setPickerMealType(null)
    const lastGrams = await findLastGramsByFoodId(food.id)
    setEntryTarget({
      mealType: pendingMealType,
      food,
      entry: null,
      initialGrams: lastGrams ?? DEFAULT_GRAMS,
      hasRememberedGrams: lastGrams !== null,
    })
  }

  /** 記録済みの1件を開く。元の食品が消えていても、記録した値で編集できるようにする。 */
  const openEntry = (entry: MealEntry) => {
    const food: Food = foods.find((item) => item.id === entry.foodId) ?? {
      id: entry.foodId,
      name: entry.foodName,
      group: '',
      basisGrams: entry.grams,
      nutrition: entry.nutrition,
      isCustom: false,
    }
    setEntryTarget({
      mealType: entry.mealType,
      food,
      entry,
      initialGrams: entry.grams,
      hasRememberedGrams: true,
    })
  }

  const submitEntry = async (grams: number, nutrition: Nutrition) => {
    if (entryTarget === null) return

    if (entryTarget.entry?.id !== undefined) {
      await updateMealEntry(entryTarget.entry.id, { grams, nutrition })
      return
    }

    await addMealEntry({
      date,
      mealType: entryTarget.mealType,
      foodId: entryTarget.food.id,
      foodName: entryTarget.food.name,
      grams,
      nutrition,
      recordedAt: new Date().toISOString(),
    })
  }

  const deleteEntry = async () => {
    if (entryTarget?.entry?.id === undefined) return
    await deleteMealEntry(entryTarget.entry.id)
  }

  /**
   * 献立をまとめて入れる。
   * 区分は献立ではなく、開いている場所（朝食・昼食…）で決まる。
   * 栄養価は献立に保存された値をそのまま使う。
   */
  const applyTemplate = async (template: MealTemplate, mealType: MealType) => {
    const recordedAt = new Date().toISOString()

    for (const item of template.items) {
      await addMealEntry({
        date,
        mealType,
        foodId: item.foodId,
        foodName: item.foodName,
        grams: item.grams,
        nutrition: item.nutrition,
        recordedAt,
      })
    }
  }

  /** 前の日と同じ内容にする。毎日ほぼ同じものを食べる日の入力を省く。 */
  const copyYesterday = async () => {
    const recordedAt = new Date().toISOString()

    for (const entry of yesterdayEntries ?? []) {
      await addMealEntry({
        date,
        mealType: entry.mealType,
        foodId: entry.foodId,
        foodName: entry.foodName,
        grams: entry.grams,
        nutrition: entry.nutrition,
        recordedAt,
      })
    }
  }

  const hasEntries = (entries ?? []).length > 0
  const canCopyYesterday = !hasEntries && (yesterdayEntries ?? []).length > 0

  return (
    <>
      <PageHeader title="食事" subtitle={formatDateLabel(date)} />

      <div className={styles.content}>
        <div className={styles.dateNav}>
          <button
            type="button"
            className={styles.dateButton}
            onClick={() => setDateKey(addDaysToDateKey(date, -1))}
            aria-label="前の日"
          >
            <span className={styles.chevronLeft}>
              <ChevronRightIcon size={18} />
            </span>
          </button>
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => setDateKey(null)}
            disabled={date === todayKey}
            aria-label={date === todayKey ? '今日' : '今日に戻る'}
          >
            {date === todayKey ? '今日' : formatDateLabel(date)}
          </button>
          <button
            type="button"
            className={styles.dateButton}
            onClick={() => setDateKey(addDaysToDateKey(date, 1))}
            disabled={date >= todayKey}
            aria-label="次の日"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        <NutritionSummary
          total={total}
          target={target}
          basalMetabolicRateKcal={energy.basalMetabolicRateKcal}
          activeKcal={energy.activeKcal}
        />

        {canCopyYesterday && (
          <button type="button" className="btn btn-block" onClick={copyYesterday}>
            <CopyIcon size={18} />
            前の日と同じにする
          </button>
        )}


        {MEAL_TYPES.map((mealType) => {
          const items = entriesByType.get(mealType) ?? []
          const sectionTotal = sumNutrition(items.map((entry) => entry.nutrition))

          return (
            <section key={mealType} className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{MEAL_TYPE_LABELS[mealType]}</h2>
                <span className={styles.sectionKcal}>{sectionTotal.kcal} kcal</span>
              </div>

              {items.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.entry}
                  onClick={() => openEntry(entry)}
                  aria-label={`${entry.foodName}の記録を編集`}
                >
                  <span className={styles.entryName}>{entry.foodName}</span>
                  <span className={styles.entryMeta}>
                    {entry.grams} g · {entry.nutrition.kcal} kcal
                  </span>
                </button>
              ))}

              <button
                type="button"
                className={styles.addButton}
                onClick={() => openPicker(mealType)}
              >
                <PlusIcon size={18} />
                {MEAL_TYPE_LABELS[mealType]}に追加
              </button>
            </section>
          )
        })}
      </div>

      <FoodPickerSheet
        isOpen={pickerMealType !== null}
        onClose={() => setPickerMealType(null)}
        onSelect={(food) => void handleSelectFood(food)}
        onRequestCreate={(initialName) => setCreatingName(initialName)}
        templates={templates ?? []}
        onSelectTemplate={(template) => {
          setPickerMealType(null)
          void applyTemplate(template, pendingMealType)
        }}
      />

      {entryTarget !== null && (
        <MealEntrySheet
          isOpen
          food={entryTarget.food}
          initialGrams={entryTarget.initialGrams}
          hasRememberedGrams={entryTarget.hasRememberedGrams}
          isEditing={entryTarget.entry !== null}
          onClose={() => setEntryTarget(null)}
          onSubmit={submitEntry}
          {...(entryTarget.entry !== null ? { onDelete: deleteEntry } : {})}
        />
      )}

      <CreateCustomFoodSheet
        isOpen={creatingName !== null}
        initialName={creatingName ?? ''}
        onClose={() => setCreatingName(null)}
        onCreated={(food) =>
          setEntryTarget({
            mealType: pendingMealType,
            food,
            entry: null,
            initialGrams: DEFAULT_GRAMS,
            hasRememberedGrams: false,
          })
        }
      />
    </>
  )
}

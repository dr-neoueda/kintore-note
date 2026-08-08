import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/Sheet'
import { PlusIcon } from '@/components/icons'
import { listFrequentFoods } from '@/data/repositories/mealRepository'
import { searchFoods, type Food } from '@/domain/food'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import { useFoodCatalog } from './useFoodCatalog'
import styles from './FoodPickerSheet.module.css'

interface FoodPickerSheetProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSelect: (food: Food) => void
  readonly onRequestCreate: (initialName: string) => void
}

/** よく食べるものは毎回検索させない。 */
const FREQUENT_FOOD_LIMIT = 8

export function FoodPickerSheet({
  isOpen,
  onClose,
  onSelect,
  onRequestCreate,
}: FoodPickerSheetProps) {
  const [keyword, setKeyword] = useState('')
  const { foods, isLoading } = useFoodCatalog()

  useResetOnOpen(isOpen, () => setKeyword(''))

  const frequent = useLiveQuery(() => listFrequentFoods(FREQUENT_FOOD_LIMIT), [])

  const results = useMemo(() => searchFoods(foods, keyword), [foods, keyword])

  const frequentFoods = useMemo(() => {
    if (frequent === undefined) return []
    const byId = new Map(foods.map((food) => [food.id, food]))
    return frequent
      .map((entry) => byId.get(entry.foodId))
      .filter((food): food is Food => food !== undefined)
  }, [frequent, foods])

  const handleSelect = (food: Food) => {
    setKeyword('')
    onSelect(food)
  }

  const handleRequestCreate = () => {
    const initialName = keyword.trim()
    setKeyword('')
    onClose()
    onRequestCreate(initialName)
  }

  const hasKeyword = keyword.trim() !== ''

  return (
    <Sheet isOpen={isOpen} title="食品を選ぶ" onClose={onClose}>
      <div className={styles.search}>
        <label className="visually-hidden" htmlFor="food-search">
          食品名で探す
        </label>
        <input
          id="food-search"
          type="search"
          placeholder="例: 鶏むね、白米、納豆"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      {!hasKeyword && frequentFoods.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>よく食べるもの</h3>
          {frequentFoods.map((food) => (
            <FoodRow key={food.id} food={food} onSelect={handleSelect} />
          ))}
        </section>
      )}

      {hasKeyword && (
        <section className={styles.section}>
          {results.length === 0 ? (
            <div className={styles.emptyState}>
              <p className="text-sm text-dim">
                {isLoading ? '食品を読み込んでいます…' : '該当する食品がありません'}
              </p>
              {!isLoading && (
                <button type="button" className="btn btn-primary" onClick={handleRequestCreate}>
                  <PlusIcon size={18} />
                  「{keyword.trim()}」を作る
                </button>
              )}
            </div>
          ) : (
            results.map((food) => (
              <FoodRow key={food.id} food={food} onSelect={handleSelect} />
            ))
          )}
        </section>
      )}

      {!hasKeyword && (
        <p className={styles.hint}>
          食品名を入力して探します。成分表に無い市販品やプロテインは、マイ食品として登録できます。
        </p>
      )}

      <button type="button" className="btn btn-block" onClick={handleRequestCreate}>
        <PlusIcon size={18} />
        マイ食品を作る
      </button>

      <p className={styles.source}>
        栄養価は「日本食品標準成分表（八訂）増補2023年」（文部科学省）から引用
      </p>
    </Sheet>
  )
}

interface FoodRowProps {
  readonly food: Food
  readonly onSelect: (food: Food) => void
}

function FoodRow({ food, onSelect }: FoodRowProps) {
  return (
    <button type="button" className={styles.item} onClick={() => onSelect(food)}>
      <span className={styles.itemName}>{food.name}</span>
      <span className={styles.itemMeta}>
        {food.isCustom && <span className={styles.customBadge}>マイ食品</span>}
        {food.nutrition.kcal} kcal / {food.basisGrams}g
      </span>
    </button>
  )
}

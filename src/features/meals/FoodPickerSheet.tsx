import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/Sheet'
import { PlusIcon } from '@/components/icons'
import {
  PACKAGED_BASIS_GRAMS,
  formatPackagedFoodName,
  searchPackagedFoods,
  type PackagedFood,
} from '@/data/openFoodFacts'
import { findOrCreateCustomFood, toFood } from '@/data/repositories/customFoodRepository'
import { DISH_GROUP } from '@/data/dishes'
import { STORE_FOOD_GROUP } from '@/data/storeFoods'
import { listFrequentFoods } from '@/data/repositories/mealRepository'
import { searchCommonFoods, type CommonFood } from '@/domain/commonFoods'
import {
  extractCookingState,
  formatFoodName,
  groupFoods,
  searchFoods,
  type Food,
  type FoodGroup,
} from '@/domain/food'
import { sumNutrition } from '@/domain/nutrition'
import type { MealTemplate } from '@/domain/types'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import { useFoodCatalog } from './useFoodCatalog'
import styles from './FoodPickerSheet.module.css'

interface FoodPickerSheetProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSelect: (food: Food) => void
  readonly onRequestCreate: (initialName: string) => void
  /**
   * まとめて入れられる献立。
   * 献立そのものを編集している画面では渡さない（献立の中に献立は入れられない）。
   */
  readonly templates?: readonly MealTemplate[]
  readonly onSelectTemplate?: (template: MealTemplate) => void
}

/** よく食べるものは毎回検索させない。 */
const FREQUENT_FOOD_LIMIT = 8

type PackagedState = 'idle' | 'searching' | 'done' | 'empty'

export function FoodPickerSheet({
  isOpen,
  onClose,
  onSelect,
  onRequestCreate,
  templates = [],
  onSelectTemplate,
}: FoodPickerSheetProps) {
  const [keyword, setKeyword] = useState('')
  const [packagedFoods, setPackagedFoods] = useState<readonly PackagedFood[]>([])
  const [packagedState, setPackagedState] = useState<PackagedState>('idle')
  /** 調理違いを開いている食品。まとめたままだと選べない場合に開く。 */
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set())
  const { foods, isLoading } = useFoodCatalog()

  useResetOnOpen(isOpen, () => {
    setKeyword('')
    setPackagedFoods([])
    setPackagedState('idle')
    setExpandedGroups(new Set())
  })

  const frequent = useLiveQuery(() => listFrequentFoods(FREQUENT_FOOD_LIMIT), [])

  const results = useMemo(() => searchFoods(foods, keyword), [foods, keyword])

  /**
   * 日常語で引ける「まずこれ」。
   * 成分表は同じ食品に多くの版があり、名前だけでは選びづらいため先頭に出す。
   */
  const suggestedFoods = useMemo(() => {
    const byId = new Map(foods.map((food) => [food.id, food]))
    return searchCommonFoods(keyword)
      .map((common) => ({ common, food: byId.get(common.id) }))
      .filter(
        (entry): entry is { common: CommonFood; food: Food } => entry.food !== undefined,
      )
  }, [foods, keyword])

  const suggestedIds = useMemo(
    () => new Set(suggestedFoods.map((entry) => entry.common.id)),
    [suggestedFoods],
  )

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

  /**
   * 市販品を探す。
   * 自動では行わない。通信は利用者の操作を起点にした方が、
   * 圏外での挙動も問い合わせ回数も読みやすい。
   */
  const searchPackaged = async () => {
    setPackagedState('searching')
    const results = await searchPackagedFoods(keyword)
    setPackagedFoods(results)
    setPackagedState(results.length === 0 ? 'empty' : 'done')
  }

  /** 選んだ市販品はマイ食品として残す。次からはオフラインでも選べる。 */
  const handleSelectPackaged = async (packaged: PackagedFood) => {
    const custom = await findOrCreateCustomFood({
      name: formatPackagedFoodName(packaged),
      basisGrams: PACKAGED_BASIS_GRAMS,
      nutrition: packaged.nutrition,
    })

    setKeyword('')
    onSelect(toFood(custom))
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
          onChange={(event) => {
            setKeyword(event.target.value)
            setPackagedFoods([])
            setPackagedState('idle')
            setExpandedGroups(new Set())
          }}
        />
      </div>

      {!hasKeyword && onSelectTemplate !== undefined && templates.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>献立からまとめて入れる</h3>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={styles.item}
              onClick={() => {
                setKeyword('')
                onSelectTemplate(template)
              }}
            >
              <span className={styles.itemName}>{template.name}</span>
              <span className={styles.itemMeta}>
                {sumNutrition(template.items.map((item) => item.nutrition)).kcal} kcal ·{' '}
                {template.items.length} 品
              </span>
            </button>
          ))}
        </section>
      )}

      {!hasKeyword && frequentFoods.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>よく食べるもの</h3>
          {frequentFoods.map((food) => (
            <FoodRow key={food.id} food={food} onSelect={handleSelect} />
          ))}
        </section>
      )}

      {hasKeyword && suggestedFoods.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>よく使うもの</h3>
          {suggestedFoods.map(({ common, food }) => (
            <button
              key={common.id}
              type="button"
              className={`${styles.item} ${styles.suggested}`}
              aria-label={`${common.label}を選ぶ`}
              onClick={() =>
                // 分かりやすい名前のまま記録する。一覧でも読み取りやすくなる
                handleSelect({ ...food, name: common.label, portions: common.portions })
              }
            >
              <span className={styles.itemName}>{common.label}</span>
              <span className={styles.itemMeta}>
                {food.nutrition.kcal} kcal / 100g ·{' '}
                {common.portions.map((portion) => portion.label).join('・')}
              </span>
            </button>
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
            <>
              {suggestedFoods.length > 0 && (
                <h3 className={styles.sectionTitle}>成分表のすべての候補</h3>
              )}
              <p className={styles.stateHint}>
                「生」と「ゆで」「めし」ではエネルギーが倍近く違います。食べた状態を選んでください。
              </p>
              {groupFoods(results.filter((food) => !suggestedIds.has(food.id))).map(
                (group) => (
                  <FoodGroupRows
                    key={group.key}
                    group={group}
                    isExpanded={expandedGroups.has(group.key)}
                    onToggle={() =>
                      setExpandedGroups((current) => {
                        const next = new Set(current)
                        if (next.has(group.key)) next.delete(group.key)
                        else next.add(group.key)
                        return next
                      })
                    }
                    onSelect={handleSelect}
                  />
                ),
              )}
            </>
          )}

          {packagedFoods.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>市販品</h3>
              {packagedFoods.map((packaged) => (
                <button
                  key={packaged.code}
                  type="button"
                  className={styles.item}
                  onClick={() => void handleSelectPackaged(packaged)}
                >
                  <span className={styles.itemName}>
                    {formatPackagedFoodName(packaged)}
                  </span>
                  <span className={styles.itemMeta}>
                    {packaged.nutrition.kcal} kcal / 100g
                  </span>
                </button>
              ))}
              <p className={styles.source}>
                市販品は Open Food Facts（有志が登録している開かれたデータベース）から。
                値が違っていることもあるので、取り込んだあとマイ食品として直せます。
              </p>
            </>
          )}

          {packagedState !== 'done' && (
            <button
              type="button"
              className="btn btn-block"
              onClick={() => void searchPackaged()}
              disabled={packagedState === 'searching'}
            >
              {packagedState === 'searching'
                ? '市販品を探しています…'
                : packagedState === 'empty'
                  ? '見つかりませんでした（もう一度探す）'
                  : '市販品も探す（インターネット）'}
            </button>
          )}
        </section>
      )}

      {!hasKeyword && (
        <p className={styles.hint}>
          食品名を入力して探します。「{STORE_FOOD_GROUP}」と入力すると、その店の商品だけが並びます。
          成分表にも店の一覧にも無いものは、マイ食品として登録できます。
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

interface FoodGroupRowsProps {
  readonly group: FoodGroup
  readonly isExpanded: boolean
  readonly onToggle: () => void
  readonly onSelect: (food: Food) => void
}

/**
 * 同じ食品の調理違いをまとめて出す。
 * ブロッコリーのように 生・ゆで・焼き・油いため と5件並ぶと選べないため、
 * まず素材そのものを出し、残りは開いたときだけ見せる。
 */
function FoodGroupRows({ group, isExpanded, onToggle, onSelect }: FoodGroupRowsProps) {
  const variantStates = group.variants
    .map((food) => extractCookingState(food.name))
    .filter((state): state is string => state !== null)

  return (
    <>
      <FoodRow food={group.representative} onSelect={onSelect} />

      {group.variants.length > 0 && (
        <button type="button" className={styles.variantToggle} onClick={onToggle}>
          {isExpanded
            ? '調理違いを閉じる'
            : `調理違い ${group.variants.length}件${
                variantStates.length === 0 ? '' : `（${variantStates.join('・')}）`
              }`}
        </button>
      )}

      {isExpanded &&
        group.variants.map((food) => (
          <div key={food.id} className={styles.variantRow}>
            <FoodRow food={food} onSelect={onSelect} />
          </div>
        ))}
    </>
  )
}

interface FoodRowProps {
  readonly food: Food
  readonly onSelect: (food: Food) => void
}

function FoodRow({ food, onSelect }: FoodRowProps) {
  const isStoreFood = food.group === STORE_FOOD_GROUP
  const isDish = food.group === DISH_GROUP
  const state =
    food.isCustom || isStoreFood || isDish ? null : extractCookingState(food.name)

  return (
    <button type="button" className={styles.item} onClick={() => onSelect(food)}>
      <span className={styles.itemName}>
        {food.isCustom ? food.name : formatFoodName(food.name)}
      </span>
      <span className={styles.itemMeta}>
        {food.isCustom && <span className={styles.customBadge}>マイ食品</span>}
        {isStoreFood && <span className={styles.customBadge}>{STORE_FOOD_GROUP}</span>}
        {isDish && <span className={styles.customBadge}>目安</span>}
        {state !== null && <span className={styles.stateBadge}>{state}</span>}
        {food.nutrition.kcal} kcal / {food.basisGrams}g
      </span>
    </button>
  )
}

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveCustomFoods, toFood } from '@/data/repositories/customFoodRepository'
import { loadCompositionFoods } from '@/data/foods'
import type { Food } from '@/domain/food'

const EMPTY_FOODS: readonly Food[] = []

interface FoodCatalog {
  /** 成分表とマイ食品を合わせた全食品。 */
  readonly foods: readonly Food[]
  /** マイ食品だけ。一覧の先頭に出すために分けて持つ。 */
  readonly customFoods: readonly Food[]
  readonly isLoading: boolean
}

/**
 * 検索対象になる食品をまとめて返す。
 *
 * 成分表は400KB超あるため、この hook を使う画面（＝食品を探す時）で初めて読み込む。
 * マイ食品は IndexedDB にあるので、追加した瞬間に一覧へ反映される。
 */
export function useFoodCatalog(): FoodCatalog {
  const [compositionFoods, setCompositionFoods] = useState<readonly Food[]>(EMPTY_FOODS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    loadCompositionFoods()
      .then((loaded) => {
        if (!isActive) return
        setCompositionFoods(loaded)
      })
      .catch(() => {
        // 成分表を読めなくても、マイ食品だけで記録は続けられる
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const customFoods = useLiveQuery(async () => (await listActiveCustomFoods()).map(toFood), [])

  return {
    foods: [...(customFoods ?? EMPTY_FOODS), ...compositionFoods],
    customFoods: customFoods ?? EMPTY_FOODS,
    isLoading: isLoading || customFoods === undefined,
  }
}

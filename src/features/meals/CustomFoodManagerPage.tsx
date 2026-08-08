import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/PageHeader'
import { PlusIcon } from '@/components/icons'
import {
  listAllCustomFoods,
  setCustomFoodArchived,
} from '@/data/repositories/customFoodRepository'
import { CreateCustomFoodSheet } from './CreateCustomFoodSheet'
import styles from './CustomFoodManagerPage.module.css'

export function CustomFoodManagerPage() {
  const foods = useLiveQuery(() => listAllCustomFoods(), [])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <>
      <PageHeader title="マイ食品" showBack />

      <div className={styles.content}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setIsCreateOpen(true)}
        >
          <PlusIcon size={20} />
          マイ食品を作る
        </button>

        {foods !== undefined && foods.length === 0 && (
          <p className="empty-state">
            まだありません。成分表に無い市販品やプロテインを登録できます。
          </p>
        )}

        {(foods ?? []).map((food) => (
          <div
            key={food.id}
            className={food.isArchived ? `${styles.item} ${styles.archived}` : styles.item}
          >
            <div className={styles.main}>
              <div className={styles.name}>{food.name}</div>
              <div className={styles.meta}>
                {food.basisGrams}g あたり {food.nutrition.kcal} kcal / P{food.nutrition.protein}{' '}
                F{food.nutrition.fat} C{food.nutrition.carb}
              </div>
            </div>
            <button
              type="button"
              className={styles.toggle}
              aria-label={`${food.name}を${food.isArchived ? '一覧に戻す' : '一覧から隠す'}`}
              onClick={() =>
                food.id !== undefined && void setCustomFoodArchived(food.id, !food.isArchived)
              }
            >
              {food.isArchived ? '戻す' : '隠す'}
            </button>
          </div>
        ))}

        <p className="text-sm text-dim">
          過去の記録は登録した時点の栄養価を持っているため、ここで隠しても記録は変わりません。
        </p>
      </div>

      <CreateCustomFoodSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => setIsCreateOpen(false)}
      />
    </>
  )
}

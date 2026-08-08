import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon, PlusIcon } from '@/components/icons'
import { listMealTemplates } from '@/data/repositories/mealTemplateRepository'
import { sumNutrition } from '@/domain/nutrition'
import { MEAL_TYPE_LABELS } from '@/domain/types'
import styles from './MealTemplatesPage.module.css'

export function MealTemplatesPage() {
  const templates = useLiveQuery(() => listMealTemplates(), [])

  return (
    <>
      <PageHeader title="献立" subtitle="いつもの組み合わせを登録できます" />

      <div className={styles.content}>
        {templates === undefined && <p className="empty-state">読み込み中…</p>}

        {templates !== undefined && templates.length === 0 && (
          <p className="empty-state">
            「いつもの朝食」のような組み合わせを登録すると、
            <br />
            「今日」タブからまとめて記録できます。
          </p>
        )}

        {templates?.map((template) => {
          const total = sumNutrition(template.items.map((item) => item.nutrition))
          const names = template.items.map((item) => item.foodName).join('、')

          return (
            <Link
              key={template.id}
              to={`/meals/templates/${template.id}`}
              className={styles.item}
            >
              <div className={styles.main}>
                <div className={styles.name}>
                  {template.name}
                  <span className={styles.mealType}>{MEAL_TYPE_LABELS[template.mealType]}</span>
                </div>
                <div className={styles.detail}>{names === '' ? '食品が未登録' : names}</div>
                <div className={styles.total}>
                  {total.kcal} kcal · P{total.protein} F{total.fat} C{total.carb}
                </div>
              </div>
              <span className={styles.chevron}>
                <ChevronRightIcon size={18} />
              </span>
            </Link>
          )
        })}

        <Link
          to="/meals/templates/new"
          className={`btn btn-primary btn-block ${styles.createButton}`}
        >
          <PlusIcon size={20} />
          献立を作る
        </Link>
      </div>
    </>
  )
}

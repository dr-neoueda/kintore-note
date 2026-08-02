import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon, PlusIcon } from '@/components/icons'
import { listTemplates } from '@/data/repositories/templateRepository'
import { useExercises } from '@/hooks/useExercises'
import styles from './TemplatesPage.module.css'

export function TemplatesPage() {
  const templates = useLiveQuery(() => listTemplates(), [])
  const { exerciseById } = useExercises()

  return (
    <>
      <PageHeader title="メニュー" subtitle="よく行う組み合わせを登録できます" />

      <div className={styles.content}>
        {templates === undefined && <p className="empty-state">読み込み中…</p>}

        {templates !== undefined && templates.length === 0 && (
          <p className="empty-state">
            「胸の日」「背中の日」のようなメニューを登録すると、
            <br />
            「ホーム」タブからまとめて呼び出せます。
          </p>
        )}

        {templates?.map((template) => {
          const exerciseNames = template.items
            .map((item) => exerciseById.get(item.exerciseId)?.name)
            .filter((name): name is string => name !== undefined)
            .join('、')

          return (
            <Link key={template.id} to={`/templates/${template.id}`} className={styles.item}>
              <div className={styles.main}>
                <div className={styles.name}>{template.name}</div>
                <div className={styles.detail}>
                  {exerciseNames === '' ? '種目が未登録' : exerciseNames}
                </div>
              </div>
              <span className={styles.chevron}>
                <ChevronRightIcon size={18} />
              </span>
            </Link>
          )
        })}

        <Link to="/templates/new" className={`btn btn-primary btn-block ${styles.createButton}`}>
          <PlusIcon size={20} />
          メニューを作る
        </Link>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { getSettings } from '@/data/repositories/settingsRepository'
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from '@/data/repositories/templateRepository'
import { formatTemplateTarget } from '@/domain/templateFormat'
import type { ExerciseId, TemplateItem } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { useExercises } from '@/hooks/useExercises'
import { CreateExerciseSheet } from '../exercises/CreateExerciseSheet'
import { ExercisePickerSheet } from '../workout/ExercisePickerSheet'
import { TemplateItemSheet } from './TemplateItemSheet'
import styles from './TemplateEditorPage.module.css'

const NEW_TEMPLATE_PARAM = 'new'
const DEFAULT_TARGET_SETS = 3
const DEFAULT_TARGET_REPS = 10

function createDefaultItem(exerciseId: ExerciseId): TemplateItem {
  return {
    exerciseId,
    targetSets: DEFAULT_TARGET_SETS,
    targetReps: DEFAULT_TARGET_REPS,
    targetWeightKg: null,
  }
}

export function TemplateEditorPage() {
  const { templateId = NEW_TEMPLATE_PARAM } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { activeExercises, exerciseById } = useExercises()
  const settings = useLiveQuery(() => getSettings(), [])

  const isNew = templateId === NEW_TEMPLATE_PARAM
  const numericId = Number(templateId)

  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<readonly TemplateItem[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [creatingName, setCreatingName] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMissing, setIsMissing] = useState(false)

  useEffect(() => {
    if (isNew) {
      setIsLoaded(true)
      return undefined
    }

    let isCancelled = false
    void getTemplate(numericId).then((template) => {
      if (isCancelled) return

      // 見つからない場合も読み込みを終える。放置すると「読み込み中」から進まなくなる
      if (template === undefined) {
        setIsMissing(true)
        setIsLoaded(true)
        return
      }

      setName(template.name)
      setNote(template.note)
      setItems(template.items)
      setIsLoaded(true)
    })

    return () => {
      isCancelled = true
    }
  }, [isNew, numericId])

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  /** 種目を選んだらそのまま目標値の設定に進む。 */
  const addItem = (exerciseId: ExerciseId) => {
    // 更新関数の中で他の state を触らないよう、追加位置を先に決めておく
    const appendedIndex = items.length
    setItems((current) => [...current, createDefaultItem(exerciseId)])
    setEditingIndex(appendedIndex)
  }

  const applyEditedItem = (edited: TemplateItem) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === editingIndex ? edited : item)),
    )
  }

  const handleSave = async () => {
    setErrorMessage(null)
    try {
      if (isNew) {
        await createTemplate({ name, note, items })
      } else {
        await updateTemplate(numericId, { name, note, items })
      }
      navigate('/templates', { replace: true })
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError ? cause.message : 'メニューを保存できませんでした',
      )
    }
  }

  const handleDelete = async () => {
    const isConfirmed = window.confirm(`「${name}」を削除します。よろしいですか？`)
    if (!isConfirmed) return

    await deleteTemplate(numericId)
    navigate('/templates', { replace: true })
  }

  if (!isLoaded) {
    return (
      <>
        <PageHeader title="メニュー" showBack />
        <p className="empty-state">読み込み中…</p>
      </>
    )
  }

  if (isMissing) {
    return (
      <>
        <PageHeader title="メニュー" showBack />
        <p className="empty-state">このメニューは見つかりませんでした。</p>
      </>
    )
  }

  const editingItem = editingIndex === null ? undefined : items[editingIndex]
  const editingExercise =
    editingItem === undefined ? undefined : exerciseById.get(editingItem.exerciseId)

  return (
    <>
      <PageHeader title={isNew ? 'メニューを作る' : 'メニューを編集'} showBack />

      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="template-name">
            メニュー名
          </label>
          <input
            id="template-name"
            type="text"
            placeholder="例: 胸の日"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="template-note">
            メモ（任意）
          </label>
          <input
            id="template-note"
            type="text"
            placeholder="例: インクライン中心"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <div>
          <span className={styles.label}>種目</span>

          <div className={styles.itemList}>
            {items.length === 0 && <p className="empty-state">種目を追加してください。</p>}

            {items.map((item, index) => (
              <div key={`${item.exerciseId}-${index}`} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemMain}
                  onClick={() => setEditingIndex(index)}
                >
                  <div className={styles.itemName}>
                    {exerciseById.get(item.exerciseId)?.name ?? '削除された種目'}
                  </div>
                  <div className={styles.itemTarget}>{formatTemplateTarget(item)}</div>
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => removeItem(index)}
                  aria-label="この種目を外す"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-block"
            onClick={() => setIsPickerOpen(true)}
          >
            <PlusIcon size={18} />
            種目を追加
          </button>
        </div>

        {errorMessage !== null && <p className={styles.error}>{errorMessage}</p>}

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-block" onClick={handleSave}>
            保存する
          </button>
          {!isNew && (
            <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
              このメニューを削除
            </button>
          )}
        </div>
      </div>

      <ExercisePickerSheet
        isOpen={isPickerOpen}
        exercises={activeExercises}
        addedExerciseIds={items.map((item) => item.exerciseId)}
        onClose={() => setIsPickerOpen(false)}
        onSelect={addItem}
        onRequestCreate={(initialName) => setCreatingName(initialName)}
      />

      <CreateExerciseSheet
        isOpen={creatingName !== null}
        initialName={creatingName ?? ''}
        onClose={() => setCreatingName(null)}
        onCreated={addItem}
      />

      {editingItem !== undefined && editingExercise !== undefined && (
        <TemplateItemSheet
          key={editingIndex}
          isOpen
          exercise={editingExercise}
          initialItem={editingItem}
          dumbbellStepsKg={settings?.dumbbellStepsKg ?? []}
          onClose={() => setEditingIndex(null)}
          onSubmit={applyEditedItem}
        />
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlusIcon, TrashIcon } from '@/components/icons'
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from '@/data/repositories/templateRepository'
import type { ExerciseId, TemplateItem } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { useExercises } from '@/hooks/useExercises'
import { ExercisePickerSheet } from '../today/ExercisePickerSheet'
import styles from './TemplateEditorPage.module.css'

const NEW_TEMPLATE_PARAM = 'new'
const DEFAULT_TARGET_SETS = 3
const DEFAULT_TARGET_REPS = 10

/** 入力途中の空文字を許すため、フォーム上の目標値は文字列で保持する。 */
interface EditableItem {
  readonly exerciseId: ExerciseId
  readonly targetSets: string
  readonly targetReps: string
  readonly targetWeightKg: string
}

function toEditableItem(item: TemplateItem): EditableItem {
  return {
    exerciseId: item.exerciseId,
    targetSets: String(item.targetSets),
    targetReps: String(item.targetReps),
    targetWeightKg: item.targetWeightKg === null ? '' : String(item.targetWeightKg),
  }
}

function toTemplateItem(item: EditableItem): TemplateItem {
  const weight = Number(item.targetWeightKg)
  return {
    exerciseId: item.exerciseId,
    targetSets: Number(item.targetSets) || DEFAULT_TARGET_SETS,
    targetReps: Number(item.targetReps) || DEFAULT_TARGET_REPS,
    targetWeightKg:
      item.targetWeightKg.trim() === '' || !Number.isFinite(weight) || weight <= 0
        ? null
        : weight,
  }
}

export function TemplateEditorPage() {
  const { templateId = NEW_TEMPLATE_PARAM } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { activeExercises, exerciseById } = useExercises()

  const isNew = templateId === NEW_TEMPLATE_PARAM
  const numericId = Number(templateId)

  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<readonly EditableItem[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isNew) {
      setIsLoaded(true)
      return
    }

    let isCancelled = false
    void getTemplate(numericId).then((template) => {
      if (isCancelled || template === undefined) return
      setName(template.name)
      setNote(template.note)
      setItems(template.items.map(toEditableItem))
      setIsLoaded(true)
    })

    return () => {
      isCancelled = true
    }
  }, [isNew, numericId])

  const updateItem = (index: number, patch: Partial<EditableItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const addItem = (exerciseId: ExerciseId) => {
    setItems((current) => [
      ...current,
      {
        exerciseId,
        targetSets: String(DEFAULT_TARGET_SETS),
        targetReps: String(DEFAULT_TARGET_REPS),
        targetWeightKg: '',
      },
    ])
  }

  const handleSave = async () => {
    setErrorMessage(null)
    const payload = {
      name,
      note,
      items: items.map(toTemplateItem),
    }

    try {
      if (isNew) {
        await createTemplate(payload)
      } else {
        await updateTemplate(numericId, payload)
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
          <div style={{ marginTop: 'var(--space-2)' }}>
            {items.length === 0 && <p className="empty-state">種目を追加してください。</p>}

            {items.map((item, index) => (
              <div key={`${item.exerciseId}-${index}`} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemName}>
                    {exerciseById.get(item.exerciseId)?.name ?? '削除された種目'}
                  </span>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => removeItem(index)}
                    aria-label="この種目を外す"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>

                <div className={styles.targets}>
                  <div className={styles.targetField}>
                    <span className={styles.targetLabel}>セット数</span>
                    <input
                      className={styles.targetInput}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={item.targetSets}
                      onChange={(event) =>
                        updateItem(index, { targetSets: event.target.value })
                      }
                      aria-label="目標セット数"
                    />
                  </div>
                  <div className={styles.targetField}>
                    <span className={styles.targetLabel}>回数</span>
                    <input
                      className={styles.targetInput}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={item.targetReps}
                      onChange={(event) =>
                        updateItem(index, { targetReps: event.target.value })
                      }
                      aria-label="目標回数"
                    />
                  </div>
                  <div className={styles.targetField}>
                    <span className={styles.targetLabel}>重量kg</span>
                    <input
                      className={styles.targetInput}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      placeholder="—"
                      value={item.targetWeightKg}
                      onChange={(event) =>
                        updateItem(index, { targetWeightKg: event.target.value })
                      }
                      aria-label="目標重量"
                    />
                  </div>
                </div>
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
      />
    </>
  )
}

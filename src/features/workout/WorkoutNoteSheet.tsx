import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'

interface WorkoutNoteValues {
  readonly note: string
  readonly bodyWeightKg: number | null
}

interface WorkoutNoteSheetProps {
  readonly isOpen: boolean
  readonly initialValues: WorkoutNoteValues
  readonly onClose: () => void
  readonly onSubmit: (values: WorkoutNoteValues) => Promise<void>
}

/** 体重とその日のメモを記録するシート。 */
export function WorkoutNoteSheet({
  isOpen,
  initialValues,
  onClose,
  onSubmit,
}: WorkoutNoteSheetProps) {
  const [note, setNote] = useState(initialValues.note)
  const [bodyWeightText, setBodyWeightText] = useState(
    initialValues.bodyWeightKg === null ? '' : String(initialValues.bodyWeightKg),
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setNote(initialValues.note)
    setBodyWeightText(
      initialValues.bodyWeightKg === null ? '' : String(initialValues.bodyWeightKg),
    )
    setErrorMessage(null)
  }, [isOpen, initialValues])

  const handleSubmit = async () => {
    const trimmed = bodyWeightText.trim()
    let bodyWeightKg: number | null = null

    if (trimmed !== '') {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setErrorMessage('体重は正の数値で入力してください')
        return
      }
      bodyWeightKg = parsed
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSubmit({ note: note.trim(), bodyWeightKg })
      onClose()
    } catch {
      setErrorMessage('保存できませんでした')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      title="体重とメモ"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          保存する
        </button>
      }
    >
      <div className="stack">
        <div>
          <label className="text-sm text-dim" htmlFor="body-weight">
            体重（kg）
          </label>
          <input
            id="body-weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="例: 68.4"
            value={bodyWeightText}
            onChange={(event) => setBodyWeightText(event.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-dim" htmlFor="workout-note">
            メモ
          </label>
          <textarea
            id="workout-note"
            rows={4}
            placeholder="フォームの気づき、体調など"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}
      </div>
    </Sheet>
  )
}

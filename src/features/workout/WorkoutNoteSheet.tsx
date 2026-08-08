import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'

interface WorkoutNoteValues {
  readonly note: string
}

interface WorkoutNoteSheetProps {
  readonly isOpen: boolean
  readonly initialValues: WorkoutNoteValues
  readonly onClose: () => void
  readonly onSubmit: (values: WorkoutNoteValues) => Promise<void>
}

/** その日のメモを記録するシート。体重や体脂肪率は体組成の記録として別に持つ。 */
export function WorkoutNoteSheet({
  isOpen,
  initialValues,
  onClose,
  onSubmit,
}: WorkoutNoteSheetProps) {
  const [note, setNote] = useState(initialValues.note)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useResetOnOpen(isOpen, () => {
    setNote(initialValues.note)
    setErrorMessage(null)
  })

  const handleSubmit = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSubmit({ note: note.trim() })
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
      title="メモ"
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

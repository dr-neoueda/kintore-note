import {
  clearBackupTarget,
  getBackupTarget,
  saveBackupTarget,
  type BackupFileHandle,
} from '@/data/repositories/backupTargetRepository'
import { downloadTextFile } from './downloadFile'

/**
 * バックアップの書き出し方。
 *
 * 「一度選んだ場所へ、以後はボタン1回で保存」は File System Access API が要る。
 * これに対応しているのは主に PC の Chrome / Edge で、
 * Safari（iPhone を含む）は保存先を選ぶ API 自体を持っていない。
 *
 * そこで対応状況に応じて3段階に落とす。
 * - remembered: 保存先を覚えて、以後はボタン1回で上書き
 * - share:      共有シートを直接開く（保存先の選択は1回で済む）
 * - download:   通常のダウンロード
 */
export type BackupExportMode = 'remembered' | 'share' | 'download'

const MIME_TYPE = 'application/json'

interface SaveFilePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<BackupFileHandle>
}

function getSaveFilePicker(): SaveFilePickerWindow['showSaveFilePicker'] {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as SaveFilePickerWindow).showSaveFilePicker
}

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return false

  try {
    const probe = new File(['{}'], 'probe.json', { type: MIME_TYPE })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export function detectBackupExportMode(): BackupExportMode {
  if (getSaveFilePicker() !== undefined) return 'remembered'
  if (canShareFiles()) return 'share'
  return 'download'
}

/** 覚えている保存先のファイル名。無ければ null。 */
export async function getRememberedTargetName(): Promise<string | null> {
  const target = await getBackupTarget()
  return target?.handle.name ?? null
}

/**
 * 覚えているハンドルが今も書き込めるか確かめる。
 * ブラウザを開き直すと権限が落ちていることがあり、その場合は操作を起点に取り直す。
 */
async function ensureWritable(handle: BackupFileHandle): Promise<boolean> {
  if (handle.queryPermission === undefined) return true

  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
    if (handle.requestPermission === undefined) return false
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
  } catch {
    return false
  }
}

async function writeToHandle(handle: BackupFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

export interface ExportResult {
  readonly mode: BackupExportMode
  /** 書き出したファイル名。共有やダウンロードでは提案した名前。 */
  readonly fileName: string
  /** 保存先を覚えたので、次からはボタン1回で済むか。 */
  readonly isRemembered: boolean
}

/**
 * 保存先を覚える。
 *
 * 覚えられなくても書き出し自体は済んでいるので、失敗を上へ投げない。
 * 次回また選んでもらうだけで済む。
 */
async function rememberTarget(handle: BackupFileHandle): Promise<boolean> {
  try {
    await saveBackupTarget(handle)
    return true
  } catch {
    return false
  }
}

async function pickTarget(suggestedName: string): Promise<BackupFileHandle | null> {
  const showSaveFilePicker = getSaveFilePicker()
  if (showSaveFilePicker === undefined) return null

  return showSaveFilePicker({
    suggestedName,
    types: [{ description: 'バックアップ', accept: { [MIME_TYPE]: ['.json'] } }],
  })
}

/** 保存先を選び直す。以後はそこへ書き出す。 */
export async function chooseBackupTarget(suggestedName: string): Promise<string | null> {
  const handle = await pickTarget(suggestedName)
  if (handle === null) return null

  const isRemembered = await rememberTarget(handle)
  return isRemembered ? handle.name : null
}

export async function forgetBackupTarget(): Promise<void> {
  await clearBackupTarget()
}

/**
 * バックアップを書き出す。
 * 保存先を覚えていればそこへ上書きし、無ければ一度だけ選んでもらう。
 */
export async function exportBackup(
  suggestedName: string,
  text: string,
): Promise<ExportResult> {
  const mode = detectBackupExportMode()

  if (mode === 'remembered') {
    const target = await getBackupTarget()

    if (target !== undefined && (await ensureWritable(target.handle))) {
      try {
        await writeToHandle(target.handle, text)
        return { mode, fileName: target.handle.name, isRemembered: true }
      } catch {
        // 覚えていた保存先が使えなくなっている。選び直してもらう
        await clearBackupTarget()
      }
    }

    // 覚えていない、権限が切れている、使えなくなっている場合だけ選んでもらう
    const handle = await pickTarget(suggestedName)
    if (handle !== null) {
      // 書き出しを先に済ませる。覚えるのに失敗しても、書き出しは成功として扱う
      await writeToHandle(handle, text)
      const isRemembered = await rememberTarget(handle)
      return { mode, fileName: handle.name, isRemembered }
    }
  }

  if (mode === 'share') {
    const file = new File([text], suggestedName, { type: MIME_TYPE })
    await navigator.share({ files: [file], title: suggestedName })
    return { mode, fileName: suggestedName, isRemembered: false }
  }

  downloadTextFile(suggestedName, text)
  return { mode: 'download', fileName: suggestedName, isRemembered: false }
}

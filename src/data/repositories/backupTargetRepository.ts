import { db } from '../db'

/**
 * 書き出し先のファイル。
 *
 * File System Access API のハンドルは端末とブラウザに紐づくもので、
 * JSON にできず、他の端末へ持って行っても意味を持たない。
 * そのためバックアップの中身（collectBackupData）には含めない。
 */

export const BACKUP_TARGET_ID = 1 as const

/** 使う機能だけを型にする。DOM の型定義には権限まわりが含まれていない。 */
export interface BackupFileHandle {
  readonly name: string
  createWritable(): Promise<{
    write(data: string): Promise<void>
    close(): Promise<void>
  }>
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>
}

export interface BackupTarget {
  readonly id: typeof BACKUP_TARGET_ID
  readonly handle: BackupFileHandle
}

export async function saveBackupTarget(handle: BackupFileHandle): Promise<void> {
  await db.backupTargets.put({ id: BACKUP_TARGET_ID, handle })
}

export async function getBackupTarget(): Promise<BackupTarget | undefined> {
  return db.backupTargets.get(BACKUP_TARGET_ID)
}

export async function clearBackupTarget(): Promise<void> {
  await db.backupTargets.delete(BACKUP_TARGET_ID)
}

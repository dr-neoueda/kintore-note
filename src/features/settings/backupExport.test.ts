import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { canShareFiles, detectBackupExportMode } from './backupExport'

/**
 * 書き出し方の判定。
 * 「保存先を覚える」は File System Access API が要り、Safari は非対応。
 * 対応状況に応じて段階的に落ちることを確かめる。
 */

const originalShare = navigator.share
const originalCanShare = navigator.canShare

function setShareSupport(isSupported: boolean): void {
  Object.defineProperty(navigator, 'share', {
    value: isSupported ? vi.fn() : undefined,
    configurable: true,
  })
  Object.defineProperty(navigator, 'canShare', {
    value: isSupported ? () => true : undefined,
    configurable: true,
  })
}

beforeEach(() => {
  delete (window as unknown as Record<string, unknown>).showSaveFilePicker
  setShareSupport(false)
})

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).showSaveFilePicker
  Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true })
  Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true })
})

describe('detectBackupExportMode', () => {
  test('保存先を選ぶ API があれば、覚える方式にする', () => {
    // Arrange: PC の Chrome / Edge など
    ;(window as unknown as Record<string, unknown>).showSaveFilePicker = () => Promise.resolve()

    // Act & Assert
    expect(detectBackupExportMode()).toBe('remembered')
  })

  test('無ければ共有シートに落とす', () => {
    // Arrange: iOS Safari は保存先を選ぶ API を持たないが、共有はできる
    setShareSupport(true)

    // Act & Assert
    expect(detectBackupExportMode()).toBe('share')
  })

  test('canShare が無くても、share があれば共有を選べる', () => {
    // Arrange: canShare は控えめに false を返すことがあるため、参考にとどめる
    Object.defineProperty(navigator, 'share', { value: () => {}, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })

    // Act & Assert
    expect(canShareFiles()).toBe(true)
    expect(detectBackupExportMode()).toBe('share')
  })

  test('どちらも無ければ通常のダウンロードにする', () => {
    // Arrange & Act & Assert
    expect(detectBackupExportMode()).toBe('download')
  })

  test('保存先を選ぶ API があるときは、共有より優先する', () => {
    // Arrange: 両方使えるなら、押す回数が少ない方を採る
    ;(window as unknown as Record<string, unknown>).showSaveFilePicker = () => Promise.resolve()
    setShareSupport(true)

    // Act & Assert
    expect(detectBackupExportMode()).toBe('remembered')
  })
})

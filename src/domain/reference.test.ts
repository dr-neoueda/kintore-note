import { describe, test, expect } from 'vitest'
import {
  buildYouTubeSearchUrl,
  isSafeExternalUrl,
  normalizeReferenceUrl,
  resolveReferenceLink,
} from './reference'
import { ValidationError } from './validation'

describe('buildYouTubeSearchUrl', () => {
  test('種目名に「フォーム」を添えた検索 URL を作る', () => {
    // Act
    const url = buildYouTubeSearchUrl('インクラインダンベルプレス')

    // Assert
    expect(url).toBe(
      'https://www.youtube.com/results?search_query=' +
        encodeURIComponent('インクラインダンベルプレス フォーム'),
    )
  })

  test('前後の空白は取り除く', () => {
    expect(buildYouTubeSearchUrl('  サイドレイズ  ')).toContain(
      encodeURIComponent('サイドレイズ フォーム'),
    )
  })

  test('種目名が空でも壊れた URL にならない', () => {
    expect(buildYouTubeSearchUrl('')).toContain('https://www.youtube.com/results')
  })
})

describe('isSafeExternalUrl', () => {
  test('https と http は許可する', () => {
    expect(isSafeExternalUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isSafeExternalUrl('http://example.com/form')).toBe(true)
  })

  test('javascript スキームは拒否する', () => {
    // 保存した URL は href に入るため、実行され得るスキームを弾く
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
  })

  test('data スキームは拒否する', () => {
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  test('その他のスキームも拒否する', () => {
    expect(isSafeExternalUrl('ftp://example.com')).toBe(false)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
  })

  test('URL として読めない文字列は拒否する', () => {
    expect(isSafeExternalUrl('ただの文字列')).toBe(false)
    expect(isSafeExternalUrl('')).toBe(false)
  })

  test('ホスト名にドットが無いものは拒否する', () => {
    expect(isSafeExternalUrl('https://localhost')).toBe(false)
  })
})

describe('normalizeReferenceUrl', () => {
  test('空文字は未設定として null を返す', () => {
    expect(normalizeReferenceUrl('')).toBeNull()
    expect(normalizeReferenceUrl('   ')).toBeNull()
  })

  test('正しい URL はそのまま返す', () => {
    expect(normalizeReferenceUrl('https://www.youtube.com/watch?v=abc')).toBe(
      'https://www.youtube.com/watch?v=abc',
    )
  })

  test('前後の空白は取り除く', () => {
    expect(normalizeReferenceUrl('  https://example.com/form  ')).toBe(
      'https://example.com/form',
    )
  })

  test('スキームが無ければ https を補う', () => {
    // 共有メニューから貼り付けるとスキームが落ちることがある
    expect(normalizeReferenceUrl('www.youtube.com/watch?v=abc')).toBe(
      'https://www.youtube.com/watch?v=abc',
    )
  })

  test('危険なスキームは弾く', () => {
    expect(() => normalizeReferenceUrl('javascript:alert(1)')).toThrow(ValidationError)
  })

  test('URL として読めない文字列は弾く', () => {
    expect(() => normalizeReferenceUrl('これはURLではありません')).toThrow(ValidationError)
  })
})

describe('resolveReferenceLink', () => {
  test('保存された URL があればそれを使う', () => {
    // Act
    const link = resolveReferenceLink({
      name: 'インクラインダンベルプレス',
      referenceUrl: 'https://www.youtube.com/watch?v=abc',
    })

    // Assert
    expect(link.url).toBe('https://www.youtube.com/watch?v=abc')
    expect(link.isCustom).toBe(true)
  })

  test('未設定なら種目名での YouTube 検索にする', () => {
    // Act
    const link = resolveReferenceLink({ name: 'サイドレイズ', referenceUrl: null })

    // Assert
    expect(link.url).toBe(buildYouTubeSearchUrl('サイドレイズ'))
    expect(link.isCustom).toBe(false)
  })

  test('保存された URL が安全でなければ検索にフォールバックする', () => {
    // Arrange: 古いデータや取り込んだバックアップに不正な値が入っていた場合
    const link = resolveReferenceLink({
      name: 'サイドレイズ',
      referenceUrl: 'javascript:alert(1)',
    })

    // Assert
    expect(link.url).toBe(buildYouTubeSearchUrl('サイドレイズ'))
    expect(link.isCustom).toBe(false)
  })
})

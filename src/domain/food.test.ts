import { describe, test, expect } from 'vitest'
import { type Food, normalizeFoodKeyword, matchesKeyword, searchFoods } from './food'

const food = (id: string, name: string, group = '肉類'): Food => ({
  id,
  name,
  group,
  basisGrams: 100,
  nutrition: { kcal: 100, protein: 20, fat: 2, carb: 0, fiber: 0, salt: 0.1 },
  isCustom: false,
})

const FOODS: readonly Food[] = [
  food('11220', '＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし 生'),
  food('11221', '＜鳥肉類＞ にわとり ［若どり・副品目］ ささみ 生'),
  food('11130', '＜畜肉類＞ ぶた ［大型種肉］ ロース 脂身つき 生'),
  food('12004', '鶏卵 全卵 生', '卵類'),
  food('01083', 'こめ ［水稲めし］ 精白米 うるち米', '穀類'),
]

describe('normalizeFoodKeyword', () => {
  test('記号と空白を落として比べられる形にする', () => {
    // Arrange & Act & Assert: 成分表の名前は ＜＞ ［］ で修飾されている
    expect(normalizeFoodKeyword('＜鳥肉類＞ にわとり ［若どり］ むね')).toBe(
      '鳥肉類にわとり若どりむね',
    )
  })

  test('全角と半角の英数字をそろえる', () => {
    expect(normalizeFoodKeyword('ＭＣＴオイル')).toBe('mctオイル')
  })
})

describe('matchesKeyword', () => {
  test('名前の一部で見つかる', () => {
    expect(matchesKeyword(FOODS[0]!, 'むね')).toBe(true)
  })

  test('読み替えた語と残りの語の両方を含むものだけに当たる', () => {
    // Arrange & Act & Assert: 「鶏むね」は「にわとり … むね」と離れて書かれている
    expect(matchesKeyword(FOODS[0]!, '鶏むね')).toBe(true)
    // ささみ も にわとり だが、「むね」を含まないので当たらない
    expect(matchesKeyword(FOODS[1]!, '鶏むね')).toBe(false)
  })

  test('漢字と残りの語を組み合わせても当たる', () => {
    expect(matchesKeyword(FOODS[2]!, '豚ロース')).toBe(true)
    expect(matchesKeyword(FOODS[0]!, '豚ロース')).toBe(false)
  })

  test('分類名でも見つかる', () => {
    expect(matchesKeyword(FOODS[3]!, '卵類')).toBe(true)
  })

  test('漢字で打っても、ひらがな表記の食品が見つかる', () => {
    // Arrange & Act & Assert: 成分表は「ぶた」表記だが、利用者は「豚」と打つ
    expect(matchesKeyword(FOODS[2]!, '豚')).toBe(true)
    expect(matchesKeyword(FOODS[0]!, '鶏')).toBe(true)
    expect(matchesKeyword(FOODS[4]!, '米')).toBe(true)
  })

  test('関係ない語では見つからない', () => {
    expect(matchesKeyword(FOODS[0]!, 'さば')).toBe(false)
  })
})

describe('searchFoods', () => {
  test('該当する食品だけを返す', () => {
    // Act
    const results = searchFoods(FOODS, '鶏')

    // Assert: にわとり2件と鶏卵1件
    expect(results).toHaveLength(3)
  })

  test('空の検索語では何も返さない', () => {
    // Arrange & Act & Assert: 2,500件を一度に並べても選べない
    expect(searchFoods(FOODS, '   ')).toEqual([])
  })

  test('名前が短い順に並べる', () => {
    // Arrange & Act: 「生」で引くと複数当たる
    const results = searchFoods(FOODS, '生')

    // Assert: 修飾の少ない、素の食品ほど上に来る
    expect(results[0]?.name).toBe('鶏卵 全卵 生')
  })

  test('返す件数に上限がある', () => {
    // Arrange: 同じ語に当たる食品を大量に用意する
    const many = Array.from({ length: 200 }, (_, index) => food(String(index), `とりにく${index}`))

    // Act & Assert
    expect(searchFoods(many, 'とりにく').length).toBeLessThanOrEqual(50)
  })
})

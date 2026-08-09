import { describe, test, expect, afterEach, vi } from 'vitest'
import { formatPackagedFoodName, searchPackagedFoods } from './openFoodFacts'

function mockResponse(body: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) })),
  )
}

const product = (overrides: Record<string, unknown> = {}) => ({
  code: '4901234567890',
  product_name: 'サラダチキン プレーン',
  brands: '7-Premium',
  nutriments: {
    'energy-kcal_100g': 114,
    proteins_100g: 24.1,
    fat_100g: 1.2,
    carbohydrates_100g: 0.3,
    salt_100g: 1.1,
  },
  ...overrides,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchPackagedFoods', () => {
  test('商品名と栄養価を取り出す', async () => {
    // Arrange
    mockResponse({ products: [product()] })

    // Act
    const [food] = await searchPackagedFoods('サラダチキン')

    // Assert: 100gあたりの値として扱う
    expect(food?.name).toBe('サラダチキン プレーン')
    expect(food?.brand).toBe('7-Premium')
    expect(food?.nutrition.kcal).toBe(114)
    expect(food?.nutrition.protein).toBe(24.1)
  })

  test('日本語の商品名があればそちらを使う', async () => {
    // Arrange
    mockResponse({ products: [product({ product_name_ja: '和名サラダチキン' })] })

    // Act & Assert
    expect((await searchPackagedFoods('サラダチキン'))[0]?.name).toBe('和名サラダチキン')
  })

  test('エネルギーが無い商品は捨てる', async () => {
    // Arrange: 有志が登録するデータのため、値が欠けていることがある
    mockResponse({ products: [product({ nutriments: {} })] })

    // Act & Assert: 選んでも計算できない
    expect(await searchPackagedFoods('サラダチキン')).toEqual([])
  })

  test('名前が無い商品は捨てる', async () => {
    mockResponse({ products: [product({ product_name: '', product_name_ja: '' })] })

    expect(await searchPackagedFoods('サラダチキン')).toEqual([])
  })

  test('検索語が空なら問い合わせない', async () => {
    // Arrange
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    // Act
    await searchPackagedFoods('   ')

    // Assert
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('繋がらなければ空を返す', async () => {
    // Arrange: 圏外でも記録の妨げにはしない
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))

    // Act & Assert
    expect(await searchPackagedFoods('サラダチキン')).toEqual([])
  })

  test('応答が壊れていても空を返す', async () => {
    mockResponse({ products: 'not-an-array' })

    expect(await searchPackagedFoods('サラダチキン')).toEqual([])
  })

  test('エラー応答でも空を返す', async () => {
    mockResponse({ products: [product()] }, false)

    expect(await searchPackagedFoods('サラダチキン')).toEqual([])
  })
})

describe('formatPackagedFoodName', () => {
  test('ブランドを添えて見分けられるようにする', async () => {
    mockResponse({ products: [product()] })
    const [food] = await searchPackagedFoods('サラダチキン')

    expect(formatPackagedFoodName(food!)).toBe('サラダチキン プレーン（7-Premium）')
  })

  test('ブランドが無ければ名前だけにする', async () => {
    mockResponse({ products: [product({ brands: '' })] })
    const [food] = await searchPackagedFoods('サラダチキン')

    expect(formatPackagedFoodName(food!)).toBe('サラダチキン プレーン')
  })
})

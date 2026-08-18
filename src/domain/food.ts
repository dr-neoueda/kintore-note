import type { FoodPortion } from './commonFoods'
import type { Nutrition } from './nutrition'

/**
 * 栄養計算の対象になる食品。
 *
 * 日本食品標準成分表の収載食品と、利用者が自分で登録した食品（マイ食品）を
 * 同じ形で扱う。成分表に無い市販品やプロテインは後者で補う。
 */
export interface Food {
  /** 成分表の食品番号、またはマイ食品の 'custom:<id>'。 */
  readonly id: string
  readonly name: string
  /** よく使う分量。量を入れるときのボタンになる。 */
  readonly portions?: readonly FoodPortion[]
  /**
   * 名前に出てこない引き方。
   * 成分表は「チャーハン」だが利用者は「炒飯」と打つ、といった差を埋める。
   */
  readonly searchTerms?: readonly string[]
  /** 食品群（穀類・肉類など）。検索の手がかりにする。 */
  readonly group: string
  /** nutrition が何 g 分の値か。成分表は100g、マイ食品は任意。 */
  readonly basisGrams: number
  readonly nutrition: Nutrition
  readonly isCustom: boolean
  /**
   * 成分表そのままではなく見積もった値のときに、その根拠を入れる。
   * 出典と見積もりを混ぜないよう、画面でも断りを出す。
   */
  readonly estimateNote?: string
}

/**
 * 成分表の名前から、飾りの部分を落として読みやすくする。
 *
 * 「＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし 生」のうち、
 * 先頭の分類（＜＞・（）で囲われた部分）は食品群と重なっていて、
 * 狭い画面では読む手がかりにならない。
 */
export function formatFoodName(name: string): string {
  return name
    .replace(/^＜[^＞]*＞\s*/, '')
    .replace(/^（[^）]*）\s*/, '')
    .trim()
}

/**
 * 調理の状態を表す言葉。
 *
 * 生か調理済みかでエネルギーが倍近く変わるため、名前に埋もれさせず取り出す。
 * 長い語から先に見て、「ゆで」より「油いため」を優先して当てる。
 */
const COOKING_STATES: readonly string[] = [
  '電子レンジ調理',
  '油いため',
  'そうざい',
  '天ぷら',
  'から揚げ',
  'フライ',
  '素揚げ',
  '水煮缶詰',
  '味付け缶詰',
  '缶詰',
  '味噌煮',
  '蒸し',
  '焼き',
  'ゆで',
  '生',
  '乾',
  'めし',
  'かゆ',
]

/** その食品がどう調理された状態か。分からなければ null。 */
export function extractCookingState(name: string): string | null {
  return COOKING_STATES.find((state) => name.includes(state)) ?? null
}

/** 一度に出す検索結果の上限。これ以上並べても選べない。 */
const MAX_SEARCH_RESULTS = 50

/**
 * 漢字で打たれた語を、成分表のひらがな表記に読み替える。
 *
 * 成分表は「ぶた」「にわとり」「こめ」のようにひらがなで収載されているが、
 * 利用者は「豚」「鶏」「米」と打つ。これが無いと検索がほとんど当たらない。
 */
const KEYWORD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  豚: ['ぶた'],
  豚肉: ['ぶた'],
  鶏: ['にわとり', 'とり', '鶏卵'],
  鶏肉: ['にわとり'],
  とり肉: ['にわとり'],
  牛: ['うし'],
  牛肉: ['うし'],
  卵: ['鶏卵', 'たまご'],
  たまご: ['鶏卵'],
  米: ['こめ'],
  ごはん: ['こめ', 'めし'],
  ご飯: ['こめ', 'めし'],
  白米: ['精白米'],
  鮭: ['さけ', 'しろさけ'],
  さば: ['さば'],
  鯖: ['さば'],
  まぐろ: ['まぐろ'],
  鮪: ['まぐろ'],
  海老: ['えび'],
  烏賊: ['いか'],
  大豆: ['だいず'],
  納豆: ['だいず'],
  豆腐: ['だいず', 'とうふ'],
  牛乳: ['普通牛乳'],
  小麦: ['こむぎ'],
  蕎麦: ['そば'],
  芋: ['いも'],
  人参: ['にんじん'],
  玉葱: ['たまねぎ'],
  胡瓜: ['きゅうり'],
  南瓜: ['かぼちゃ'],
  茄子: ['なす'],
  大根: ['だいこん'],
  白菜: ['はくさい'],
  葱: ['ねぎ'],
  蜂蜜: ['はちみつ'],
  胡麻: ['ごま'],
}

/**
 * 比較の邪魔になる記号と空白を落とし、表記のゆれをそろえる。
 *
 * カタカナはひらがなに寄せる。成分表は「ぽん酢しょうゆ」のようにひらがなで
 * 収載されている一方、利用者は「ポン酢」と打つ。
 */
export function normalizeFoodKeyword(value: string): string {
  return value
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .toLowerCase()
    .replace(/[\s　＜＞〈〉［］[\]（）()【】、,.／/・-]/g, '')
}

/**
 * 検索語を「すべて満たすべき条件」の並びに分解する。
 *
 * 「鶏むね」は成分表では「にわとり ［若どり・主品目］ むね」と離れて書かれる。
 * 単純な部分一致では引けず、かといって「にわとり」だけで引くと ささみ まで出る。
 * そこで読み替えた語と残りの語に分け、その全部を含むものだけを当てる。
 *
 * 戻り値は AND（配列）× OR（内側の配列）。
 */
function toSearchTerms(normalized: string): readonly (readonly string[])[] {
  if (normalized === '') return []

  const matchedKey = Object.keys(KEYWORD_ALIASES)
    .map(normalizeFoodKeyword)
    .filter((key) => key !== '' && normalized.includes(key))
    // 「豚肉」と「豚」の両方に当たるときは長い方を採る
    .sort((a, b) => b.length - a.length)[0]

  if (matchedKey === undefined) return [[normalized]]

  const index = normalized.indexOf(matchedKey)
  const alternatives = Object.entries(KEYWORD_ALIASES)
    .filter(([term]) => normalizeFoodKeyword(term) === matchedKey)
    .flatMap(([, replacements]) => replacements.map(normalizeFoodKeyword))

  return [
    ...toSearchTerms(normalized.slice(0, index)),
    [matchedKey, ...alternatives],
    ...toSearchTerms(normalized.slice(index + matchedKey.length)),
  ]
}

/** その食品が検索語に当たるか。 */
export function matchesKeyword(food: Food, keyword: string): boolean {
  const terms = toSearchTerms(normalizeFoodKeyword(keyword))
  if (terms.length === 0) return false

  const haystack = normalizeFoodKeyword(
    `${food.name}${food.group}${(food.searchTerms ?? []).join('')}`,
  )
  return terms.every((alternatives) =>
    alternatives.some((alternative) => haystack.includes(alternative)),
  )
}

/**
 * 同じ食品の調理違いをまとめたもの。
 * 「ブロッコリー 花序」に 生・ゆで・電子レンジ調理・焼き・油いため が並ぶような場合に、
 * まず代表を1つ出し、残りは畳んでおくために使う。
 */
export interface FoodGroup {
  readonly key: string
  readonly representative: Food
  /** 代表以外の調理違い。無ければ空。 */
  readonly variants: readonly Food[]
}

/** 調理法を落とした部分。これが同じなら同じ食品とみなす。 */
export function toFoodBaseName(name: string): string {
  const parts = formatFoodName(name).split(/\s+/)

  while (parts.length > 1) {
    const last = parts[parts.length - 1]
    if (last === undefined || !COOKING_STATES.includes(last)) break
    parts.pop()
  }

  return parts.join(' ')
}

/**
 * 代表として先に出す調理法の優先順。
 * 素材そのものを先に出し、そこから調理違いへ辿れるようにする。
 */
const REPRESENTATIVE_ORDER: readonly string[] = ['生', 'ゆで', 'めし', '蒸し', '焼き']

function representativeRank(food: Food): number {
  const state = extractCookingState(food.name)
  if (state === null) return REPRESENTATIVE_ORDER.length
  const index = REPRESENTATIVE_ORDER.indexOf(state)
  return index === -1 ? REPRESENTATIVE_ORDER.length + 1 : index
}

/**
 * 検索結果を食品ごとにまとめる。
 * 並び順は元のまま保ち、同じ食品が離れて出ないようにする。
 */
export function groupFoods(foods: readonly Food[]): FoodGroup[] {
  const byBase = new Map<string, Food[]>()

  for (const food of foods) {
    const key = food.isCustom ? food.id : toFoodBaseName(food.name)
    const current = byBase.get(key)
    if (current === undefined) byBase.set(key, [food])
    else current.push(food)
  }

  return [...byBase.entries()].map(([key, members]) => {
    const sorted = [...members].sort((a, b) => representativeRank(a) - representativeRank(b))
    const [representative, ...variants] = sorted

    // members は必ず1件以上あるため representative は存在する
    return { key, representative: representative as Food, variants }
  })
}

/**
 * 食品を検索する。
 * 修飾の少ない素の食品ほど探している物である場合が多いため、名前の短い順に並べる。
 */
export function searchFoods(foods: readonly Food[], keyword: string): Food[] {
  if (normalizeFoodKeyword(keyword) === '') return []

  return foods
    .filter((food) => matchesKeyword(food, keyword))
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, MAX_SEARCH_RESULTS)
}

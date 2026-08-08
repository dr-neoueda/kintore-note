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
  /** 食品群（穀類・肉類など）。検索の手がかりにする。 */
  readonly group: string
  /** nutrition が何 g 分の値か。成分表は100g、マイ食品は任意。 */
  readonly basisGrams: number
  readonly nutrition: Nutrition
  readonly isCustom: boolean
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

/** 比較の邪魔になる記号と空白を落とし、英数字を半角小文字にそろえる。 */
export function normalizeFoodKeyword(value: string): string {
  return value
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
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

  const haystack = normalizeFoodKeyword(`${food.name}${food.group}`)
  return terms.every((alternatives) =>
    alternatives.some((alternative) => haystack.includes(alternative)),
  )
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

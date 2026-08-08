import { roundTo } from './number'

/**
 * 食品の栄養価。
 * 「何 g 分の値か」は持たず、使う側が基準量とセットで扱う。
 */
export interface Nutrition {
  /** エネルギー（kcal）。 */
  readonly kcal: number
  /** たんぱく質（g）。 */
  readonly protein: number
  /** 脂質（g）。 */
  readonly fat: number
  /** 炭水化物（g）。 */
  readonly carb: number
  /** 食物繊維総量（g）。 */
  readonly fiber: number
  /** 食塩相当量（g）。 */
  readonly salt: number
}

export const EMPTY_NUTRITION: Nutrition = {
  kcal: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  fiber: 0,
  salt: 0,
}

/** 成分表の基準量。可食部100g当たりで収載されている。 */
export const COMPOSITION_BASIS_GRAMS = 100

/** アトウォーター係数（kcal/g）。PFC のエネルギー比率を出すのに使う。 */
const KCAL_PER_GRAM = { protein: 4, fat: 9, carb: 4 } as const

/** 成分は小数1桁まで表示する。 */
const NUTRIENT_DECIMALS = 1

export interface EnergyShare {
  readonly protein: number
  readonly fat: number
  readonly carb: number
}

/**
 * 基準量あたりの栄養価を、実際に食べた量に合わせる。
 * 壊れたデータ（基準量0など）でも画面を落とさず0を返す。
 */
export function scaleNutrition(
  nutrition: Nutrition,
  grams: number,
  basisGrams: number,
): Nutrition {
  if (grams <= 0 || basisGrams <= 0) return EMPTY_NUTRITION

  const ratio = grams / basisGrams
  return {
    kcal: Math.round(nutrition.kcal * ratio),
    protein: roundTo(nutrition.protein * ratio, NUTRIENT_DECIMALS),
    fat: roundTo(nutrition.fat * ratio, NUTRIENT_DECIMALS),
    carb: roundTo(nutrition.carb * ratio, NUTRIENT_DECIMALS),
    fiber: roundTo(nutrition.fiber * ratio, NUTRIENT_DECIMALS),
    salt: roundTo(nutrition.salt * ratio, NUTRIENT_DECIMALS + 1),
  }
}

/** 複数の栄養価を合計する。 */
export function sumNutrition(items: readonly Nutrition[]): Nutrition {
  const total = items.reduce<Nutrition>(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      protein: sum.protein + item.protein,
      fat: sum.fat + item.fat,
      carb: sum.carb + item.carb,
      fiber: sum.fiber + item.fiber,
      salt: sum.salt + item.salt,
    }),
    EMPTY_NUTRITION,
  )

  // 二進小数の誤差（0.1+0.1+0.1=0.30000000000000004）を表示前に落とす
  return {
    kcal: Math.round(total.kcal),
    protein: roundTo(total.protein, NUTRIENT_DECIMALS),
    fat: roundTo(total.fat, NUTRIENT_DECIMALS),
    carb: roundTo(total.carb, NUTRIENT_DECIMALS),
    fiber: roundTo(total.fiber, NUTRIENT_DECIMALS),
    salt: roundTo(total.salt, NUTRIENT_DECIMALS + 1),
  }
}

/**
 * PFC がエネルギーに占める割合（%）を返す。
 * 表示上の合計が100になるよう、炭水化物で端数を吸収する。
 */
export function calcEnergyShare(nutrition: Nutrition): EnergyShare {
  const proteinKcal = nutrition.protein * KCAL_PER_GRAM.protein
  const fatKcal = nutrition.fat * KCAL_PER_GRAM.fat
  const carbKcal = nutrition.carb * KCAL_PER_GRAM.carb
  const total = proteinKcal + fatKcal + carbKcal

  if (total <= 0) return { protein: 0, fat: 0, carb: 0 }

  const protein = Math.round((proteinKcal / total) * 100)
  const fat = Math.round((fatKcal / total) * 100)
  return { protein, fat, carb: 100 - protein - fat }
}

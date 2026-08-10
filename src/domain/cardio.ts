/**
 * 有酸素運動の記録から、ペース・速度・強度（METs）を求める。
 *
 * GPS による自動記録は行わない。iOS の Web アプリは画面ロック中に
 * 位置情報を取得できず、軌跡もスプリットも残せないため。
 * 距離と時間を手で入れてもらい、そこから読み取れる値を出す。
 */

export type CardioActivity = 'running' | 'walking' | 'cycling' | 'calisthenics'

export const CARDIO_ACTIVITIES: readonly CardioActivity[] = [
  'running',
  'walking',
  'cycling',
  'calisthenics',
]

export const CARDIO_ACTIVITY_LABELS: Readonly<Record<CardioActivity, string>> = {
  running: 'ランニング',
  walking: 'ウォーキング',
  cycling: 'バイク',
  calisthenics: '自重トレ',
}

/**
 * 距離を測らない運動。
 *
 * 動画に沿って行う腹筋・体幹のトレーニングは、距離もペースも意味を持たない。
 * 時間と強度だけで記録する。
 */
export function usesDistance(
  activity: CardioActivity,
): activity is Exclude<CardioActivity, 'calisthenics'> {
  return activity !== 'calisthenics'
}

/** 自重トレーニングの強度。同じ時間でも、休みなく続けるかで倍以上変わる。 */
export type CardioIntensity = 'light' | 'moderate' | 'vigorous'

export const CARDIO_INTENSITIES: readonly CardioIntensity[] = ['light', 'moderate', 'vigorous']

export const CARDIO_INTENSITY_LABELS: Readonly<Record<CardioIntensity, string>> = {
  light: '軽め',
  moderate: 'ふつう',
  vigorous: 'きつい',
}

/**
 * 自重トレーニングの METs。
 * 出典: Compendium of Physical Activities (2011)
 * - calisthenics, home exercise, light or moderate effort: 3.5
 * - calisthenics（腕立て・腹筋など）, vigorous effort: 8.0
 *
 * 動画に沿って休みなく続ける腹筋は「ふつう」〜「きつい」に当たる。
 */
const CALISTHENICS_METS: Readonly<Record<CardioIntensity, number>> = {
  light: 3.5,
  moderate: 5.0,
  vigorous: 8.0,
}

export const DEFAULT_CARDIO_INTENSITY: CardioIntensity = 'moderate'

export function metsForCalisthenics(intensity: CardioIntensity | null): number {
  return CALISTHENICS_METS[intensity ?? DEFAULT_CARDIO_INTENSITY]
}

const SECONDS_PER_HOUR = 3600

/**
 * 速度（km/h）と METs の対応。
 * 出典: Compendium of Physical Activities (2011)。
 * 表にない速度は前後の値から直線で補間する。
 */
const METS_TABLE: Readonly<
  Record<Exclude<CardioActivity, 'calisthenics'>, readonly (readonly [number, number])[]>
> = {
  walking: [
    [3.2, 2.8],
    [4.8, 3.5],
    [5.6, 4.3],
    [6.4, 5.0],
    [7.2, 7.0],
  ],
  running: [
    [6.4, 6.0],
    [8.0, 8.3],
    [9.7, 9.8],
    [11.3, 11.0],
    [12.9, 11.8],
    [14.5, 12.8],
    [16.1, 14.5],
    [17.7, 16.0],
    [19.3, 19.0],
  ],
  cycling: [
    [16.0, 6.8],
    [19.0, 8.0],
    [22.5, 10.0],
    [25.5, 12.0],
    [30.0, 15.8],
  ],
}

/** 平均速度（km/h）。時間が0なら0を返す。 */
export function calcSpeedKmh(distanceKm: number, durationSec: number): number {
  if (distanceKm <= 0 || durationSec <= 0) return 0
  return Math.round((distanceKm / (durationSec / SECONDS_PER_HOUR)) * 10) / 10
}

/** 1kmあたりの秒数。距離が0なら null。 */
export function calcPaceSecPerKm(distanceKm: number, durationSec: number): number | null {
  if (distanceKm <= 0 || durationSec <= 0) return null
  return Math.round(durationSec / distanceKm)
}

/** ペースを 5'30" 形式にする。 */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null) return '—'

  const minutes = Math.floor(secPerKm / 60)
  const seconds = Math.round(secPerKm % 60)
  return `${minutes}'${String(seconds).padStart(2, '0')}"`
}

/**
 * 速度から METs を求める。
 * 表の範囲外は端の値で頭打ちにする。外挿すると非現実的な値になるため。
 */
export function metsForSpeed(
  activity: Exclude<CardioActivity, 'calisthenics'>,
  speedKmh: number,
): number {
  const table = METS_TABLE[activity]
  const first = table[0]
  const last = table[table.length - 1]
  if (first === undefined || last === undefined) return 0

  if (speedKmh <= first[0]) return first[1]
  if (speedKmh >= last[0]) return last[1]

  for (let index = 1; index < table.length; index += 1) {
    const lower = table[index - 1]
    const upper = table[index]
    if (lower === undefined || upper === undefined) continue

    if (speedKmh <= upper[0]) {
      const ratio = (speedKmh - lower[0]) / (upper[0] - lower[0])
      return Math.round((lower[1] + (upper[1] - lower[1]) * ratio) * 10) / 10
    }
  }

  return last[1]
}

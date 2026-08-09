/**
 * 休憩終了を知らせるビープ音。
 *
 * 音声ファイルを持たず Web Audio API で合成する。
 * 追加のダウンロードが不要で、オフラインでも確実に鳴らせるため。
 *
 * iOS では利用者の操作を起点にしないと音を出せないので、
 * セットを記録したタイミングで unlockAlarmAudio を呼んで解錠しておく。
 */

const BEEP_FREQUENCY_HZ = 880
const BEEP_DURATION_SEC = 0.18
const BEEP_INTERVAL_SEC = 0.3
/** 1組の鳴らす回数。まとまりを作らないと、長く鳴らしたとき機械の警告音のようになる。 */
const BEEPS_PER_GROUP = 2
/** 組と組の間。ここで途切れることで「鳴り続けている」と分かる。 */
const GROUP_GAP_SEC = 0.5
const PEAK_GAIN = 0.25
/** 立ち上がりを緩やかにしてプチッというノイズを避ける。 */
const ENVELOPE_ATTACK_SEC = 0.01

type AudioContextConstructor = typeof AudioContext

let sharedAudioContext: AudioContext | null = null

function resolveAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext
  return candidate ?? null
}

function getAudioContext(): AudioContext | null {
  if (sharedAudioContext !== null) return sharedAudioContext

  const AudioContextClass = resolveAudioContextConstructor()
  if (AudioContextClass === null) return null

  sharedAudioContext = new AudioContextClass()
  return sharedAudioContext
}

/**
 * 利用者の操作の中で呼び、以降はプログラムから音を鳴らせるようにする。
 * iOS は操作を伴わない音の再生を許可しないため、この解錠が必須になる。
 */
export async function unlockAlarmAudio(): Promise<void> {
  const context = getAudioContext()
  if (context === null) return

  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch {
      // 解錠できなくても記録の妨げにはしない
    }
  }
}

function scheduleBeep(context: AudioContext, startTime: number): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(BEEP_FREQUENCY_HZ, startTime)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, startTime + ENVELOPE_ATTACK_SEC)
  gain.gain.linearRampToValueAtTime(0, startTime + BEEP_DURATION_SEC)

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.start(startTime)
  oscillator.stop(startTime + BEEP_DURATION_SEC)
}

/**
 * 鳴らす時刻の一覧を、指定した長さに収まるだけ組み立てる。
 * 2回鳴らして少し空ける、を繰り返す。
 */
export function buildBeepOffsets(durationSec: number): number[] {
  if (durationSec <= 0) return []

  const offsets: number[] = []
  let offset = 0

  while (offset < durationSec) {
    for (let index = 0; index < BEEPS_PER_GROUP; index += 1) {
      if (offset >= durationSec) break
      offsets.push(offset)
      offset += BEEP_INTERVAL_SEC
    }
    offset += GROUP_GAP_SEC
  }

  // 長さが1回ぶんに満たなくても、無音では合図にならない
  return offsets.length === 0 ? [0] : offsets
}

/**
 * 休憩終了の合図を鳴らす。鳴らせない環境では静かに何もしない。
 * durationSec の間、鳴らし続ける。
 */
export async function playRestAlarm(durationSec: number): Promise<void> {
  const context = getAudioContext()
  if (context === null) return

  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch {
      return
    }
  }

  const startTime = context.currentTime
  for (const offset of buildBeepOffsets(durationSec)) {
    scheduleBeep(context, startTime + offset)
  }
}

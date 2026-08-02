import { ValidationError } from './validation'

const YOUTUBE_SEARCH_ENDPOINT = 'https://www.youtube.com/results'

/** 検索語に添える言葉。フォーム解説の動画に当たりやすくする。 */
const FORM_KEYWORD = 'フォーム'

const ALLOWED_PROTOCOLS: readonly string[] = ['http:', 'https:']

/** 種目名から YouTube の検索 URL を作る。事前設定なしでも参照できるようにするための既定値。 */
export function buildYouTubeSearchUrl(exerciseName: string): string {
  const query = `${exerciseName.trim()} ${FORM_KEYWORD}`.trim()
  return `${YOUTUBE_SEARCH_ENDPOINT}?search_query=${encodeURIComponent(query)}`
}

/**
 * リンクとして開いてよい URL か。
 *
 * 保存された値はそのまま href に入るため、`javascript:` のように
 * クリックで実行され得るスキームを必ず弾く。
 */
export function isSafeExternalUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false
  // 外部サイトを想定しているため、ホスト名を持つものだけを通す
  return parsed.hostname.includes('.')
}

/**
 * 入力された参照 URL を保存できる形に整える。
 * 空欄は未設定（null）として扱い、開けない URL は弾く。
 */
export function normalizeReferenceUrl(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  // 共有メニューからの貼り付けでスキームが落ちることがあるため補う
  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  if (!isSafeExternalUrl(withProtocol)) {
    throw new ValidationError('http または https で始まる URL を入力してください')
  }

  return withProtocol
}

export interface ReferenceLink {
  readonly url: string
  /** 利用者が保存した URL か（false なら種目名での検索）。 */
  readonly isCustom: boolean
}

/**
 * その種目のフォーム参照先を決める。
 * 保存された URL を優先し、無い場合や開けない場合は YouTube 検索にフォールバックする。
 */
export function resolveReferenceLink(exercise: {
  readonly name: string
  readonly referenceUrl: string | null
}): ReferenceLink {
  const { name, referenceUrl } = exercise

  if (referenceUrl !== null && isSafeExternalUrl(referenceUrl)) {
    return { url: referenceUrl, isCustom: true }
  }

  return { url: buildYouTubeSearchUrl(name), isCustom: false }
}

import type { Locale } from '../types/site'

export const SUPPORTED_LANGUAGES: Locale[] = ['en', 'zh']
export const LANGUAGE_STORAGE_KEY = 'xj-lang'

const normalizeLanguage = (lang?: string | null): Locale | null => {
  if (!lang) return null
  const lower = lang.toLowerCase()
  if (lower.startsWith('zh')) return 'zh'
  if (lower.startsWith('en')) return 'en'
  return null
}

const getSearchParam = (search: string): string | null => {
  if (!search) return null
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  return params.get('lang')
}

export const getQueryLanguage = (): Locale | null => {
  // 优先从哈希中的查询参数读取（HashRouter 场景：#/path?lang=zh）
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex >= 0) {
    const query = hash.slice(queryIndex + 1)
    return normalizeLanguage(getSearchParam(query))
  }

  // 其次从普通 search 读取（兼容历史 URL，如 ?lang=zh#/path）
  const fromSearch = getSearchParam(window.location.search)
  const normalizedSearch = normalizeLanguage(fromSearch)
  if (normalizedSearch) return normalizedSearch

  return null
}

export const getInitialLanguage = (): Locale => {
  const fromQuery = getQueryLanguage()
  if (fromQuery) return fromQuery

  const stored = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  if (stored) return stored

  const navigatorLang = normalizeLanguage(navigator.language)
  return navigatorLang ?? 'en'
}

export const setLanguageParam = (lang: Locale) => {
  const url = new URL(window.location.href)
  let hash = url.hash || '#/'

  // 拆分哈希中的路径和查询字符串：#/path?lang=xx
  const queryIndex = hash.indexOf('?')
  let hashPath = hash
  let hashQuery = ''
  if (queryIndex >= 0) {
    hashPath = hash.slice(0, queryIndex)
    hashQuery = hash.slice(queryIndex + 1)
  }

  const params = new URLSearchParams(hashQuery)
  params.set('lang', lang)
  url.hash = `${hashPath}?${params.toString()}`

  // 可选：清理 search 中旧的 lang，避免同时存在 ?lang=xx#/path?lang=yy 这种形式
  url.searchParams.delete('lang')
  url.search = url.searchParams.toString()

  window.history.replaceState({}, '', url.toString())
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  document.documentElement.lang = lang
}

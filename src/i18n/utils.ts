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
  const fromSearch = getSearchParam(window.location.search)
  const normalizedSearch = normalizeLanguage(fromSearch)
  if (normalizedSearch) return normalizedSearch

  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex >= 0) {
    const query = hash.slice(queryIndex + 1)
    return normalizeLanguage(getSearchParam(query))
  }

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
  const hash = url.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex >= 0) {
    const hashPath = hash.slice(0, queryIndex)
    const params = new URLSearchParams(hash.slice(queryIndex + 1))
    params.set('lang', lang)
    url.hash = `${hashPath}?${params.toString()}`
  } else if (hash) {
    const params = new URLSearchParams()
    params.set('lang', lang)
    url.hash = `${hash}?${params.toString()}`
  } else {
    const params = url.searchParams
    params.set('lang', lang)
    url.search = params.toString()
  }

  window.history.replaceState({}, '', url.toString())
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  document.documentElement.lang = lang
}

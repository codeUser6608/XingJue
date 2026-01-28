import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSiteData } from '../../context/SiteDataContext'
import type { LocalizedText } from '../../types/site'

interface SeoProps {
  title: LocalizedText
  description: LocalizedText
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
}

const ensureMetaTag = (attr: 'name' | 'property', value: string) => {
  const selector = attr === 'name' ? `meta[name="${value}"]` : `meta[property="${value}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, value)
    document.head.appendChild(element)
  }
  return element
}

const ensureLinkTag = (rel: string, hreflang: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"][hreflang="${hreflang}"]`
  )
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    element.hreflang = hreflang
    document.head.appendChild(element)
  }
  return element
}

const ensureCanonical = () => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }
  return element
}

export const Seo = ({ title, description, structuredData }: SeoProps) => {
  const location = useLocation()
  const { i18n } = useTranslation()
  const { siteData } = useSiteData()

  useEffect(() => {
    // 确保 title 和 description 是有效的对象
    const safeTitle = title && typeof title === 'object' ? title : { en: '', zh: '' }
    const safeDescription = description && typeof description === 'object' ? description : { en: '', zh: '' }
    
    const lang = i18n.language as 'en' | 'zh'
    const pageTitle = safeTitle[lang] || siteData.settings?.seoDefaults?.title?.[lang] || ''
    const pageDescription =
      safeDescription[lang] || siteData.settings?.seoDefaults?.description?.[lang] || ''

    document.title = pageTitle
    ensureMetaTag('name', 'description').content = pageDescription
    ensureMetaTag('property', 'og:title').content = pageTitle
    ensureMetaTag('property', 'og:description').content = pageDescription
    ensureMetaTag('property', 'og:type').content = 'website'
    ensureMetaTag('property', 'og:locale').content = lang === 'zh' ? 'zh_CN' : 'en_US'
    ensureMetaTag('name', 'twitter:card').content = 'summary_large_image'
    ensureMetaTag('name', 'twitter:title').content = pageTitle
    ensureMetaTag('name', 'twitter:description').content = pageDescription

    const baseUrl = `${window.location.origin}${window.location.pathname}`
    const hashPath = location.pathname === '/' ? '' : location.pathname
    const routeHash = `#${hashPath}`
    const canonicalUrl = `${baseUrl}${routeHash}`

    siteData.locales?.forEach((locale) => {
      const link = ensureLinkTag('alternate', locale)
      link.href = `${baseUrl}${routeHash}?lang=${locale}`
    })

    const xDefault = ensureLinkTag('alternate', 'x-default')
    xDefault.href = `${baseUrl}${routeHash}?lang=${siteData.defaultLocale || 'en'}`

    ensureCanonical().href = canonicalUrl

    const existing = document.getElementById('structured-data')
    if (structuredData) {
      let script = existing as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = 'structured-data'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(structuredData)
    } else if (existing) {
      existing.remove()
    }
  }, [description, i18n.language, location.pathname, siteData, structuredData, title])

  return null
}

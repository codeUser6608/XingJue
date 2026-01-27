import type { Locale } from '../types/site'

export const formatCurrency = (amount: number, currency: string, locale: Locale) => {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatDate = (iso: string, locale: Locale) => {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setLanguageParam, SUPPORTED_LANGUAGES } from '../../i18n/utils'
import type { Locale } from '../../types/site'

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = (i18n.language as Locale) || 'en'

  const handleSelect = (lang: Locale) => {
    void i18n.changeLanguage(lang)
    setLanguageParam(lang)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/40"
      >
        <span>{t(`languages.${current}`)}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 text-xs shadow-xl backdrop-blur">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleSelect(lang)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-white/80 hover:bg-white/10"
            >
              <span>{t(`languages.${lang}`)}</span>
              {current === lang && <span className="text-amber-300">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

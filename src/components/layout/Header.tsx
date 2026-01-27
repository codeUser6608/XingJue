import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSiteData } from '../../context/SiteDataContext'
import { LanguageSwitcher } from '../common/LanguageSwitcher'
import type { Locale } from '../../types/site'

const navLinks = [
  { to: '/', key: 'nav.home' },
  { to: '/products', key: 'nav.products' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' }
]

export const Header = () => {
  const { t, i18n } = useTranslation()
  const { siteData } = useSiteData()
  const [open, setOpen] = useState(false)
  const locale = i18n.language as Locale

  return (
    <header className="sticky top-0 z-30 w-full">
      <div className="glass-panel mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <NavLink to="/" className="flex items-center gap-3">
          <img
            src={siteData.settings.logoUrl}
            alt={siteData.settings.siteName[locale]}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
          />
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-white">
              {siteData.settings.siteName[locale]}
            </p>
            <p className="text-xs text-white/60">{siteData.settings.tagline[locale]}</p>
          </div>
        </NavLink>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.key}
              to={link.to}
              className={({ isActive }) =>
                `text-sm transition ${isActive ? 'text-amber-300' : 'text-white/70 hover:text-white'}`
              }
            >
              {t(link.key)}
            </NavLink>
          ))}
          <NavLink
            to="/admin"
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40"
          >
            {t('nav.admin')}
          </NavLink>
          <LanguageSwitcher />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center text-white/80 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="glass-panel mx-4 mt-2 flex flex-col gap-3 px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <NavLink
              key={link.key}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `text-sm transition ${isActive ? 'text-amber-300' : 'text-white/70 hover:text-white'}`
              }
            >
              {t(link.key)}
            </NavLink>
          ))}
          <div className="flex items-center justify-between pt-2">
            <NavLink
              to="/admin"
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40"
            >
              {t('nav.admin')}
            </NavLink>
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  )
}

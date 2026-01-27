import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useSiteData } from '../../context/SiteDataContext'
import type { Locale } from '../../types/site'

const navLinks = [
  { to: '/', key: 'nav.home' },
  { to: '/products', key: 'nav.products' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' }
]

export const Footer = () => {
  const { t, i18n } = useTranslation()
  const { siteData } = useSiteData()
  const locale = i18n.language as Locale

  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={siteData.settings.logoUrl}
              alt={siteData.settings.siteName[locale]}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {siteData.settings.siteName[locale]}
              </p>
              <p className="text-xs text-white/60">{siteData.settings.tagline[locale]}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/60">{t('footer.tagline')}</p>
          <p className="mt-4 text-sm font-medium text-amber-300">{t('footer.cta')}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t('nav.products')}</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/60">
            {navLinks.map((link) => (
              <NavLink key={link.key} to={link.to} className="hover:text-white">
                {t(link.key)}
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t('contact.infoTitle')}</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/60">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-amber-300" />
              <span>{siteData.contact.address[locale]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-300" />
              <span>{siteData.contact.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-300" />
              <span>{siteData.contact.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 px-4 pt-6 text-xs text-white/50 md:flex-row md:px-6">
        <span>
          © {new Date().getFullYear()} {siteData.settings.siteName[locale]} · {t('footer.rights')}
        </span>
        <div className="flex items-center gap-4">
          <span>{t('footer.privacy')}</span>
          <span>{t('footer.terms')}</span>
        </div>
      </div>
    </footer>
  )
}

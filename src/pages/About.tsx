import { useTranslation } from 'react-i18next'
import { useSiteData } from '../context/SiteDataContext'
import { Seo } from '../components/common/Seo'
import type { Locale } from '../types/site'

export const About = () => {
  const { siteData } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale

  return (
    <>
      <Seo title={siteData.seo.pages.about.title} description={siteData.seo.pages.about.description} />
      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            <h1 className="section-title">{t('about.title')}</h1>
            <p className="mt-3 text-sm text-white/60">{t('about.subtitle')}</p>
            <p className="mt-6 text-sm text-white/70">{siteData.about.overview[locale]}</p>
          </div>
        </div>
      </section>
    </>
  )
}

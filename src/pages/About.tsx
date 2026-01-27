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
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <h1 className="section-title">{t('about.title')}</h1>
              <p className="mt-3 text-sm text-white/60">{t('about.subtitle')}</p>
              <p className="mt-6 text-sm text-white/70">{siteData.about.overview[locale]}</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/50">
                  {t('about.missionTitle')}
                </p>
                <p className="mt-3 text-sm text-white/70">{siteData.about.mission[locale]}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <h2 className="text-lg font-semibold text-white">{t('about.timelineTitle')}</h2>
              <div className="mt-4 space-y-4">
                {siteData.about.timeline.map((event) => (
                  <div
                    key={event.year}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <span className="text-sm font-semibold text-amber-300">{event.year}</span>
                    <p className="text-sm text-white/70">{event.content[locale]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            <h2 className="text-lg font-semibold text-white">{t('about.teamTitle')}</h2>
            <div className="mt-6 space-y-5">
              {siteData.about.team.map((member) => (
                <div
                  key={member.name}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-white">{member.name}</p>
                  <p className="text-xs text-amber-300">{member.role[locale]}</p>
                  <p className="mt-2 text-sm text-white/60">{member.bio[locale]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

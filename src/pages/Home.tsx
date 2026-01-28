import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSiteData } from '../context/SiteDataContext'
import { Seo } from '../components/common/Seo'
import { ProductCard } from '../components/products/ProductCard'
import { iconMap } from '../utils/iconMap'
import type { Locale } from '../types/site'

export const Home = () => {
  const { siteData, isLoading } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale

  // 所有 Hooks 必须在条件返回之前调用
  const [activeIndex, setActiveIndex] = useState(0)

  // 计算精选产品（需要处理加载状态）
  const featuredProducts = isLoading
    ? []
    : siteData.products.filter((product) =>
        siteData.featuredProductIds.includes(product.id)
      )

  useEffect(() => {
    if (isLoading || featuredProducts.length === 0) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredProducts.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [featuredProducts.length, isLoading])

  useEffect(() => {
    if (!isLoading && activeIndex >= featuredProducts.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, featuredProducts.length, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
          <p className="text-sm text-white/60">{t('misc.loading')}</p>
        </div>
      </div>
    )
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteData.settings?.siteName?.[locale] || '',
    url: `${window.location.origin}${window.location.pathname}`,
    logo: siteData.settings?.logoUrl || '',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: siteData.contact?.phone || '',
        email: siteData.contact?.email || '',
        contactType: 'sales'
      }
    ],
    sameAs: siteData.contact?.socials?.map((social) => social.url) || []
  }

  return (
    <>
      <Seo
        title={siteData.seo?.pages?.home?.title || { en: '', zh: '' }}
        description={siteData.seo?.pages?.home?.description || { en: '', zh: '' }}
        structuredData={organizationSchema}
      />

      <section className="relative overflow-hidden px-4 py-16 md:px-6">
        <div className="absolute inset-0 -z-10">
          {siteData.hero.backgroundVideo ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover opacity-40"
            >
              <source src={siteData.hero.backgroundVideo} />
            </video>
          ) : (
            <img
              src={siteData.hero.backgroundImage}
              alt="hero background"
              className="h-full w-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/90" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">
              {t('home.heroBadge')}
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white md:text-5xl">
              {siteData.hero?.title?.[locale] || ''}
            </h1>
            <p className="mt-4 text-base text-white/70 md:text-lg">
              {siteData.hero?.subtitle?.[locale] || ''}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/contact" className="btn-primary">
                {siteData.hero?.ctaLabel?.[locale] || ''}
              </Link>
              <Link to="/products" className="btn-ghost">
                {t('actions.viewCatalog')}
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-panel flex-1 rounded-3xl p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {siteData.tradeRegions?.map((region) => (
                <div key={region.id} className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{region.name?.[locale] || ''}</p>
                  <p className="mt-2 text-xs text-white/60">{region.markets?.[locale] || ''}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest text-white/50">
                {t('home.mapTitle')}
              </p>
              <p className="mt-2 text-sm text-white/70">{t('home.mapSubtitle')}</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3">
            <h2 className="section-title">{t('home.advantagesTitle')}</h2>
            <p className="section-subtitle">{t('home.advantagesSubtitle')}</p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {siteData.advantages?.map((advantage) => {
              const Icon = iconMap[advantage.icon as keyof typeof iconMap] ?? iconMap.default
              return (
                <motion.div
                  key={advantage.id}
                  whileHover={{ y: -6 }}
                  className="glass-panel rounded-2xl p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/20">
                    <Icon className="h-6 w-6 text-amber-300" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {advantage.title?.[locale] || ''}
                  </h3>
                  <p className="mt-3 text-sm text-white/60">
                    {advantage.description?.[locale] || ''}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3">
            <h2 className="section-title">{t('home.featuredTitle')}</h2>
            <p className="section-subtitle">{t('home.featuredSubtitle')}</p>
          </div>
          <div className="mt-8 md:hidden">
            {featuredProducts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((prev) =>
                        prev === 0 ? featuredProducts.length - 1 : prev - 1
                      )
                    }
                    className="btn-ghost"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((prev) => (prev + 1) % featuredProducts.length)
                    }
                    className="btn-ghost"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <motion.div
                  key={featuredProducts[activeIndex]?.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ProductCard product={featuredProducts[activeIndex]} />
                </motion.div>
              </div>
            )}
          </div>
          <div className="mt-8 hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3">
            <h2 className="section-title">{t('home.mapTitle')}</h2>
            <p className="section-subtitle">{t('home.mapSubtitle')}</p>
          </div>
          <div className="glass-panel mt-8 overflow-hidden rounded-3xl border border-white/10">
            <div className="relative h-80 w-full">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png"
                alt="global trade map"
                className="h-full w-full object-cover opacity-70"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/60" />
              <div className="absolute inset-0 flex flex-wrap items-end justify-between gap-2 p-6 text-xs text-white/80">
                {siteData.tradeRegions.map((region) => (
                  <span
                    key={region.id}
                    className="rounded-full border border-white/20 bg-slate-950/60 px-3 py-1"
                  >
                    {region.name[locale]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3">
            <h2 className="section-title">{t('home.partnersTitle')}</h2>
            <p className="section-subtitle">{t('home.partnersSubtitle')}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {siteData.partners.map((partner) => (
              <div
                key={partner.id}
                className="glass-panel flex items-center justify-center rounded-2xl px-4 py-6 text-sm font-semibold text-white/70"
              >
                {partner.name}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

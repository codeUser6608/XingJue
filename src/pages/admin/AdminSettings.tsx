import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSiteData } from '../../context/SiteDataContext'

const settingsSchema = z.object({
  siteNameEn: z.string().min(1),
  siteNameZh: z.string().min(1),
  taglineEn: z.string().min(1),
  taglineZh: z.string().min(1),
  logoUrl: z.string().min(1),
  seoTitleEn: z.string().min(1),
  seoTitleZh: z.string().min(1),
  seoDescEn: z.string().min(1),
  seoDescZh: z.string().min(1),
  heroTitleEn: z.string().min(1),
  heroTitleZh: z.string().min(1),
  heroSubtitleEn: z.string().min(1),
  heroSubtitleZh: z.string().min(1),
  heroCtaEn: z.string().min(1),
  heroCtaZh: z.string().min(1),
  heroBackgroundImage: z.string().min(1),
  heroBackgroundVideo: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(1),
  addressEn: z.string().min(1),
  addressZh: z.string().min(1),
  hoursEn: z.string().min(1),
  hoursZh: z.string().min(1),
  mapLat: z.coerce.number(),
  mapLng: z.coerce.number(),
  mapZoom: z.coerce.number(),
  socials: z.string().optional()
})

type SettingsFormValues = z.infer<typeof settingsSchema>

export const AdminSettings = () => {
  const { siteData, setSiteData } = useSiteData()
  const { t } = useTranslation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      siteNameEn: siteData.settings.siteName.en,
      siteNameZh: siteData.settings.siteName.zh,
      taglineEn: siteData.settings.tagline.en,
      taglineZh: siteData.settings.tagline.zh,
      logoUrl: siteData.settings.logoUrl,
      seoTitleEn: siteData.settings.seoDefaults.title.en,
      seoTitleZh: siteData.settings.seoDefaults.title.zh,
      seoDescEn: siteData.settings.seoDefaults.description.en,
      seoDescZh: siteData.settings.seoDefaults.description.zh,
      heroTitleEn: siteData.hero.title.en,
      heroTitleZh: siteData.hero.title.zh,
      heroSubtitleEn: siteData.hero.subtitle.en,
      heroSubtitleZh: siteData.hero.subtitle.zh,
      heroCtaEn: siteData.hero.ctaLabel.en,
      heroCtaZh: siteData.hero.ctaLabel.zh,
      heroBackgroundImage: siteData.hero.backgroundImage,
      heroBackgroundVideo: siteData.hero.backgroundVideo ?? '',
      phone: siteData.contact.phone,
      email: siteData.contact.email,
      whatsapp: siteData.contact.whatsapp,
      addressEn: siteData.contact.address.en,
      addressZh: siteData.contact.address.zh,
      hoursEn: siteData.contact.hours.en,
      hoursZh: siteData.contact.hours.zh,
      mapLat: siteData.contact.map.lat,
      mapLng: siteData.contact.map.lng,
      mapZoom: siteData.contact.map.zoom,
      socials: siteData.contact.socials
        .map((item) => `${item.platform}|${item.url}`)
        .join('\n')
    }
  })

  const onSubmit = (values: SettingsFormValues): void => {
    const socials = values.socials
      ? values.socials
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [platform, url] = line.split('|').map((item) => item.trim())
            return { platform: platform || 'Social', url: url || '' }
          })
      : []

    setSiteData({
      ...siteData,
      settings: {
        ...siteData.settings,
        siteName: { en: values.siteNameEn, zh: values.siteNameZh },
        tagline: { en: values.taglineEn, zh: values.taglineZh },
        logoUrl: values.logoUrl,
        seoDefaults: {
          title: { en: values.seoTitleEn, zh: values.seoTitleZh },
          description: { en: values.seoDescEn, zh: values.seoDescZh }
        }
      },
      hero: {
        ...siteData.hero,
        title: { en: values.heroTitleEn, zh: values.heroTitleZh },
        subtitle: { en: values.heroSubtitleEn, zh: values.heroSubtitleZh },
        ctaLabel: { en: values.heroCtaEn, zh: values.heroCtaZh },
        backgroundImage: values.heroBackgroundImage,
        backgroundVideo: values.heroBackgroundVideo
      },
      contact: {
        ...siteData.contact,
        phone: values.phone,
        email: values.email,
        whatsapp: values.whatsapp,
        address: { en: values.addressEn, zh: values.addressZh },
        hours: { en: values.hoursEn, zh: values.hoursZh },
        map: { lat: values.mapLat, lng: values.mapLng, zoom: values.mapZoom },
        socials
      }
    })
    toast.success(t('misc.updated'))
    reset(values)
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <h1 className="text-xl font-semibold text-white">{t('admin.settings.title')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 text-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">{t('admin.settings.siteTitle')}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              {...register('siteNameEn')}
              placeholder={t('admin.settings.form.siteNameEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('siteNameZh')}
              placeholder={t('admin.settings.form.siteNameZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('taglineEn')}
              placeholder={t('admin.settings.form.taglineEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('taglineZh')}
              placeholder={t('admin.settings.form.taglineZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('logoUrl')}
              placeholder={t('admin.settings.form.logoUrl')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
            <input
              {...register('seoTitleEn')}
              placeholder={t('admin.settings.form.seoTitleEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('seoTitleZh')}
              placeholder={t('admin.settings.form.seoTitleZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('seoDescEn')}
              placeholder={t('admin.settings.form.seoDescEn')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('seoDescZh')}
              placeholder={t('admin.settings.form.seoDescZh')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">{t('admin.settings.heroTitle')}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              {...register('heroTitleEn')}
              placeholder={t('admin.settings.form.heroTitleEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('heroTitleZh')}
              placeholder={t('admin.settings.form.heroTitleZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('heroSubtitleEn')}
              placeholder={t('admin.settings.form.heroSubtitleEn')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
            <textarea
              {...register('heroSubtitleZh')}
              placeholder={t('admin.settings.form.heroSubtitleZh')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
            <input
              {...register('heroCtaEn')}
              placeholder={t('admin.settings.form.heroCtaEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('heroCtaZh')}
              placeholder={t('admin.settings.form.heroCtaZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('heroBackgroundImage')}
              placeholder={t('admin.settings.form.heroBackgroundImage')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
            <input
              {...register('heroBackgroundVideo')}
              placeholder={t('admin.settings.form.heroBackgroundVideo')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">{t('admin.settings.contactTitle')}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              {...register('phone')}
              placeholder={t('admin.settings.form.phone')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('email')}
              placeholder={t('admin.settings.form.email')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('whatsapp')}
              placeholder={t('admin.settings.form.whatsapp')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('addressEn')}
              placeholder={t('admin.settings.form.addressEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('addressZh')}
              placeholder={t('admin.settings.form.addressZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('hoursEn')}
              placeholder={t('admin.settings.form.hoursEn')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('hoursZh')}
              placeholder={t('admin.settings.form.hoursZh')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('mapLat')}
              placeholder={t('admin.settings.form.mapLat')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('mapLng')}
              placeholder={t('admin.settings.form.mapLng')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <input
              {...register('mapZoom')}
              placeholder={t('admin.settings.form.mapZoom')}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('socials')}
              placeholder={t('admin.settings.form.socials')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          {t('actions.save')}
        </button>

        {errors.siteNameEn && <p className="text-xs text-rose-300">{t('validation.required')}</p>}
      </form>
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useSiteData } from '../context/SiteDataContext'
import { Seo } from '../components/common/Seo'
import type { Locale } from '../types/site'

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  quantity: z.string().optional(),
  message: z.string().min(6)
})

type ContactFormValues = z.infer<typeof contactSchema>

export const Contact = () => {
  const { siteData, addInquiry } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema)
  })

  const onSubmit = async (values: ContactFormValues) => {
    try {
      await addInquiry({
      name: values.name,
      email: values.email,
      phone: values.phone,
      company: values.company,
      message: values.message,
      quantity: values.quantity ? Number(values.quantity) : undefined,
      locale
    })
    toast.success(t('misc.inquirySent'))
    reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send inquiry')
    }
  }

  const { lat = 0, lng = 0 } = siteData.contact?.map || {}
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05}%2C${lat - 0.03}%2C${lng + 0.05}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`

  return (
    <>
      <Seo 
        title={siteData.seo?.pages?.contact?.title || { en: '', zh: '' }} 
        description={siteData.seo?.pages?.contact?.description || { en: '', zh: '' }} 
      />
      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3">
            <h1 className="section-title">{t('contact.title')}</h1>
            <p className="section-subtitle">{t('contact.subtitle')}</p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                <h2 className="text-lg font-semibold text-white">{t('contact.formTitle')}</h2>
                <p className="mt-2 text-sm text-white/60">{t('contact.formSubtitle')}</p>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <input
                        {...register('name')}
                        placeholder={t('contact.fields.name')}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-rose-300">{t('validation.required')}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register('email')}
                        placeholder={t('contact.fields.email')}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-rose-300">{t('validation.email')}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      {...register('phone')}
                      placeholder={t('contact.fields.phone')}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                    />
                    <input
                      {...register('company')}
                      placeholder={t('contact.fields.company')}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                    />
                  </div>
                  <input
                    {...register('quantity')}
                    placeholder={t('contact.fields.quantity')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                  />
                  <div>
                    <textarea
                      {...register('message')}
                      placeholder={t('contact.fields.message')}
                      rows={5}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-rose-300">{t('validation.required')}</p>
                    )}
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    {t('actions.submit')}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                <h2 className="text-lg font-semibold text-white">{t('contact.infoTitle')}</h2>
                <div className="mt-4 space-y-3 text-sm text-white/60">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-amber-300" />
                    <span>{siteData.contact.address[locale]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-amber-300" />
                    <span>{siteData.contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-amber-300" />
                    <span>
                      {t('contact.whatsapp')}: {siteData.contact.whatsapp}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-amber-300" />
                    <span>{siteData.contact.email}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                    {siteData.contact.hours[locale]}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {siteData.contact.socials.map((social) => (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/30"
                    >
                      {social.platform}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <h2 className="px-2 text-lg font-semibold text-white">{t('contact.mapTitle')}</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  title="map"
                  src={mapUrl}
                  className="h-96 w-full"
                  loading="lazy"
                />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                {t('contact.address')}: {siteData.contact.address[locale]}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

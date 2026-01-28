import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSiteData } from '../context/SiteDataContext'
import { Seo } from '../components/common/Seo'
import { ProductCard } from '../components/products/ProductCard'
import { formatCurrency } from '../utils/format'
import type { Locale } from '../types/site'

const inquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  quantity: z.string().optional(),
  message: z.string().min(6)
})

type InquiryFormValues = z.infer<typeof inquirySchema>

export const ProductDetail = () => {
  const { productId } = useParams()
  const { siteData, addInquiry } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale

  const product = siteData.products.find((item) => item.id === productId)
  const [activeImage, setActiveImage] = useState(product?.mainImage ?? '')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState('')

  useEffect(() => {
    setActiveImage(product?.mainImage ?? '')
  }, [product])

  useEffect(() => {
    if (!lightboxOpen || !product) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        const images = product.images
        const currentIndex = images.indexOf(lightboxImage)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1
        setLightboxImage(images[prevIndex])
      } else if (e.key === 'ArrowRight') {
        const images = product.images
        const currentIndex = images.indexOf(lightboxImage)
        const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0
        setLightboxImage(images[nextIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, lightboxImage, product])

  const openLightbox = (image: string) => {
    setLightboxImage(image)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!product) return
    const images = product.images
    const currentIndex = images.indexOf(lightboxImage)
    if (direction === 'prev') {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1
      setLightboxImage(images[prevIndex])
    } else {
      const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0
      setLightboxImage(images[nextIndex])
    }
  }

  const relatedProducts = useMemo(() => {
    if (!product) return []
    return siteData.products
      .filter((item) => item.categoryId === product.categoryId && item.id !== product.id)
      .slice(0, 3)
  }, [product, siteData.products])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema)
  })

  const productSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name[locale],
        description: product.description[locale],
        sku: product.sku,
        image: product.images,
        brand: {
          '@type': 'Brand',
          name: siteData.settings.siteName[locale]
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: product.price.currency,
          price: product.price.amount,
          availability:
            product.stockStatus === 'in_stock'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock'
        }
      }
    : undefined

  if (!product) {
    return (
      <section className="px-4 py-16 md:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-slate-950/60 p-10 text-center text-white/60">
          {t('productDetail.notFound')}
        </div>
      </section>
    )
  }

  const onSubmit = async (values: InquiryFormValues) => {
    try {
      await addInquiry({
        productId: product.id,
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

  return (
    <>
      <Seo
        title={product.seo.title}
        description={product.seo.description}
        structuredData={productSchema}
      />
      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <p className="text-xs uppercase tracking-widest text-white/40">
                {t('productDetail.galleryLabel')}
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => openLightbox(activeImage)}
                  className="block w-full cursor-zoom-in transition-opacity hover:opacity-90"
                >
                  <img
                    src={activeImage}
                    alt={product.name[locale]}
                    className="h-80 w-full object-cover"
                  />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {product.images.map((image) => (
                  <button
                    type="button"
                    key={image}
                    onClick={() => setActiveImage(image)}
                    className={`overflow-hidden rounded-xl border transition-opacity hover:opacity-90 ${
                      activeImage === image ? 'border-amber-300' : 'border-white/10'
                    }`}
                  >
                    <img src={image} alt="" className="h-20 w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <h1 className="text-2xl font-semibold text-white">{product.name[locale]}</h1>
              <p className="mt-3 text-sm text-white/60">{product.description[locale]}</p>
              <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>{t('productDetail.price')}</span>
                  <span className="text-amber-300">
                    {formatCurrency(product.price.amount, product.price.currency, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>{t('productDetail.unit')}</span>
                  <span>{product.price.unit[locale]}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>{t('productDetail.moq')}</span>
                  <span>{product.price.moq}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>{t('productDetail.leadTime')}</span>
                  <span>{product.leadTime[locale]}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                <h2 className="text-lg font-semibold text-white">
                  {t('productDetail.featuresTitle')}
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-white/60">
                  {product.features.map((feature, index) => (
                    <li key={`${feature.en}-${index}`} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-amber-300" />
                      <span>{feature[locale]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                <h2 className="text-lg font-semibold text-white">
                  {t('productDetail.certificationsTitle')}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <h2 className="text-lg font-semibold text-white">
                {t('productDetail.specsTitle')}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                {product.specs.map((spec) => (
                  <div
                    key={spec.label.en}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/70"
                  >
                    <span>{spec.label[locale]}</span>
                    <span>{spec.value[locale]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('productDetail.relatedTitle')}
              </h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {relatedProducts.map((related) => (
                  <ProductCard key={related.id} product={related} />
                ))}
              </div>
              {relatedProducts.length === 0 && (
                <p className="mt-4 text-sm text-white/50">{t('products.empty')}</p>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-slate-950/70 p-6 lg:sticky lg:top-28">
            <p className="text-lg font-semibold text-white">{t('productDetail.inquiryTitle')}</p>
            <p className="mt-2 text-sm text-white/60">{t('productDetail.inquirySubtitle')}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 text-sm">
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
              <input
                {...register('quantity')}
                placeholder={t('contact.fields.quantity')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
              />
              <div>
                <textarea
                  {...register('message')}
                  placeholder={t('contact.fields.message')}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-rose-300">{t('validation.required')}</p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full">
                {t('actions.submit')}
              </button>
              <Link to="/contact" className="btn-ghost w-full">
                {t('actions.learnMore')}
              </Link>
            </form>
          </aside>
        </div>
      </section>

      {/* 图片预览模态框 */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="关闭"
          >
            <X className="h-6 w-6" />
          </button>
          {product && product.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  navigateImage('prev')
                }}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="上一张"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  navigateImage('next')
                }}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="下一张"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt={product.name[locale]}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}

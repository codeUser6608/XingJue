import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Image as ImageIcon, Pencil } from 'lucide-react'
import { useSiteData } from '../../context/SiteDataContext'
import type { Locale, Product } from '../../types/site'

const productSchema = z.object({
  id: z.string().min(3),
  sku: z.string().min(2),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional(),
  nameEn: z.string().min(2),
  nameZh: z.string().min(1),
  shortEn: z.string().min(2),
  shortZh: z.string().min(1),
  descEn: z.string().min(5),
  descZh: z.string().min(5),
  priceAmount: z.coerce.number().min(0),
  currency: z.string().min(1),
  unitEn: z.string().min(1),
  unitZh: z.string().min(1),
  moq: z.coerce.number().min(1),
  stockStatus: z.enum(['in_stock', 'out_of_stock']),
  leadTimeEn: z.string().min(1),
  leadTimeZh: z.string().min(1),
  certifications: z.string().optional(),
  featuresEn: z.string().optional(),
  featuresZh: z.string().optional(),
  translationEn: z.boolean().default(true),
  translationZh: z.boolean().default(true),
  specs: z.array(
    z.object({
      labelEn: z.string().min(1),
      labelZh: z.string().min(1),
      valueEn: z.string().min(1),
      valueZh: z.string().min(1)
    })
  )
})

type ProductFormValues = z.infer<typeof productSchema>

const defaultSpec = { labelEn: '', labelZh: '', valueEn: '', valueZh: '' }

const buildFormValues = (product?: Product): ProductFormValues => {
  return {
    id: product?.id ?? '',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? '',
    subcategoryId: product?.subcategoryId ?? '',
    nameEn: product?.name.en ?? '',
    nameZh: product?.name.zh ?? '',
    shortEn: product?.shortDescription.en ?? '',
    shortZh: product?.shortDescription.zh ?? '',
    descEn: product?.description.en ?? '',
    descZh: product?.description.zh ?? '',
    priceAmount: product?.price.amount ?? 0,
    currency: product?.price.currency ?? 'USD',
    unitEn: product?.price.unit.en ?? '',
    unitZh: product?.price.unit.zh ?? '',
    moq: product?.price.moq ?? 1,
    stockStatus: product?.stockStatus ?? 'in_stock',
    leadTimeEn: product?.leadTime.en ?? '',
    leadTimeZh: product?.leadTime.zh ?? '',
    certifications: product?.certifications.join(', ') ?? '',
    featuresEn: product?.features.map((item) => item.en).join('\n') ?? '',
    featuresZh: product?.features.map((item) => item.zh).join('\n') ?? '',
    translationEn: product?.translationStatus.en ?? true,
    translationZh: product?.translationStatus.zh ?? true,
    specs:
      product?.specs.map((spec) => ({
        labelEn: spec.label.en,
        labelZh: spec.label.zh,
        valueEn: spec.value.en,
        valueZh: spec.value.zh
      })) ?? [defaultSpec]
  }
}

export const AdminProducts = () => {
  const { siteData, upsertProduct, deleteProduct } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [mainImage, setMainImage] = useState<string>('')
  const [imageInput, setImageInput] = useState('')

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: buildFormValues()
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'specs' })

  useEffect(() => {
    reset(buildFormValues(activeProduct ?? undefined))
    setImages(activeProduct?.images ?? [])
    setMainImage(activeProduct?.mainImage ?? '')
    setImageInput('')
  }, [activeProduct, reset])

  const categories = siteData.categories
  const selectedCategory = watch('categoryId')

  const subcategories = useMemo(() => {
    if (!selectedCategory) return categories.flatMap((category) => category.subcategories)
    return (
      categories.find((category) => category.id === selectedCategory)?.subcategories ?? []
    )
  }, [categories, selectedCategory])

  const handleAddImage = (imageUrl: string) => {
    if (!imageUrl) return
    setImages((prev) => {
      const next = [...prev, imageUrl]
      if (!mainImage) setMainImage(imageUrl)
      return next
    })
    setImageInput('')
  }

  const handleUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleAddImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = (values: ProductFormValues): void => {
    if (images.length === 0) {
      toast.error(t('validation.required'))
      return
    }
    const features = values.featuresEn
      ? values.featuresEn.split('\n').map((line) => line.trim()).filter(Boolean)
      : []
    const featuresZh = values.featuresZh
      ? values.featuresZh.split('\n').map((line) => line.trim()).filter(Boolean)
      : []

    const product: Product = {
      id: values.id,
      sku: values.sku,
      categoryId: values.categoryId,
      subcategoryId: values.subcategoryId || undefined,
      name: { en: values.nameEn, zh: values.nameZh },
      shortDescription: { en: values.shortEn, zh: values.shortZh },
      description: { en: values.descEn, zh: values.descZh },
      price: {
        amount: values.priceAmount,
        currency: values.currency,
        unit: { en: values.unitEn, zh: values.unitZh },
        moq: values.moq
      },
      images,
      mainImage: mainImage || images[0],
      features: features.map((feature, index) => ({
        en: feature,
        zh: featuresZh[index] ?? feature
      })),
      specs: values.specs.map((spec) => ({
        label: { en: spec.labelEn, zh: spec.labelZh },
        value: { en: spec.valueEn, zh: spec.valueZh }
      })),
      certifications: values.certifications
        ? values.certifications.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
      stockStatus: values.stockStatus,
      leadTime: { en: values.leadTimeEn, zh: values.leadTimeZh },
      seo: {
        title: { en: values.nameEn, zh: values.nameZh },
        description: { en: values.shortEn, zh: values.shortZh }
      },
      translationStatus: { en: values.translationEn, zh: values.translationZh },
      createdAt: activeProduct?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    upsertProduct(product)
    toast.success(t('misc.updated'))
    setActiveProduct(null)
    reset(buildFormValues())
    setImages([])
    setMainImage('')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* 左侧：产品列表 */}
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 lg:sticky lg:top-6 lg:h-fit">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">{t('admin.products.title')}</h2>
          <button
            type="button"
            onClick={() => setActiveProduct(null)}
            className="btn-primary text-xs px-3 py-1.5"
          >
            <Plus className="h-3 w-3" />
            {t('admin.products.newProduct')}
          </button>
        </div>
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {siteData.products.map((product) => (
            <div
              key={product.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                activeProduct?.id === product.id
                  ? 'border-amber-300 bg-amber-300/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{product.name[locale]}</p>
                <p className="text-xs text-white/50">{product.sku}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveProduct(product)}
                  className="rounded-full border border-white/15 p-1.5 text-white/70 hover:border-white/40 hover:text-white transition"
                  title={t('actions.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('admin.products.deleteConfirm'))) {
                      deleteProduct(product.id)
                      if (activeProduct?.id === product.id) {
                        setActiveProduct(null)
                        reset(buildFormValues())
                        setImages([])
                        setMainImage('')
                      }
                    }
                  }}
                  className="rounded-full border border-white/15 p-1.5 text-rose-300 hover:border-rose-300 transition"
                  title={t('actions.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {siteData.products.length === 0 && (
            <p className="text-sm text-white/50 text-center py-4">{t('admin.empty')}</p>
          )}
        </div>
      </section>

      {/* 右侧：编辑表单 */}
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {activeProduct ? t('admin.products.editProduct') : t('admin.products.newProduct')}
            </h1>
            <p className="text-sm text-white/60">{t('admin.products.imageHint')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              {...register('id')}
              placeholder={t('admin.products.form.id')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <input
              {...register('sku')}
              placeholder={t('admin.products.form.sku')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <select
              {...register('categoryId')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="">{t('products.filter.category')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name[locale]}
                </option>
              ))}
            </select>
            <select
              {...register('subcategoryId')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="">{t('products.filter.subcategory')}</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name[locale]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              {...register('nameEn')}
              placeholder={t('admin.products.form.nameEn')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <input
              {...register('nameZh')}
              placeholder={t('admin.products.form.nameZh')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <textarea
              {...register('shortEn')}
              placeholder={t('admin.products.form.shortEn')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('shortZh')}
              placeholder={t('admin.products.form.shortZh')}
              className="min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('descEn')}
              placeholder={t('admin.products.form.descEn')}
              className="min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
            <textarea
              {...register('descZh')}
              placeholder={t('admin.products.form.descZh')}
              className="min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              {...register('priceAmount')}
              type="number"
              placeholder={t('admin.products.form.price')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <input
              {...register('currency')}
              placeholder={t('admin.products.form.currency')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <input
              {...register('unitEn')}
              placeholder={t('admin.products.form.unitEn')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <input
              {...register('unitZh')}
              placeholder={t('admin.products.form.unitZh')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <input
              {...register('moq')}
              type="number"
              placeholder={t('admin.products.form.moq')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <select
              {...register('stockStatus')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="in_stock">{t('products.badge.inStock')}</option>
              <option value="out_of_stock">{t('products.badge.outOfStock')}</option>
            </select>
            <input
              {...register('leadTimeEn')}
              placeholder={t('admin.products.form.leadTimeEn')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
            <input
              {...register('leadTimeZh')}
              placeholder={t('admin.products.form.leadTimeZh')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 md:col-span-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              {...register('featuresEn')}
              placeholder={t('admin.products.form.featuresEn')}
              className="min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
            />
            <textarea
              {...register('featuresZh')}
              placeholder={t('admin.products.form.featuresZh')}
              className="min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">{t('productDetail.specsTitle')}</p>
              <button
                type="button"
                onClick={() => append(defaultSpec)}
                className="btn-ghost"
              >
                <Plus className="h-4 w-4" />
                {t('actions.add')}
              </button>
            </div>
            <div className="mt-4 grid gap-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 md:grid-cols-4">
                  <input
                    {...register(`specs.${index}.labelEn`)}
                    placeholder={t('admin.products.form.specLabelEn')}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white/70 min-w-0"
                  />
                  <input
                    {...register(`specs.${index}.labelZh`)}
                    placeholder={t('admin.products.form.specLabelZh')}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white/70 min-w-0"
                  />
                  <input
                    {...register(`specs.${index}.valueEn`)}
                    placeholder={t('admin.products.form.specValueEn')}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white/70 min-w-0"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      {...register(`specs.${index}.valueZh`)}
                      placeholder={t('admin.products.form.specValueZh')}
                      className="flex-1 min-w-0 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white/70"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="flex-shrink-0 rounded-full border border-white/10 p-2 text-rose-300 hover:border-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              {...register('certifications')}
              placeholder={t('admin.products.form.certifications')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('translationEn')} />
                EN
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('translationZh')} />
                ZH
              </label>
              <span>{t('admin.products.translations')}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/70">{t('admin.products.form.imagesTitle')}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {images.map((image) => (
                <div
                  key={image}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border ${
                    mainImage === image ? 'border-amber-300' : 'border-white/10'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImages((prev) => {
                        const next = prev.filter((item) => item !== image)
                        if (mainImage === image) {
                          setMainImage(next[0] ?? '')
                        }
                        return next
                      })
                    }}
                    className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainImage(image)}
                    className="absolute bottom-1 left-1 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] text-white/80"
                  >
                    {t('admin.products.form.main')}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                value={imageInput}
                onChange={(event) => setImageInput(event.target.value)}
                placeholder={t('admin.products.form.imageUrlPlaceholder')}
                className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/70"
              />
              <button type="button" onClick={() => handleAddImage(imageInput)} className="btn-ghost">
                <ImageIcon className="h-4 w-4" />
                {t('admin.products.form.addUrl')}
              </button>
              <label className="btn-ghost cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) handleUpload(file)
                  }}
                />
                {t('admin.products.form.upload')}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary">
              {t('actions.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveProduct(null)
                reset(buildFormValues())
                setImages([])
                setMainImage('')
              }}
              className="btn-ghost"
            >
              {t('actions.cancel')}
            </button>
          </div>

          {(errors.id || errors.sku) && (
            <p className="text-xs text-rose-300">{t('validation.required')}</p>
          )}
        </form>
      </section>
    </div>
  )
}

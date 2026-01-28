import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useSiteData } from '../context/SiteDataContext'
import { ProductCard } from '../components/products/ProductCard'
import { Seo } from '../components/common/Seo'
import type { Locale } from '../types/site'

const PAGE_SIZE = 9

export const Products = () => {
  const { siteData, isLoading } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale

  // 所有 Hooks 必须在条件返回之前调用
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [subcategoryId, setSubcategoryId] = useState('all')
  const [stockStatus, setStockStatus] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [page, setPage] = useState(1)

  // 计算价格范围（需要处理加载状态）
  const priceRange = useMemo(() => {
    if (isLoading || !siteData.products || siteData.products.length === 0) {
      return { min: 0, max: 1000 }
    }
    const prices = siteData.products.map((product) => product.price.amount)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }, [siteData.products, isLoading])

  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(1000)

  useEffect(() => {
    if (!isLoading && siteData.products && siteData.products.length > 0) {
      setMinPrice(priceRange.min)
      setMaxPrice(priceRange.max)
    }
  }, [priceRange.min, priceRange.max, isLoading, siteData.products])

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

  const categories = siteData.categories
  const subcategories =
    categoryId === 'all'
      ? categories.flatMap((category) => category.subcategories)
      : categories.find((category) => category.id === categoryId)?.subcategories ?? []

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    let result = siteData.products.filter((product) => {
      const matchesKeyword =
        !keyword ||
        product.name.en.toLowerCase().includes(keyword) ||
        product.name.zh.toLowerCase().includes(keyword) ||
        product.sku.toLowerCase().includes(keyword) ||
        product.description.en.toLowerCase().includes(keyword) ||
        product.description.zh.toLowerCase().includes(keyword)

      const matchesCategory =
        categoryId === 'all' || product.categoryId === categoryId
      const matchesSubcategory =
        subcategoryId === 'all' || product.subcategoryId === subcategoryId
      const matchesStock =
        stockStatus === 'all' || product.stockStatus === stockStatus
      const matchesPrice =
        product.price.amount >= minPrice && product.price.amount <= maxPrice

      return (
        matchesKeyword &&
        matchesCategory &&
        matchesSubcategory &&
        matchesStock &&
        matchesPrice
      )
    })

    result = [...result].sort((a, b) => {
      if (sortBy === 'latest') return b.createdAt.localeCompare(a.createdAt)
      if (sortBy === 'nameAsc') return a.name[locale].localeCompare(b.name[locale])
      if (sortBy === 'priceAsc') return a.price.amount - b.price.amount
      if (sortBy === 'priceDesc') return b.price.amount - a.price.amount
      return 0
    })

    return result
  }, [categoryId, locale, maxPrice, minPrice, search, siteData.products, sortBy, stockStatus, subcategoryId])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const pageProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)

  return (
    <>
      <Seo
        title={siteData.seo.pages.products.title}
        description={siteData.seo.pages.products.description}
      />
      <section className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3">
            <h1 className="section-title">{t('products.title')}</h1>
            <p className="section-subtitle">{t('products.subtitle')}</p>
          </div>

          <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:grid-cols-[1.2fr_1fr_1fr]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  resetPage()
                }}
                placeholder={t('products.searchPlaceholder')}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </label>

            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setSubcategoryId('all')
                resetPage()
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="all">{t('products.filter.all')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name[locale]}
                </option>
              ))}
            </select>

            <select
              value={subcategoryId}
              onChange={(event) => {
                setSubcategoryId(event.target.value)
                resetPage()
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="all">{t('products.filter.all')}</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name[locale]}
                </option>
              ))}
            </select>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 md:col-span-2">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>{t('products.filter.priceRange')}</span>
                <span>
                  {minPrice} - {maxPrice} {siteData.products[0]?.price.currency}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={minPrice}
                  onChange={(event) => {
                    setMinPrice(Number(event.target.value))
                    resetPage()
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/70"
                />
                <input
                  type="number"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={maxPrice}
                  onChange={(event) => {
                    setMaxPrice(Number(event.target.value))
                    resetPage()
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/70"
                />
              </div>
            </div>

            <select
              value={stockStatus}
              onChange={(event) => {
                setStockStatus(event.target.value)
                resetPage()
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="all">{t('products.filter.all')}</option>
              <option value="in_stock">{t('products.badge.inStock')}</option>
              <option value="out_of_stock">{t('products.badge.outOfStock')}</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value)
                resetPage()
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <option value="latest">{t('products.sort.latest')}</option>
              <option value="nameAsc">{t('products.sort.nameAsc')}</option>
              <option value="priceAsc">{t('products.sort.priceAsc')}</option>
              <option value="priceDesc">{t('products.sort.priceDesc')}</option>
            </select>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pageProducts.length > 0 ? (
              pageProducts.map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <div className="col-span-full rounded-3xl border border-white/10 bg-slate-950/50 p-10 text-center text-white/60">
                {t('products.empty')}
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-sm text-white/60">
            <span>{t('products.pagination.page', { page, total: totalPages })}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="btn-ghost disabled:opacity-40"
              >
                {t('products.pagination.prev')}
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="btn-ghost disabled:opacity-40"
              >
                {t('products.pagination.next')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

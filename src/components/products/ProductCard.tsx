import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/format'
import type { Locale, Product } from '../../types/site'

interface ProductCardProps {
  product: Product
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale
  const inStock = product.stockStatus === 'in_stock'

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-lg transition hover:border-amber-400/40"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.mainImage}
          alt={product.name[locale]}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
            inStock ? 'bg-emerald-400 text-slate-900' : 'bg-rose-400 text-slate-900'
          }`}
        >
          {t(inStock ? 'products.badge.inStock' : 'products.badge.outOfStock')}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-base font-semibold text-white">{product.name[locale]}</h3>
          <p className="mt-2 text-sm text-white/60">
            {product.shortDescription[locale]}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between text-sm">
          <span className="text-amber-300">
            {formatCurrency(product.price.amount, product.price.currency, locale)}
          </span>
          <span className="text-white/50">{product.price.unit[locale]}</span>
        </div>
      </div>
    </Link>
  )
}

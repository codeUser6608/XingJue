import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { Download } from 'lucide-react'
import { useSiteData } from '../../context/SiteDataContext'
import { formatDate } from '../../utils/format'
import type { Locale } from '../../types/site'

export const AdminInquiries = () => {
  const { inquiries, siteData, updateInquiryStatus } = useSiteData()
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale
  const [statusFilter, setStatusFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return inquiries.filter((inquiry) => {
      const matchesStatus =
        statusFilter === 'all' || inquiry.status === statusFilter
      const matchesProduct =
        productFilter === 'all' || inquiry.productId === productFilter
      const createdAt = new Date(inquiry.createdAt).getTime()
      const fromTime = dateFrom ? new Date(dateFrom).getTime() : null
      const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
      const matchesDate =
        (!fromTime || createdAt >= fromTime) && (!toTime || createdAt <= toTime)
      return matchesStatus && matchesProduct && matchesDate
    })
  }, [dateFrom, dateTo, inquiries, productFilter, statusFilter])

  const exportData = () => {
    const payload = JSON.stringify(filtered, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inquiries.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="w-full max-w-full rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-white">{t('admin.inquiries.title')}</h1>
        <button type="button" onClick={exportData} className="btn-ghost">
          <Download className="h-4 w-4" />
          {t('admin.inquiries.export')}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 md:grid-rows-1">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
        >
          <option value="all">{t('products.filter.all')}</option>
          <option value="new">{t('admin.status.new')}</option>
          <option value="processing">{t('admin.status.processing')}</option>
          <option value="closed">{t('admin.status.closed')}</option>
        </select>
        <select
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
        >
          <option value="all">{t('products.filter.all')}</option>
          {siteData.products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name[locale]}
            </option>
          ))}
        </select>
        <div className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <p className="text-xs text-white/50">{t('admin.inquiries.filters.date')}</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-xs text-white/70"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-xs text-white/70"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {filtered.map((inquiry) => {
          const productName =
            siteData.products.find((product) => product.id === inquiry.productId)?.name[
              locale
            ]
          return (
            <div
              key={inquiry.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{inquiry.name}</p>
                  <p className="text-xs text-white/50">
                    {inquiry.email} · {formatDate(inquiry.createdAt, locale)}
                  </p>
                </div>
                <select
                  value={inquiry.status}
                  onChange={async (event) => {
                    try {
                      await updateInquiryStatus(inquiry.id, event.target.value as 'new' | 'processing' | 'closed')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Failed to update inquiry status')
                    }
                  }}
                  className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-white"
                >
                  <option value="new">{t('admin.status.new')}</option>
                  <option value="processing">{t('admin.status.processing')}</option>
                  <option value="closed">{t('admin.status.closed')}</option>
                </select>
              </div>
              <p className="mt-3 text-xs text-amber-300">
                {productName ?? t('products.filter.all')}
              </p>
              <p className="mt-2 text-sm text-white/60">{inquiry.message}</p>
              {inquiry.company && (
                <p className="mt-2 text-xs text-white/40">{inquiry.company}</p>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-sm text-white/50">{t('admin.empty')}</p>}
      </div>
    </section>
  )
}

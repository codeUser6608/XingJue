import { useState } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { Download, Upload, Copy } from 'lucide-react'
import { useSiteData } from '../../context/SiteDataContext'
import type { SiteData } from '../../types/site'

const siteDataSchema = z
  .object({
    locales: z.array(z.string()),
    defaultLocale: z.string(),
    settings: z
      .object({
        siteName: z.any(),
        tagline: z.any(),
        logoUrl: z.string(),
        adminPassword: z.string(),
        seoDefaults: z.any()
      })
      .passthrough(),
    hero: z
      .object({
        title: z.any(),
        subtitle: z.any(),
        ctaLabel: z.any(),
        backgroundImage: z.string()
      })
      .passthrough(),
    advantages: z.array(z.any()),
    partners: z.array(z.any()),
    tradeRegions: z.array(z.any()),
    categories: z.array(z.any()),
    featuredProductIds: z.array(z.string()),
    products: z.array(z.any()),
    about: z.any(),
    contact: z.any(),
    seo: z.any()
  })
  .passthrough()

export const AdminDataSync = () => {
  const { exportSiteData, importSiteData } = useSiteData()
  const { t } = useTranslation()
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState<string>('')

  const handleDownload = () => {
    const payload = exportSiteData()
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'site-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportSiteData())
    toast.success(t('misc.copied'))
  }

  const handleImport = () => {
    try {
      const data = JSON.parse(importText)
      const parsed = siteDataSchema.parse(data)
      // 确保 locales 是正确的类型
      const typedData = {
        ...parsed,
        locales: parsed.locales as ('en' | 'zh')[],
        defaultLocale: parsed.defaultLocale as 'en' | 'zh'
      }
      importSiteData(typedData as SiteData)
      setPreview(JSON.stringify(typedData, null, 2))
      toast.success(t('misc.updated'))
    } catch (error) {
      toast.error(t('admin.dataSync.invalidJson'))
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <h1 className="text-xl font-semibold text-white">{t('admin.dataSync.title')}</h1>
      <p className="mt-2 text-sm text-white/60">{t('admin.dataSync.exportHint')}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={handleDownload} className="btn-ghost">
          <Download className="h-4 w-4" />
          {t('actions.download')}
        </button>
        <button type="button" onClick={handleCopy} className="btn-ghost">
          <Copy className="h-4 w-4" />
          {t('actions.copy')}
        </button>
      </div>

      <textarea
        readOnly
        value={exportSiteData()}
        className="mt-4 min-h-[240px] w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-white/70"
      />

      <div className="mt-8">
        <p className="text-sm text-white/60">{t('admin.dataSync.importHint')}</p>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          className="mt-4 min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-white/70"
        />
        <button type="button" onClick={handleImport} className="btn-primary mt-4">
          <Upload className="h-4 w-4" />
          {t('actions.import')}
        </button>
      </div>

      {preview && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">
            {t('admin.dataSync.preview')}
          </p>
          <pre className="mt-3 max-h-64 overflow-auto text-xs text-white/70">{preview}</pre>
        </div>
      )}
    </section>
  )
}

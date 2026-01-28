import { useState, useRef } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { Download, Upload, Copy, FileUp } from 'lucide-react'
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
  const { exportSiteData, importSiteData, isLoading } = useSiteData()
  const { t } = useTranslation()
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast.error('请选择 JSON 文件')
      return
    }

    try {
      setIsImporting(true)
      // 读取文件内容并验证
      const text = await file.text()
      const data = JSON.parse(text)
      const parsed = siteDataSchema.parse(data)
      // 确保 locales 是正确的类型
      const typedData = {
        ...parsed,
        locales: parsed.locales as ('en' | 'zh')[],
        defaultLocale: parsed.defaultLocale as 'en' | 'zh'
      }
      
      // 使用文件上传方式导入
      await importSiteData(typedData as SiteData, file)
      setPreview(JSON.stringify(typedData, null, 2))
      toast.success(t('misc.updated'))
      
      // 清空文件选择
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to')) {
        toast.error(error.message)
      } else {
        toast.error(t('admin.dataSync.invalidJson'))
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleImport = async () => {
    try {
      setIsImporting(true)
      const data = JSON.parse(importText)
      const parsed = siteDataSchema.parse(data)
      // 确保 locales 是正确的类型
      const typedData = {
        ...parsed,
        locales: parsed.locales as ('en' | 'zh')[],
        defaultLocale: parsed.defaultLocale as 'en' | 'zh'
      }
      await importSiteData(typedData as SiteData)
      setPreview(JSON.stringify(typedData, null, 2))
      toast.success(t('misc.updated'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to')) {
        toast.error(error.message)
      } else {
        toast.error(t('admin.dataSync.invalidJson'))
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="w-full max-w-full rounded-3xl border border-white/10 bg-slate-950/60 p-6">
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
        className="mt-4 min-h-[240px] w-full max-w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-white/70 overflow-x-auto"
      />

      <div className="mt-8 w-full max-w-full">
        <p className="text-sm text-white/60">{t('admin.dataSync.importHint')}</p>
        
        {/* 文件上传方式（推荐） */}
        <div className="mt-4">
          <label className="block text-sm text-white/70 mb-2">上传 JSON 文件（推荐）</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            disabled={isImporting || isLoading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white/80 cursor-pointer transition-opacity hover:opacity-80 ${
              isImporting || isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FileUp className="h-4 w-4" />
            {isImporting ? t('misc.loading') : '选择文件上传'}
          </label>
        </div>

        {/* 文本粘贴方式（备用） */}
        <div className="mt-4">
          <label className="block text-sm text-white/70 mb-2">或粘贴 JSON 文本</label>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className="mt-2 min-h-[180px] w-full max-w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-white/70 overflow-x-auto"
            placeholder="粘贴 JSON 数据..."
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || isLoading || !importText.trim()}
            className="btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? t('misc.loading') : t('actions.import')}
          </button>
        </div>
      </div>

      {preview && (
        <div className="mt-6 w-full max-w-full rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">
            {t('admin.dataSync.preview')}
          </p>
          <pre className="mt-3 max-h-64 w-full max-w-full overflow-auto text-xs text-white/70 whitespace-pre-wrap break-words">{preview}</pre>
        </div>
      )}
    </section>
  )
}

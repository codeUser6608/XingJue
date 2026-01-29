import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import rawSiteData from '../data/site-data.json'
import type { SiteData } from '../types/site'

// 直接从 JSON 文件导入数据
const getDefaultData = (): SiteData => rawSiteData as SiteData

interface SiteDataContextValue {
  siteData: SiteData
  isLoading: boolean
}

const SiteDataContext = createContext<SiteDataContextValue | null>(null)

export const SiteDataProvider = ({ children }: { children: ReactNode }) => {
  // 直接使用导入的数据，无需异步加载
  const [siteData] = useState<SiteData>(getDefaultData())
  const [isLoading] = useState(false)

  const value = useMemo(
    () => ({
      siteData,
      isLoading
    }),
    [siteData]
  )

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>
}

export const useSiteData = () => {
  const context = useContext(SiteDataContext)
  if (!context) {
    throw new Error('useSiteData must be used within SiteDataProvider')
  }
  return context
}

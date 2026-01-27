import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import rawSiteData from '../data/site-data.json'
import type { Inquiry, Product, SiteData } from '../types/site'

const STORAGE_KEY = 'xj-site-data-v1'
const INQUIRIES_KEY = 'xj-inquiries-v1'

const getDefaultData = (): SiteData => rawSiteData as SiteData

const getStoredData = (): SiteData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return getDefaultData()
    return JSON.parse(stored) as SiteData
  } catch {
    return getDefaultData()
  }
}

const getStoredInquiries = (): Inquiry[] => {
  try {
    const stored = localStorage.getItem(INQUIRIES_KEY)
    if (!stored) return []
    return JSON.parse(stored) as Inquiry[]
  } catch {
    return []
  }
}

const saveData = (data: SiteData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2))
}

const saveInquiries = (inquiries: Inquiry[]) => {
  localStorage.setItem(INQUIRIES_KEY, JSON.stringify(inquiries, null, 2))
}

interface SiteDataContextValue {
  siteData: SiteData
  setSiteData: (data: SiteData) => void
  upsertProduct: (product: Product) => void
  deleteProduct: (productId: string) => void
  inquiries: Inquiry[]
  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => void
  updateInquiryStatus: (id: string, status: Inquiry['status']) => void
  exportSiteData: () => string
  importSiteData: (data: SiteData) => void
}

const SiteDataContext = createContext<SiteDataContextValue | null>(null)

export const SiteDataProvider = ({ children }: { children: ReactNode }) => {
  const [siteData, setSiteDataState] = useState<SiteData>(getDefaultData())
  const [inquiries, setInquiries] = useState<Inquiry[]>([])

  useEffect(() => {
    setSiteDataState(getStoredData())
    setInquiries(getStoredInquiries())
  }, [])

  const setSiteData = (data: SiteData) => {
    setSiteDataState(data)
    saveData(data)
  }

  const upsertProduct = (product: Product) => {
    setSiteDataState((prev) => {
      const existingIndex = prev.products.findIndex((item) => item.id === product.id)
      const products =
        existingIndex >= 0
          ? prev.products.map((item) => (item.id === product.id ? product : item))
          : [product, ...prev.products]
      const next = { ...prev, products }
      saveData(next)
      return next
    })
  }

  const deleteProduct = (productId: string) => {
    setSiteDataState((prev) => {
      const next = { ...prev, products: prev.products.filter((item) => item.id !== productId) }
      saveData(next)
      return next
    })
  }

  const addInquiry = (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const nextInquiry: Inquiry = {
      ...inquiry,
      id,
      createdAt: new Date().toISOString(),
      status: 'new'
    }
    setInquiries((prev) => {
      const next = [nextInquiry, ...prev]
      saveInquiries(next)
      return next
    })
  }

  const updateInquiryStatus = (id: string, status: Inquiry['status']) => {
    setInquiries((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, status } : item))
      saveInquiries(next)
      return next
    })
  }

  const exportSiteData = () => JSON.stringify(siteData, null, 2)

  const importSiteData = (data: SiteData) => {
    setSiteDataState(data)
    saveData(data)
  }

  const value = useMemo(
    () => ({
      siteData,
      setSiteData,
      upsertProduct,
      deleteProduct,
      inquiries,
      addInquiry,
      updateInquiryStatus,
      exportSiteData,
      importSiteData
    }),
    [siteData, inquiries]
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

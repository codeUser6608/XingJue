import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import rawSiteData from '../data/site-data.json'
import type { Inquiry, Product, SiteData } from '../types/site'
import { api } from '../utils/api'

// 默认数据作为后备（仅在 API 失败时使用）
const getDefaultData = (): SiteData => rawSiteData as SiteData

// localStorage 后备方案（用于 GitHub Pages 部署时 API 不可用的情况）
const STORAGE_KEY = 'xj-site-data-v1'
const INQUIRIES_KEY = 'xj-inquiries-v1'

const getStoredData = (): SiteData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as SiteData
  } catch {
    return null
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

const saveDataToStorage = (data: SiteData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

const saveInquiriesToStorage = (inquiries: Inquiry[]) => {
  try {
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(inquiries, null, 2))
  } catch (error) {
    console.error('Failed to save inquiries to localStorage:', error)
  }
}

interface SiteDataContextValue {
  siteData: SiteData
  isLoading: boolean
  error: string | null
  setSiteData: (data: SiteData) => Promise<void>
  upsertProduct: (product: Product) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
  inquiries: Inquiry[]
  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => Promise<void>
  updateInquiryStatus: (id: string, status: Inquiry['status']) => Promise<void>
  exportSiteData: () => string
  importSiteData: (data: SiteData) => Promise<void>
  refreshData: () => Promise<void>
}

const SiteDataContext = createContext<SiteDataContextValue | null>(null)

export const SiteDataProvider = ({ children }: { children: ReactNode }) => {
  const [siteData, setSiteDataState] = useState<SiteData>(getDefaultData())
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 从服务器加载数据，如果失败则使用 localStorage 后备
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [siteDataResponse, inquiriesResponse] = await Promise.all([
        api.getSiteData(),
        api.getInquiries()
      ])
      setSiteDataState(siteDataResponse)
      setInquiries(inquiriesResponse)
      // 同步到 localStorage 作为后备
      saveDataToStorage(siteDataResponse)
      saveInquiriesToStorage(inquiriesResponse)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      console.warn('Failed to load data from server, using fallback:', err)
      
      // 尝试从 localStorage 加载
      const storedData = getStoredData()
      const storedInquiries = getStoredInquiries()
      
      if (storedData) {
        setSiteDataState(storedData)
        setInquiries(storedInquiries)
        setError(`Using cached data (server unavailable: ${errorMessage})`)
      } else {
        // 如果 localStorage 也没有，使用默认数据
        setSiteDataState(getDefaultData())
        setInquiries([])
        setError(`Using default data (server and cache unavailable: ${errorMessage})`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshData = async () => {
    await loadData()
  }

  const setSiteData = async (data: SiteData) => {
    try {
      setSiteDataState(data)
      // 先保存到 localStorage 作为后备
      saveDataToStorage(data)
      // 尝试保存到服务器
      try {
        await api.updateSiteData(data)
      } catch (serverError) {
        console.warn('Failed to save to server, data saved to localStorage:', serverError)
        // 如果服务器保存失败，数据已经保存到 localStorage，不抛出错误
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save site data'
      setError(errorMessage)
      throw err
    }
  }

  const upsertProduct = async (product: Product) => {
    try {
      const existingIndex = siteData.products.findIndex((item) => item.id === product.id)
      const products =
        existingIndex >= 0
          ? siteData.products.map((item) => (item.id === product.id ? product : item))
          : [product, ...siteData.products]
      const next = { ...siteData, products }
      setSiteDataState(next)
      // 先保存到 localStorage
      saveDataToStorage(next)
      // 尝试保存到服务器
      try {
        await api.updateSiteData(next)
      } catch (serverError) {
        console.warn('Failed to save product to server, saved to localStorage:', serverError)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product'
      setError(errorMessage)
      throw err
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      const next = { ...siteData, products: siteData.products.filter((item) => item.id !== productId) }
      setSiteDataState(next)
      // 先保存到 localStorage
      saveDataToStorage(next)
      // 尝试保存到服务器
      try {
        await api.updateSiteData(next)
      } catch (serverError) {
        console.warn('Failed to delete product on server, saved to localStorage:', serverError)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product'
      setError(errorMessage)
      throw err
    }
  }

  const addInquiry = async (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => {
    try {
      // 尝试通过 API 创建
      try {
        const newInquiry = await api.createInquiry(inquiry)
        setInquiries((prev) => {
          const next = [newInquiry, ...prev]
          saveInquiriesToStorage(next)
          return next
        })
      } catch (serverError) {
        // 如果服务器不可用，使用本地生成
        console.warn('Failed to create inquiry on server, using local storage:', serverError)
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto 
          ? crypto.randomUUID() 
          : `${Date.now()}-${Math.random()}`
        const newInquiry: Inquiry = {
          ...inquiry,
          id,
          createdAt: new Date().toISOString(),
          status: 'new'
        }
        setInquiries((prev) => {
          const next = [newInquiry, ...prev]
          saveInquiriesToStorage(next)
          return next
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create inquiry'
      setError(errorMessage)
      throw err
    }
  }

  const updateInquiryStatus = async (id: string, status: Inquiry['status']) => {
    try {
      // 先更新本地状态
      setInquiries((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, status } : item))
        saveInquiriesToStorage(next)
        return next
      })
      // 尝试更新服务器
      try {
        await api.updateInquiryStatus(id, status)
      } catch (serverError) {
        console.warn('Failed to update inquiry on server, updated in localStorage:', serverError)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update inquiry'
      setError(errorMessage)
      throw err
    }
  }

  const exportSiteData = () => JSON.stringify(siteData, null, 2)

  const importSiteData = async (data: SiteData) => {
    try {
      setSiteDataState(data)
      // 先保存到 localStorage
      saveDataToStorage(data)
      // 尝试保存到服务器
      try {
        await api.updateSiteData(data)
      } catch (serverError) {
        console.warn('Failed to import to server, saved to localStorage:', serverError)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import site data'
      setError(errorMessage)
      throw err
    }
  }

  const value = useMemo(
    () => ({
      siteData,
      isLoading,
      error,
      setSiteData,
      upsertProduct,
      deleteProduct,
      inquiries,
      addInquiry,
      updateInquiryStatus,
      exportSiteData,
      importSiteData,
      refreshData
    }),
    [siteData, inquiries, isLoading, error]
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

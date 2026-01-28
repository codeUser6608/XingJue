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
  importSiteData: (data: SiteData, file?: File) => Promise<void>
  refreshData: () => Promise<void>
}

const SiteDataContext = createContext<SiteDataContextValue | null>(null)

export const SiteDataProvider = ({ children }: { children: ReactNode }) => {
  const [siteData, setSiteDataState] = useState<SiteData>(getDefaultData())
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 检查数据是否有实际内容（不是只有默认的空值）
  const hasRealData = (data: SiteData): boolean => {
    return !!(
      data?.settings?.siteName?.en?.trim() ||
      data?.hero?.title?.en?.trim() ||
      (data?.products && data.products.length > 0)
    )
  }

  // 从服务器加载数据，如果失败则使用 localStorage 后备
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [siteDataResponse, inquiriesResponse] = await Promise.all([
        api.getSiteData(),
        api.getInquiries()
      ])
      
      // 检查返回的数据是否有实际内容
      if (hasRealData(siteDataResponse)) {
        setSiteDataState(siteDataResponse)
        setInquiries(inquiriesResponse)
        // 同步到 localStorage 作为后备
        saveDataToStorage(siteDataResponse)
        saveInquiriesToStorage(inquiriesResponse)
      } else {
        // 如果后端返回的是空数据，尝试使用 localStorage 或默认数据
        console.warn('Server returned empty data, trying fallback...')
        const storedData = getStoredData()
        const storedInquiries = getStoredInquiries()
        
        if (storedData && hasRealData(storedData)) {
          setSiteDataState(storedData)
          setInquiries(storedInquiries)
          setError('Using cached data (server returned empty data)')
        } else {
          // 使用默认数据
          const defaultData = getDefaultData()
          setSiteDataState(defaultData)
          setInquiries([])
          // 保存默认数据到 localStorage
          saveDataToStorage(defaultData)
          setError('Using default data (server returned empty data)')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      console.warn('Failed to load data from server, using fallback:', err)
      
      // 尝试从 localStorage 加载
      const storedData = getStoredData()
      const storedInquiries = getStoredInquiries()
      
      if (storedData && hasRealData(storedData)) {
        setSiteDataState(storedData)
        setInquiries(storedInquiries)
        setError(`Using cached data (server unavailable: ${errorMessage})`)
      } else {
        // 如果 localStorage 也没有，使用默认数据
        const defaultData = getDefaultData()
        setSiteDataState(defaultData)
        setInquiries([])
        // 保存默认数据到 localStorage
        saveDataToStorage(defaultData)
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
      // 使用新的部分更新 API（只更新单个产品）
      try {
        await api.upsertProduct(product)
        // 更新本地状态
        const existingIndex = siteData.products.findIndex((item) => item.id === product.id)
        const products =
          existingIndex >= 0
            ? siteData.products.map((item) => (item.id === product.id ? product : item))
            : [product, ...siteData.products]
        const next = { ...siteData, products }
        setSiteDataState(next)
        // 同步到 localStorage
        saveDataToStorage(next)
      } catch (serverError) {
        // 如果服务器更新失败，回退到整体更新（向后兼容）
        console.warn('Partial update failed, falling back to full update:', serverError)
        const existingIndex = siteData.products.findIndex((item) => item.id === product.id)
        const products =
          existingIndex >= 0
            ? siteData.products.map((item) => (item.id === product.id ? product : item))
            : [product, ...siteData.products]
        const next = { ...siteData, products }
        setSiteDataState(next)
        saveDataToStorage(next)
        try {
          await api.updateSiteData(next)
        } catch (fallbackError) {
          console.warn('Failed to save product to server, saved to localStorage:', fallbackError)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product'
      setError(errorMessage)
      throw err
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      // 使用新的删除 API
      try {
        await api.deleteProduct(productId)
        // 更新本地状态
        const next = { ...siteData, products: siteData.products.filter((item) => item.id !== productId) }
        setSiteDataState(next)
        // 同步到 localStorage
        saveDataToStorage(next)
      } catch (serverError) {
        // 如果服务器删除失败，回退到整体更新（向后兼容）
        console.warn('Partial delete failed, falling back to full update:', serverError)
        const next = { ...siteData, products: siteData.products.filter((item) => item.id !== productId) }
        setSiteDataState(next)
        saveDataToStorage(next)
        try {
          await api.updateSiteData(next)
        } catch (fallbackError) {
          console.warn('Failed to delete product on server, saved to localStorage:', fallbackError)
        }
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

  const importSiteData = async (data: SiteData, file?: File) => {
    try {
      // 如果提供了文件，优先使用文件上传方式（避免 413 错误和 CORS 问题）
      if (file) {
        try {
          await api.uploadSiteData(file)
          console.log('✅ Data successfully uploaded to server via file upload')
        } catch (uploadError) {
          // 如果文件上传失败（可能是 413 或 CORS），自动回退到部分更新方式
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error'
          const is413Error = errorMessage.includes('413') || 
                            errorMessage.includes('Content Too Large') ||
                            errorMessage.includes('文件太大')
          const isNetworkError = uploadError instanceof TypeError && 
                                (errorMessage.includes('Failed to fetch') || 
                                 errorMessage.includes('网络错误'))
          
          if (is413Error || isNetworkError) {
            console.warn('File upload failed, falling back to partial updates:', uploadError)
            // 回退到部分更新方式
            try {
              // 分别更新各个部分
              await Promise.all([
                api.updateSiteSection('locales', data.locales),
                api.updateSiteSection('defaultLocale', data.defaultLocale),
                api.updateSiteSection('settings', data.settings),
                api.updateSiteSection('hero', data.hero),
                api.updateSiteSection('advantages', data.advantages),
                api.updateSiteSection('partners', data.partners),
                api.updateSiteSection('tradeRegions', data.tradeRegions),
                api.updateSiteSection('categories', data.categories),
                api.updateSiteSection('featuredProductIds', data.featuredProductIds),
                api.updateSiteSection('about', data.about),
                api.updateSiteSection('contact', data.contact),
                api.updateSiteSection('seo', data.seo)
              ])
              
              // 分批更新产品（避免一次性更新太多）
              const batchSize = 10
              for (let i = 0; i < data.products.length; i += batchSize) {
                const batch = data.products.slice(i, i + batchSize)
                await Promise.all(batch.map(product => api.upsertProduct(product)))
              }
              
              console.log('✅ Data successfully saved to server using partial updates (fallback)')
            } catch (partialError) {
              console.error('Failed to import using partial updates:', partialError)
              throw new Error(`文件上传失败，且部分更新也失败: ${partialError instanceof Error ? partialError.message : 'Unknown error'}`)
            }
          } else {
            // 其他错误，直接抛出
            console.error('Failed to upload file:', uploadError)
            throw new Error(`文件上传失败: ${errorMessage}`)
          }
        }
      } else {
        // 如果没有文件，使用原来的方式（向后兼容）
        // 先保存到服务器
        // 如果遇到 413 错误，尝试使用部分更新
        try {
          await api.updateSiteData(data)
          console.log('✅ Data successfully saved to server')
        } catch (serverError) {
          // 检查是否是 413 错误（内容太大）或网络错误（可能是 CORS 或 413）
          const errorMessage = serverError instanceof Error ? serverError.message : 'Unknown error'
          const is413Error = errorMessage.includes('413') || 
                            errorMessage.includes('Content Too Large') ||
                            errorMessage.includes('Request too large')
          
          // 如果是网络错误，也可能是 413（因为 413 可能导致 CORS 预检失败）
          const isNetworkError = serverError instanceof TypeError && 
                                (errorMessage.includes('Failed to fetch') || 
                                 errorMessage.includes('NetworkError'))
          
          if (is413Error || isNetworkError) {
            console.warn('Data too large for single request, using partial updates...')
            // 使用部分更新 API
            try {
              // 分别更新各个部分
              await Promise.all([
                api.updateSiteSection('locales', data.locales),
                api.updateSiteSection('defaultLocale', data.defaultLocale),
                api.updateSiteSection('settings', data.settings),
                api.updateSiteSection('hero', data.hero),
                api.updateSiteSection('advantages', data.advantages),
                api.updateSiteSection('partners', data.partners),
                api.updateSiteSection('tradeRegions', data.tradeRegions),
                api.updateSiteSection('categories', data.categories),
                api.updateSiteSection('featuredProductIds', data.featuredProductIds),
                api.updateSiteSection('about', data.about),
                api.updateSiteSection('contact', data.contact),
                api.updateSiteSection('seo', data.seo)
              ])
              
              // 分批更新产品（避免一次性更新太多）
              const batchSize = 10
              for (let i = 0; i < data.products.length; i += batchSize) {
                const batch = data.products.slice(i, i + batchSize)
                await Promise.all(batch.map(product => api.upsertProduct(product)))
              }
              
              console.log('✅ Data successfully saved to server using partial updates')
            } catch (partialError) {
              console.error('Failed to import using partial updates:', partialError)
              throw new Error(`Failed to save to server (data too large): ${partialError instanceof Error ? partialError.message : 'Unknown error'}`)
            }
          } else {
            // 其他错误
            console.error('Failed to import to server:', serverError)
            throw new Error(`Failed to save to server: ${errorMessage}`)
          }
        }
      }
      
      // 服务器保存成功后，更新本地状态和 localStorage
      setSiteDataState(data)
      saveDataToStorage(data)
      
      // 刷新数据以确保同步
      await refreshData()
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

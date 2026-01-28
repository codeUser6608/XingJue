import { put, head, del, list } from '@vercel/blob'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 检查 Blob Storage 是否可用
const isBlobAvailable = () => {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

// Blob 存储路径前缀
const BLOB_PREFIX = 'xingjue-data'

// 构建 Blob 路径
const getBlobPath = (filename) => `${BLOB_PREFIX}/${filename}`

// 从 Blob 读取 JSON 文件
const readJsonBlob = async (filename, defaultValue = null) => {
  if (!isBlobAvailable()) {
    return defaultValue
  }

  try {
    const blobPath = getBlobPath(filename)
    
    // 使用 head 检查文件是否存在并获取 URL
    let blobInfo
    try {
      blobInfo = await head(blobPath)
    } catch (error) {
      // 文件不存在，返回默认值
      return defaultValue
    }

    // 如果文件存在，使用 fetch 获取内容
    // blobInfo.url 是公开访问的 URL
    if (!blobInfo || !blobInfo.url) {
      return defaultValue
    }
    
    const response = await fetch(blobInfo.url)
    if (!response.ok) {
      return defaultValue
    }
    const text = await response.text().trim()
    
    // 对于 defaultLocale，特殊处理可能的双重序列化问题
    if (filename === 'defaultLocale.json') {
      try {
        const parsed = JSON.parse(text)
        // 如果解析后仍然是字符串（可能是双重序列化），再次解析
        if (typeof parsed === 'string' && parsed.startsWith('"') && parsed.endsWith('"')) {
          try {
            return JSON.parse(parsed)
          } catch {
            // 如果再次解析失败，返回解析后的值
            return parsed
          }
        }
        return parsed
      } catch (error) {
        // 如果解析失败，尝试直接返回内容（去除引号）
        console.warn(`Error parsing defaultLocale blob, trying to extract string value:`, error)
        const trimmed = text.replace(/^["']|["']$/g, '')
        return trimmed || defaultValue
      }
    }
    
    return JSON.parse(text)
  } catch (error) {
    console.error(`Error reading blob ${filename}:`, error)
    return defaultValue
  }
}

// 写入 JSON 到 Blob
const writeJsonBlob = async (filename, data) => {
  if (!isBlobAvailable()) {
    throw new Error('Blob Storage not available')
  }

  try {
    const blobPath = getBlobPath(filename)
    
    // 对于 defaultLocale，如果值是字符串，直接写入字符串值（不带 JSON.stringify）
    // 因为 defaultLocale.json 应该只包含字符串值，而不是 JSON 对象
    let content
    if (filename === 'defaultLocale.json' && typeof data === 'string') {
      // 如果字符串已经是 JSON 字符串（带引号），先解析再写入
      let value = data
      try {
        // 检查是否是双重序列化的字符串
        const parsed = JSON.parse(data)
        if (typeof parsed === 'string') {
          value = parsed
        }
      } catch {
        // 不是 JSON 字符串，直接使用原值
      }
      content = JSON.stringify(value)
    } else {
      content = JSON.stringify(data, null, 2)
    }
    
    await put(blobPath, content, {
      access: 'public',
      addRandomSuffix: false
    })
    return true
  } catch (error) {
    console.error(`Error writing blob ${filename}:`, error)
    throw new Error(`Failed to write ${filename}`)
  }
}

// 删除 Blob
const deleteBlob = async (filename) => {
  if (!isBlobAvailable()) {
    return false
  }

  try {
    const blobPath = getBlobPath(filename)
    await del(blobPath)
    return true
  } catch (error) {
    console.error(`Error deleting blob ${filename}:`, error)
    return false
  }
}

// 列出所有 Blob（用于获取产品列表等）
const listBlobs = async (prefix) => {
  if (!isBlobAvailable()) {
    return []
  }

  try {
    const fullPrefix = `${BLOB_PREFIX}/${prefix}`
    const { blobs } = await list({ prefix: fullPrefix })
    return blobs.map(blob => blob.pathname.replace(`${BLOB_PREFIX}/`, ''))
  } catch (error) {
    console.error(`Error listing blobs with prefix ${prefix}:`, error)
    return []
  }
}

// 默认数据结构
const getDefaultSettings = () => ({
  siteName: { en: '', zh: '' },
  tagline: { en: '', zh: '' },
  logoUrl: '',
  adminPassword: '',
  seoDefaults: {
    title: { en: '', zh: '' },
    description: { en: '', zh: '' }
  },
  twitterHandle: ''
})

const getDefaultHero = () => ({
  title: { en: '', zh: '' },
  subtitle: { en: '', zh: '' },
  ctaLabel: { en: '', zh: '' },
  backgroundImage: '',
  backgroundVideo: ''
})

const getDefaultContact = () => ({
  phone: '',
  email: '',
  whatsapp: '',
  address: { en: '', zh: '' },
  hours: { en: '', zh: '' },
  map: { lat: 0, lng: 0, zoom: 10 },
  socials: []
})

const getDefaultAbout = () => ({
  overview: { en: '', zh: '' }
})

// 获取完整站点数据
export const getSiteData = async () => {
  try {
    const [
      locales,
      defaultLocale,
      settings,
      hero,
      advantages,
      partners,
      tradeRegions,
      categories,
      featuredProductIds,
      about,
      contact,
      seo
    ] = await Promise.all([
      readJsonBlob('locales.json', ['en', 'zh']),
      readJsonBlob('defaultLocale.json', 'en'),
      readJsonBlob('settings.json', null),
      readJsonBlob('hero.json', null),
      readJsonBlob('advantages.json', []),
      readJsonBlob('partners.json', []),
      readJsonBlob('tradeRegions.json', []),
      readJsonBlob('categories.json', []),
      readJsonBlob('featuredProductIds.json', []),
      readJsonBlob('about.json', null),
      readJsonBlob('contact.json', null),
      readJsonBlob('seo.json', null)
    ])

    // 获取所有产品
    const products = await getAllProducts()

    // 合并默认值，确保嵌套结构完整（深度合并）
    const defaultSettings = getDefaultSettings()
    const defaultHero = getDefaultHero()
    const defaultContact = getDefaultContact()
    const defaultAbout = getDefaultAbout()

    // 深度合并函数
    const deepMerge = (target, source) => {
      if (!source || typeof source !== 'object') return target
      const result = { ...target }
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key])
        } else {
          result[key] = source[key]
        }
      }
      return result
    }

    // 确保 seo.pages 有完整的结构
    const defaultSeo = {
      pages: {
        home: { title: { en: '', zh: '' }, description: { en: '', zh: '' } },
        products: { title: { en: '', zh: '' }, description: { en: '', zh: '' } },
        about: { title: { en: '', zh: '' }, description: { en: '', zh: '' } },
        contact: { title: { en: '', zh: '' }, description: { en: '', zh: '' } },
        admin: { title: { en: '', zh: '' }, description: { en: '', zh: '' } }
      }
    }
    
    const mergedSeo = seo ? deepMerge(defaultSeo, seo) : defaultSeo

    return {
      locales: locales || ['en', 'zh'],
      defaultLocale: defaultLocale || 'en',
      settings: settings ? deepMerge(defaultSettings, settings) : defaultSettings,
      hero: hero ? deepMerge(defaultHero, hero) : defaultHero,
      advantages: advantages || [],
      partners: partners || [],
      tradeRegions: tradeRegions || [],
      categories: categories || [],
      featuredProductIds: featuredProductIds || [],
      products: products,
      about: about ? deepMerge(defaultAbout, about) : defaultAbout,
      contact: contact ? deepMerge(defaultContact, contact) : defaultContact,
      seo: mergedSeo
    }
  } catch (error) {
    console.error('Error getting site data:', error)
    throw new Error('Failed to get site data')
  }
}

// 更新站点数据的指定部分
export const updateSiteSection = async (section, data) => {
  const fileMap = {
    settings: 'settings.json',
    hero: 'hero.json',
    advantages: 'advantages.json',
    partners: 'partners.json',
    tradeRegions: 'tradeRegions.json',
    categories: 'categories.json',
    featuredProductIds: 'featuredProductIds.json',
    about: 'about.json',
    contact: 'contact.json',
    seo: 'seo.json',
    locales: 'locales.json',
    defaultLocale: 'defaultLocale.json'
  }

  const filename = fileMap[section]
  if (!filename) {
    throw new Error(`Invalid section: ${section}`)
  }

  try {
    await writeJsonBlob(filename, data)
    return true
  } catch (error) {
    console.error(`Error updating site section ${section}:`, error)
    throw new Error(`Failed to update ${section}`)
  }
}

// 获取单个产品
export const getProduct = async (id) => {
  try {
    return await readJsonBlob(`products/${id}.json`, null)
  } catch (error) {
    console.error(`Error getting product ${id}:`, error)
    return null
  }
}

// 获取所有产品
export const getAllProducts = async () => {
  try {
    const productIds = await readJsonBlob('productIds.json', [])
    if (productIds.length === 0) {
      return []
    }

    // 并行读取所有产品文件
    const productPromises = productIds.map(id => getProduct(id))
    const products = await Promise.all(productPromises)

    // 过滤掉 null 值
    return products.filter(p => p !== null)
  } catch (error) {
    console.error('Error getting all products:', error)
    return []
  }
}

// 创建或更新产品
export const upsertProduct = async (product) => {
  try {
    // 保存产品到单独文件
    await writeJsonBlob(`products/${product.id}.json`, product)

    // 更新产品 ID 列表
    const productIds = await readJsonBlob('productIds.json', [])
    if (!productIds.includes(product.id)) {
      productIds.push(product.id)
      await writeJsonBlob('productIds.json', productIds)
    }

    return product
  } catch (error) {
    console.error(`Error upserting product ${product.id}:`, error)
    throw new Error('Failed to upsert product')
  }
}

// 删除产品
export const deleteProduct = async (id) => {
  try {
    // 删除产品文件
    await deleteBlob(`products/${id}.json`)

    // 从产品 ID 列表中移除
    const productIds = await readJsonBlob('productIds.json', [])
    const updatedProductIds = productIds.filter(pid => pid !== id)
    await writeJsonBlob('productIds.json', updatedProductIds)

    // 从 featuredProductIds 中移除
    const featuredIds = await readJsonBlob('featuredProductIds.json', [])
    const updatedFeaturedIds = featuredIds.filter(pid => pid !== id)
    await writeJsonBlob('featuredProductIds.json', updatedFeaturedIds)

    return true
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error)
    throw new Error('Failed to delete product')
  }
}

// 获取所有询盘
export const getInquiries = async () => {
  try {
    const inquiryIds = await readJsonBlob('inquiryIds.json', [])
    if (inquiryIds.length === 0) {
      return []
    }

    // 并行读取所有询盘文件
    const inquiryPromises = inquiryIds.map(id => 
      readJsonBlob(`inquiries/${id}.json`, null)
    )
    const inquiries = await Promise.all(inquiryPromises)

    // 过滤掉 null 值并按创建时间排序（最新的在前）
    return inquiries.filter(i => i !== null).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  } catch (error) {
    console.error('Error getting inquiries:', error)
    return []
  }
}

// 创建询盘
export const createInquiry = async (inquiry) => {
  try {
    const id = inquiry.id || `inq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newInquiry = {
      ...inquiry,
      id,
      createdAt: inquiry.createdAt || new Date().toISOString(),
      status: inquiry.status || 'new'
    }

    // 保存询盘到单独文件
    await writeJsonBlob(`inquiries/${id}.json`, newInquiry)

    // 更新询盘 ID 列表
    const inquiryIds = await readJsonBlob('inquiryIds.json', [])
    if (!inquiryIds.includes(id)) {
      inquiryIds.unshift(id) // 添加到开头
      await writeJsonBlob('inquiryIds.json', inquiryIds)
    }

    return newInquiry
  } catch (error) {
    console.error('Error creating inquiry:', error)
    throw new Error('Failed to create inquiry')
  }
}

// 更新询盘
export const updateInquiry = async (id, updates) => {
  try {
    const inquiry = await readJsonBlob(`inquiries/${id}.json`, null)
    if (!inquiry) {
      throw new Error('Inquiry not found')
    }

    const updatedInquiry = {
      ...inquiry,
      ...updates
    }

    await writeJsonBlob(`inquiries/${id}.json`, updatedInquiry)
    return updatedInquiry
  } catch (error) {
    console.error(`Error updating inquiry ${id}:`, error)
    throw new Error('Failed to update inquiry')
  }
}

// 初始化默认数据（从模板文件）
export const initializeDefaultData = async (defaultData) => {
  try {
    // 检查是否已初始化（检查是否有实际内容，而不是只有默认值）
    const existing = await readJsonBlob('settings.json', null)
    const hasRealData = existing && 
      existing.siteName && 
      existing.siteName.en && 
      existing.siteName.en.trim() !== ''
    
    if (hasRealData) {
      console.log('Data already initialized, skipping...')
      return
    }

    // 初始化各个部分
    await Promise.all([
      updateSiteSection('locales', defaultData.locales || ['en', 'zh']),
      updateSiteSection('defaultLocale', defaultData.defaultLocale || 'en'),
      updateSiteSection('settings', defaultData.settings || {}),
      updateSiteSection('hero', defaultData.hero || {}),
      updateSiteSection('advantages', defaultData.advantages || []),
      updateSiteSection('partners', defaultData.partners || []),
      updateSiteSection('tradeRegions', defaultData.tradeRegions || []),
      updateSiteSection('categories', defaultData.categories || []),
      updateSiteSection('featuredProductIds', defaultData.featuredProductIds || []),
      updateSiteSection('about', defaultData.about || {}),
      updateSiteSection('contact', defaultData.contact || {}),
      updateSiteSection('seo', defaultData.seo || { pages: {} })
    ])

    // 初始化产品
    if (defaultData.products && Array.isArray(defaultData.products)) {
      const productIds = []
      for (const product of defaultData.products) {
        await upsertProduct(product)
        productIds.push(product.id)
      }
      await writeJsonBlob('productIds.json', productIds)
    }

    // 初始化询盘列表
    await writeJsonBlob('inquiryIds.json', [])

    console.log('Default data initialized successfully')
  } catch (error) {
    console.error('Error initializing default data:', error)
    throw error
  }
}


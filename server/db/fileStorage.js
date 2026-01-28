import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Vercel Serverless Functions 环境：使用 /tmp 目录（可写）
// 本地开发环境：使用项目目录
const isVercel = process.env.VERCEL === '1'
const DATA_DIR = isVercel ? '/tmp/xingjue-data' : join(__dirname, '../data')

// 确保数据目录存在
const ensureDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    try {
      mkdirSync(DATA_DIR, { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
    }
  }
}

ensureDataDir()

// 文件路径
const getFilePath = (filename) => join(DATA_DIR, filename)

// 读取 JSON 文件
const readJsonFile = (filename, defaultValue = null) => {
  try {
    const filePath = getFilePath(filename)
    if (!existsSync(filePath)) {
      console.log(`[readJsonFile] File not found: ${filename}, returning default:`, defaultValue)
      return defaultValue
    }
    const content = readFileSync(filePath, 'utf-8').trim()
    
    // 如果文件内容为空，返回默认值
    if (!content || content.length === 0) {
      console.log(`[readJsonFile] File is empty: ${filename}, returning default:`, defaultValue)
      return defaultValue
    }
    
    // 对于 defaultLocale，特殊处理可能的双重序列化问题
    if (filename === 'defaultLocale.json') {
      try {
        // 先尝试直接解析
        let parsed = JSON.parse(content)
        
        // 如果解析后仍然是字符串，检查是否是双重序列化
        if (typeof parsed === 'string') {
          // 检查字符串是否看起来像 JSON 字符串（以引号开头和结尾）
          const trimmed = parsed.trim()
          if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
            try {
              // 尝试再次解析（双重序列化的情况）
              const doubleParsed = JSON.parse(parsed)
              if (typeof doubleParsed === 'string') {
                console.log(`[defaultLocale] Detected double-serialized JSON, extracted: "${doubleParsed}"`)
                return doubleParsed
              }
            } catch {
              // 如果再次解析失败，可能是正常的带引号的字符串，去除外层引号
              console.log(`[defaultLocale] Removing outer quotes from: "${parsed}"`)
              return parsed.slice(1, -1)
            }
          }
        }
        
        return parsed
      } catch (error) {
        // 如果解析失败，尝试直接返回内容（去除引号）
        console.warn(`[defaultLocale] Error parsing JSON, trying to extract string value:`, error.message)
        console.warn(`[defaultLocale] Raw content:`, content)
        
        // 尝试多种方式提取字符串值
        let trimmed = content.trim()
        
        // 去除外层引号
        trimmed = trimmed.replace(/^["']|["']$/g, '')
        
        // 如果仍然包含转义引号，尝试解析
        if (trimmed.includes('\\"')) {
          try {
            return JSON.parse(`"${trimmed}"`)
          } catch {
            // 如果还是失败，返回去除引号后的值
          }
        }
        
        return trimmed || defaultValue
      }
    }
    
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error)
    return defaultValue
  }
}

// 写入 JSON 文件
const writeJsonFile = (filename, data) => {
  try {
    const filePath = getFilePath(filename)
    ensureDataDir()
    
    // 如果文件在子目录中，确保子目录存在
    const dirPath = dirname(filePath)
    if (dirPath !== DATA_DIR && !existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
    }
    
    // 对于 defaultLocale，如果值是字符串，直接写入字符串值（不带 JSON.stringify）
    // 因为 defaultLocale.json 应该只包含字符串值，而不是 JSON 对象
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
      writeFileSync(filePath, JSON.stringify(value), 'utf-8')
    } else {
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    }
    return true
  } catch (error) {
    console.error(`Error writing file ${filename}:`, error)
    throw new Error(`Failed to write ${filename}`)
  }
}

// 默认数据结构（确保所有嵌套字段都存在）
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

// 获取完整站点数据（从多个文件组装）
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
      readJsonFile('locales.json', ['en', 'zh']),
      readJsonFile('defaultLocale.json', 'en'),
      readJsonFile('settings.json', null),
      readJsonFile('hero.json', null),
      readJsonFile('advantages.json', []),
      readJsonFile('partners.json', []),
      readJsonFile('tradeRegions.json', []),
      readJsonFile('categories.json', []),
      readJsonFile('featuredProductIds.json', []),
      readJsonFile('about.json', null),
      readJsonFile('contact.json', null),
      readJsonFile('seo.json', null)
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
    writeJsonFile(filename, data)
    return true
  } catch (error) {
    console.error(`Error updating site section ${section}:`, error)
    throw new Error(`Failed to update ${section}`)
  }
}

// 获取单个产品
export const getProduct = async (id) => {
  try {
    return readJsonFile(`products/${id}.json`, null)
  } catch (error) {
    console.error(`Error getting product ${id}:`, error)
    return null
  }
}

// 获取所有产品
export const getAllProducts = async () => {
  try {
    const productsDir = getFilePath('products')
    if (!existsSync(productsDir)) {
      return []
    }

    // 读取产品列表文件
    const productIds = readJsonFile('productIds.json', [])
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
    // 确保 products 目录存在
    const productsDir = getFilePath('products')
    if (!existsSync(productsDir)) {
      mkdirSync(productsDir, { recursive: true })
    }

    // 保存产品到单独文件
    writeJsonFile(`products/${product.id}.json`, product)

    // 更新产品 ID 列表
    const productIds = readJsonFile('productIds.json', [])
    if (!productIds.includes(product.id)) {
      productIds.push(product.id)
      writeJsonFile('productIds.json', productIds)
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
    const productFile = getFilePath(`products/${id}.json`)
    if (existsSync(productFile)) {
      unlinkSync(productFile)
    }

    // 从产品 ID 列表中移除
    const productIds = readJsonFile('productIds.json', [])
    const updatedProductIds = productIds.filter(pid => pid !== id)
    writeJsonFile('productIds.json', updatedProductIds)

    // 从 featuredProductIds 中移除
    const featuredIds = readJsonFile('featuredProductIds.json', [])
    const updatedFeaturedIds = featuredIds.filter(pid => pid !== id)
    writeJsonFile('featuredProductIds.json', updatedFeaturedIds)

    return true
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error)
    throw new Error('Failed to delete product')
  }
}

// 获取所有询盘
export const getInquiries = async () => {
  try {
    const inquiryIds = readJsonFile('inquiryIds.json', [])
    if (inquiryIds.length === 0) {
      return []
    }

    const inquiriesDir = getFilePath('inquiries')
    if (!existsSync(inquiriesDir)) {
      return []
    }

    // 并行读取所有询盘文件
    const inquiryPromises = inquiryIds.map(id => 
      readJsonFile(`inquiries/${id}.json`, null)
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

    // 确保 inquiries 目录存在
    const inquiriesDir = getFilePath('inquiries')
    if (!existsSync(inquiriesDir)) {
      mkdirSync(inquiriesDir, { recursive: true })
    }

    // 保存询盘到单独文件
    writeJsonFile(`inquiries/${id}.json`, newInquiry)

    // 更新询盘 ID 列表
    const inquiryIds = readJsonFile('inquiryIds.json', [])
    if (!inquiryIds.includes(id)) {
      inquiryIds.unshift(id) // 添加到开头
      writeJsonFile('inquiryIds.json', inquiryIds)
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
    const inquiry = readJsonFile(`inquiries/${id}.json`, null)
    if (!inquiry) {
      throw new Error('Inquiry not found')
    }

    const updatedInquiry = {
      ...inquiry,
      ...updates
    }

    writeJsonFile(`inquiries/${id}.json`, updatedInquiry)
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
    const existing = readJsonFile('settings.json', null)
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
      writeJsonFile('productIds.json', productIds)
    }

    // 初始化询盘列表
    writeJsonFile('inquiryIds.json', [])

    console.log('Default data initialized successfully')
  } catch (error) {
    console.error('Error initializing default data:', error)
    throw error
  }
}


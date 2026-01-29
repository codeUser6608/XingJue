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
    console.log(`[readJsonBlob] Blob Storage not available for ${filename}, returning default`)
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
      console.log(`[readJsonBlob] Blob not found: ${blobPath}, returning default`)
      return defaultValue
    }

    // 如果文件存在，使用 fetch 获取内容
    // blobInfo.url 是公开访问的 URL
    if (!blobInfo || !blobInfo.url) {
      console.log(`[readJsonBlob] Blob info missing for ${blobPath}, returning default`)
      return defaultValue
    }
    
    const response = await fetch(blobInfo.url)
    if (!response.ok) {
      console.warn(`[readJsonBlob] Failed to fetch blob ${blobPath}: ${response.status} ${response.statusText}`)
      return defaultValue
    }
    const text = (await response.text()).trim()
    
    if (!text || text.length === 0) {
      console.warn(`⚠️ [readJsonBlob] Blob ${blobPath} exists but is empty (${text.length} bytes)`)
      console.warn(`   This might indicate a write failure. Returning default value.`)
      return defaultValue
    }
    
    // 检查是否是无效的 JSON（例如只有空白字符或 "null"）
    const trimmedText = text.trim()
    if (trimmedText === '' || trimmedText === 'null' || trimmedText === '{}' || trimmedText === '[]') {
      console.warn(`⚠️ [readJsonBlob] Blob ${blobPath} contains only empty/invalid JSON: "${trimmedText}"`)
      return defaultValue
    }
    
    console.log(`[readJsonBlob] Successfully read ${filename} (${text.length} bytes) from ${blobPath}`)
    
    // 对于 defaultLocale，特殊处理可能的双重序列化问题
    if (filename === 'defaultLocale.json') {
      try {
        // 先尝试直接解析
        let parsed = JSON.parse(text)
        
        // 如果解析后仍然是字符串，检查是否是双重序列化
        if (typeof parsed === 'string') {
          // 检查字符串是否看起来像 JSON 字符串（以引号开头和结尾）
          const trimmed = parsed.trim()
          if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
            try {
              // 尝试再次解析（双重序列化的情况）
              const doubleParsed = JSON.parse(parsed)
              if (typeof doubleParsed === 'string') {
                console.log(`[defaultLocale blob] Detected double-serialized JSON, extracted: "${doubleParsed}"`)
                return doubleParsed
              }
            } catch {
              // 如果再次解析失败，可能是正常的带引号的字符串，去除外层引号
              console.log(`[defaultLocale blob] Removing outer quotes from: "${parsed}"`)
              return parsed.slice(1, -1)
            }
          }
        }
        
        return parsed
      } catch (error) {
        // 如果解析失败，尝试直接返回内容（去除引号）
        console.warn(`[defaultLocale blob] Error parsing JSON, trying to extract string value:`, error.message)
        console.warn(`[defaultLocale blob] Raw content:`, text)
        
        // 尝试多种方式提取字符串值
        let trimmed = text.trim()
        
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
    
    const parsed = JSON.parse(text)
    
    // 对于非 defaultLocale 文件，输出关键字段预览
    if (filename !== 'defaultLocale.json' && typeof parsed === 'object' && parsed !== null) {
      const preview = JSON.stringify(parsed).substring(0, 200)
      console.log(`[readJsonBlob] Parsed ${filename} preview: ${preview}...`)
      
      // 特别检查 settings 和 products 的关键字段
      if (filename === 'settings.json' && parsed.siteName) {
        console.log(`[readJsonBlob] settings.siteName.en = "${parsed.siteName.en || ''}"`)
      }
    }
    
    return parsed
  } catch (error) {
    console.error(`[readJsonBlob] Error reading blob ${filename}:`, error)
    console.error(`[readJsonBlob] Raw text (first 200 chars):`, text.substring(0, 200))
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
    
    // 输出数据预览（用于调试）
    if (filename !== 'defaultLocale.json' && typeof data === 'object' && data !== null) {
      const dataPreview = JSON.stringify(data).substring(0, 200)
      console.log(`[writeJsonBlob] Writing ${filename}, data preview: ${dataPreview}...`)
      
      // 特别检查 settings 和 products 的关键字段
      if (filename === 'settings.json' && data.siteName) {
        console.log(`[writeJsonBlob] settings.siteName.en = "${data.siteName.en || ''}"`)
      }
      if (filename === 'hero.json' && data.title) {
        console.log(`[writeJsonBlob] hero.title.en = "${data.title.en || ''}"`)
      }
    } else if (filename === 'defaultLocale.json') {
      console.log(`[writeJsonBlob] Writing defaultLocale = "${data}"`)
    }
    
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
    
    console.log(`✅ [writeJsonBlob] Successfully wrote ${filename} (${content.length} bytes) to ${blobPath}`)
    
    // 立即验证写入是否成功（读取回来检查内容）
    try {
      // 等待一小段时间，确保 Blob 已经写入完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const verifyInfo = await head(blobPath)
      if (verifyInfo && verifyInfo.url) {
        console.log(`✅ [writeJsonBlob] Verified ${filename} exists at ${blobPath}`)
        
        // 尝试读取内容验证
        try {
          const verifyResponse = await fetch(verifyInfo.url)
          if (verifyResponse.ok) {
            const verifyText = (await verifyResponse.text()).trim()
            if (verifyText === content.trim()) {
              console.log(`✅ [writeJsonBlob] Content verification passed for ${filename}`)
            } else {
              console.warn(`⚠️ [writeJsonBlob] Content mismatch for ${filename}`)
              console.warn(`   Written: ${content.substring(0, 100)}...`)
              console.warn(`   Read back: ${verifyText.substring(0, 100)}...`)
            }
          }
        } catch (readError) {
          console.warn(`⚠️ [writeJsonBlob] Could not read back ${filename} for verification:`, readError.message)
        }
      } else {
        console.warn(`⚠️ [writeJsonBlob] Could not verify ${filename} exists after write`)
      }
    } catch (verifyError) {
      console.warn(`⚠️ [writeJsonBlob] Could not verify ${filename} after write:`, verifyError.message)
    }
    
    return true
  } catch (error) {
    console.error(`❌ [writeJsonBlob] Error writing blob ${filename}:`, error)
    throw new Error(`Failed to write ${filename}: ${error.message}`)
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

    // 深度合并函数：source（用户数据）覆盖 target（默认值）
    // 确保用户数据优先，默认值只作为后备
    const deepMerge = (target, source) => {
      if (!source || typeof source !== 'object') {
        // 如果 source 无效，返回 target（默认值）
        return target
      }
      // 如果 source 是数组，直接返回 source（用户数据优先）
      if (Array.isArray(source)) {
        return source
      }
      // 从 source 开始（用户数据优先），然后合并 target（默认值）中缺失的字段
      const result = { ...source }
      for (const key in target) {
        // 如果 source 中没有这个 key，使用 target 的默认值
        if (!(key in source)) {
          result[key] = target[key]
        } else if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]) &&
                   source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          // 如果两者都是对象，递归合并（source 优先）
          result[key] = deepMerge(target[key], source[key])
        }
        // 如果 source 中有值，直接使用 source 的值（已经在上面的 ...source 中处理了）
      }
      return result
    }
    
    console.log(`[getSiteData] Reading all sections from Blob Storage...`)
    console.log(`[getSiteData] settings: ${settings ? 'exists' : 'null'}, hero: ${hero ? 'exists' : 'null'}, products: ${products.length}`)
    
    // 检查是否所有关键数据都是默认值（空）
    const settingsIsEmpty = !settings || 
      !settings.siteName || 
      !settings.siteName.en || 
      settings.siteName.en.trim() === ''
    const heroIsEmpty = !hero || 
      !hero.title || 
      !hero.title.en || 
      hero.title.en.trim() === ''
    const productsIsEmpty = !products || products.length === 0
    
    if (settingsIsEmpty && heroIsEmpty && productsIsEmpty) {
      console.warn('⚠️ [getSiteData] All critical data appears empty!')
      console.warn('   This might indicate that data was not properly saved to Blob Storage.')
      console.warn('   Please check Vercel function logs for write errors.')
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
    
    // 合并 SEO：用户数据优先，默认值作为后备
    const mergedSeo = seo ? deepMerge(defaultSeo, seo) : defaultSeo

    // 构建最终结果：用户数据优先，默认值作为后备
    const result = {
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
    
    // 输出关键字段用于调试
    const hasRealData = result.settings?.siteName?.en?.trim() || 
                       result.hero?.title?.en?.trim() || 
                       result.products.length > 0
    console.log(`[getSiteData] Final result: hasRealData=${hasRealData}, products=${result.products.length}, settings.siteName.en="${result.settings?.siteName?.en || ''}"`)
    
    return result
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
    console.log(`[updateSiteSection] Updating ${section} (${filename})...`)
    const dataPreview = typeof data === 'object' && data !== null
      ? JSON.stringify(data).substring(0, 200)
      : String(data).substring(0, 200)
    console.log(`[updateSiteSection] Data preview for ${section}: ${dataPreview}...`)
    
    await writeJsonBlob(filename, data)
    
    // 等待一小段时间，确保 Blob 已经写入完成
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 立即验证文件是否可读
    const verifyRead = await readJsonBlob(filename, null)
    
    // 对于对象类型，比较关键字段
    if (verifyRead === null && data !== null && data !== undefined) {
      console.error(`❌ [updateSiteSection] CRITICAL: ${section} was written but read back as null!`)
      console.error(`   This indicates a write/read failure. Data may not be persisted.`)
      
      // 对于 settings 和 hero，输出更详细的错误信息
      if (section === 'settings' && data.siteName) {
        console.error(`   Original data had siteName.en = "${data.siteName.en}"`)
      }
      if (section === 'hero' && data.title) {
        console.error(`   Original data had title.en = "${data.title.en}"`)
      }
    } else if (verifyRead !== null && data !== null && typeof data === 'object' && typeof verifyRead === 'object') {
      // 验证关键字段是否一致
      if (section === 'settings' && data.siteName && verifyRead.siteName) {
        const originalValue = data.siteName.en || ''
        const readValue = verifyRead.siteName.en || ''
        if (originalValue !== readValue) {
          console.warn(`⚠️ [updateSiteSection] ${section} siteName.en mismatch: "${originalValue}" vs "${readValue}"`)
        } else {
          console.log(`✅ [updateSiteSection] Successfully updated ${section}, verified read back (siteName.en = "${readValue}")`)
        }
      } else if (section === 'hero' && data.title && verifyRead.title) {
        const originalValue = data.title.en || ''
        const readValue = verifyRead.title.en || ''
        if (originalValue !== readValue) {
          console.warn(`⚠️ [updateSiteSection] ${section} title.en mismatch: "${originalValue}" vs "${readValue}"`)
        } else {
          console.log(`✅ [updateSiteSection] Successfully updated ${section}, verified read back (title.en = "${readValue}")`)
        }
      } else {
        console.log(`✅ [updateSiteSection] Successfully updated ${section}, verified read back`)
      }
    } else {
      console.log(`✅ [updateSiteSection] Successfully updated ${section}, verified read back`)
    }
    
    return true
  } catch (error) {
    console.error(`❌ [updateSiteSection] Error updating site section ${section}:`, error)
    throw new Error(`Failed to update ${section}: ${error.message}`)
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
    console.log('[initializeDefaultData] Checking if data already exists...')
    
    // 检查是否已初始化（检查是否有实际内容，而不是只有默认值）
    const existing = await readJsonBlob('settings.json', null)
    const hasRealData = existing && 
      existing.siteName && 
      existing.siteName.en && 
      existing.siteName.en.trim() !== ''
    
    if (hasRealData) {
      console.log('✅ [initializeDefaultData] Data already initialized with real content, skipping...')
      console.log(`   Existing siteName.en: "${existing.siteName.en}"`)
      return
    }
    
    // 检查是否有任何 Blob 文件存在（即使内容为空）
    // 如果已经有文件存在，说明用户可能已经导入过数据，不应该用默认数据覆盖
    try {
      const testBlob = await head(getBlobPath('settings.json'))
      if (testBlob) {
        console.log('⚠️ [initializeDefaultData] Blob files exist but appear empty. Not overwriting with defaults.')
        console.log('   User should import data via admin panel instead.')
        return
      }
    } catch {
      // 文件不存在，可以初始化
    }

    console.log('[initializeDefaultData] No existing data found, initializing from template...')

    // 初始化各个部分（只在完全没有数据时）
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



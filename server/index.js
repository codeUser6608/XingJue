import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
// 根据环境选择存储方式
// Vercel 环境：使用 Blob Storage（如果配置了 BLOB_READ_WRITE_TOKEN）
// 本地开发：使用文件系统
const isVercel = process.env.VERCEL === '1'
const useBlobStorage = isVercel && !!process.env.BLOB_READ_WRITE_TOKEN

let storageModule
if (useBlobStorage) {
  storageModule = await import('./db/blobStorage.js')
  console.log('Using Vercel Blob Storage')
} else {
  storageModule = await import('./db/fileStorage.js')
  console.log('Using file system storage')
}

const {
  getSiteData,
  updateSiteSection,
  getProduct,
  getAllProducts,
  upsertProduct,
  deleteProduct,
  getInquiries,
  createInquiry,
  updateInquiry,
  initializeDefaultData
} = storageModule

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000

// 初始化默认数据（如果文件不存在）
const initDefaultDataIfNeeded = async () => {
  try {
    // 检查是否已初始化（检查 settings 是否有实际内容，而不是只有默认值）
    const siteData = await getSiteData()
    const hasRealData = siteData && 
      siteData.settings && 
      siteData.settings.siteName && 
      siteData.settings.siteName.en && 
      siteData.settings.siteName.en.trim() !== ''
    
    if (hasRealData) {
      console.log('✅ Data already initialized, has real content')
      return
    }
    
    console.log('⚠️ No real data found, attempting to initialize from template...')
    
    // 尝试从多个可能的路径读取模板文件
    const possiblePaths = [
      join(__dirname, '../src/data/site-data.json'), // 标准路径
      join(__dirname, '../../src/data/site-data.json'), // Vercel 可能的路径
      join(process.cwd(), 'src/data/site-data.json'), // 工作目录路径
      join(process.cwd(), 'data/site-data.json') // 备用路径
    ]
    
    let defaultData = null
    let templatePath = null
    
    for (const path of possiblePaths) {
      try {
        if (existsSync(path)) {
          console.log(`Found template file at: ${path}`)
          defaultData = JSON.parse(readFileSync(path, 'utf-8'))
          templatePath = path
          break
        }
      } catch (error) {
        console.warn(`Could not read template from ${path}:`, error.message)
      }
    }
    
    if (defaultData) {
      console.log('✅ Loading template data, initializing...')
      await initializeDefaultData(defaultData)
      console.log('✅ Initialized default data from template')
    } else {
      console.error('❌ Template file not found in any of the expected paths:', possiblePaths)
      console.error('Will return empty data structure. Please import data via admin panel.')
    }
  } catch (error) {
    console.error('Error initializing default data:', error)
    console.error('Stack:', error.stack)
  }
}

// 异步初始化（不阻塞服务器启动）
// 在 Vercel 环境下，每次函数调用时都会检查并初始化（如果需要）
initDefaultDataIfNeeded().catch(console.error)

// 中间件
// CORS 配置：允许前端域名访问
const allowedOrigins = [
  'http://localhost:5174', // 本地开发
  'https://codeuser6608.github.io', // GitHub Pages 域名
  process.env.FRONTEND_URL // 环境变量配置的前端 URL
].filter(Boolean) // 移除 undefined 值

// 处理 OPTIONS 预检请求（必须在 CORS 中间件之前）
app.options('*', (req, res) => {
  const origin = req.headers.origin
  console.log(`OPTIONS request from origin: ${origin}`)
  
  // 允许所有来源（临时解决方案，确保 CORS 不会阻止请求）
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Max-Age', '86400')
  }
  res.sendStatus(200)
})

// CORS 配置：允许所有来源（确保不会阻止任何请求）
app.use(cors({
  origin: true, // 允许所有来源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type']
}))

// 额外的 CORS 响应头中间件（作为双重保险，确保所有响应都包含 CORS 头）
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  next()
})
// 增加请求体大小限制到 50mb（用于整体更新，但推荐使用部分更新）
app.use(express.json({ limit: '50mb' }))

// 请求日志中间件（用于调试）
app.use((req, res, next) => {
  if (req.path.includes('site-data')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    console.log('Headers:', JSON.stringify(req.headers, null, 2))
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2).substring(0, 500))
    }
  }
  next()
})

// 配置 multer 用于文件上传（内存存储，最大 4MB，因为 Vercel 限制约 4.5MB）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024 // 4MB，留一些余量给 Vercel 的限制
  },
  fileFilter: (req, file, cb) => {
    // 只接受 JSON 文件
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传 JSON 文件'))
    }
  }
})

// API 路由
// 在 Vercel 中，所有请求都路由到根路径，所以不需要 /api 前缀
// 在本地开发中，需要 /api 前缀
const API_PREFIX = isVercel ? '' : '/api'

// GET /health - 健康检查（Vercel）或 /api/health（本地）
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: isVercel
  })
})

// GET /site-data - 获取站点数据
app.get(`${API_PREFIX}/site-data`, async (req, res) => {
  // 设置 CORS 头（确保在所有响应中都包含）
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  // 确保响应是 JSON 格式
  res.setHeader('Content-Type', 'application/json')

  try {
    // 在 Vercel 环境下，每次请求时检查是否需要初始化
    if (isVercel) {
      await initDefaultDataIfNeeded()
    }
    const data = await getSiteData()
    
    // 记录数据状态用于调试
    const hasProducts = data?.products && data.products.length > 0
    const hasSettings = data?.settings?.siteName?.en?.trim()
    const hasHero = data?.hero?.title?.en?.trim()
    
    console.log(`[GET /site-data] Data status: products=${hasProducts ? data.products.length : 0}, hasSettings=${!!hasSettings}, hasHero=${!!hasHero}`)
    
    // 检查数据是否为空，如果为空且是 Vercel 环境，尝试再次初始化
    const isEmpty = !hasProducts && !hasSettings && !hasHero
    
    if (isEmpty && isVercel) {
      console.warn('⚠️ Data appears empty, attempting re-initialization...')
      await initDefaultDataIfNeeded()
      // 重新获取数据
      const retryData = await getSiteData()
      console.log(`[GET /site-data] After re-init: products=${retryData?.products?.length || 0}`)
      res.json(retryData)
    } else {
      res.json(data)
    }
  } catch (error) {
    console.error('Error getting site data:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /site-data/:section - 获取站点数据的指定部分
app.get(`${API_PREFIX}/site-data/:section`, async (req, res) => {
  // 设置 CORS 头（确保在所有响应中都包含）
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  // 确保响应是 JSON 格式
  res.setHeader('Content-Type', 'application/json')

  try {
    const { section } = req.params
    
    // 验证 section 是否有效
    const validSections = [
      'settings', 'hero', 'advantages', 'partners', 'tradeRegions',
      'categories', 'featuredProductIds', 'about', 'contact', 'seo',
      'locales', 'defaultLocale'
    ]
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: `Invalid section: ${section}. Valid sections: ${validSections.join(', ')}` })
    }
    
    // 获取完整站点数据，然后返回指定部分
    const siteData = await getSiteData()
    const sectionData = siteData[section]
    
    if (sectionData === undefined) {
      return res.status(404).json({ error: `Section ${section} not found` })
    }
    
    res.json(sectionData)
  } catch (error) {
    console.error(`Error getting site section ${req.params.section}:`, error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// POST /site-data/upload - 通过文件上传更新站点数据（推荐方式）
// 注意：Vercel 对请求体大小有限制（约 4.5MB），大文件会自动使用部分更新方式
app.post(`${API_PREFIX}/site-data/upload`, upload.single('file'), async (req, res) => {
  // 设置 CORS 头（确保在所有响应中都包含）
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' })
    }

    // 解析 JSON 文件内容
    let data
    try {
      const fileContent = req.file.buffer.toString('utf-8')
      data = JSON.parse(fileContent)
    } catch (parseError) {
      console.error('Error parsing JSON file:', parseError)
      return res.status(400).json({ error: '无效的 JSON 文件格式' })
    }

    // 将整体数据拆分为各个部分并分别更新
    const updatePromises = []
    
    if (data.locales !== undefined) updatePromises.push(updateSiteSection('locales', data.locales))
    if (data.defaultLocale !== undefined) updatePromises.push(updateSiteSection('defaultLocale', data.defaultLocale))
    if (data.settings) updatePromises.push(updateSiteSection('settings', data.settings))
    if (data.hero) updatePromises.push(updateSiteSection('hero', data.hero))
    if (data.advantages) updatePromises.push(updateSiteSection('advantages', data.advantages))
    if (data.partners) updatePromises.push(updateSiteSection('partners', data.partners))
    if (data.tradeRegions) updatePromises.push(updateSiteSection('tradeRegions', data.tradeRegions))
    if (data.categories) updatePromises.push(updateSiteSection('categories', data.categories))
    if (data.featuredProductIds) updatePromises.push(updateSiteSection('featuredProductIds', data.featuredProductIds))
    if (data.about) updatePromises.push(updateSiteSection('about', data.about))
    if (data.contact) updatePromises.push(updateSiteSection('contact', data.contact))
    if (data.seo) updatePromises.push(updateSiteSection('seo', data.seo))
    
    // 更新产品
    if (data.products && Array.isArray(data.products)) {
      for (const product of data.products) {
        await upsertProduct(product)
      }
    }
    
    await Promise.all(updatePromises)
    
    console.log('✅ Site data updated successfully via file upload')
    res.json({ success: true, message: '站点数据已成功更新' })
  } catch (error) {
    console.error('Error updating site data from file:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /site-data - 整体更新站点数据（向后兼容，不推荐，可能遇到 413 错误）
app.put(`${API_PREFIX}/site-data`, async (req, res) => {
  // 设置 CORS 头（确保在所有响应中都包含）
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  // 确保响应是 JSON 格式
  res.setHeader('Content-Type', 'application/json')

  try {
    const data = req.body
    
    // 检查请求体是否为空（可能是 Vercel 在请求体太大时没有解析 body）
    if (!data || Object.keys(data).length === 0) {
      return res.status(413).json({ 
        error: 'Request too large. Vercel has a 4.5MB limit for request bodies.',
        suggestion: 'Please use partial update methods (PATCH /site-data/:section) or file upload (POST /site-data/upload) instead.',
        maxSize: '4.5MB',
        alternatives: [
          'Use PATCH /site-data/:section for individual sections',
          'Use POST /site-data/upload for file upload (supports up to 4MB files)',
          'Use multiple PATCH requests to update sections separately'
        ]
      })
    }
    
    // 将整体数据拆分为各个部分并分别更新
    const updatePromises = []
    
    if (data.locales !== undefined) updatePromises.push(updateSiteSection('locales', data.locales))
    if (data.defaultLocale !== undefined) {
      // 确保 defaultLocale 是字符串
      const defaultLocaleValue = typeof data.defaultLocale === 'string' 
        ? data.defaultLocale 
        : String(data.defaultLocale)
      updatePromises.push(updateSiteSection('defaultLocale', defaultLocaleValue))
    }
    if (data.settings) updatePromises.push(updateSiteSection('settings', data.settings))
    if (data.hero) updatePromises.push(updateSiteSection('hero', data.hero))
    if (data.advantages) updatePromises.push(updateSiteSection('advantages', data.advantages))
    if (data.partners) updatePromises.push(updateSiteSection('partners', data.partners))
    if (data.tradeRegions) updatePromises.push(updateSiteSection('tradeRegions', data.tradeRegions))
    if (data.categories) updatePromises.push(updateSiteSection('categories', data.categories))
    if (data.featuredProductIds) updatePromises.push(updateSiteSection('featuredProductIds', data.featuredProductIds))
    if (data.about) updatePromises.push(updateSiteSection('about', data.about))
    if (data.contact) updatePromises.push(updateSiteSection('contact', data.contact))
    if (data.seo) updatePromises.push(updateSiteSection('seo', data.seo))
    
    // 更新产品
    if (data.products && Array.isArray(data.products)) {
      const productIds = []
      for (const product of data.products) {
        await upsertProduct(product)
        productIds.push(product.id)
      }
      // upsertProduct 已经会自动更新产品 ID 列表，所以这里不需要额外操作
    }
    
    await Promise.all(updatePromises)
    
    console.log('✅ Site data updated successfully')
    res.json({ success: true, message: 'Site data updated successfully' })
  } catch (error) {
    console.error('Error updating site data:', error)
    // 如果是 413 错误，提供更详细的错误信息
    if (error.message && error.message.includes('413')) {
      res.status(413).json({ 
        error: 'Request too large. Please use partial update methods instead.',
        suggestion: 'Use PATCH /site-data/:section for individual sections or POST /site-data/upload for file upload',
        maxSize: '4.5MB'
      })
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }
})

// PATCH /site-data/:section - 部分更新站点数据的指定部分
app.patch(`${API_PREFIX}/site-data/:section`, async (req, res) => {
  // 设置 CORS 头（确保在所有响应中都包含）
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  // 确保响应是 JSON 格式
  res.setHeader('Content-Type', 'application/json')

  try {
    const { section } = req.params
    let data = req.body
    
    // 详细日志
    console.log(`[PATCH /site-data/${section}] Received request`)
    console.log(`Section: ${section}`)
    console.log(`Data type: ${typeof data}, isArray: ${Array.isArray(data)}`)
    console.log(`Data value:`, data)
    
    // 验证 section 是否有效
    const validSections = [
      'settings', 'hero', 'advantages', 'partners', 'tradeRegions',
      'categories', 'featuredProductIds', 'about', 'contact', 'seo',
      'locales', 'defaultLocale'
    ]
    
    if (!validSections.includes(section)) {
      console.error(`Invalid section: ${section}, valid sections: ${validSections.join(', ')}`)
      return res.status(400).json({ error: `Invalid section: ${section}. Valid sections: ${validSections.join(', ')}` })
    }
    
    // 对于 defaultLocale，特殊处理（仅做提取和清洗，不再对纯字符串做 JSON.parse）
    if (section === 'defaultLocale') {
      console.log(`[defaultLocale] Processing defaultLocale update`)
      console.log(`[defaultLocale] Original data:`, data, `Type:`, typeof data)

      // 必须有值
      if (data === undefined || data === null) {
        console.error('[defaultLocale] No data provided (undefined or null)')
        return res.status(400).json({ error: 'No data provided for defaultLocale' })
      }

      // 如果是对象或数组，尽量从中提取一个候选值
      if (typeof data === 'object' && data !== null) {
        console.log('[defaultLocale] Data is object, extracting value...')
        if (Array.isArray(data)) {
          data = data[0] ?? 'en'
          console.log('[defaultLocale] Extracted from array:', data)
        } else {
          const keys = Object.keys(data)
          console.log('[defaultLocale] Object keys:', keys)
          data = data.defaultLocale ?? data.value ?? Object.values(data)[0] ?? 'en'
          console.log('[defaultLocale] Extracted from object:', data)
        }
      }

      // 统一转成字符串
      data = String(data).trim()

      // 去掉外层引号（例如 "\"en\"" -> en）
      data = data.replace(/^["']|["']$/g, '').trim()

      // 只允许 'en' 或 'zh'，否则回退为 'en'
      if (data !== 'en' && data !== 'zh') {
        console.warn(`[defaultLocale] Invalid value "${data}", fallback to 'en'`)
        data = 'en'
      }

      console.log(`[defaultLocale] Final value to save: "${data}"`)
    } else {
      // 其他 section 的验证
      if (data === undefined) {
        console.error(`No data provided for section: ${section}`)
        return res.status(400).json({ error: `No data provided for section: ${section}` })
      }
      
      // 检查数据是否为空对象（对于非 defaultLocale 的 section）
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && Object.keys(data).length === 0) {
        console.error(`Attempted to update section ${section} with empty object`)
        return res.status(400).json({ error: `Cannot update ${section} with empty data` })
      }
      
      console.log(`Updating section: ${section}, data type: ${typeof data}, isArray: ${Array.isArray(data)}`)
    }
    
    await updateSiteSection(section, data)
    console.log(`✅ Section ${section} updated successfully`)
    res.json({ success: true, message: `${section} updated successfully` })
  } catch (error) {
    console.error(`Error updating site section ${req.params.section}:`, error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// GET /site-data/products/:id - 获取单个产品
app.get(`${API_PREFIX}/site-data/products/:id`, async (req, res) => {
  try {
    const { id } = req.params
    const product = await getProduct(id)
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    
    res.json(product)
  } catch (error) {
    console.error(`Error getting product ${req.params.id}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /site-data/products - 创建产品
app.post(`${API_PREFIX}/site-data/products`, async (req, res) => {
  try {
    const product = req.body
    const newProduct = await upsertProduct(product)
    res.status(201).json(newProduct)
  } catch (error) {
    console.error('Error creating product:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /site-data/products/:id - 更新产品
app.patch(`${API_PREFIX}/site-data/products/:id`, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const existingProduct = await getProduct(id)
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }
    
    const updatedProduct = { ...existingProduct, ...updates, id }
    const result = await upsertProduct(updatedProduct)
    res.json(result)
  } catch (error) {
    console.error(`Error updating product ${req.params.id}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /site-data/products/:id - 删除产品
app.delete(`${API_PREFIX}/site-data/products/:id`, async (req, res) => {
  try {
    const { id } = req.params
    await deleteProduct(id)
    res.json({ success: true, message: 'Product deleted successfully' })
  } catch (error) {
    console.error(`Error deleting product ${req.params.id}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// GET /inquiries - 获取所有询盘
app.get(`${API_PREFIX}/inquiries`, async (req, res) => {
  try {
    const inquiries = await getInquiries()
    res.json(inquiries)
  } catch (error) {
    console.error('Error getting inquiries:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /inquiries - 创建新询盘
app.post(`${API_PREFIX}/inquiries`, async (req, res) => {
  try {
    const inquiry = req.body
    const newInquiry = await createInquiry(inquiry)
    res.status(201).json(newInquiry)
  } catch (error) {
    console.error('Error creating inquiry:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /inquiries/:id - 更新询盘
app.patch(`${API_PREFIX}/inquiries/:id`, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const updatedInquiry = await updateInquiry(id, updates)
    res.json(updatedInquiry)
  } catch (error) {
    console.error(`Error updating inquiry ${req.params.id}:`, error)
    if (error.message === 'Inquiry not found') {
      res.status(404).json({ error: error.message })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// 仅在非 Vercel 环境启动服务器（Vercel 使用 Serverless Functions）
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`API endpoints available at http://localhost:${PORT}/api`)
  })
}

// 全局错误处理中间件（必须在所有路由之后）
app.use((err, req, res, next) => {
  // 设置 CORS 头
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  // 确保响应是 JSON 格式
  res.setHeader('Content-Type', 'application/json')
  
  console.error('Global error handler:', err)
  
  // 如果是 multer 错误（文件上传相关）
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` })
  }
  
  // 其他错误
  const statusCode = err.statusCode || err.status || 500
  res.status(statusCode).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 处理（必须在所有路由之后）
app.use((req, res) => {
  // 设置 CORS 头
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }
  // 确保响应是 JSON 格式
  res.setHeader('Content-Type', 'application/json')
  
  console.error(`404 - Route not found: ${req.method} ${req.path}`)
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// 导出 app 供 Vercel Serverless Functions 使用
export default app


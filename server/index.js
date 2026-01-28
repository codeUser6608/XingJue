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
      console.log('Data already initialized in file storage')
      return
    }
    
    // 尝试从模板文件读取
    try {
      const templatePath = join(__dirname, '../src/data/site-data.json')
      if (existsSync(templatePath)) {
        const defaultData = JSON.parse(readFileSync(templatePath, 'utf-8'))
        await initializeDefaultData(defaultData)
        console.log('✅ Initialized default data from template')
      } else {
        console.warn('Template file not found:', templatePath)
      }
    } catch (error) {
      console.warn('Could not read template file:', error.message)
    }
  } catch (error) {
    console.error('Error initializing default data:', error)
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

// 配置 multer 用于文件上传（内存存储，最大 50MB）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
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
  try {
    // 在 Vercel 环境下，每次请求时检查是否需要初始化
    if (isVercel) {
      await initDefaultDataIfNeeded()
    }
    const data = await getSiteData()
    res.json(data)
  } catch (error) {
    console.error('Error getting site data:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /site-data/upload - 通过文件上传更新站点数据（推荐方式）
app.post(`${API_PREFIX}/site-data/upload`, upload.single('file'), async (req, res) => {
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
  try {
    const data = req.body
    
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
    res.status(500).json({ error: error.message })
  }
})

// PATCH /site-data/:section - 部分更新站点数据的指定部分
app.patch(`${API_PREFIX}/site-data/:section`, async (req, res) => {
  try {
    const { section } = req.params
    let data = req.body
    
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
    
    // 验证数据是否存在
    if (data === undefined) {
      console.error(`No data provided for section: ${section}`)
      return res.status(400).json({ error: `No data provided for section: ${section}` })
    }
    
    // 对于 defaultLocale，确保它是字符串
    if (section === 'defaultLocale' && typeof data !== 'string') {
      // 如果传入的是对象，尝试提取值
      if (typeof data === 'object' && data !== null) {
        data = Object.values(data)[0] || data
      }
      // 如果仍然是对象，转换为字符串
      if (typeof data !== 'string') {
        data = String(data)
      }
    }
    
    console.log(`Updating section: ${section}, data type: ${typeof data}, isArray: ${Array.isArray(data)}, value: ${typeof data === 'string' ? data : JSON.stringify(data).substring(0, 100)}`)
    
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

// 导出 app 供 Vercel Serverless Functions 使用
export default app


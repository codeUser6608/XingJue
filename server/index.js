import express from 'express'
import cors from 'cors'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
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
} from './db/fileStorage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000
const isVercel = process.env.VERCEL === '1'

// 初始化默认数据（如果文件不存在）
const initDefaultDataIfNeeded = async () => {
  try {
    // 检查是否已初始化
    const siteData = await getSiteData()
    if (siteData && siteData.settings && Object.keys(siteData.settings).length > 0) {
      console.log('Data already initialized in file storage')
      return
    }
    
    // 尝试从模板文件读取
    try {
      const templatePath = join(__dirname, '../src/data/site-data.json')
      if (existsSync(templatePath)) {
        const defaultData = JSON.parse(readFileSync(templatePath, 'utf-8'))
        await initializeDefaultData(defaultData)
        console.log('Initialized default data from template')
      }
    } catch (error) {
      console.warn('Could not read template file:', error.message)
    }
  } catch (error) {
    console.error('Error initializing default data:', error)
  }
}

// 异步初始化（不阻塞服务器启动）
if (!isVercel) {
  initDefaultDataIfNeeded().catch(console.error)
}

// 中间件
// CORS 配置：允许前端域名访问
const allowedOrigins = [
  'http://localhost:5174', // 本地开发
  'https://codeuser6608.github.io', // GitHub Pages 域名
  process.env.FRONTEND_URL // 环境变量配置的前端 URL
].filter(Boolean) // 移除 undefined 值

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 Postman、curl）
    if (!origin) return callback(null, true)
    // 检查是否在允许列表中
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true)
    } else {
      // 开发环境允许所有来源
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true
}))
// 增加请求体大小限制到 50mb（用于整体更新，但推荐使用部分更新）
app.use(express.json({ limit: '50mb' }))

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
    const data = await getSiteData()
    res.json(data)
  } catch (error) {
    console.error('Error getting site data:', error)
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
      for (const product of data.products) {
        updatePromises.push(upsertProduct(product))
      }
    }
    
    await Promise.all(updatePromises)
    
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
    const data = req.body
    
    const validSections = [
      'settings', 'hero', 'advantages', 'partners', 'tradeRegions',
      'categories', 'featuredProductIds', 'about', 'contact', 'seo',
      'locales', 'defaultLocale'
    ]
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: `Invalid section: ${section}` })
    }
    
    await updateSiteSection(section, data)
    res.json({ success: true, message: `${section} updated successfully` })
  } catch (error) {
    console.error(`Error updating site section ${req.params.section}:`, error)
    res.status(500).json({ error: error.message })
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


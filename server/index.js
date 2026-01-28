import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000

// Vercel Serverless Functions 环境：使用 /tmp 目录（可写）
// 本地开发环境：使用项目目录
const isVercel = process.env.VERCEL === '1'
const DATA_DIR = isVercel ? '/tmp/xingjue-data' : join(__dirname, 'data')
const SITE_DATA_FILE = join(DATA_DIR, 'site-data.json')
const INQUIRIES_FILE = join(DATA_DIR, 'inquiries.json')

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  try {
    mkdirSync(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create data directory:', error)
  }
}

// 初始化数据文件（如果不存在）
const initDataFiles = () => {
  try {
    if (!existsSync(SITE_DATA_FILE)) {
      // 尝试从前端复制初始数据
      try {
        const defaultSiteData = readFileSync(join(__dirname, '../src/data/site-data.json'), 'utf-8')
        writeFileSync(SITE_DATA_FILE, defaultSiteData, 'utf-8')
        console.log('Initialized site-data.json from template')
      } catch (error) {
        // 如果无法读取模板文件，使用默认空数据
        console.warn('Could not read template file, using default data:', error.message)
        const defaultData = {
          featuredProductIds: [],
          products: [],
          categories: [],
          about: { overview: { en: '', zh: '' } },
          contact: { email: '', phone: '', address: { en: '', zh: '' }, socials: [] },
          seo: { pages: {} },
          settings: { siteName: { en: '', zh: '' }, logoUrl: '' }
        }
        writeFileSync(SITE_DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8')
      }
    }

    if (!existsSync(INQUIRIES_FILE)) {
      writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8')
      console.log('Initialized inquiries.json')
    }
  } catch (error) {
    console.error('Error initializing data files:', error)
    // 在 Serverless 环境中，如果无法写入文件，使用内存存储
  }
}

// 仅在非 Serverless 环境或可以写入时初始化
if (!isVercel || existsSync('/tmp')) {
  initDataFiles()
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
app.use(express.json({ limit: '10mb' }))

// 内存存储（作为后备，用于 Serverless 环境）
let memoryStore = {
  siteData: null,
  inquiries: []
}

// 读取站点数据
const readSiteData = () => {
  try {
    if (existsSync(SITE_DATA_FILE)) {
      const data = readFileSync(SITE_DATA_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      memoryStore.siteData = parsed // 缓存到内存
      return parsed
    } else if (memoryStore.siteData) {
      // 如果文件不存在但内存中有数据，使用内存数据
      return memoryStore.siteData
    } else {
      // 尝试从模板文件读取
      try {
        const defaultData = readFileSync(join(__dirname, '../src/data/site-data.json'), 'utf-8')
        const parsed = JSON.parse(defaultData)
        memoryStore.siteData = parsed
        return parsed
      } catch {
        throw new Error('No site data available')
      }
    }
  } catch (error) {
    console.error('Error reading site data:', error)
    if (memoryStore.siteData) {
      return memoryStore.siteData
    }
    throw new Error('Failed to read site data')
  }
}

// 保存站点数据
const saveSiteData = (data) => {
  try {
    // 先保存到内存
    memoryStore.siteData = data
    // 尝试保存到文件
    try {
      writeFileSync(SITE_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    } catch (fileError) {
      console.warn('Could not save to file, using memory storage:', fileError.message)
      // 在 Serverless 环境中，如果无法写入文件，仅使用内存存储
    }
    return true
  } catch (error) {
    console.error('Error saving site data:', error)
    throw new Error('Failed to save site data')
  }
}

// 读取询盘数据
const readInquiries = () => {
  try {
    if (existsSync(INQUIRIES_FILE)) {
      const data = readFileSync(INQUIRIES_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      memoryStore.inquiries = parsed // 缓存到内存
      return parsed
    } else if (memoryStore.inquiries.length > 0) {
      // 如果文件不存在但内存中有数据，使用内存数据
      return memoryStore.inquiries
    } else {
      return []
    }
  } catch (error) {
    console.error('Error reading inquiries:', error)
    return memoryStore.inquiries || []
  }
}

// 保存询盘数据
const saveInquiries = (inquiries) => {
  try {
    // 先保存到内存
    memoryStore.inquiries = inquiries
    // 尝试保存到文件
    try {
      writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8')
    } catch (fileError) {
      console.warn('Could not save to file, using memory storage:', fileError.message)
      // 在 Serverless 环境中，如果无法写入文件，仅使用内存存储
    }
    return true
  } catch (error) {
    console.error('Error saving inquiries:', error)
    throw new Error('Failed to save inquiries')
  }
}

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
app.get(`${API_PREFIX}/site-data`, (req, res) => {
  try {
    const data = readSiteData()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /site-data - 更新站点数据
app.put(`${API_PREFIX}/site-data`, (req, res) => {
  try {
    const data = req.body
    saveSiteData(data)
    res.json({ success: true, message: 'Site data updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /inquiries - 获取所有询盘
app.get(`${API_PREFIX}/inquiries`, (req, res) => {
  try {
    const inquiries = readInquiries()
    res.json(inquiries)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /inquiries - 创建新询盘
app.post(`${API_PREFIX}/inquiries`, (req, res) => {
  try {
    const inquiry = req.body
    const inquiries = readInquiries()
    
    // 生成 ID 和时间戳
    const id = randomUUID()
    
    const newInquiry = {
      ...inquiry,
      id,
      createdAt: new Date().toISOString(),
      status: 'new'
    }
    
    inquiries.unshift(newInquiry) // 添加到开头
    saveInquiries(inquiries)
    
    res.status(201).json(newInquiry)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH /inquiries/:id - 更新询盘状态
app.patch(`${API_PREFIX}/inquiries/:id`, (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    const inquiries = readInquiries()
    const index = inquiries.findIndex(inq => inq.id === id)
    
    if (index === -1) {
      return res.status(404).json({ error: 'Inquiry not found' })
    }
    
    inquiries[index] = { ...inquiries[index], status }
    saveInquiries(inquiries)
    
    res.json(inquiries[index])
  } catch (error) {
    res.status(500).json({ error: error.message })
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


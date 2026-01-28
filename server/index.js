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
const DATA_DIR = join(__dirname, 'data')
const SITE_DATA_FILE = join(DATA_DIR, 'site-data.json')
const INQUIRIES_FILE = join(DATA_DIR, 'inquiries.json')

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

// 初始化数据文件（如果不存在）
const initDataFiles = () => {
  if (!existsSync(SITE_DATA_FILE)) {
    // 从前端复制初始数据
    const defaultSiteData = readFileSync(join(__dirname, '../src/data/site-data.json'), 'utf-8')
    writeFileSync(SITE_DATA_FILE, defaultSiteData, 'utf-8')
    console.log('Initialized site-data.json from template')
  }

  if (!existsSync(INQUIRIES_FILE)) {
    writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8')
    console.log('Initialized inquiries.json')
  }
}

initDataFiles()

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// 读取站点数据
const readSiteData = () => {
  try {
    const data = readFileSync(SITE_DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading site data:', error)
    throw new Error('Failed to read site data')
  }
}

// 保存站点数据
const saveSiteData = (data) => {
  try {
    writeFileSync(SITE_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error saving site data:', error)
    throw new Error('Failed to save site data')
  }
}

// 读取询盘数据
const readInquiries = () => {
  try {
    if (!existsSync(INQUIRIES_FILE)) {
      return []
    }
    const data = readFileSync(INQUIRIES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading inquiries:', error)
    return []
  }
}

// 保存询盘数据
const saveInquiries = (inquiries) => {
  try {
    writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error saving inquiries:', error)
    throw new Error('Failed to save inquiries')
  }
}

// API 路由

// GET /api/site-data - 获取站点数据
app.get('/api/site-data', (req, res) => {
  try {
    const data = readSiteData()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/site-data - 更新站点数据
app.put('/api/site-data', (req, res) => {
  try {
    const data = req.body
    saveSiteData(data)
    res.json({ success: true, message: 'Site data updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/inquiries - 获取所有询盘
app.get('/api/inquiries', (req, res) => {
  try {
    const inquiries = readInquiries()
    res.json(inquiries)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/inquiries - 创建新询盘
app.post('/api/inquiries', (req, res) => {
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

// PATCH /api/inquiries/:id - 更新询盘状态
app.patch('/api/inquiries/:id', (req, res) => {
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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API endpoints available at http://localhost:${PORT}/api`)
})


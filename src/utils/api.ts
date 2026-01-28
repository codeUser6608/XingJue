// 根据环境自动选择 API 地址
// 开发环境：http://localhost:4000/api
// 生产环境：使用 VITE_API_BASE_URL 环境变量，如果未设置则尝试相对路径
const getApiBaseUrl = () => {
  // 如果明确设置了环境变量，使用它
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // 开发环境
  if (import.meta.env.DEV) {
    return 'http://localhost:4000/api'
  }
  
  // 生产环境：尝试使用相对路径（如果后端部署在同一域名下）
  // 或者使用环境变量中配置的完整 URL
  // 默认返回空字符串，让调用方处理
  return ''
}

const API_BASE_URL = getApiBaseUrl()

// 构建完整的 API URL
const buildApiUrl = (endpoint: string): string | null => {
  if (API_BASE_URL) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${API_BASE_URL}${cleanEndpoint}`
  }
  // 如果没有配置 API 地址，返回 null 表示使用后备方案
  return null
}

export const api = {
  async getSiteData() {
    const url = buildApiUrl('/site-data')
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch site data: ${response.statusText}`)
    }
    return response.json()
  },

  async updateSiteData(data: unknown) {
    const url = buildApiUrl('/site-data')
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Failed to update site data: ${response.statusText}`)
    }
    return response.json()
  },

  async getInquiries() {
    const url = buildApiUrl('/inquiries')
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch inquiries: ${response.statusText}`)
    }
    return response.json()
  },

  async createInquiry(inquiry: unknown) {
    const url = buildApiUrl('/inquiries')
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inquiry),
    })
    if (!response.ok) {
      throw new Error(`Failed to create inquiry: ${response.statusText}`)
    }
    return response.json()
  },

  async updateInquiryStatus(id: string, status: string) {
    const url = buildApiUrl(`/inquiries/${id}`)
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update inquiry: ${response.statusText}`)
    }
    return response.json()
  },
}


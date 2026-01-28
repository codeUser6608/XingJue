// 根据环境自动选择 API 地址
// 开发环境：http://localhost:4000/api
// 生产环境：使用 VITE_API_BASE_URL 环境变量，如果未设置则返回空（触发后备方案）
const getApiBaseUrl = () => {
  // 如果明确设置了环境变量（且不为空字符串），使用它
  const envApiUrl = import.meta.env.VITE_API_BASE_URL
  if (envApiUrl && envApiUrl.trim() !== '') {
    const url = envApiUrl.trim()
    // 移除末尾的斜杠（如果有）
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
  
  // 开发环境
  if (import.meta.env.DEV) {
    return 'http://localhost:4000/api'
  }
  
  // 生产环境：如果未配置 API 地址，返回空字符串
  // 这会触发后备方案（localStorage）
  // 注意：生产环境应该配置 VITE_API_BASE_URL 指向实际的后端服务器（不带 /api 后缀）
  if (import.meta.env.PROD) {
    console.warn('[API] VITE_API_BASE_URL not configured in production. Using localStorage fallback.')
  }
  return ''
}

const API_BASE_URL = getApiBaseUrl()

// 开发环境下输出当前使用的 API 地址（便于调试）
if (import.meta.env.DEV) {
  console.log('[API] Using API base URL:', API_BASE_URL || '(fallback: localStorage)')
}

// 构建完整的 API URL
const buildApiUrl = (endpoint: string): string | null => {
  if (API_BASE_URL) {
    // 确保 endpoint 以 / 开头
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    // 在开发环境中，API_BASE_URL 已经包含 /api，直接拼接
    // 在生产环境中，API_BASE_URL 是根 URL，直接拼接 endpoint
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
    // 添加缓存控制，确保每次都获取最新数据
    const response = await fetch(url, {
      cache: 'no-store', // 禁用缓存，确保获取最新数据
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
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
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('413 Content Too Large: Request too large. Please use partial update methods instead.')
        }
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Failed to update site data: ${response.status} ${errorText}`)
      }
      return response.json()
    } catch (error) {
      // 如果是网络错误（如 CORS），也检查是否是 413
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // 可能是 CORS 或网络错误，但如果是 413，response 可能已经返回了
        // 这里我们让调用者处理
        throw error
      }
      throw error
    }
  },

  // 通过文件上传更新站点数据（推荐方式，避免 413 错误）
  // 注意：如果文件超过 4MB，建议使用部分更新方式
  async uploadSiteData(file: File) {
    const url = buildApiUrl('/site-data/upload')
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        // 如果是 413 错误，提供更友好的错误信息
        if (response.status === 413) {
          throw new Error('413 Content Too Large: 文件太大，请使用部分更新方式或减小文件大小')
        }
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Failed to upload site data: ${response.status} ${errorText}`)
      }
      return response.json()
    } catch (error) {
      // 如果是网络错误（可能是 CORS 或 413），提供更详细的错误信息
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('网络错误：可能是 CORS 问题或文件太大。请尝试使用部分更新方式。')
      }
      throw error
    }
  },

  // 部分更新站点数据的指定部分
  async updateSiteSection(section: string, data: unknown) {
    const url = buildApiUrl(`/site-data/${section}`)
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Failed to update ${section}: ${response.status} ${errorText}`)
      }
      return response.json()
    } catch (error) {
      // 如果是网络错误，提供更详细的错误信息
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Network error when updating ${section}: ${error.message}. This might be a CORS issue.`)
      }
      throw error
    }
  },

  // 产品 CRUD
  async getProduct(id: string) {
    const url = buildApiUrl(`/site-data/products/${id}`)
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`)
    }
    return response.json()
  },

  async upsertProduct(product: unknown) {
    const url = buildApiUrl('/site-data/products')
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    })
    if (!response.ok) {
      throw new Error(`Failed to upsert product: ${response.statusText}`)
    }
    return response.json()
  },

  async updateProduct(id: string, updates: unknown) {
    const url = buildApiUrl(`/site-data/products/${id}`)
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    if (!response.ok) {
      throw new Error(`Failed to update product: ${response.statusText}`)
    }
    return response.json()
  },

  async deleteProduct(id: string) {
    const url = buildApiUrl(`/site-data/products/${id}`)
    if (!url) {
      throw new Error('API_BASE_URL not configured')
    }
    const response = await fetch(url, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.statusText}`)
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


# XingJue Backend Server

后端 API 服务器，用于存储和管理站点数据。

## 功能

- 提供 REST API 接口管理站点数据
- 持久化存储站点配置和产品数据
- 管理询盘数据

## API 端点

- `GET /api/site-data` - 获取站点数据
- `PUT /api/site-data` - 更新站点数据
- `GET /api/inquiries` - 获取所有询盘
- `POST /api/inquiries` - 创建新询盘
- `PATCH /api/inquiries/:id` - 更新询盘状态
- `GET /api/health` - 健康检查

## 本地开发

### 安装和运行

1. 安装依赖：
```bash
cd server
npm install
```

2. 运行开发服务器：
```bash
npm run dev
```

服务器将在 `http://localhost:4000` 启动。

## 数据存储

数据存储在 `server/data/` 目录：
- `site-data.json` - 站点配置和产品数据
- `inquiries.json` - 询盘数据

首次运行时会自动从前端模板文件初始化数据。

## 环境变量

- `PORT` - 服务器端口（默认：4000）
- `FRONTEND_URL` - 前端 URL（默认：http://localhost:5174）

## 生产环境部署

### Vercel

1. 安装 Vercel CLI：`npm i -g vercel`
2. 在 `server` 目录运行：`vercel`
3. 配置环境变量 `FRONTEND_URL`

### Render

1. 创建新的 Web Service
2. 根目录设置为 `server`
3. 构建命令：`npm install`
4. 启动命令：`npm start`

### Railway

1. 连接 GitHub 仓库
2. 设置根目录为 `server`
3. 配置环境变量

详细部署说明请参考 [DEPLOYMENT.md](../DEPLOYMENT.md)

## 注意事项

- 确保 `server/data/` 目录有写入权限
- 生产环境建议使用数据库而不是 JSON 文件
- 建议添加身份验证和授权机制
- 对于 Serverless 平台（如 Vercel），文件系统存储可能不是持久化的，建议使用数据库

## 数据迁移

如果需要从本地迁移数据到生产环境：

1. 导出本地 `server/data/` 目录中的 JSON 文件
2. 部署后端后，通过 API 导入数据
3. 或者直接上传 JSON 文件到服务器

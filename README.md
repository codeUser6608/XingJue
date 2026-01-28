# XingJue Sports Trade Portal

## 项目简介

星爵体育外贸门户网站，基于 Vite + React 19 + TypeScript + Tailwind CSS 4 构建的现代化体育产品展示与贸易平台。

支持 GitHub Pages 部署，数据通过 `src/data/site-data.json` 进行管理。

使用 i18next 实现多语言国际化支持。

## 主要功能

- **产品展示**：响应式产品卡片、详情页、分类筛选
- **管理后台**：完整的 CRUD 操作，支持产品、询盘、设置管理
- **多语言支持**：URL 路径 + 语言切换器，支持中英文切换
- **SEO 优化**：完整的 Meta 标签、Open Graph、Twitter Card、hreflang 标签支持

## 快速开始

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
npm run preview
```

## GitHub Pages 部署指南

参考：[GitHub Pages 快速入门](https://docs.github.com/zh/pages/quickstart)

### 方法一：使用 GitHub Actions 自动部署（推荐）

项目已配置 GitHub Actions 工作流，可以实现自动部署。这是 GitHub 推荐的部署方式。

#### 详细步骤：

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "准备部署到 GitHub Pages"
   git push origin main
   ```
   > 注意：如果您的默认分支是 `master`，请将 `.github/workflows/deploy.yml` 中的 `main` 改为 `master`

2. **在 GitHub 仓库中启用 Pages**
   - 在仓库页面，点击 **Settings**（设置）标签
   - 在左侧边栏的 "代码和自动化" 部分，点击 **Pages**
   - 在 "生成和部署" 的 "源" 下，选择 **"GitHub Actions"**
   - 保存设置

3. **查看部署状态**
   - 在 GitHub 仓库页面，点击 **Actions** 标签
   - 查看 "Deploy to GitHub Pages" 工作流的运行状态
   - 等待部署完成（通常需要 1-3 分钟）

4. **访问网站**
   - 部署完成后，在 **Settings** > **Pages** 中可以看到网站 URL
   - **项目站点**地址格式：`https://<用户名>.github.io/<仓库名>/`
   - 例如：`https://username.github.io/XingJueWebSite/`
   - ⚠️ **注意**：对站点的更改在推送到 GitHub 后，最长可能需要 **10 分钟** 才会发布

### 方法二：从分支手动部署

如果不想使用 GitHub Actions，也可以从分支手动部署：

1. **构建项目**
   ```bash
   npm run build
   ```

2. **创建并推送到 gh-pages 分支**
   ```bash
   git checkout -b gh-pages
   git add dist
   git commit -m "部署到 GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```
   或者使用更简单的方法：
   ```bash
   npm run build
   cd dist
   git init
   git add .
   git commit -m "部署到 GitHub Pages"
   git branch -M gh-pages
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -f origin gh-pages
   ```

3. **在 GitHub 仓库设置中启用 Pages**
   - 进入 **Settings** > **Pages**
   - 在 "生成和部署" 的 "源" 下，选择 **"从分支进行部署"**
   - 在 "分支" 下拉菜单中选择 `gh-pages`
   - 文件夹选择 `/ (root)`
   - 点击 **Save**（保存）

### 重要配置说明

项目已针对 GitHub Pages 进行了优化配置：

- ✅ **HashRouter**：使用 Hash 路由（`/#/`），避免 GitHub Pages 的路径问题
- ✅ **Base 路径**：`vite.config.ts` 中设置了 `base: '/XingJue/'`，匹配仓库名
  - ⚠️ **重要**：如果您的仓库名不是 `XingJue`，请修改 `vite.config.ts` 中的 `base` 值
  - 例如：仓库名是 `my-project`，则改为 `base: '/my-project/'`
  - 或者使用环境变量：`VITE_BASE_PATH=/your-repo-name/`
- ✅ **自动部署**：GitHub Actions 工作流已配置，推送到 main 分支即可自动部署
- ✅ **构建输出**：构建产物输出到 `dist` 目录，符合 GitHub Pages 要求
- ⚠️ **后端 API 配置**：生产环境必须配置 `VITE_API_BASE_URL` secret，指向实际的后端服务器地址
  - 如果不配置，前端会使用 localStorage 作为后备（数据仅存储在浏览器本地）
  - 配置方法：Settings > Secrets and variables > Actions > 添加 `VITE_API_BASE_URL`

### 站点类型说明

根据 [GitHub Pages 文档](https://docs.github.com/zh/pages/quickstart)，有两种类型的站点：

1. **用户站点**：`<username>.github.io`
   - 需要创建名为 `username.github.io` 的仓库
   - 访问地址：`https://username.github.io`

2. **项目站点**：`<username>.github.io/<repository>`
   - 使用当前仓库（推荐）
   - 访问地址：`https://username.github.io/XingJueWebSite/`
   - 注意：URL 末尾有斜杠 `/`

### 自定义域名（可选）

如果需要使用自定义域名，参考 [配置自定义域](https://docs.github.com/zh/pages/configuring-a-custom-domain-for-your-github-pages-site)：

1. 在 `public` 目录下创建 `CNAME` 文件，内容为您的域名：
   ```
   example.com
   ```

2. 在域名 DNS 设置中添加 CNAME 记录，指向 `<用户名>.github.io`

3. 在 GitHub Pages 设置中启用 **"Enforce HTTPS"**（强制 HTTPS）

### 故障排查

如果遇到 404 错误或资源加载失败，请检查：

1. **Base 路径配置**
   - 确认 `vite.config.ts` 中的 `base` 值与仓库名匹配
   - 仓库名是 `XingJue`，则 `base` 应该是 `'/XingJue/'`
   - 如果仓库名不同，请相应修改 `base` 值

2. **常见问题**
   - [排查 GitHub Pages 404 错误](https://docs.github.com/zh/pages/getting-started-with-github-pages/troubleshooting-github-pages-404-errors)
   - 检查 GitHub Actions 工作流的运行日志
   - 确认使用的是 `HashRouter` 而不是 `BrowserRouter`
   - 清除浏览器缓存后重新访问

3. **验证部署**
   - 检查构建后的 `dist/index.html` 中的资源路径是否正确
   - 确认所有静态资源（JS、CSS）路径都包含正确的 base 路径

## 管理后台

- 访问路径：`/#/admin`
- 默认密码：`XJ-2026-Admin`（可在 `src/data/site-data.json` 中修改）

## 数据管理

- 网站内容配置：通过后端 API 管理（见下方服务器说明）
- 多语言翻译：`src/i18n/locales/*.json`
- 数据存储：服务器端 JSON 文件（`server/data/`）
- 前端默认数据：`src/data/site-data.json`（仅作为后备模板）

## 后端服务器

项目包含一个 Node.js 后端服务器，用于持久化存储站点数据。

### 本地开发

```bash
# 启动后端服务器
cd server
npm install
npm run dev
```

服务器将在 `http://localhost:4000` 启动。

### 环境变量配置

#### 本地开发

在前端项目根目录创建 `.env` 文件（可选，默认使用 `http://localhost:4000/api`）：

```
VITE_API_BASE_URL=http://localhost:4000/api
```

#### 生产环境（GitHub Pages）

**重要**：生产环境必须配置后端 API 地址，否则前端会使用 localStorage 作为后备。

⚠️ **GitHub Pages 不能运行后端服务器**：如果你访问 `https://codeuser6608.github.io/XingJue/api/` 返回 404，这是正常的。GitHub Pages 只托管静态文件，后端必须部署到其他平台（Vercel、Render、Railway 等）。

📖 **快速部署指南**：请参考 [QUICK_DEPLOY.md](QUICK_DEPLOY.md) 获取详细的部署步骤（5 分钟完成）。

1. **部署后端到云平台**（Vercel、Render、Railway 等）
   - 获取后端 API 的根 URL，例如：`https://your-api.vercel.app`（不需要 `/api` 后缀）

2. **配置 GitHub Secrets**：
   - 进入 GitHub 仓库：Settings > Secrets and variables > Actions
   - 点击 "New repository secret"
   - 添加以下 secret：
     - **Name**: `VITE_API_BASE_URL`
     - **Value**: 你的后端 API 根 URL（例如：`https://your-api.vercel.app`，不需要 `/api` 后缀）
   - 点击 "Add secret" 保存

3. **重新触发部署**：
   - 推送代码到 `main` 分支，或
   - 在 Actions 页面手动触发 workflow

4. **验证配置**：
   - 部署完成后，打开浏览器开发者工具
   - 检查 Network 标签，确认 API 请求指向正确的后端地址
   - 打开 Console 标签，查看是否有 API 相关的警告或错误
   - 如果看到 `localhost:4000` 或请求失败，说明 `VITE_API_BASE_URL` 未正确配置

5. **故障排查**：
   - 检查 GitHub Actions 构建日志，确认 `VITE_API_BASE_URL` 是否正确显示
   - 确认 secret 名称完全匹配：`VITE_API_BASE_URL`（区分大小写）
   - 确认 API URL 格式正确：应该是根 URL，例如：`https://your-api.vercel.app`（不需要 `/api` 后缀）
   - 如果使用相对路径，确保后端部署在同一域名下

**注意**：
- 如果不配置 `VITE_API_BASE_URL`，前端会自动使用 localStorage 作为后备，数据仅存储在浏览器本地，不会同步到服务器
- 构建时启动的本地后端服务器（localhost:4000）仅用于构建过程，不会在生产环境中使用
- 生产环境必须使用实际部署的后端服务器地址

### 数据存储说明

- **开发环境**：数据存储在 `server/data/` 目录，分为多个 JSON 文件
  - `settings.json` - 站点设置
  - `categories.json` - 分类
  - `products/{id}.json` - 每个产品单独文件
  - `inquiries/{id}.json` - 每个询盘单独文件
  - 等等...
- **生产环境（Vercel）**：数据存储在 `/tmp/xingjue-data/` 目录
  - ⚠️ **注意**：Vercel Serverless Functions 的 `/tmp` 目录在函数重启后会被清空
  - 如果需要持久化，建议使用外部存储服务或定期备份
- **后备方案**：如果 API 不可用，前端会自动使用 localStorage 作为后备

### 数据更新方式

- **部分更新**：使用 `PATCH /site-data/:section` 更新指定部分（推荐，避免 413 错误）
- **整体更新**：使用 `PUT /site-data` 整体替换（向后兼容，但可能遇到 413 错误）
- **产品操作**：使用 `POST/PATCH/DELETE /site-data/products/:id` 进行产品 CRUD

详细说明请参考 [server/README.md](server/README.md)

## 项目结构

```
src/
├── components/     # 组件
├── context/       # 上下文
├── data/          # 数据文件
├── i18n/          # 国际化
├── pages/         # 页面
├── types/         # 类型定义
└── utils/         # 工具函数
```

## 技术栈

- **框架**：React 19
- **构建工具**：Vite 7
- **语言**：TypeScript
- **样式**：Tailwind CSS 4
- **路由**：React Router DOM 7 (HashRouter)
- **国际化**：i18next + react-i18next
- **表单**：React Hook Form + Zod
- **动画**：Framer Motion
- **图标**：Lucide React
- **通知**：React Hot Toast

## 开发说明

1. 克隆项目后运行 `npm install` 安装依赖
2. 运行 `npm run dev` 启动开发服务器
3. 修改 `src/data/site-data.json` 来更新网站内容
4. 修改 `src/i18n/locales/*.json` 来更新翻译文本

## 许可证

私有项目


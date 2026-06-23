# 云栖浅食餐饮PWA双端点餐系统 - 交付报告

## 🌐 访问链接（GitHub Pages 部署后可用）

部署到 GitHub Pages 后，以下链接将可用：

| 入口 | 链接 | 二维码 |
|------|------|--------|
| 🏠 PWA 引导首页 | https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/ | [qr.html] |
| 🍽 客户端（我要点餐） | https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/client/ | [qr.html] |
| 📊 商家端（订单管理） | https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/admin/ | [qr.html] |
| 📲 安装引导 | https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/install.html | - |
| 📱 二维码页 | https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/qr.html | - |

> ⚠️ 请把上面所有 `YOUR-GITHUB-USERNAME` 替换为你的真实 GitHub 用户名。

## 📱 安装到桌面

### iOS Safari（iPhone/iPad）
1. 用 Safari 打开 https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/
2. 点击底部"分享"按钮（向上箭头图标）
3. 选择"添加到主屏幕"
4. 点击"添加"

### Android Chrome
1. 用 Chrome 打开 https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/
2. 点击右上角菜单（三个点）
3. 选择"添加到主屏幕"或"安装应用"
4. 点击"安装"

### Desktop Chrome/Edge
1. 打开 https://YOUR-GITHUB-USERNAME.github.io/yunqi-canteen/
2. 地址栏右侧会出现"安装"图标（⊕）
3. 点击安装

## 🛠 部署到 GitHub Pages 步骤

1. 在 GitHub 创建新仓库 `yunqi-canteen`
2. 把本地项目推送到 GitHub
3. 在仓库 Settings → Pages → Source 选择 `Deploy from a branch`
4. Branch: `main`，Folder: `/dist-static`
5. 等待 1-2 分钟部署完成

> 💡 启用 GitHub Actions 自动部署：项目根目录已包含 `.github/workflows/deploy-pages.yml`，push 到 `main` 分支即会自动构建并发布到 GitHub Pages。

## ⚠️ 重要注意事项

**GitHub Pages 仅托管静态资源，无法运行 Node.js 后端。**

本项目 `server/` 目录（API + WebSocket）需要单独部署到支持 Node.js 的平台，例如：

- [Render](https://render.com) — 免费 Node.js 服务
- [Railway](https://railway.app) — 一键部署
- [Vercel](https://vercel.com) — Serverless
- 自有服务器 / VPS

部署 `server/` 完成后，将前端 `.env.production` 中的 `VITE_API_BASE` 指向 API 地址，重新 `npm run build`，再 push 即可。

### 离线/演示模式
当前 `dist-static` 前端已支持 PWA 离线缓存 + Service Worker，可作为 UI 演示。完整业务功能（登录、下单、支付、实时订单推送）需配置后端 API 后才能使用。

## ✅ 项目完成情况

- [x] 后端 API 测试 10/10 通过
- [x] 双端深度巡查 + 关键 bug 修复
- [x] UI 升级（骨架屏 + 动画 + 空状态 + PWA 引导）
- [x] 静态部署产物生成（`dist-static/`）
- [x] 引导页 + 安装页 + 二维码页
- [x] PWA 离线支持（manifest + sw.js）
- [x] GitHub Actions 自动部署工作流

## 📂 关键目录结构

```
D:\云栖浅食1.0\
├── client/              # 顾客端源码（React + Vite）
├── admin/               # 商家端源码（React + Vite）
├── server/              # 后端 API（Node + Express + Prisma + Socket.io）
├── shared/              # 共享类型定义
├── dist-static/         # 静态部署产物（GitHub Pages 入口）
│   ├── index.html       # 引导首页
│   ├── install.html     # 安装引导
│   ├── qr.html          # 二维码页
│   ├── 404.html         # 404 兜底
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── icons/           # 公共图标
│   ├── client/          # 顾客端构建产物 + PWA
│   └── admin/           # 商家端构建产物 + PWA
├── scripts/             # 构建辅助脚本
├── .github/workflows/   # GitHub Actions 工作流
└── DELIVERY.md          # 本文件
```

## 🚀 快速开始

### 本地开发
```bash
# 启动后端
cd server && npm install && npm run dev

# 启动客户端（新终端）
cd client && npm install && npm run dev

# 启动商家端（新终端）
cd admin && npm install && npm run dev
```

### 静态部署（GitHub Pages）
直接 push 到 GitHub，`dist-static/` 目录即为发布目录。

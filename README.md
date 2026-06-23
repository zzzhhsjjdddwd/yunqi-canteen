# 云栖浅食 · YunQi Canteen

> 健康轻食在线点餐 PWA 双端系统（客户端 + 商家端）
>
> 🍜 客户端 / 📊 商家端 / ⚙ Express 后端（保留本地或 Render 部署）

---

## 项目结构

```
.
├── client/            # 用户端 SPA（Vite + React + PWA，vite-plugin-pwa）
├── admin/             # 商家端 SPA（Vite + React + PWA，vite-plugin-pwa）
├── server/            # Node.js + Express 后端（Prisma + SQLite，部署到 Render 等）
├── shared/            # 前后端共享类型
├── scripts/           # 工具脚本（图标生成 / 静态构建）
├── dist-static/       # ⭐ GitHub Pages 部署产物（client + admin + 引导页）
│   ├── index.html         # PWA 引导首页（两个 App 入口）
│   ├── install.html       # 通用 PWA 安装引导
│   ├── install-client.html
│   ├── install-admin.html
│   ├── qr.html            # 双端二维码（可打印）
│   ├── 404.html           # SPA fallback
│   ├── manifest.webmanifest
│   ├── sw.js              # 根级占位 SW
│   ├── icons/             # 通用图标
│   ├── client/            # 客户端构建产物（路径已改为相对）
│   └── admin/             # 商家端构建产物（路径已改为相对）
└── README.md
```

---

## 本地开发

```bash
# 安装全部依赖（根 + client + admin + server）
npm run install:all

# 同时启动 server + client + admin（dev）
npm run dev

# 单独启动
cd client && npm run dev    # 客户端 :5173
cd admin  && npm run dev    # 商家端 :5174
cd server  && npm run dev   # 后端   :3000
```

> 数据库：默认 SQLite（`server/src/prisma/dev.db`）。首次运行：
>
> ```bash
> cd server && npx prisma db push && npm run db:seed
> ```

---

## 构建

```bash
# 构建 client + admin + server
npm run build

# 只构建前端（生成 client/dist + admin/dist）
npm run build:client
npm run build:admin

# 一键生成 GitHub Pages 静态产物（dist-static/）
powershell -ExecutionPolicy Bypass -File scripts/build-static.ps1
```

---

## 部署到 GitHub Pages

### 方案 A：用 `dist-static/` 直接发布（推荐）

1. **创建 GitHub 仓库** `yunqi-canteen`（公开）。

2. **在 GitHub → Settings → Pages → Build and deployment**：
   - Source: `Deploy from a branch`
   - Branch: `main`，Folder: `/dist-static`

3. **首次推送**（需要 PAT 或已配置 SSH）：

   ```bash
   git init
   git checkout -b main
   git add .
   git commit -m "chore: 初始化 + 静态部署产物"
   git remote add origin https://github.com/<your-username>/yunqi-canteen.git
   git push -u origin main
   ```

4. **访问**：`https://<your-username>.github.io/yunqi-canteen/`

### 方案 B：使用 `gh-pages` 分支

```bash
# 仅提交 dist-static 内容到 gh-pages 分支
npx gh-pages -d dist-static
```

GitHub Pages 设置中选择 `gh-pages` 分支根目录即可。

### 方案 C：GitHub Actions 自动部署

参考 `.github/workflows/ci-cd.yml`，配置 Pages 部署工作流：

```yaml
permissions:
  pages: write
  id-token: write
```

---

## ⚠️ 部署前必读

1. **后端 API**：`client/` 和 `admin/` 默认调用 `/api/*` 同源请求。
   - GitHub Pages 本身是**纯静态**，没有 `/api`。
   - 你需要：① 将后端部署到 Render / Railway / 自有服务器；② 在构建前设置 `VITE_API_BASE`。
2. **API 基址示例**（在 `client/.env.production` 与 `admin/.env.production` 中）：
   ```
   VITE_API_BASE=https://api.example.com
   ```
3. **微信扫码 / iOS PWA**：iOS 不会触发 `beforeinstallprompt`，必须用 Safari "分享 → 添加到主屏" 流程。
4. **Service Worker 缓存**：安装 PWA 后离线可访问已缓存的页面；新数据需要联网。
5. **二维码页** `qr.html` 会基于当前域名自动生成 QR，部署到正式域名后再打印张贴。

---

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run install:all` | 一键安装前后端依赖 |
| `npm run dev` | 并行启动 server + client + admin |
| `npm run build` | 构建全部 |
| `npm run build:client` | 只构建客户端 |
| `npm run build:admin` | 只构建商家端 |
| `npm run generate:icons` | 重新生成图标 SVG |
| `npm run generate:png-icons` | 重新生成 PNG 图标 |
| `npm run db:push` | 推送 Prisma schema 到 SQLite |
| `npm run db:seed` | 初始化示例数据 |

---

## 许可

MIT

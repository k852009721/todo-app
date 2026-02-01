# 🚂 Railway 部署指南

本指南說明如何將 Todo List 應用部署到 Railway。

## 前置需求

- GitHub 帳號
- Railway 帳號（使用 GitHub 登入）

---

## 步驟一：推送到 GitHub

```bash
# 在 todo-app 目錄下
cd /Users/kevinh/Documents/side/antigravity/todo-app

# 初始化 Git（如果還沒有）
git init

# 建立 .gitignore
echo "node_modules/\ndist/\ndata/\n.env" > .gitignore

# 提交程式碼
git add .
git commit -m "Prepare for Railway deployment"

# 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/todo-app.git
git push -u origin main
```

---

## 步驟二：部署後端 API

1. 登入 [Railway](https://railway.app)
2. 點擊 **New Project** → **Deploy from GitHub repo**
3. 選擇你的 `todo-app` repo
4. Railway 會自動偵測為 Node.js 專案

### 設定 Root Directory

因為後端在 `server/` 子目錄：

1. 進入 **Settings** → **Source**
2. 設定 **Root Directory** 為 `server`

### 新增 Volume（資料庫持久化）

1. 在專案中點擊 **New** → **Volume**
2. 設定 Mount Path 為 `/data`
3. 這會自動設定 `RAILWAY_VOLUME_MOUNT_PATH` 環境變數

### 設定環境變數

在 **Variables** 頁面新增：

| 變數名稱 | 值 |
|----------|-----|
| `JWT_SECRET` | `your-super-secret-key-change-in-production` |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | `https://YOUR-FRONTEND.up.railway.app` |

### 取得後端 URL

部署完成後，在 **Settings** → **Networking** → **Generate Domain**

記下這個 URL，例如：`https://todo-api-production.up.railway.app`

---

## 步驟三：部署前端

1. 在同一個 Railway 專案中，點擊 **New** → **GitHub Repo**
2. 選擇同一個 `todo-app` repo

### 設定 Build

在 **Settings**：
- **Root Directory**: `/`（根目錄）
- **Build Command**: `npm run build`
- **Start Command**: `npx serve dist -s`

### 設定環境變數

| 變數名稱 | 值 |
|----------|-----|
| `VITE_API_URL` | `https://YOUR-BACKEND.up.railway.app/api` |

### 取得前端 URL

在 **Settings** → **Networking** → **Generate Domain**

---

## 步驟四：更新 CORS

回到後端 Service，更新環境變數：

| 變數名稱 | 值 |
|----------|-----|
| `CORS_ORIGINS` | `https://YOUR-FRONTEND.up.railway.app` |

---

## 完成！🎉

你的應用現在可以透過前端 URL 訪問了！

### 測試清單

- [ ] 前端頁面正常載入
- [ ] 可以註冊新帳號
- [ ] 可以登入
- [ ] 可以新增/編輯/刪除任務
- [ ] 登出後重新登入，資料仍在

---

## 常見問題

### Q: 網站顯示 502 或載入失敗？
確認後端 Service 有正確設定 Volume，且 `CORS_ORIGINS` 包含前端 URL。

### Q: 資料遺失？
確認已新增 Volume 並掛載到 `/data`。

### Q: 登入失敗？
確認 `JWT_SECRET` 環境變數已設定。

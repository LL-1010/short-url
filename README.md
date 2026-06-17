# 🔗 全栈短链接服务

## 📖 项目简介
独立开发类微博短链接系统，支持长链接转短链、短链跳转、批量生成、Redis缓存等功能。提供 **Vue3** 和 **React** 双前端版本。

## 🛠️ 技术栈
- **后端**：FastAPI + SQLite + Redis
- **前端**：Vue3 / React
- **并发**：ThreadPoolExecutor 多线程批量处理

## ✨ 核心功能
- 🔗 单链接生成
- ⚡ 批量生成（多线程加速）
- 💾 Redis 缓存热点数据
- 📋 一键复制短链接

## 🚀 本地运行

### 1. 启动后端
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. 启动前端（Vue）
```bash
cd frontend-vue
npm install
npm run dev
```

### 3. 启动前端（React）
```bash
cd frontend-react
npm install
npm run dev
```

## 💡 项目亮点
- ⚡ 多线程批量生成，20个网址从 **2.35秒** 降至 **0.48秒**
- 🚀 Redis缓存加速热点短链接访问
- 🔄 302重定向，支持访问统计
- 🔑 MD5哈希生成6位短码，唯一索引处理哈希冲突
- 🎨 双前端版本（Vue3 + React）

## 👤 作者
**LL-1010**

🔗 项目地址：https://github.com/LL-1010/short-url

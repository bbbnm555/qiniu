# AI视觉对话助手 🎙️

面向视障人士的多模态实时视觉辅助系统。通过摄像头+麦克风采集环境信息，结合多模态AI实现视听融合理解，用自然语音为用户提供实时场景描述和问答。

## Demo 视频

🔗 [查看演示视频](https://www.bilibili.com/xxx) _(待上传)_

## 功能列表

- 🎤 **语音交互**：按住说话，松开即问，AI 语音回答（Chrome/Edge 原生语音识别）
- 📷 **实时视觉采集**：后置摄像头每2秒自动抓取场景图像，通过 WebSocket 实时传输
- 🧠 **视听融合理解**：多模态 AI（GPT-4o / 通义千问VL）同时对图像和语音进行理解和推理
- 🔊 **TTS 语音合成**：AI 回答逐句合成语音，AudioContext 按序播放
- 💬 **对话历史**：流式对话面板，支持多轮上下文理解，可清空重来
- ⚡ **自动中断**：新问题自动取消上一个进行中的回答
- 🎨 **三主题**：标准/深色/高对比度，支持 `prefers-reduced-motion` 和屏幕阅读器
- 📱 **移动端适配**：PWA 离线支持，大按钮盲操作友好（48px+ 触摸目标）
- ☁️ **七牛云集成**：Kodo 存储、CDN 加速、Dora 音视频处理

## 技术栈

| 层级   | 技术                                                 |
| ------ | ---------------------------------------------------- |
| 前端   | React 18 + TypeScript + Vite + Zustand               |
| 后端   | Node.js + Express + TypeScript + ws                  |
| AI     | 多模态视觉 API (OpenAI 兼容) + TTS API               |
| 云服务 | 七牛云 Kodo / CDN / Dora                             |
| 语音   | Web Speech API (SpeechRecognition + SpeechSynthesis) |

## 使用方法

### 环境要求

- Node.js >= 18
- Chrome 或 Edge 浏览器（语音识别需要）

### 安装

```bash
git clone https://github.com/bbbnm555/qiniu.git
cd qiniu
npm install
```

### 配置

```bash
cp .env.example .env
# 编辑 .env，填入 AI API Key 和七牛云密钥
```

| 环境变量           | 说明                                 | 必填 |
| ------------------ | ------------------------------------ | ---- |
| `VISION_API_KEY`   | 多模态视觉模型 API Key (OpenAI 兼容) | 推荐 |
| `VISION_MODEL`     | 模型名称，默认 `gpt-4o`              | 否   |
| `TTS_API_KEY`      | TTS 语音合成 API Key                 | 推荐 |
| `QINIU_ACCESS_KEY` | 七牛云 AccessKey                     | 可选 |
| `QINIU_SECRET_KEY` | 七牛云 SecretKey                     | 可选 |

> 不填 API Key 也能启动，相关服务会优雅降级。

### 运行

```bash
# 同时启动前后端
npm run dev

# 前端: http://localhost:5173
# 后端: http://localhost:3001
# WebSocket: ws://localhost:3001/ws
```

## 依赖说明

| 依赖              | 用途             |
| ----------------- | ---------------- |
| react / react-dom | 前端 UI 框架     |
| react-router-dom  | 页面路由         |
| zustand           | 轻量状态管理     |
| vite              | 前端构建工具     |
| express           | 后端 HTTP 框架   |
| ws                | WebSocket 服务端 |
| zod               | 环境变量校验     |
| pino              | 结构化日志       |
| helmet / cors     | 安全中间件       |

## 项目结构

```
├── frontend/           # React 前端
│   └── src/
│       ├── components/ # UI 组件（conversation/layout/ui）
│       ├── hooks/      # 自定义 Hooks（WS/媒体/语音/音频）
│       ├── services/   # 服务层（WebSocket/摄像头/音频采集）
│       ├── stores/     # Zustand 状态管理
│       └── types/      # TypeScript 类型定义
├── backend/            # Express 后端
│   └── src/
│       ├── config/     # 配置（env/七牛云/AI）
│       ├── middleware/ # 中间件（错误/限流/日志/安全）
│       ├── routes/     # REST API 路由
│       ├── services/   # 业务服务（AI/媒体/七牛云）
│       └── websocket/  # WebSocket 协议/会话/处理器
└── docs/               # 架构文档
```

## 开发进度

- ✅ Phase 0: 项目初始化 (3/3)
- ✅ Phase 1: 核心通信链路 (3/3)
- ✅ Phase 2: 语音交互链路 (3/3)
- ✅ Phase 3: 对话体验优化 (3/3)
- ✅ Phase 4: 七牛云集成 (2/2)
- ✅ Phase 5: 完善交付 (2/2)

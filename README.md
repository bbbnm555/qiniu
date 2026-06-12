# AI视觉对话助手 🎙️

面向视障人士的多模态实时视觉辅助系统。通过摄像头采集环境、麦克风听取语音，结合通义千问多模态大模型实现视听融合理解，用 cosyvoice 自然语音合成回答。

## Demo 视频

🔗 [查看演示视频](https://www.bilibili.com/xxx) _(待上传)_

## 功能列表

- 🎤 **语音交互** — 按住说话，松开即问，AI 语音回答
- 📷 **实时视觉采集** — 后置摄像头每 2 秒自动抓取场景帧，WebSocket 实时传输
- 🧠 **视听融合推理** — 通义千问 VL Plus 多模态模型，同时理解图像和语音
- 🔊 **自然语音合成** — 阿里云 cosyvoice TTS，逐句合成、按序播放
- 💬 **流式对话** — AI 回答逐句推送，支持多轮上下文理解
- ⚡ **自动中断** — 新问题自动取消上一个进行中的回答
- 🎨 **三主题** — 标准 / 深色 / 高对比度，支持屏幕阅读器和减弱动画
- 📱 **移动端适配** — PWA 离线支持，48px+ 大按钮盲操作友好
- ☁️ **七牛云集成** — Kodo 私有存储 + CDN 签名分发 + Dora 音视频处理

## 技术栈

| 层级     | 技术                                            |
| -------- | ----------------------------------------------- |
| 前端     | React 18 + TypeScript + Vite + Zustand          |
| 后端     | Node.js + Express + TypeScript + WebSocket (ws) |
| AI 视觉  | 通义千问 VL Plus（DashScope 兼容 OpenAI 格式）  |
| AI 语音  | 阿里云 cosyvoice TTS                            |
| 云存储   | 七牛云 Kodo（私有 Bucket + CDN 签名 URL）       |
| 语音输入 | Web Speech API（浏览器原生语音识别）            |

## 使用方法

### 环境要求

- Node.js >= 18
- Chrome 或 Edge 浏览器

### 安装

```bash
git clone https://github.com/bbbnm555/qiniu.git
cd qiniu
npm install
```

### 配置

```bash
cp .env.example .env
# 编辑 .env，填入以下必填项：
```

| 环境变量           | 说明                  | 获取地址                                                        |
| ------------------ | --------------------- | --------------------------------------------------------------- |
| `VISION_API_KEY`   | 通义千问 VL API Key   | [DashScope 控制台](https://dashscope.console.aliyun.com/apiKey) |
| `TTS_API_KEY`      | cosyvoice TTS API Key | 同上（一个 Key 通用）                                           |
| `QINIU_ACCESS_KEY` | 七牛云 AccessKey      | [七牛云密钥管理](https://portal.qiniu.com/user/key)             |
| `QINIU_SECRET_KEY` | 七牛云 SecretKey      | 同上                                                            |
| `QINIU_BUCKET`     | Kodo 存储空间名称     | [Kodo 控制台](https://portal.qiniu.com/kodo/bucket) 创建        |

### 运行

```bash
# 同时启动前后端
npm run dev

# 前端: http://localhost:5173
# 后端: http://localhost:3001
# WebSocket: ws://localhost:3001/ws
```

## 架构

```
用户语音 → SpeechRecognition → WS user.query
                                    ↓
摄像头帧 → canvas 截 JPEG → WS frame.update → visionService（通义千问 VL）
                                                    ↓
                                    逐句 response.text + TTS 音频 (Binary)
                                                    ↓
                                    前端 AudioContext 播放语音回答
```

## 项目结构

```
├── frontend/              # React 前端
│   └── src/
│       ├── components/    # conversation / layout / ui
│       ├── hooks/         # useMediaStream / useWebSocket / useVoiceRecognition / useAudioOutput
│       ├── services/      # WebSocketClient / cameraCapture / audioCapture
│       └── stores/        # useConversationStore / useMediaStore / useSettingsStore / useConnectionStore
├── backend/               # Express 后端
│   └── src/
│       ├── config/        # env (Zod) / qiniu
│       ├── middleware/    # errorHandler / rateLimiter / validator / security
│       ├── routes/        # health / upload
│       ├── services/      # ai (vision / tts / context) / qiniu (kodo / processing)
│       └── websocket/     # protocol / handler / session
└── docs/                  # 架构文档
```

## 依赖说明

| 依赖              | 用途                           |
| ----------------- | ------------------------------ |
| react / react-dom | 前端 UI 框架                   |
| react-router-dom  | 页面路由（`/` 和 `/settings`） |
| zustand           | 轻量状态管理                   |
| vite              | 前端构建工具                   |
| express           | 后端 HTTP 框架                 |
| ws                | WebSocket 实时通信             |
| zod               | 环境变量运行时校验             |
| pino              | 结构化日志                     |
| helmet / cors     | 安全中间件                     |

## 许可证

MIT

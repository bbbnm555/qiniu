# VisionTalk — AI 视觉对话助手 🎙️

面向**视障人士**的多模态实时视觉辅助系统。语音唤醒 + 摄像头 + AI 理解场景，cosyvoice / 浏览器双引擎语音回答，让用户"听见"世界。

> 🏆 七牛云 XXEngineer 暑期实训营参赛作品

## Demo 视频

🔗 [查看演示视频](https://www.bilibili.com/xxx) _(待上传)_

---

## 功能

| 功能          | 说明                                                 |
| ------------- | ---------------------------------------------------- |
| 🎤 语音唤醒   | 说 **"你好VT"** 自动唤醒，全程免提操作               |
| 🎤 按键输入   | 按住 **T 键** 说话，松开提交                         |
| 📷 实时视觉   | 摄像头每 2 秒抓帧，WebSocket 实时传输                |
| 🧠 AI 理解    | 通义千问 VL Plus，图像 + 语音融合推理                |
| 🔊 双引擎 TTS | cosyvoice-v3-flash 云端高音质 / 浏览器内置，设置切换 |
| ⌨️ 文字输入   | 输入框打字备用交互                                   |
| ⚡ 自动中断   | 新问题自动取消上一个回答                             |
| ☀️ 温暖 UI    | 温暖日光配色 · 高对比度 · 大字号 · AAA 无障碍        |

## 技术栈

| 层       | 技术                                   |
| -------- | -------------------------------------- |
| 前端     | React 18 + TypeScript + Vite + Zustand |
| 后端     | Node.js + Express + WebSocket (ws)     |
| AI 视觉  | 通义千问 VL Plus（DashScope）          |
| AI 语音  | cosyvoice-v3-flash / SpeechSynthesis   |
| 语音识别 | Web Speech API                         |
| 云存储   | 七牛云 Kodo（私有 Bucket）             |
| 字体     | Inter（高可读性可变字体）              |

## 设计系统

采用 **温暖日光** 设计语言 — 为视障用户优化：

| 特性     | 值                              |
| -------- | ------------------------------- |
| 背景色   | 暖米色 `#FFF8F0`                |
| 强调色   | 暖橙 `#C45A28`                  |
| 基准字号 | 18px（112.5%）                  |
| 对比度   | WCAG **AAA** 级 (≥7:1)          |
| 触控目标 | 最小 56px                       |
| 暗色模式 | 跟随系统自动切换                |
| 动效     | 克制 + `prefers-reduced-motion` |

## 快速开始

```bash
git clone https://github.com/bbbnm555/qiniu.git
cd qiniu
npm install
cp .env.example .env   # 编辑填入 API Key
npm run dev             # 前端 :5173  后端 :3001
```

## 环境变量

| 变量               | 说明             | 获取                                                     |
| ------------------ | ---------------- | -------------------------------------------------------- |
| `FRONTEND_URL`     | 前端地址（CORS） | 默认 `http://localhost:5173`                             |
| `VISION_API_KEY`   | 通义千问 VL      | [DashScope](https://dashscope.console.aliyun.com/apiKey) |
| `TTS_API_KEY`      | cosyvoice TTS    | 同上                                                     |
| `QINIU_ACCESS_KEY` | 七牛云 AK        | [密钥管理](https://portal.qiniu.com/user/key)            |
| `QINIU_SECRET_KEY` | 七牛云 SK        | 同上                                                     |
| `QINIU_BUCKET`     | 存储空间名       | [Kodo](https://portal.qiniu.com/kodo/bucket)             |

## 操作指南

| 操作        | 方式                                              |
| ----------- | ------------------------------------------------- |
| 🎤 语音唤醒 | 说 **"你好VT"**，自动连接 + 开摄像头              |
| 🎤 按键说话 | 按住 **T 键**，松开提交                           |
| 📷 摄像头   | 点击 📷 按钮开关                                  |
| ⌨️ 文字输入 | 输入框打字，点击发送                              |
| ⚙️ 设置     | 右上角 → 语速 / 音量 / 语音引擎 / 主题 / 输入模式 |

## 架构

```
麦克风 → SpeechRecognition → WebSocket user.query
                                      ↓
摄像头 → canvas 截 JPEG → WS frame.update → visionService（通义千问 VL）
                                                      ↓
                                      逐句 response.text + TTS Binary
                                                      ↓
                                      AudioContext / SpeechSynthesis
```

## 项目结构

```
frontend/src/              backend/src/
├── assets/styles/         ├── config/        # env (Zod) / qiniu
│   ├── globals.css  ← 设计 tokens         ├── middleware/    # error / rate / validator / security
│   └── mobile.css                          ├── routes/        # health / upload
├── components/                             ├── services/      # ai (vision/tts/context) / qiniu
│   ├── conversation/                       └── websocket/     # protocol / handler / session
│   ├── layout/           PRODUCT.md  ← 产品战略
│   └── ui/               DESIGN.md   ← 设计系统
├── hooks/
├── services/
├── stores/
└── types/
```

## License

MIT

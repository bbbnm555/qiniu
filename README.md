# VisionTalk — AI 视觉对话助手 🎙️

面向视障人士的多模态实时视觉辅助系统。摄像头采集环境 + 麦克风听取语音，通义千问 VL 多模态大模型理解场景，cosyvoice / 浏览器双引擎语音回答。

> 🏆 七牛云 XXEngineer 暑期实训营参赛作品

## Demo 视频

🔗 [查看演示视频](https://www.bilibili.com/xxx) _(待上传)_

## 功能

| 功能          | 说明                                                |
| ------------- | --------------------------------------------------- |
| 🎤 语音输入   | 按住 **T 键**说话，松开提交。支持浏览器原生语音识别 |
| 📷 实时视觉   | 后置摄像头每 2 秒抓帧，WebSocket 实时传输           |
| 🧠 AI 理解    | 通义千问 VL Plus 多模态模型，图像 + 语音融合推理    |
| 🔊 双引擎 TTS | cosyvoice 云端高音质 / 浏览器内置免费，设置中切换   |
| ⚡ 自动中断   | 新问题自动取消上一个回答                            |
| 🎨 暗色 UI    | Outfit 字体 + 暖金点缀 + 玻璃态灵动岛               |

## 技术栈

| 层       | 技术                                           |
| -------- | ---------------------------------------------- |
| 前端     | React 18 + TypeScript + Vite + Zustand         |
| 后端     | Node.js + Express + WebSocket (ws)             |
| AI 视觉  | 通义千问 VL Plus（DashScope 兼容 OpenAI 格式） |
| AI 语音  | cosyvoice-v3-flash / 浏览器 SpeechSynthesis    |
| 语音输入 | Web Speech API                                 |
| 云存储   | 七牛云 Kodo（私有 Bucket）                     |

## 快速开始

### 环境要求

- Node.js >= 18
- Chrome / Edge 浏览器

### 安装

```bash
git clone https://github.com/bbbnm555/qiniu.git
cd qiniu
npm install
cp .env.example .env
```

### 配置 .env

| 变量               | 说明                    | 获取                                                     |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| `VISION_API_KEY`   | 通义千问 VL             | [DashScope](https://dashscope.console.aliyun.com/apiKey) |
| `TTS_API_KEY`      | cosyvoice TTS（同 Key） | 同上                                                     |
| `QINIU_ACCESS_KEY` | 七牛云 AK               | [密钥管理](https://portal.qiniu.com/user/key)            |
| `QINIU_SECRET_KEY` | 七牛云 SK               | 同上                                                     |
| `QINIU_BUCKET`     | 存储空间名              | [Kodo 控制台](https://portal.qiniu.com/kodo/bucket)      |

### 运行

```bash
npm run dev        # 前端 :5173  后端 :3001  WS :3001/ws
```

## 操作

| 操作          | 方式          |
| ------------- | ------------- |
| 🎤 开始说话   | 按住 **T 键** |
| 🤚 停止说话   | 松开 **T 键** |
| 📷 开关摄像头 | 点击 📷 按钮  |
| ⚙️ 设置       | 右上角设置页  |

## 架构

```
按住 T → SpeechRecognition → WS user.query
                                  ↓
摄像头 → canvas 截 JPEG → WS frame.update → visionService（通义千问 VL）
                                                  ↓
                                  逐句 response.text + TTS Binary 帧
                                                  ↓
                                  AudioContext / SpeechSynthesis 播放
```

## 项目结构

```
├── frontend/src/
│   ├── components/   # conversation / layout / ui
│   ├── hooks/        # useMediaStream / useWebSocket / useVoiceRecognition / useAudioOutput
│   ├── services/     # WebSocketClient / cameraCapture / audioCapture
│   └── stores/       # Zustand 状态管理
├── backend/src/
│   ├── config/       # env (Zod) / qiniu
│   ├── middleware/   # errorHandler / rateLimiter / validator / security
│   ├── routes/       # health / upload
│   ├── services/     # ai (vision / tts / context) / qiniu
│   └── websocket/    # protocol / handler / session
```

## License

MIT

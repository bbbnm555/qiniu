import { getEnv } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type { ContextService } from "./contextService.js";

interface AnalyzeRequest {
  imageBase64: string;
  question: string;
  context: ReturnType<ContextService["getContext"]>;
  signal?: AbortSignal;
}

/**
 * 多模态视觉理解服务
 *
 * 调用兼容 OpenAI 格式的多模态 API（支持 GPT-4o / 通义千问VL / DeepSeek-VL 等）
 * 使用 streaming 模式，按句子 yield 返回
 */
export class VisionService {
  private activeAbortControllers = new Map<string, AbortController>();

  /**
   * 分析图像 + 问题，流式返回回答句子
   */
  async *analyze(request: AnalyzeRequest): AsyncGenerator<string> {
    const env = getEnv();

    if (!env.VISION_API_KEY) {
      yield "视觉理解服务未配置 API Key，请设置 VISION_API_KEY 环境变量。";
      return;
    }

    const queryId = crypto.randomUUID();
    const abortController = new AbortController();
    this.activeAbortControllers.set(queryId, abortController);

    // 合并 signal
    if (request.signal) {
      request.signal.addEventListener("abort", () => abortController.abort());
    }

    try {
      const messages: Array<Record<string, unknown>> = [
        {
          role: "system",
          content:
            "你是一个视障人士的视觉助手。请观察用户提供的图像，用中文简洁清晰地回答用户的问题。" +
            "回答要求：分句表述，每句话不超过 30 个字，便于语音播报。" +
            "如果图像不清晰或无法判断，请如实告知用户。",
        },
        // 附加上下文
        ...request.context.map((ctx) => ({
          role: ctx.role,
          content: ctx.content,
        })),
        {
          role: "user",
          content: [
            {
              type: "text",
              text: request.question,
            },
            {
              type: "image_url",
              image_url: {
                url: request.imageBase64,
                detail: "low", // 低分辨率即可，减少 token 消耗
              },
            },
          ],
        },
      ];

      const response = await fetch(env.VISION_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.VISION_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.VISION_MODEL,
          messages,
          max_tokens: 500,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        logger.error(
          { status: response.status, errorText },
          "视觉 AI API 请求失败",
        );
        yield `AI 服务返回错误 (${response.status})，请稍后重试。`;
        return;
      }

      // 解析 SSE streaming
      let sentenceBuffer = "";
      const reader = response.body?.getReader();
      if (!reader) {
        yield "AI 服务响应异常，请重试。";
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (!delta) continue;

            sentenceBuffer += delta;

            // 按标点符号分句
            if (/[。！？\n]/.test(sentenceBuffer)) {
              const parts = sentenceBuffer.split(/(?<=[。！？\n])/);
              // 最后一个可能是不完整的
              for (let i = 0; i < parts.length - 1; i++) {
                const sentence = parts[i].trim();
                if (sentence) yield sentence;
              }
              sentenceBuffer = parts[parts.length - 1];
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }

      // 输出剩余内容
      if (sentenceBuffer.trim()) {
        yield sentenceBuffer.trim();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        logger.info({ queryId }, "AI 调用已被取消");
        return;
      }
      logger.error({ err }, "视觉 AI 调用异常");
      yield "AI 服务暂时不可用，请检查网络连接后重试。";
    } finally {
      this.activeAbortControllers.delete(queryId);
    }
  }

  /** 取消指定查询 */
  cancel(queryId: string): void {
    const controller = this.activeAbortControllers.get(queryId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(queryId);
    }
  }
}

// 全局单例
export const visionService = new VisionService();

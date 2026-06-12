import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";

type ValidationTarget = "body" | "query" | "params";

/**
 * 请求参数校验中间件工厂
 *
 * @param schema  Zod schema
 * @param target  校验目标（body / query / params）
 */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[target];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "请求参数校验失败",
          details: errors,
        },
      });
      return;
    }

    // 用校验后的数据替换原始数据（包含默认值、转换等）
    req[target] = result.data;
    next();
  };
}

// ---- 常用 Schema ----

export const idParamSchema = z.object({
  id: z.string().uuid("无效的会话 ID"),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v || "1", 10))),
  pageSize: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v || "20", 10)))),
});

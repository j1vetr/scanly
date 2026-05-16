import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_BASE64_BYTES = 10 * 1024 * 1024;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  entry.count += 1;
  return true;
}

router.post("/ocr", async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin." });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 alanı gereklidir." });
    return;
  }

  const safeType = (typeof mimeType === "string" ? mimeType.toLowerCase() : "");
  if (!ALLOWED_MIME_TYPES.has(safeType)) {
    res.status(400).json({ error: "Desteklenmeyen dosya türü. Kabul edilen tipler: JPEG, PNG, WebP." });
    return;
  }

  if (Buffer.byteLength(imageBase64, "base64") > MAX_BASE64_BYTES) {
    res.status(413).json({ error: "Görüntü dosyası çok büyük. Maksimum 10 MB desteklenmektedir." });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Bu belgedeki tüm metni olduğu gibi çıkar. Sadece belgedeki metni döndür, başka hiçbir şey ekleme. Metin yoksa boş string döndür.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${safeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    res.json({ text });
  } catch (err) {
    req.log.error({ err }, "OCR hatası");
    res.status(500).json({ error: "Metin tanıma sırasında bir hata oluştu." });
  }
});

export default router;

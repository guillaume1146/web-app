import { Injectable, BadRequestException, Logger } from '@nestjs/common';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';

export interface ReceiptExtraction {
  merchant: string | null;
  date: string | null;          // ISO date yyyy-mm-dd
  category: string | null;      // consultation | pharmacy | dental | lab | hospitalization | other
  currency: string | null;
  totalAmount: number | null;
  items: Array<{ description: string; amount: number }>;
  confidence: 'low' | 'medium' | 'high';
  rawText: string | null;       // best-effort transcription for audit
}

/**
 * Groq-backed receipt OCR. Given an image URL (or base64 data URI), asks a
 * vision model to extract the fields the insurance claim form needs. The
 * output is a best-effort JSON structure — the UI still lets the member
 * correct each field before submitting.
 *
 * Used by: member-side claim submission flow (auto-fill form), fraud
 * pipeline (compare OCR amount against declared amount), admin review.
 */
@Injectable()
export class ReceiptOcrService {
  private readonly logger = new Logger(ReceiptOcrService.name);

  async extractFromUrl(imageUrl: string): Promise<ReceiptExtraction> {
    if (!imageUrl) throw new BadRequestException('imageUrl is required');
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');

    const prompt = `You are a medical receipt / invoice OCR engine. Extract fields from the attached image.
Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "merchant": string | null,
  "date": "YYYY-MM-DD" | null,
  "category": "consultation" | "pharmacy" | "dental" | "lab" | "hospitalization" | "optical" | "other" | null,
  "currency": string | null,
  "totalAmount": number | null,
  "items": [{ "description": string, "amount": number }],
  "confidence": "low" | "medium" | "high",
  "rawText": string | null
}
Rules:
- Pick the SINGLE total (not a line item) for totalAmount. If multiple totals, prefer the one labelled "Total" / "Net à payer".
- Category: infer from merchant type + description. Default to "other" when unsure.
- Confidence: "high" if image is crisp and all fields clear; "medium" if partial; "low" if blurry / missing / clearly not a receipt.
- rawText: a short verbatim transcription of the key lines, up to 400 characters.
- If image is NOT a medical receipt, return all nulls with confidence "low".`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          }],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Groq vision error ${response.status}: ${body}`);
        throw new Error(`OCR failed (${response.status})`);
      }

      const data: any = await response.json();
      const raw = data?.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error('OCR returned empty response');

      return this.parseJson(raw);
    } catch (e) {
      this.logger.warn(`Receipt OCR failed for ${imageUrl}: ${(e as Error).message}`);
      return {
        merchant: null, date: null, category: null, currency: null,
        totalAmount: null, items: [], confidence: 'low',
        rawText: `OCR error: ${(e as Error).message}`,
      };
    }
  }

  private parseJson(raw: string): ReceiptExtraction {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OCR did not return JSON');
    const parsed = JSON.parse(match[0]) as Partial<ReceiptExtraction>;
    return {
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      category: parsed.category ?? null,
      currency: parsed.currency ?? null,
      totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null,
      items: Array.isArray(parsed.items) ? parsed.items.filter(
        (i: any) => i && typeof i.description === 'string' && typeof i.amount === 'number',
      ) : [],
      confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low',
      rawText: parsed.rawText ?? null,
    };
  }
}

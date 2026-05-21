import type { LlmSettings } from "@/lib/llm-settings";
import { normalizeOpenAIBaseUrl } from "@/lib/llm-settings";

export interface OpenAIProxyRequestOptions {
  model: string;
  prompt: string;
  stream: boolean;
  temperature?: number;
}

function isResponsesEndpoint(targetUrl: string): boolean {
  return /\/responses(?:\?|$)/.test(targetUrl);
}

function extractTextFromContentArray(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const record = item as Record<string, unknown>;
      return typeof record.text === "string" ? record.text : "";
    })
    .join("");
}

export function extractOpenAICompatibleResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];

  for (const choice of choices) {
    if (!choice || typeof choice !== "object") {
      continue;
    }

    const message = (choice as Record<string, unknown>).message;
    if (!message || typeof message !== "object") {
      continue;
    }

    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }

    const arrayText = extractTextFromContentArray(content);
    if (arrayText) {
      return arrayText;
    }
  }

  const output = Array.isArray(record.output) ? record.output : [];
  let outputText = "";

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as Record<string, unknown>).content;
    outputText += extractTextFromContentArray(content);
  }

  if (outputText) {
    return outputText;
  }

  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  return "";
}

export function extractOpenAICompatibleStreamText(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const chunks: string[] = [];

  const choices = Array.isArray(record.choices) ? record.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") {
      continue;
    }

    const delta = (choice as Record<string, unknown>).delta;
    if (typeof delta === "string" && delta.length > 0) {
      chunks.push(delta);
      continue;
    }

    if (!delta || typeof delta !== "object") {
      continue;
    }

    const content = (delta as Record<string, unknown>).content;
    if (typeof content === "string" && content.length > 0) {
      chunks.push(content);
      continue;
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const text = (item as Record<string, unknown>).text;
        if (typeof text === "string" && text.length > 0) {
          chunks.push(text);
        }
      }
    }
  }

  if (record.type === "response.output_text.delta" && typeof record.delta === "string") {
    chunks.push(record.delta);
  }

  return chunks;
}

export function buildOpenAIProxyRequest(
  settings: LlmSettings,
  options: OpenAIProxyRequestOptions
) {
  const targetUrl = normalizeOpenAIBaseUrl(settings.openaiCompatible.baseURL);
  const apiKey = settings.openaiCompatible.apiKey.trim();

  if (!targetUrl) {
    throw new Error("OpenAI-compatible Base URL is missing.");
  }
  if (!apiKey) {
    throw new Error("OpenAI-compatible API Key is missing.");
  }

  const requestBody = isResponsesEndpoint(targetUrl)
    ? {
        model: options.model,
        input: [{ role: "user", content: options.prompt }],
        stream: options.stream,
        temperature: options.temperature,
      }
    : {
        model: options.model,
        messages: [{ role: "user", content: options.prompt }],
        stream: options.stream,
        temperature: options.temperature,
      };

  return {
    url: "/api/llm-proxy",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LLM-Target-URL": targetUrl,
        "X-LLM-API-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
    } satisfies RequestInit,
  };
}

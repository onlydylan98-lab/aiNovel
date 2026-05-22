import type { CompatibleProtocol, CompatibleSettings } from "@/lib/llm-settings";
import { normalizeCompatibleBaseUrl } from "@/lib/llm-settings";

export interface CompatibleProxyRequestOptions {
  model: string;
  prompt: string;
  stream: boolean;
  temperature?: number;
}

type ResolvedCompatibleProtocol = Exclude<CompatibleProtocol, "auto">;

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

export function extractCompatibleResponseText(payload: unknown): string {
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

export function extractCompatibleStreamText(payload: unknown): string[] {
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

export function resolveCompatibleProtocol(
  baseURL: string,
  protocol: CompatibleProtocol
): ResolvedCompatibleProtocol {
  if (protocol === "responses" || protocol === "chat-completions") {
    return protocol;
  }

  if (/\/responses(?:\?|$)/.test(baseURL)) {
    return "responses";
  }

  if (/\/chat\/completions(?:\?|$)/.test(baseURL)) {
    return "chat-completions";
  }

  return "chat-completions";
}

export function buildCompatibleProxyRequest(
  settings: CompatibleSettings,
  options: CompatibleProxyRequestOptions
) {
  const targetUrl = normalizeCompatibleBaseUrl(settings.baseURL);
  const apiKey = settings.apiKey.trim();

  if (!targetUrl) {
    throw new Error("Compatible interface Base URL is missing.");
  }
  if (!apiKey) {
    throw new Error("Compatible interface API Key is missing.");
  }

  const protocol = resolveCompatibleProtocol(targetUrl, settings.protocol);
  const requestBody = protocol === "responses"
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

export async function generateCompatibleCompletion(
  settings: CompatibleSettings,
  options: {
    model: string;
    prompt: string;
    stream: false;
    temperature?: number;
  }
): Promise<string> {
  const proxyRequest = buildCompatibleProxyRequest(settings, {
    model: options.model,
    prompt: options.prompt,
    stream: false,
    temperature: options.temperature,
  });

  const response = await fetch(proxyRequest.url, proxyRequest.init);

  if (!response.ok) {
    const detail = await safeReadErrorBody(response);
    throw new Error(
      `Compatible interface request failed with ${response.status}.${detail ? ` ${detail}` : ""}`
    );
  }

  const json = await response.json();
  const content = extractCompatibleResponseText(json);
  if (content) {
    return content;
  }

  throw new Error("Compatible interface response did not contain message content.");
}

export async function* generateCompatibleCompletionStream(
  settings: CompatibleSettings,
  options: {
    model: string;
    prompt: string;
    temperature?: number;
  }
) {
  const proxyRequest = buildCompatibleProxyRequest(settings, {
    model: options.model,
    prompt: options.prompt,
    stream: true,
    temperature: options.temperature,
  });

  const response = await fetch(proxyRequest.url, proxyRequest.init);

  if (!response.ok || !response.body) {
    const detail = await safeReadErrorBody(response);
    throw new Error(
      `Compatible interface stream failed with ${response.status}.${detail ? ` ${detail}` : ""}`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const lines = event
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"));

      for (const line of lines) {
        const payload = line.slice(5).trim();
        if (!payload) {
          continue;
        }
        if (payload === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const chunks = extractCompatibleStreamText(parsed);
          for (const chunk of chunks) {
            if (chunk.length > 0) {
              yield chunk;
            }
          }
        } catch {
          // Ignore malformed keep-alive chunks from third-party implementations.
        }
      }
    }

    if (done) {
      return;
    }
  }
}

async function safeReadErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return "";
    }

    try {
      const parsed = JSON.parse(text) as {
        error?: unknown;
        targetUrl?: unknown;
        upstreamBody?: unknown;
      };
      const pieces = [
        typeof parsed.error === "string" ? parsed.error : "",
        typeof parsed.targetUrl === "string" ? `target=${parsed.targetUrl}` : "",
        typeof parsed.upstreamBody === "string" && parsed.upstreamBody.trim()
          ? `upstream=${parsed.upstreamBody.trim()}`
          : "",
      ].filter(Boolean);
      return pieces.join(" ");
    } catch {
      return text;
    }
  } catch {
    return "";
  }
}

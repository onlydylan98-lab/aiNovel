import { GoogleGenAI, Type } from "@google/genai";
import type { LlmSettings } from "@/lib/llm-settings";
import { normalizeOpenAIBaseUrl } from "@/lib/llm-settings";
import {
  buildOpenAIProxyRequest,
  extractOpenAICompatibleResponseText,
  extractOpenAICompatibleStreamText,
} from "@/lib/openai-compatible";

export interface NovelConfig {
  title: string;
  genre: string;
  coreIdea: string;
  protagonist: string;
  tone: string;
}

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  synopsis: string;
  status: "pending" | "generating" | "completed";
  content?: string;
  summary?: string;
}

export interface NovelOutline {
  synopsis: string;
  worldview: string;
  characterProfiles: string;
  chapters: ChapterOutline[];
}

type JsonSchema = Record<string, unknown>;

function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!apiKey.trim()) {
    throw new Error("Gemini API Key is missing.");
  }

  return new GoogleGenAI({ apiKey });
}

export { mergeStoredLlmSettings, normalizeOpenAIBaseUrl } from "@/lib/llm-settings";

export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJson<T>(rawText: string): T {
  return JSON.parse(stripJsonFences(rawText)) as T;
}

function normalizeTextField(value: unknown, fieldName: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (!item || typeof item !== "object") {
          return "";
        }

        const record = item as Record<string, unknown>;

        if (
          typeof record.name === "string" &&
          typeof record.role === "string" &&
          typeof record.profile === "string"
        ) {
          return `${record.name}（${record.role}）：${record.profile}`;
        }

        return Object.values(record)
          .filter((entry): entry is string => typeof entry === "string")
          .join(" ");
      })
      .filter(Boolean)
      .join("\n");

    if (text) {
      return text;
    }
  }

  throw new Error(`Model response is missing required ${fieldName} field.`);
}

function normalizeChapters(chapters: unknown): ChapterOutline[] {
  if (!Array.isArray(chapters)) {
    throw new Error("Model response does not contain a valid chapters array.");
  }

  return chapters.map((chapter, index) => {
    if (
      !chapter ||
      typeof chapter !== "object" ||
      typeof (chapter as Record<string, unknown>).chapterNumber !== "number" ||
      typeof (chapter as Record<string, unknown>).title !== "string" ||
      typeof (chapter as Record<string, unknown>).synopsis !== "string"
    ) {
      throw new Error(`Invalid chapter structure at index ${index}.`);
    }

    const record = chapter as Record<string, unknown>;
    return {
      chapterNumber: record.chapterNumber as number,
      title: record.title as string,
      synopsis: record.synopsis as string,
      status: "pending",
    };
  });
}

export function normalizeNovelOutline(parsed: unknown): NovelOutline {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model response is not a valid outline object.");
  }

  const record = parsed as Record<string, unknown>;

  return {
    synopsis: normalizeTextField(record.synopsis, "synopsis"),
    worldview: normalizeTextField(record.worldview, "worldview"),
    characterProfiles: normalizeTextField(record.characterProfiles, "characterProfiles"),
    chapters: normalizeChapters(record.chapters),
  };
}

function getProviderErrorMessage(error: unknown): string {
  const detail =
    error instanceof Error && error.message
      ? ` 详细信息：${error.message}`
      : "";

  return `请检查供应商、模型名、接口地址和 API Key 是否正确。OpenAI 兼容接口会直接使用你填写的地址。${detail}`;
}

async function generateJson(
  settings: LlmSettings,
  prompt: string,
  model: string,
  schema: JsonSchema,
  temperature: number
): Promise<string> {
  if (settings.provider === "gemini") {
    const ai = getGeminiClient(settings.gemini.apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return response.text || "{}";
  }

  const content = await generateOpenAIChatCompletion(settings, {
    model,
    prompt: `${prompt}\n\n请只返回合法 JSON，不要添加代码块、解释或额外文本。`,
    stream: false,
    temperature,
  });

  return content;
}

async function generateText(
  settings: LlmSettings,
  prompt: string,
  model: string,
  temperature?: number
): Promise<string> {
  if (settings.provider === "gemini") {
    const ai = getGeminiClient(settings.gemini.apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: temperature === undefined ? undefined : { temperature },
    });
    return response.text || "";
  }

  return generateOpenAIChatCompletion(settings, {
    model,
    prompt,
    stream: false,
    temperature,
  });
}

async function* generateTextStream(
  settings: LlmSettings,
  prompt: string,
  model: string,
  temperature?: number
) {
  if (settings.provider === "gemini") {
    const ai = getGeminiClient(settings.gemini.apiKey);
    const responseStream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: temperature === undefined ? undefined : { temperature },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
    return;
  }

  yield* generateOpenAIChatCompletionStream(settings, {
    model,
    prompt,
    temperature,
  });
}

async function generateOpenAIChatCompletion(
  settings: LlmSettings,
  options: {
    model: string;
    prompt: string;
    stream: false;
    temperature?: number;
  }
): Promise<string> {
  const baseURL = normalizeOpenAIBaseUrl(settings.openaiCompatible.baseURL);
  const apiKey = settings.openaiCompatible.apiKey.trim();

  if (!baseURL) {
    throw new Error("OpenAI-compatible Base URL is missing.");
  }
  if (!apiKey) {
    throw new Error("OpenAI-compatible API Key is missing.");
  }

  const proxyRequest = buildOpenAIProxyRequest(settings, {
    model: options.model,
    prompt: options.prompt,
    stream: false,
    temperature: options.temperature,
  });

  const response = await fetch(proxyRequest.url, proxyRequest.init);

  if (!response.ok) {
    const detail = await safeReadErrorBody(response);
    throw new Error(`OpenAI-compatible request failed with ${response.status}.${detail ? ` ${detail}` : ""}`);
  }

  const json = await response.json();
  const content = extractOpenAICompatibleResponseText(json);
  if (content) {
    return content;
  }

  throw new Error("OpenAI-compatible response did not contain message content.");
}

async function* generateOpenAIChatCompletionStream(
  settings: LlmSettings,
  options: {
    model: string;
    prompt: string;
    temperature?: number;
  }
) {
  const baseURL = normalizeOpenAIBaseUrl(settings.openaiCompatible.baseURL);
  const apiKey = settings.openaiCompatible.apiKey.trim();

  if (!baseURL) {
    throw new Error("OpenAI-compatible Base URL is missing.");
  }
  if (!apiKey) {
    throw new Error("OpenAI-compatible API Key is missing.");
  }

  const proxyRequest = buildOpenAIProxyRequest(settings, {
    model: options.model,
    prompt: options.prompt,
    stream: true,
    temperature: options.temperature,
  });

  const response = await fetch(proxyRequest.url, proxyRequest.init);

  if (!response.ok || !response.body) {
    const detail = await safeReadErrorBody(response);
    throw new Error(`OpenAI-compatible stream failed with ${response.status}.${detail ? ` ${detail}` : ""}`);
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
          const chunks = extractOpenAICompatibleStreamText(parsed);
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

export async function generateNovelOutline(
  config: NovelConfig,
  settings: LlmSettings
): Promise<NovelOutline> {
  const prompt = `你现在是一位起点中文网的白金大神经典网文作家（如辰东、唐家三少、爱潜水的乌贼等水平）。你精通网文架构、爽点设置、节奏把控、人物塑造和世界观构建。
请根据以下设想，为一部长篇网文小说生成大纲和前10章的详细章节大纲：

书名：《${config.title}》
类型：${config.genre}
核心创意/故事主线：${config.coreIdea}
主角设定：${config.protagonist}
基调/风格：${config.tone}

请输出结构化的JSON格式，包含以下字段：
- synopsis: 整体故事摘要（约500字）
- worldview: 世界观与力量体系设定（约500字）
- characterProfiles: 主要人物小传（主角及重要配角）
- chapters: 前10章的章节大纲，每个章节包含 chapterNumber(数字), title(章节名), synopsis(本章详细剧情脉络和爽点，约100-200字)

注意：请务必保证网文的爽感、期待感和逻辑严密。`;

  try {
    const rawText = await generateJson(
      settings,
      prompt,
      settings.provider === "gemini"
        ? settings.gemini.outlineModel
        : settings.openaiCompatible.outlineModel,
      {
        type: Type.OBJECT,
        properties: {
          synopsis: { type: Type.STRING },
          worldview: { type: Type.STRING },
          characterProfiles: { type: Type.STRING },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                synopsis: { type: Type.STRING },
              },
              required: ["chapterNumber", "title", "synopsis"],
            },
          },
        },
        required: ["synopsis", "worldview", "characterProfiles", "chapters"],
      },
      0.8
    );

    return normalizeNovelOutline(extractJson(rawText));
  } catch (error) {
    throw new Error(getProviderErrorMessage(error));
  }
}

export async function extendNovelOutline(
  config: NovelConfig,
  outline: NovelOutline,
  settings: LlmSettings,
  count: number = 10
): Promise<ChapterOutline[]> {
  const lastChapter = outline.chapters[outline.chapters.length - 1];
  const startNumber = lastChapter ? lastChapter.chapterNumber + 1 : 1;

  const writtenChapters = outline.chapters.filter((c) => c.status === "completed" && c.summary);
  const storyProgressContext =
    writtenChapters.length > 0
      ? `【目前已完成章节的正文进展】\n${writtenChapters
        .map((c) => `第${c.chapterNumber}章 ${c.title}: ${c.summary}`)
        .join("\n")}`
      : "【目前尚未开始正式正文创作，仅有大纲规划】";

  const prompt = `你是一位起点中文网的白金作家。目前你正在创作的小说《${config.title}》已经完成了前${startNumber - 1}章的规划。
你需要在此基础上，继续向下规划后续的 ${count} 章内容。

【小说核心设定】
类型：${config.genre}
核心创意：${config.coreIdea}
世界观：${outline.worldview}
人物设定：${outline.characterProfiles}
整体大纲摘要：${outline.synopsis}

${storyProgressContext}

【最后几章的规划详情】
${outline.chapters.slice(-3).map((c) => `第${c.chapterNumber}章 ${c.title}: ${c.synopsis}`).join("\n")}

请输出接下来的第 ${startNumber} 到 第 ${startNumber + count - 1} 章的详细章节大纲（JSON格式）：
- chapters: 包含 chapterNumber(数字), title(章节名), synopsis(本章详细剧情脉络和爽点) 的数组。

【创作要求】
1. **人物成长**：请务必考虑主角及重要配角的合理成长，包括实力提升、心理转变、人际关系变化等。
2. **逻辑连贯**：后续剧情必须严格符合已有的世界观和故事主线，伏笔要合理回收。
3. **爽点把控**：保持白金作家的水准，快慢结合，合理设置冲突与高潮。
4. **编号严谨**：起始章节编号必须从 ${startNumber} 开始，依次递增。`;

  try {
    const rawText = await generateJson(
      settings,
      prompt,
      settings.provider === "gemini"
        ? settings.gemini.outlineModel
        : settings.openaiCompatible.outlineModel,
      {
        type: Type.OBJECT,
        properties: {
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                synopsis: { type: Type.STRING },
              },
              required: ["chapterNumber", "title", "synopsis"],
            },
          },
        },
        required: ["chapters"],
      },
      0.8
    );

    return normalizeChapters((extractJson<{ chapters: unknown }>(rawText)).chapters);
  } catch (error) {
    throw new Error(getProviderErrorMessage(error));
  }
}

export async function* generateChapterStream(
  config: NovelConfig,
  outline: NovelOutline,
  chapterToGenerate: ChapterOutline,
  previousChapters: ChapterOutline[],
  settings: LlmSettings
) {
  let context = `你是一位起点中文网的白金大神经典网文大V。你的文笔极佳，词汇丰富，擅长环境渲染和动作描写，人物对话极具性格特色。你的剧情节奏极好，断章技巧高超，能够牢牢抓住读者的心。
现在，请你撰写本部小说的第${chapterToGenerate.chapterNumber}章：《${chapterToGenerate.title}》。

【小说设定】
书名：《${config.title}》
类型：${config.genre}
风格：${config.tone}
世界观：${outline.worldview}
人物设定：${outline.characterProfiles}
全书摘要：${outline.synopsis}

【最新剧情上下文】
`;

  const recentChapters = previousChapters.slice(-5);
  if (recentChapters.length > 0) {
    context += `以下是最近几章的剧情梗概，请保持剧情的连贯性：\n`;
    for (const c of recentChapters) {
      context += `- 第${c.chapterNumber}章 ${c.title}: ${c.summary || c.synopsis}\n`;
    }
  } else {
    context += `这是本文的开篇第一章。请务必设定好黄金三章的悬念，引人入胜！\n`;
  }

  if (recentChapters.length > 0) {
    const lastSummaryOrContent = recentChapters[recentChapters.length - 1];
    if (lastSummaryOrContent.content) {
      context += `\n【上一章结尾】\n${lastSummaryOrContent.content.slice(-500)}\n`;
    }
  }

  context += `\n【本章任务】
本章是第${chapterToGenerate.chapterNumber}章：《${chapterToGenerate.title}》
本章详细大纲：${chapterToGenerate.synopsis}

【写作要求】
1. **字数要求**：网文标准单章字数，必须达到约3000字（中文）。请通过细致的环境描写、人物心理活动、精彩的对话和动作细节来扩充篇幅，但绝不要注水。
2. **文风要求**：符合白金网文作家的水准，文风连贯，爽点突出，节奏合理，高潮迭起。
3. **输出格式**：直接输出正文内容，**不要**输出诸如“好的，下面是第X章”、“正文如下”等废话。直接以小说内容开始！**不要**输出章节标题。`;

  try {
    const model =
      settings.provider === "gemini"
        ? settings.gemini.chapterModel
        : settings.openaiCompatible.chapterModel;

    yield* generateTextStream(settings, context, model, 0.9);
  } catch (error) {
    throw new Error(getProviderErrorMessage(error));
  }
}

export async function generateChapterSummary(
  content: string,
  settings: LlmSettings
): Promise<string> {
  const prompt = `请为以下小说章节生成一个简短的剧情梗概（不超过150字），用于作为下一章内容生成的上下文提示：\n\n${content}`;

  try {
    const model =
      settings.provider === "gemini"
        ? settings.gemini.summaryModel
        : settings.openaiCompatible.summaryModel;
    return await generateText(settings, prompt, model);
  } catch (error) {
    throw new Error(getProviderErrorMessage(error));
  }
}

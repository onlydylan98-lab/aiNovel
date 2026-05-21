export type ProviderType = "gemini" | "openai-compatible";

export interface GeminiProviderSettings {
  apiKey: string;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}

export interface OpenAICompatibleSettings {
  baseURL: string;
  apiKey: string;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}

export interface LlmSettings {
  provider: ProviderType;
  gemini: GeminiProviderSettings;
  openaiCompatible: OpenAICompatibleSettings;
}

const isProviderType = (value: unknown): value is ProviderType =>
  value === "gemini" || value === "openai-compatible";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const STALE_OPENAI_BASE_URL_HOST = "freemodel.dev";

export function normalizeOpenAIBaseUrl(baseURL: string): string {
  return baseURL.trim();
}

function isStaleOpenAIBaseUrl(baseURL: string): boolean {
  try {
    const hostname = new URL(normalizeOpenAIBaseUrl(baseURL)).hostname.toLowerCase();
    return (
      hostname === STALE_OPENAI_BASE_URL_HOST ||
      hostname.endsWith(`.${STALE_OPENAI_BASE_URL_HOST}`)
    );
  } catch {
    return false;
  }
}

export function getDefaultLlmSettings(): LlmSettings {
  const env = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
  const defaultProvider = env?.VITE_DEFAULT_PROVIDER;
  const provider = isProviderType(defaultProvider)
    ? defaultProvider
    : "gemini";

  return {
    provider,
    gemini: {
      apiKey: env?.VITE_GEMINI_API_KEY ?? "",
      outlineModel: env?.VITE_GEMINI_OUTLINE_MODEL ?? "gemini-3.1-pro-preview",
      chapterModel: env?.VITE_GEMINI_CHAPTER_MODEL ?? "gemini-3.1-pro-preview",
      summaryModel: env?.VITE_GEMINI_SUMMARY_MODEL ?? "gemini-3-flash-preview",
    },
    openaiCompatible: {
      baseURL: normalizeOpenAIBaseUrl(
        env?.VITE_OPENAI_BASE_URL ?? "https://xiaohumini.site/v1/chat/completions"
      ),
      apiKey: env?.VITE_OPENAI_API_KEY ?? "",
      outlineModel: env?.VITE_OPENAI_OUTLINE_MODEL ?? "gpt-5.4",
      chapterModel: env?.VITE_OPENAI_CHAPTER_MODEL ?? "gpt-5.4",
      summaryModel: env?.VITE_OPENAI_SUMMARY_MODEL ?? "gpt-5.4",
    },
  };
}

export function mergeStoredLlmSettings(
  defaults: LlmSettings,
  stored: unknown
): LlmSettings {
  if (!isRecord(stored)) {
    return defaults;
  }

  const gemini = isRecord(stored.gemini) ? stored.gemini : {};
  const openaiCompatible = isRecord(stored.openaiCompatible) ? stored.openaiCompatible : {};
  const mergedOpenAIBaseUrl =
    typeof openaiCompatible.baseURL === "string"
      ? normalizeOpenAIBaseUrl(openaiCompatible.baseURL)
      : defaults.openaiCompatible.baseURL;

  return {
    provider: isProviderType(stored.provider) ? stored.provider : defaults.provider,
    gemini: {
      apiKey: typeof gemini.apiKey === "string" ? gemini.apiKey : defaults.gemini.apiKey,
      outlineModel:
        typeof gemini.outlineModel === "string"
          ? gemini.outlineModel
          : defaults.gemini.outlineModel,
      chapterModel:
        typeof gemini.chapterModel === "string"
          ? gemini.chapterModel
          : defaults.gemini.chapterModel,
      summaryModel:
        typeof gemini.summaryModel === "string"
          ? gemini.summaryModel
          : defaults.gemini.summaryModel,
    },
    openaiCompatible: {
      baseURL: isStaleOpenAIBaseUrl(mergedOpenAIBaseUrl)
        ? defaults.openaiCompatible.baseURL
        : mergedOpenAIBaseUrl,
      apiKey:
        typeof openaiCompatible.apiKey === "string"
          ? openaiCompatible.apiKey
          : defaults.openaiCompatible.apiKey,
      outlineModel:
        typeof openaiCompatible.outlineModel === "string"
          ? openaiCompatible.outlineModel
          : defaults.openaiCompatible.outlineModel,
      chapterModel:
        typeof openaiCompatible.chapterModel === "string"
          ? openaiCompatible.chapterModel
          : defaults.openaiCompatible.chapterModel,
      summaryModel:
        typeof openaiCompatible.summaryModel === "string"
          ? openaiCompatible.summaryModel
          : defaults.openaiCompatible.summaryModel,
    },
  };
}

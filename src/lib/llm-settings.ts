export type ProviderType = "gemini" | "compatible";
export type CompatibleProtocol = "auto" | "chat-completions" | "responses";

export interface GeminiProviderSettings {
  apiKey: string;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}

export interface CompatibleSettings {
  baseURL: string;
  apiKey: string;
  protocol: CompatibleProtocol;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}

export interface LlmSettings {
  provider: ProviderType;
  gemini: GeminiProviderSettings;
  compatible: CompatibleSettings;
}

const isProviderType = (value: unknown): value is ProviderType =>
  value === "gemini" || value === "compatible";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const STALE_OPENAI_BASE_URL_HOST = "freemodel.dev";

export function normalizeCompatibleBaseUrl(baseURL: string): string {
  return baseURL.trim();
}

export const normalizeOpenAIBaseUrl = normalizeCompatibleBaseUrl;

function isStaleOpenAIBaseUrl(baseURL: string): boolean {
  try {
    const hostname = new URL(normalizeCompatibleBaseUrl(baseURL)).hostname.toLowerCase();
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
  const provider = normalizeProvider(defaultProvider, "gemini");

  return {
    provider,
    gemini: {
      apiKey: env?.VITE_GEMINI_API_KEY ?? "",
      outlineModel: env?.VITE_GEMINI_OUTLINE_MODEL ?? "gemini-3.1-pro-preview",
      chapterModel: env?.VITE_GEMINI_CHAPTER_MODEL ?? "gemini-3.1-pro-preview",
      summaryModel: env?.VITE_GEMINI_SUMMARY_MODEL ?? "gemini-3-flash-preview",
    },
    compatible: getDefaultCompatibleSettings(env),
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
  const compatible = isRecord(stored.compatible) ? stored.compatible : {};
  const legacyOpenAICompatible = isRecord(stored.openaiCompatible) ? stored.openaiCompatible : {};

  return {
    provider: normalizeProvider(stored.provider, defaults.provider),
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
    compatible: mergeCompatibleSettings(defaults.compatible, compatible, legacyOpenAICompatible),
  };
}

function isCompatibleProtocol(value: unknown): value is CompatibleProtocol {
  return value === "auto" || value === "chat-completions" || value === "responses";
}

function getDefaultCompatibleSettings(
  env: (ImportMeta & { env?: ImportMetaEnv })["env"]
): CompatibleSettings {
  return {
    baseURL: normalizeCompatibleBaseUrl(
      env?.VITE_OPENAI_BASE_URL ?? "https://xiaohumini.site/v1/chat/completions"
    ),
    apiKey: env?.VITE_OPENAI_API_KEY ?? "",
    protocol: "auto",
    outlineModel: env?.VITE_OPENAI_OUTLINE_MODEL ?? "gpt-5.4",
    chapterModel: env?.VITE_OPENAI_CHAPTER_MODEL ?? "gpt-5.4",
    summaryModel: env?.VITE_OPENAI_SUMMARY_MODEL ?? "gpt-5.4",
  };
}

function mergeCompatibleSettings(
  defaults: CompatibleSettings,
  primary: Record<string, unknown>,
  legacy: Record<string, unknown>
): CompatibleSettings {
  const mergedBaseUrl = readCompatibleString(primary, legacy, "baseURL", defaults.baseURL);

  return {
    baseURL: isStaleOpenAIBaseUrl(mergedBaseUrl) ? defaults.baseURL : mergedBaseUrl,
    apiKey: readCompatibleString(primary, legacy, "apiKey", defaults.apiKey),
    protocol: readCompatibleProtocol(primary, legacy, defaults.protocol),
    outlineModel: readCompatibleString(primary, legacy, "outlineModel", defaults.outlineModel),
    chapterModel: readCompatibleString(primary, legacy, "chapterModel", defaults.chapterModel),
    summaryModel: readCompatibleString(primary, legacy, "summaryModel", defaults.summaryModel),
  };
}

function readCompatibleString(
  primary: Record<string, unknown>,
  legacy: Record<string, unknown>,
  key: keyof Omit<CompatibleSettings, "protocol">,
  fallback: string
): string {
  const primaryValue = primary[key];
  if (typeof primaryValue === "string" && primaryValue.trim().length > 0) {
    return key === "baseURL" ? normalizeCompatibleBaseUrl(primaryValue) : primaryValue;
  }

  const legacyValue = legacy[key];
  if (typeof legacyValue === "string" && legacyValue.trim().length > 0) {
    return key === "baseURL" ? normalizeCompatibleBaseUrl(legacyValue) : legacyValue;
  }

  return fallback;
}

function readCompatibleProtocol(
  primary: Record<string, unknown>,
  legacy: Record<string, unknown>,
  fallback: CompatibleProtocol
): CompatibleProtocol {
  if (isCompatibleProtocol(primary.protocol)) {
    return primary.protocol;
  }

  if (isCompatibleProtocol(legacy.protocol)) {
    return legacy.protocol;
  }

  return fallback;
}

function normalizeProvider(value: unknown, fallback: ProviderType): ProviderType {
  if (value === "openai-compatible") {
    return "compatible";
  }

  return value === "gemini" || value === "compatible" ? value : fallback;
}

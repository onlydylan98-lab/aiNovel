import { getDefaultLlmSettings, mergeStoredLlmSettings, type LlmSettings } from "@/lib/llm-settings";

export const LLM_SETTINGS_STORAGE_KEY = "novel-ai-creator:llm-settings";

export function resetStoredLlmSettings<T extends LlmSettings>(defaults: T): T {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
  }

  return defaults;
}

export function shouldClearStoredLlmSettings(
  current: LlmSettings,
  defaults: LlmSettings
): boolean {
  return JSON.stringify(current) === JSON.stringify(defaults);
}

export function loadInitialLlmSettings(): LlmSettings {
  const defaults = getDefaultLlmSettings();

  if (typeof window === "undefined") {
    return defaults;
  }

  const raw = window.localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return defaults;
  }

  try {
    return mergeStoredLlmSettings(defaults, JSON.parse(raw));
  } catch {
    return defaults;
  }
}

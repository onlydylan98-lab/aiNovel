import { strict as assert } from "node:assert";
import test from "node:test";
import { stripJsonFences } from "@/lib/gemini";
import {
  getDefaultLlmSettings,
  mergeStoredLlmSettings,
  normalizeOpenAIBaseUrl,
  type LlmSettings,
} from "@/lib/llm-settings";
import {
  LLM_SETTINGS_STORAGE_KEY,
  reduceStoreState,
  resetStoredLlmSettings,
  shouldClearStoredLlmSettings,
} from "@/store";

const baseSettings: LlmSettings = {
  provider: "gemini",
  gemini: {
    apiKey: "g-key",
    outlineModel: "g-outline",
    chapterModel: "g-chapter",
    summaryModel: "g-summary",
  },
  openaiCompatible: {
    baseURL: "https://api.example.com/v1",
    apiKey: "o-key",
    outlineModel: "o-outline",
    chapterModel: "o-chapter",
    summaryModel: "o-summary",
  },
};

function withImportMetaEnv<T>(
  env: Record<string, string | undefined>,
  run: () => T
): T {
  const previousEnv = import.meta.env;
  Object.defineProperty(import.meta, "env", {
    value: env,
    configurable: true,
  });

  try {
    return run();
  } finally {
    Object.defineProperty(import.meta, "env", {
      value: previousEnv,
      configurable: true,
    });
  }
}

test("normalizeOpenAIBaseUrl only trims surrounding whitespace", () => {
  assert.equal(
    normalizeOpenAIBaseUrl("  https://api.example.com/v1/chat/completions  "),
    "https://api.example.com/v1/chat/completions"
  );
});

test("stripJsonFences unwraps fenced json", () => {
  assert.equal(stripJsonFences("```json\n{\"ok\":true}\n```"), "{\"ok\":true}");
});

test("mergeStoredLlmSettings merges nested overrides only when valid", () => {
  const merged = mergeStoredLlmSettings(baseSettings, {
    provider: "openai-compatible",
    openaiCompatible: {
      baseURL: "https://alt.example.com/v1/chat/completions",
      outlineModel: "alt-outline",
    },
    gemini: {
      apiKey: "g-key-2",
    },
  });

  assert.equal(merged.provider, "openai-compatible");
  assert.equal(merged.gemini.apiKey, "g-key-2");
  assert.equal(merged.gemini.chapterModel, "g-chapter");
  assert.equal(merged.openaiCompatible.baseURL, "https://alt.example.com/v1/chat/completions");
  assert.equal(merged.openaiCompatible.outlineModel, "alt-outline");
  assert.equal(merged.openaiCompatible.chapterModel, "o-chapter");
});

test("getDefaultLlmSettings uses Xiaohumini OpenAI-compatible defaults", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());

  assert.equal(
    defaults.openaiCompatible.baseURL,
    "https://xiaohumini.site/v1/chat/completions"
  );
  assert.equal(defaults.openaiCompatible.outlineModel, "gpt-5.4");
  assert.equal(defaults.openaiCompatible.chapterModel, "gpt-5.4");
  assert.equal(defaults.openaiCompatible.summaryModel, "gpt-5.4");
});

test("mergeStoredLlmSettings replaces stale freemodel base URL and preserves other stored fields", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());

  const merged = mergeStoredLlmSettings(defaults, {
    provider: "openai-compatible",
    openaiCompatible: {
      baseURL: " https://api.freemodel.dev/v1/chat/completions ",
      apiKey: "stored-key",
      outlineModel: "stored-outline",
      chapterModel: "stored-chapter",
      summaryModel: "stored-summary",
    },
  });

  assert.equal(merged.provider, "openai-compatible");
  assert.equal(
    merged.openaiCompatible.baseURL,
    defaults.openaiCompatible.baseURL
  );
  assert.equal(merged.openaiCompatible.apiKey, "stored-key");
  assert.equal(merged.openaiCompatible.outlineModel, "stored-outline");
  assert.equal(merged.openaiCompatible.chapterModel, "stored-chapter");
  assert.equal(merged.openaiCompatible.summaryModel, "stored-summary");
});

test("mergeStoredLlmSettings keeps a non-stale URL when freemodel.dev appears outside the hostname", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());
  const nonStaleBaseUrl =
    "https://api.example.com/v1/chat/completions?source=freemodel.dev";

  const merged = mergeStoredLlmSettings(defaults, {
    openaiCompatible: {
      baseURL: nonStaleBaseUrl,
    },
  });

  assert.equal(merged.openaiCompatible.baseURL, nonStaleBaseUrl);
});

test("resetStoredLlmSettings clears persisted settings and returns defaults", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());
  const localStorage = {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      this.store.set(key, value);
    },
    removeItem(key: string) {
      this.store.delete(key);
    },
    clear() {
      this.store.clear();
    },
  };
  const previousWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  try {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage },
      configurable: true,
    });

    localStorage.setItem(
      LLM_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        provider: "openai-compatible",
        openaiCompatible: {
          baseURL: "https://api.example.com/v1",
        },
      })
    );

    const reset = resetStoredLlmSettings(defaults);

    assert.deepEqual(reset, defaults);
    assert.equal(localStorage.getItem(LLM_SETTINGS_STORAGE_KEY), null);
  } finally {
    if (previousWindowDescriptor) {
      Object.defineProperty(globalThis, "window", previousWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
});

test("RESET_LLM_SETTINGS restores default llm settings without a payload", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());
  const stateWithCustomSettings = {
    appState: "setup" as const,
    config: null,
    outline: null,
    currentChapterId: null,
    llmSettings: {
      ...defaults,
      provider: "openai-compatible" as const,
      gemini: {
        ...defaults.gemini,
        apiKey: "custom-g-key",
      },
      openaiCompatible: {
        ...defaults.openaiCompatible,
        apiKey: "custom-o-key",
        baseURL: "https://api.example.com/v1",
      },
    },
  };

  const nextState = reduceStoreState(stateWithCustomSettings, {
    type: "RESET_LLM_SETTINGS",
  });

  assert.deepEqual(nextState.llmSettings, defaults);
});

test("shouldClearStoredLlmSettings returns true for default settings", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());

  assert.equal(shouldClearStoredLlmSettings(defaults, defaults), true);
});

test("shouldClearStoredLlmSettings returns false for non-default settings", () => {
  const defaults = withImportMetaEnv({}, () => getDefaultLlmSettings());
  const customSettings = {
    ...defaults,
    openaiCompatible: {
      ...defaults.openaiCompatible,
      apiKey: "custom-o-key",
    },
  };

  assert.equal(shouldClearStoredLlmSettings(customSettings, defaults), false);
});

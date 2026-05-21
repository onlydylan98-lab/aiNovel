# Xiaohumini Default And Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the default OpenAI-compatible provider to Xiaohumini and add a built-in recovery path for stale browser-stored AI settings.

**Architecture:** Keep the existing provider architecture and proxy flow intact, but update the default OpenAI-compatible values in the LLM settings layer. Add a small migration rule for stale `freemodel.dev` base URLs during settings merge, then expose a reset action from the store to the setup screen so users can clear local overrides without using devtools.

**Tech Stack:** React 19, TypeScript, Vite, Node test runner

---

### Task 1: Lock New Default Settings And Stale URL Migration With Tests

**Files:**
- Modify: `src/lib/__tests__/llm-settings.test.ts`
- Modify: `src/lib/llm-settings.ts`

- [ ] **Step 1: Write the failing tests**

```ts
test("getDefaultLlmSettings uses Xiaohumini OpenAI-compatible defaults", () => {
  const defaults = getDefaultLlmSettings();

  assert.equal(defaults.openaiCompatible.baseURL, "https://xiaohumini.site/v1/chat/completions");
  assert.equal(defaults.openaiCompatible.outlineModel, "gpt-5.4");
  assert.equal(defaults.openaiCompatible.chapterModel, "gpt-5.4");
  assert.equal(defaults.openaiCompatible.summaryModel, "gpt-5.4");
});

test("mergeStoredLlmSettings replaces stale freemodel base URL with current default", () => {
  const merged = mergeStoredLlmSettings(baseSettings, {
    provider: "openai-compatible",
    openaiCompatible: {
      baseURL: "https://api.freemodel.dev/v1/chat/completions",
      outlineModel: "custom-outline",
    },
  });

  assert.equal(merged.openaiCompatible.baseURL, baseSettings.openaiCompatible.baseURL);
  assert.equal(merged.openaiCompatible.outlineModel, "custom-outline");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test src/lib/__tests__/llm-settings.test.ts`
Expected: FAIL because defaults still point at older models/blank URL and stale `freemodel.dev` is not migrated.

- [ ] **Step 3: Write minimal implementation**

```ts
function isStaleFreemodelBaseUrl(baseURL: string): boolean {
  return /(^|:\/\/)([^/]*\.)?freemodel\.dev(\/|$)/i.test(baseURL);
}

export function getDefaultLlmSettings(): LlmSettings {
  const env = import.meta.env;

  return {
    provider,
    gemini: { ... },
    openaiCompatible: {
      baseURL: normalizeOpenAIBaseUrl(
        env.VITE_OPENAI_BASE_URL ?? "https://xiaohumini.site/v1/chat/completions"
      ),
      apiKey: env.VITE_OPENAI_API_KEY ?? "",
      outlineModel: env.VITE_OPENAI_OUTLINE_MODEL ?? "gpt-5.4",
      chapterModel: env.VITE_OPENAI_CHAPTER_MODEL ?? "gpt-5.4",
      summaryModel: env.VITE_OPENAI_SUMMARY_MODEL ?? "gpt-5.4",
    },
  };
}

export function mergeStoredLlmSettings(
  defaults: LlmSettings,
  stored: unknown
): LlmSettings {
  const merged = {
    provider: ...,
    gemini: ...,
    openaiCompatible: {
      baseURL:
        typeof openaiCompatible.baseURL === "string"
          ? normalizeOpenAIBaseUrl(openaiCompatible.baseURL)
          : defaults.openaiCompatible.baseURL,
      apiKey: ...,
      outlineModel: ...,
      chapterModel: ...,
      summaryModel: ...,
    },
  };

  if (isStaleFreemodelBaseUrl(merged.openaiCompatible.baseURL)) {
    merged.openaiCompatible.baseURL = defaults.openaiCompatible.baseURL;
  }

  return merged;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test src/lib/__tests__/llm-settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm-settings.ts src/lib/__tests__/llm-settings.test.ts
git commit -m "feat: switch default openai provider to xiaohumini"
```

### Task 2: Add Reset Action To Store

**Files:**
- Modify: `src/store/index.tsx`
- Test: `src/lib/__tests__/llm-settings.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("clearStoredLlmSettings removes browser overrides and returns defaults", () => {
  const storage = new Map<string, string>();
  const fakeWindow = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
  };

  storage.set(
    "novel-ai-creator:llm-settings",
    JSON.stringify({
      provider: "openai-compatible",
      openaiCompatible: {
        baseURL: "https://api.freemodel.dev/v1/chat/completions",
      },
    })
  );

  const defaults = getDefaultLlmSettings();
  const cleared = clearStoredLlmSettings(fakeWindow as Window, defaults);

  assert.equal(storage.has("novel-ai-creator:llm-settings"), false);
  assert.deepEqual(cleared, defaults);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test src/lib/__tests__/llm-settings.test.ts`
Expected: FAIL because no reset helper exists yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export const LLM_SETTINGS_STORAGE_KEY = "novel-ai-creator:llm-settings";

export function clearStoredLlmSettings(
  storageHost: Pick<Window, "localStorage">,
  defaults: LlmSettings
): LlmSettings {
  storageHost.localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
  return defaults;
}
```

Then wire the reducer with a new action:

```ts
type Action =
  | { type: "SET_LLM_SETTINGS"; payload: LlmSettings }
  | { type: "RESET_LLM_SETTINGS" };

case "RESET_LLM_SETTINGS":
  return { ...state, llmSettings: getDefaultLlmSettings() };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test src/lib/__tests__/llm-settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/index.tsx src/lib/__tests__/llm-settings.test.ts
git commit -m "feat: add llm settings reset action"
```

### Task 3: Expose Reset Control In Setup Screen And Update Copy

**Files:**
- Modify: `src/components/SetupScreen.tsx`
- Modify: `README.md`

- [ ] **Step 1: Add the reset control markup**

```tsx
<div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-3">
  <p className="text-xs text-muted-foreground">
    可重置浏览器中保存的 AI 覆盖配置，并恢复当前默认接口与模型。
  </p>
  <Button
    type="button"
    variant="outline"
    onClick={handleResetLlmSettings}
  >
    重置 AI 配置
  </Button>
</div>
```

- [ ] **Step 2: Wire the button to the store reset flow**

```tsx
const handleResetLlmSettings = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("novel-ai-creator:llm-settings");
  }

  dispatch({
    type: "SET_LLM_SETTINGS",
    payload: getDefaultLlmSettings(),
  });
};
```

If store exports a reset helper, call that helper instead of duplicating string literals.

- [ ] **Step 3: Update user-facing copy**

```md
VITE_OPENAI_BASE_URL=https://xiaohumini.site/v1/chat/completions
VITE_OPENAI_OUTLINE_MODEL=gpt-5.4
VITE_OPENAI_CHAPTER_MODEL=gpt-5.4
VITE_OPENAI_SUMMARY_MODEL=gpt-5.4
```

And update the setup screen helper text so it explains:

- defaults now come from current project config
- reset clears browser-saved overrides
- full `/v1/chat/completions` and `/v1/responses` endpoints are still supported

- [ ] **Step 4: Run project verification**

Run:

```bash
npm run lint
node --import tsx --test src/lib/__tests__/openai-compatible.test.ts src/lib/__tests__/llm-settings.test.ts
npm run build
```

Expected:

- `tsc --noEmit` passes
- all tests pass
- Vite build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/SetupScreen.tsx README.md
git commit -m "feat: add ai settings reset control"
```

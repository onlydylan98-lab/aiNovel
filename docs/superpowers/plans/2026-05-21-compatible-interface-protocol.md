# Compatible Interface Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the OpenAI-specific compatible UI with a single `兼容接口` mode that supports explicit protocol selection and works across Gemini-compatible, OpenAI-compatible, and other endpoint families.

**Architecture:** Keep `官方 Gemini` on the existing Gemini SDK path, and treat `兼容接口` as a protocol-driven HTTP client with `auto`, `chat-completions`, and `responses` modes. Migrate stored settings in place so existing users keep their saved values, then update the setup screen to expose the new mode and protocol selector.

**Tech Stack:** React 19, TypeScript, Vite, `@google/genai`, browser `fetch`, localStorage, `node:test`

---

### Task 1: Rename and migrate compatible settings

**Files:**
- Modify: `src/lib/llm-settings.ts`
- Modify: `src/store/index.tsx`
- Modify: `src/lib/__tests__/llm-settings.test.ts`

- [ ] **Step 1: Write the failing migration test**

```ts
test("mergeStoredLlmSettings migrates openai-compatible provider and block to compatible settings", () => {
  const defaults = getDefaultLlmSettings();
  const merged = mergeStoredLlmSettings(defaults, {
    provider: "openai-compatible",
    openaiCompatible: {
      baseURL: "https://example.com/v1/chat/completions",
      apiKey: "key",
      outlineModel: "outline",
      chapterModel: "chapter",
      summaryModel: "summary",
    },
  });

  assert.equal(merged.provider, "compatible");
  assert.equal(merged.compatible.baseURL, "https://example.com/v1/chat/completions");
});
```

- [ ] **Step 2: Run the targeted test and confirm it fails**

Run: `node --import tsx --test src/lib/__tests__/llm-settings.test.ts`

Expected: fail because `compatible` and `protocol` do not exist yet.

- [ ] **Step 3: Implement the minimal settings migration**

```ts
export type ProviderType = "gemini" | "compatible";
export type CompatibleProtocol = "auto" | "chat-completions" | "responses";

export interface CompatibleSettings {
  baseURL: string;
  apiKey: string;
  protocol: CompatibleProtocol;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}
```

- [ ] **Step 4: Update store wiring to use the new names**

```ts
case "RESET_LLM_SETTINGS":
  return { ...state, llmSettings: getDefaultLlmSettings() };
```

- [ ] **Step 5: Re-run the settings tests**

Run:

```bash
node --import tsx --test src/lib/__tests__/llm-settings.test.ts
npm run lint
```

Expected: the settings tests pass and `tsc --noEmit` reports no type errors.

### Task 2: Make the compatible client protocol-aware

**Files:**
- Modify: `src/lib/openai-compatible.ts`
- Modify: `src/lib/gemini.ts`
- Modify: `src/lib/__tests__/openai-compatible.test.ts`
- Modify: `src/lib/__tests__/gemini.test.ts`

- [ ] **Step 1: Add failing protocol-resolution tests**

```ts
test("resolveCompatibleProtocol uses responses for /responses URLs", () => {
  const request = buildOpenAIProxyRequest(settings, {
    model: "gpt-4.1",
    prompt: "hello",
    stream: false,
    temperature: 0.8,
  });

  assert.deepEqual(JSON.parse(String(request.init.body)).input, [{ role: "user", content: "hello" }]);
});
```

- [ ] **Step 2: Run the client tests and confirm the missing protocol support**

Run: `node --import tsx --test src/lib/__tests__/openai-compatible.test.ts`

Expected: fail until `protocol` is part of settings and request selection.

- [ ] **Step 3: Implement protocol helpers**

```ts
function resolveCompatibleProtocol(baseURL: string, protocol: CompatibleProtocol): CompatibleProtocol {
  if (protocol !== "auto") return protocol;
  if (/\/responses(?:\?|$)/.test(baseURL)) return "responses";
  if (/\/chat\/completions(?:\?|$)/.test(baseURL)) return "chat-completions";
  return "chat-completions";
}
```

- [ ] **Step 4: Route `generateJson`, `generateText`, and stream generation through the selected protocol**

```ts
const protocol = resolveCompatibleProtocol(settings.compatible.baseURL, settings.compatible.protocol);
```

- [ ] **Step 5: Verify both chat-completions and responses parsing still work**

Run:

```bash
node --import tsx --test src/lib/__tests__/openai-compatible.test.ts
node --import tsx --test src/lib/__tests__/gemini.test.ts
npm run lint
```

Expected: both test files pass and the existing parsing helpers still satisfy TypeScript.

### Task 3: Update the setup UI and labels

**Files:**
- Modify: `src/components/SetupScreen.tsx`

- [ ] **Step 1: Rename the provider buttons**

```tsx
<Button
  type="button"
  variant={llmSettings.provider === "compatible" ? "default" : "outline"}
  onClick={() => updateProvider("compatible")}
>
  兼容接口
</Button>
```

- [ ] **Step 2: Add the protocol selector with a native `<select>`**

```tsx
<select
  id="compatible-protocol"
  value={llmSettings.compatible.protocol}
  onChange={(e) => updateCompatibleField("protocol", e.target.value as CompatibleProtocol)}
>
  <option value="auto">自动识别</option>
  <option value="chat-completions">Chat Completions</option>
  <option value="responses">Responses</option>
</select>
```

- [ ] **Step 3: Make the form fields read and write the renamed compatible settings block**

```tsx
value={llmSettings.compatible.baseURL}
```

- [ ] **Step 4: Update helper copy to explain vendor-agnostic compatible mode**

```tsx
<p className="text-xs text-muted-foreground">
  兼容接口适用于任何提供兼容端点的厂商，模型名和厂商独立于协议类型；自动识别会优先根据 URL 中的
  /chat/completions 或 /responses 判断。
</p>
```

- [ ] **Step 5: Check the screen in the browser**

Run: `npm run dev`

Expected: the setup screen shows `官方 Gemini` and `兼容接口`, and switching modes exposes the right fields.

### Task 4: Tighten regression coverage and docs

**Files:**
- Modify: `src/lib/__tests__/llm-settings.test.ts`
- Modify: `src/lib/__tests__/openai-compatible.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Add migration coverage for legacy stored settings**

```ts
test("legacy openaiCompatible storage still merges into compatible settings", () => {
  const merged = mergeStoredLlmSettings(defaults, {
    provider: "openai-compatible",
    openaiCompatible: { baseURL: "https://example.com/v1/chat/completions" },
  });

  assert.equal(merged.provider, "compatible");
});
```

- [ ] **Step 2: Add protocol auto-detection coverage**

```ts
test("auto protocol resolves /responses URLs", () => {
  assert.equal(resolveCompatibleProtocol("https://x/v1/responses", "auto"), "responses");
});
```

- [ ] **Step 3: Update README env and usage notes**

```md
- `VITE_DEFAULT_PROVIDER`
- `VITE_GEMINI_API_KEY`
- `VITE_OPENAI_BASE_URL`
- `VITE_OPENAI_API_KEY`
```

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass with no type errors and a successful production bundle.

# LLM Provider Switch Design

## Goal

Add a user-selectable model provider layer so the app can work with both:

- Gemini
- OpenAI-compatible third-party APIs

The configuration should:

- read default values from `.env`
- allow browser-side overrides from the setup page
- persist overrides in `localStorage`

This change must cover the full writing workflow:

- generate initial novel outline
- extend outline with more chapters
- stream chapter content generation
- summarize generated chapter content

## Current State

The app currently uses a single hard-coded Gemini integration in `src/lib/gemini.ts`.

That file currently owns:

- shared types for novel config and outline data
- prompt construction
- Gemini SDK calls
- JSON parsing for structured outputs
- streaming chapter output

UI screens call the exported functions directly:

- `SetupScreen` calls `generateNovelOutline`
- `OutlineScreen` calls `generateNovelOutline`
- `WritingScreen` calls `extendNovelOutline`, `generateChapterStream`, `generateChapterSummary`

There is no provider switch, no base URL input, and no model configuration UI.

## Requirements

## Functional

The app must allow the user to:

- choose between `Gemini` and `OpenAI-Compatible`
- edit provider settings in the setup page
- use `.env` defaults when no browser override exists
- override those defaults in the browser
- keep overrides across refreshes with `localStorage`

The generation pipeline must continue to support:

- JSON outline generation
- JSON chapter-outline extension
- streaming chapter generation
- plain text chapter summarization

## Provider Settings

Gemini settings:

- `apiKey`
- `outlineModel`
- `chapterModel`
- `summaryModel`

OpenAI-compatible settings:

- `baseURL`
- `apiKey`
- `outlineModel`
- `chapterModel`
- `summaryModel`

## Environment Defaults

The app will read provider defaults from Vite environment variables.

Proposed variables:

- `VITE_DEFAULT_PROVIDER`
- `VITE_GEMINI_API_KEY`
- `VITE_GEMINI_OUTLINE_MODEL`
- `VITE_GEMINI_CHAPTER_MODEL`
- `VITE_GEMINI_SUMMARY_MODEL`
- `VITE_OPENAI_BASE_URL`
- `VITE_OPENAI_API_KEY`
- `VITE_OPENAI_OUTLINE_MODEL`
- `VITE_OPENAI_CHAPTER_MODEL`
- `VITE_OPENAI_SUMMARY_MODEL`

Notes:

- Existing `GEMINI_API_KEY` should be replaced by a Vite-exposed variable because the app is frontend code.
- `baseURL` should represent the API root and must not include `/chat/completions`.

## Design

## State Model

Add `llmSettings` to app state.

Suggested shape:

```ts
type ProviderType = "gemini" | "openai-compatible";

interface GeminiProviderSettings {
  apiKey: string;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}

interface OpenAICompatibleSettings {
  baseURL: string;
  apiKey: string;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}

interface LlmSettings {
  provider: ProviderType;
  gemini: GeminiProviderSettings;
  openaiCompatible: OpenAICompatibleSettings;
}
```

The store should initialize from:

1. Vite env defaults
2. `localStorage` override, if present

The store should persist updates back to `localStorage`.

## UI Changes

Add an "AI 接口配置" section to the setup screen.

Common behavior:

- provider switcher
- provider-specific form fields
- values bind to store state
- changes save immediately

Gemini form:

- API Key
- Outline model
- Chapter model
- Summary model

OpenAI-compatible form:

- Base URL
- API Key
- Outline model
- Chapter model
- Summary model

Helpful inline copy:

- explain that `Base URL` should be the API root
- explain that the app appends `/chat/completions`
- mention that page values override `.env` defaults

## Client Layer

Refactor `src/lib/gemini.ts` into a provider-agnostic module. The file may be renamed to `src/lib/llm.ts`.

This module will keep the existing business-facing exports:

- `generateNovelOutline`
- `extendNovelOutline`
- `generateChapterStream`
- `generateChapterSummary`

These functions should receive `llmSettings` as an argument or read it from callers that already have store state available.

Recommended internal helpers:

- `generateJson(...)`
- `generateText(...)`
- `generateTextStream(...)`

Each helper dispatches to the active provider implementation.

## Gemini Implementation

Keep using `@google/genai`.

Gemini behavior:

- structured outline operations use `responseMimeType: "application/json"`
- chapter generation uses SDK streaming
- summarization uses plain text generation

## OpenAI-Compatible Implementation

Use `fetch` against:

- `POST {baseURL}/chat/completions`

For JSON tasks:

- send a prompt in chat format
- use `stream: false`
- request JSON output by prompt instruction
- parse `choices[0].message.content`

For streaming chapter generation:

- use `stream: true`
- parse Server-Sent Events lines beginning with `data:`
- extract `choices[0].delta.content`
- stop on `[DONE]`

For summary generation:

- use standard non-streaming text completion via chat completions

## Parsing and Validation

Structured responses should be parsed defensively.

Rules:

- trim markdown code fences if the provider returns fenced JSON
- validate that required fields exist before using them
- default chapter `status` to `"pending"` after parsing

If parsing fails, surface a user-friendly error that points to:

- wrong model
- malformed provider response
- unsupported third-party compatibility quirks

## Error Handling

Replace provider-specific alerts with neutral messages such as:

- "请检查供应商、模型名、接口地址和 API Key 是否正确。"

For OpenAI-compatible failures, include targeted guidance where possible:

- base URL should not end with `/chat/completions`
- some third-party providers may not support streaming or exact OpenAI response shapes

## Testing Strategy

Because this repo currently has no test harness, start with targeted TypeScript-safe refactoring plus manual verification.

Add small pure helpers where practical so they can be unit-tested later:

- settings normalization
- base URL normalization
- JSON text extraction
- SSE chunk parsing

Manual verification checklist:

1. Start app with Gemini env defaults and generate outline successfully.
2. Refresh page and verify saved provider settings persist.
3. Switch to OpenAI-compatible provider and generate outline successfully.
4. Extend outline successfully with OpenAI-compatible provider.
5. Generate a chapter with streaming output using OpenAI-compatible provider.
6. Generate chapter summary successfully.
7. Switch back to Gemini and confirm the workflow still works.

## Scope Boundaries

In scope:

- provider switching
- env defaults plus browser overrides
- local persistence
- full workflow coverage
- improved provider-agnostic error messages

Out of scope:

- adding a backend proxy server
- securing secrets beyond current frontend-app constraints
- supporting non-chat OpenAI-style endpoints
- adding a new automated test framework in this change

## Risks and Mitigations

Risk: third-party OpenAI-compatible services may not perfectly match OpenAI streaming payloads.

Mitigation:

- implement tolerant SSE parsing
- show actionable error messages
- keep provider-specific logic isolated

Risk: frontend env access is currently inconsistent with Vite conventions.

Mitigation:

- migrate reads to `import.meta.env`
- document new env variable names in `README.md`

Risk: callers may need broad signature changes if settings are threaded awkwardly.

Mitigation:

- prefer reading settings from screen/store call sites and passing them explicitly
- keep the public business function API small and consistent

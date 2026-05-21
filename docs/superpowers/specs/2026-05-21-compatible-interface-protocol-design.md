# Compatible Interface Protocol Design

## Goal

Unify the current third-party provider entry into a single `兼容接口` mode while preserving the existing `官方 Gemini` mode.

The new compatible mode should support model families such as Gemini, OpenAI, DeepSeek, and others without hard-coding brand-specific behavior in the request layer.

## Problem

The current UI presents:

- `Gemini`
- `OpenAI 兼容接口`

This creates two sources of confusion:

1. `Gemini` currently means "Gemini official SDK" rather than "any Gemini model"
2. some Gemini deployments also expose OpenAI-compatible endpoints, but the current naming suggests they do not belong in the compatible path

At the implementation level, the app already treats the third-party path as protocol-driven, but the UI and stored settings still frame it as OpenAI-specific.

## Scope

This change covers:

- provider naming in state and UI
- compatible-protocol selection for third-party endpoints
- request construction and stream parsing based on protocol choice
- tests for settings and protocol selection

This change does not cover:

- adding brand-specific SDKs beyond official Gemini
- adding Anthropic-native or other non-compatible protocols
- changing the local `/api/llm-proxy` contract

## Design

## Provider Model

Keep two top-level modes:

- `官方 Gemini`
- `兼容接口`

Interpretation:

- `官方 Gemini` uses `@google/genai`
- `兼容接口` uses plain HTTP requests against a user-provided endpoint

The key rule is:

- model names are opaque strings
- protocol choice determines payload shape, response parsing, and stream parsing

Examples that should all work in `兼容接口` mode:

- `gemini-2.5-pro`
- `gpt-5.4`
- `deepseek-chat`

## Settings Model

Rename the current OpenAI-compatible settings block to a generic compatible block.

Suggested shape:

```ts
type ProviderType = "gemini" | "compatible";

type CompatibleProtocol = "auto" | "chat-completions" | "responses";

interface CompatibleSettings {
  baseURL: string;
  apiKey: string;
  protocol: CompatibleProtocol;
  outlineModel: string;
  chapterModel: string;
  summaryModel: string;
}
```

Notes:

- `gemini` continues to mean official Gemini SDK mode for backward compatibility in code intent
- `compatible` replaces `openai-compatible` in new state
- stored legacy `openaiCompatible` values should still be read and merged during migration

## Protocol Resolution

`兼容接口` needs an explicit protocol concept because different endpoints that accept the same model family can still require different request/response shapes.

Add `protocol` options:

- `auto`
- `chat-completions`
- `responses`

Resolution rules:

1. if user selects `chat-completions` or `responses`, use it directly
2. if user selects `auto`, inspect `baseURL`
3. if URL path contains `/responses`, use `responses`
4. if URL path contains `/chat/completions`, use `chat-completions`
5. otherwise default to `chat-completions`

Rationale:

- this keeps the default simple for most providers
- it still gives users a manual escape hatch for non-standard compatible implementations
- it avoids trying to infer protocol from model name, which would be brittle and wrong

## Request Layer

Refactor the current helper layer so protocol handling is generic rather than OpenAI-branded.

Expected behavior:

- `chat-completions` sends `{ model, messages, stream, temperature }`
- `responses` sends `{ model, input, stream, temperature }`

Parsing behavior:

- non-streaming text extraction must support both chat completions and responses payload shapes
- streaming extraction must support both delta styles already handled in the project

This means the current parsing code is mostly reusable; the main change is to drive it from `protocol` instead of endpoint branding.

## UI Changes

Update the setup screen AI config section to show:

- `官方 Gemini`
- `兼容接口`

Inside `兼容接口`, show:

- Base URL
- API Key
- 协议类型
- 大纲模型
- 正文模型
- 摘要模型

Recommended protocol labels:

- `自动识别`
- `Chat Completions`
- `Responses`

Recommended helper copy:

- explain that compatible mode works for any vendor exposing a compatible endpoint
- explain that model name and vendor are independent from protocol choice
- explain that `自动识别` uses the URL suffix and can be overridden manually when a provider is not fully standard

## Data Migration

Browser-stored settings may still contain:

- provider value `openai-compatible`
- nested key `openaiCompatible`

Migration behavior should be tolerant:

- treat stored provider `openai-compatible` as `compatible`
- treat stored `openaiCompatible` as the source for new compatible settings when `compatible` is absent
- default protocol to `auto` when missing

This avoids breaking existing users after deploy.

## Error Handling

Error copy should remain vendor-neutral.

Recommended wording:

- ask users to check interface type, protocol, model name, endpoint, and API key
- avoid implying that a given model family only works in one mode

Compatible-mode failures should especially hint at protocol mismatch when parsing fails or when the upstream returns an unsupported shape.

## Testing

Add or update tests for:

- default compatible settings include `protocol: "auto"`
- legacy stored provider `openai-compatible` migrates to `compatible`
- legacy stored `openaiCompatible` block still merges correctly
- manual protocol selection overrides URL inference
- `auto` resolves `/responses` correctly
- `auto` resolves `/chat/completions` correctly
- `auto` falls back to `chat-completions` for ambiguous URLs

## Risks

- some providers may expose root URLs instead of explicit endpoint URLs, so `auto` can only make a best-effort choice
- renaming the settings block requires careful migration coverage to avoid dropping stored user config
- UI copy needs to clearly distinguish `官方 Gemini` from `兼容接口` so the two modes remain understandable

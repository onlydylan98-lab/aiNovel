# Xiaohumini Default And Reset Design

## Goal

Switch the app's default OpenAI-compatible provider settings to the Xiaohumini chat completions endpoint and add a safe way to recover from stale browser-stored provider settings.

This change should make the app:

- default to `https://xiaohumini.site/v1/chat/completions`
- default OpenAI-compatible models to `gpt-5.4`
- let the user reset browser-stored AI settings without opening devtools
- reduce confusion when an old `freemodel.dev` value is still stored locally

## Current Problem

The app reads provider defaults from Vite env values, then lets browser `localStorage` override them.

That means:

- updating defaults alone is not enough for existing users
- old saved `freemodel.dev` values continue to win
- users can think a new provider is active while requests still go to the stale endpoint

## Scope

This spec only changes provider defaults and settings recovery behavior.

It does not change:

- the provider switch model
- the local `/api/llm-proxy`
- OpenAI-compatible protocol selection
- existing `/v1/chat/completions` and `/v1/responses` support

## Design

## Default OpenAI-Compatible Settings

Update the OpenAI-compatible defaults so the app uses:

- `baseURL`: `https://xiaohumini.site/v1/chat/completions`
- `outlineModel`: `gpt-5.4`
- `chapterModel`: `gpt-5.4`
- `summaryModel`: `gpt-5.4`

These values should remain overridable through `.env` and browser edits.

## Reset Local AI Settings

Add a visible reset action in the setup screen's AI settings area.

Behavior:

- clear the `novel-ai-creator:llm-settings` localStorage entry
- restore store state to the current default settings
- keep the user on the setup screen
- make the effect immediate so the next generation uses the reset values

Recommended UI copy:

- button label: `重置 AI 配置`
- helper text: explain that it clears browser-saved overrides and restores current defaults

## Stale Freemodel Protection

When loading stored LLM settings, detect whether the saved OpenAI-compatible `baseURL` contains `freemodel.dev`.

If so:

- prefer the current default `baseURL`
- keep the rest of the stored settings merge behavior unchanged

This provides a lightweight migration path for a known stale endpoint while avoiding a larger migration system.

## Data Flow

1. load env-backed defaults
2. read browser-stored settings
3. merge stored values into defaults
4. if stored OpenAI-compatible base URL points to `freemodel.dev`, replace it with the current default base URL
5. expose a reset action in UI that restores defaults and clears storage

## Testing

Add or update tests for:

- default OpenAI-compatible models and URL
- merge behavior when stored base URL contains `freemodel.dev`
- reset helper behavior if implemented as a pure function

Run:

- `npm run lint`
- existing TypeScript tests for LLM settings and OpenAI compatibility

## Risks

- users who intentionally still want `freemodel.dev` will have that stored base URL replaced during load

This is acceptable for this targeted fix because the current task is specifically to move away from the stale provider and make recovery straightforward.

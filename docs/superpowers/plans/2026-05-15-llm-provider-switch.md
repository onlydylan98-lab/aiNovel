# LLM Provider Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable Gemini/OpenAI-compatible provider layer with env defaults, browser overrides, and full workflow support for outline generation, outline extension, chapter streaming, and summary generation.

**Architecture:** Introduce provider settings into app state, persist them with `localStorage`, and route existing generation functions through a provider-agnostic client layer. Keep UI changes localized to the setup screen and keep business-level generation APIs stable for the outline and writing screens.

**Tech Stack:** React 19, TypeScript, Vite, `@google/genai`, browser `fetch`, localStorage

---

### Task 1: Add state and settings plumbing

**Files:**
- Modify: `src/store/index.tsx`

- [ ] Define provider settings types, default env-backed settings, and store actions.
- [ ] Initialize provider settings from env and merge localStorage overrides.
- [ ] Persist provider setting updates back to localStorage.
- [ ] Export shared settings types for UI and LLM client use.

### Task 2: Add provider-aware LLM client

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] Introduce provider-agnostic helper functions for JSON, text, and streaming generation.
- [ ] Keep existing prompt construction and output types intact.
- [ ] Implement Gemini execution using existing SDK calls with configurable models and keys.
- [ ] Implement OpenAI-compatible execution with chat completions and SSE stream parsing.
- [ ] Harden JSON extraction and response parsing.

### Task 3: Wire all generation call sites to current settings

**Files:**
- Modify: `src/components/SetupScreen.tsx`
- Modify: `src/components/OutlineScreen.tsx`
- Modify: `src/components/WritingScreen.tsx`

- [ ] Pass current `llmSettings` into outline generation from setup and outline screens.
- [ ] Pass current `llmSettings` into outline extension, chapter streaming, and summary generation.
- [ ] Replace provider-specific error alerts with neutral guidance.

### Task 4: Add provider settings UI

**Files:**
- Modify: `src/components/SetupScreen.tsx`

- [ ] Add provider switch control.
- [ ] Add provider-specific form inputs for Gemini and OpenAI-compatible settings.
- [ ] Bind changes to store updates.
- [ ] Add concise helper text about env defaults, browser overrides, and OpenAI base URL format.

### Task 5: Update docs and verify

**Files:**
- Modify: `README.md`

- [ ] Document new Vite env variables and usage.
- [ ] Run typecheck.
- [ ] Run production build.
- [ ] Fix any issues found during verification.

# Project-Wide Refactor And Cleanup Design

## Goal

Perform a project-wide internal refactor and cleanup to improve clarity, maintainability, and developer handoff quality without changing product behavior.

This work should prioritize:

1. code structure refactor
2. repository and dependency cleanup
3. README and project documentation improvement

## Non-Goal

This project-wide cleanup must not intentionally change feature behavior, product scope, or the current user flow.

The following should remain functionally equivalent after the refactor:

- setup flow
- outline generation
- outline regeneration
- outline extension
- chapter generation
- summary generation
- chapter export
- LLM provider configuration behavior

## Current Problems

The current codebase works, but several structural problems make it harder to maintain:

### Large mixed-responsibility files

- `src/lib/gemini.ts` currently mixes:
  - domain types
  - prompt construction
  - provider routing
  - protocol-specific transport calls
  - response parsing
  - user-facing error shaping
- `src/store/index.tsx` currently mixes:
  - state types
  - reducer logic
  - localStorage behavior
  - context creation
  - provider hook exports
- screen files contain both:
  - page-level orchestration
  - repeated display sections
  - ad hoc state update logic

### Weak domain boundaries

Novel-specific concepts such as outline structure, chapter structure, export formatting, and chapter state transitions are not separated from UI and provider code.

### Repository clutter

The project contains:

- transitional or historical implementation files
- likely-unused UI helper files
- process docs that may not belong in the delivered repository
- root-level files whose value needs review
- dependencies that may no longer be required after cleanup

### README is incomplete for real handoff

The current README is still too close to a starter-app style document. It does not yet fully explain:

- what the app does
- how the codebase is organized
- how provider modes differ
- how local persistence works
- how to extend the system cleanly

## Scope

This work includes:

- refactoring code structure
- splitting large files into focused modules
- removing unnecessary files and code
- reviewing dependencies for dead weight
- improving README and project-level documentation
- preserving current runtime behavior

This work does not include:

- redesigning the UI flow
- changing prompts for product quality tuning unless needed for structure
- adding new features
- changing the persistence model beyond cleanup/migration safety

## Refactor Strategy

## Guiding Principle

The codebase should be reorganized around responsibility boundaries rather than convenience boundaries.

Each layer should answer one main question:

- app layer: what screen is active and what state changes are possible
- domain layer: what the novel data means and how it is manipulated
- provider layer: how model providers are configured and called
- screen/component layer: how the current UI renders and dispatches actions
- project/docs layer: how a developer runs, understands, and extends the app

## Target Structure

The exact filenames can adapt to the existing repo, but the code should move toward this shape:

### App Layer

- `src/App.tsx`
- `src/store/`

Suggested responsibilities:

- `src/store/types.ts`
  - app state types
  - action types
- `src/store/reducer.ts`
  - pure reducer logic
- `src/store/persistence.ts`
  - localStorage loading and saving
- `src/store/index.tsx`
  - context provider
  - hook exports

Goal:

- remove large mixed concerns from the current single store file
- keep reducer logic pure and easy to test

### Provider Layer

- `src/lib/llm-settings.ts`
- `src/lib/gemini-provider.ts` or equivalent
- `src/lib/compatible-interface.ts`
- `src/lib/novel-generation.ts`

Suggested responsibilities:

- `llm-settings`
  - env defaults
  - normalization
  - migration from legacy stored values
- `gemini-provider`
  - Gemini SDK calls only
- `compatible-interface`
  - protocol resolution
  - compatible request creation
  - compatible response parsing
- `novel-generation`
  - prompt construction
  - business-facing generation functions
  - provider dispatching

Goal:

- stop overloading `gemini.ts`
- isolate protocol mechanics from novel-writing business logic

### Domain Layer

Suggested structure:

- `src/domain/novel/types.ts`
- `src/domain/novel/export.ts`
- `src/domain/novel/state.ts`

Suggested responsibilities:

- `types`
  - `NovelConfig`
  - `NovelOutline`
  - `ChapterOutline`
- `export`
  - TXT export formatting
- `state`
  - chapter updates
  - append-content helpers
  - reusable outline/chapter mutation helpers when useful

Goal:

- remove novel-specific logic from screens and provider files
- make domain concepts reusable and easier to reason about

### Screen Layer

Keep the existing screen behavior, but split large screen files into smaller view components where it improves clarity.

Examples:

- `src/components/setup/ProviderSettingsPanel.tsx`
- `src/components/outline/OutlineMetaEditor.tsx`
- `src/components/outline/ChapterOutlineList.tsx`
- `src/components/writing/ChapterSidebar.tsx`
- `src/components/writing/ChapterContentPane.tsx`

Goal:

- screens orchestrate behavior
- smaller child components render sections
- remove repeated inline rendering logic

### Project Layer

Review and clean:

- root config files
- generated metadata
- process docs
- starter leftovers
- dead dependencies

## Cleanup Policy

Cleanup must be evidence-driven.

### Safe Delete

Delete files only when they are clearly:

- unused
- redundant after refactor
- not required for runtime
- not needed for developer handoff

Candidates to inspect:

- unused UI component files in `src/components/ui/`
- replaced transitional provider files
- process-only docs in `docs/superpowers/`
- root-level metadata or starter files with no active value

### Merge Then Delete

If a file contains useful content but poor boundaries:

- move the valuable content into the correct module
- remove the old container file afterward

### Conservative Keep

Keep a file if there is meaningful uncertainty that it is required by:

- runtime
- local development
- external hosting/platform assumptions
- future migration safety

## Dependency Review

Review `package.json` and remove dependencies that are no longer used after refactor.

Likely categories to inspect:

- starter dependencies that are not imported anywhere
- UI packages whose components are no longer referenced
- libraries added during experimentation but not used in runtime code

Do not remove a dependency just because its use is indirect; confirm with import usage and build success.

## README Target Content

Replace the current lightweight README with a developer-oriented project guide.

Recommended sections:

### Project Overview

- what the application is
- what problems it solves
- what the main workflow is

### Feature Overview

- setup and provider configuration
- outline generation
- outline editing
- chapter writing
- summary generation
- export

### Tech Stack

- React
- TypeScript
- Vite
- Gemini SDK
- compatible interface transport

### Project Structure

Explain the main directories and responsibilities after refactor.

### Local Development

- install
- run dev server
- build
- run tests

### Environment Variables

Document:

- default provider
- Gemini official settings
- compatible interface settings
- model settings

### Provider Modes

Explain:

- `官方 Gemini`
- `兼容接口`
- protocol options:
  - `自动识别`
  - `Chat Completions`
  - `Responses`

### Data Persistence

Explain:

- browser-side localStorage overrides
- reset behavior
- legacy provider migration behavior

### Common Problems

Examples:

- wrong API key
- wrong endpoint
- wrong protocol selection
- stale local browser settings

### Development Conventions

Document rules such as:

- put provider transport logic in provider modules
- keep screens thin
- keep domain types out of UI files
- avoid growing one-file “god modules”

## Risks

### Refactor risk

Because the work is intentionally broad, the main risk is accidental behavior regression while improving internal structure.

Mitigation:

- move logic in small steps
- keep tests green
- run build frequently

### Cleanup risk

Removing files or dependencies can break hidden paths if done too aggressively.

Mitigation:

- use repo-wide search before deletion
- verify with typecheck and build

### Documentation drift risk

README can become incorrect if written before the refactor settles.

Mitigation:

- update README after structure cleanup is complete
- verify commands and file paths against the final repo state

## Validation

The refactor is complete only when:

- feature behavior remains intact
- code structure is clearer and more modular
- obvious dead files/code are removed
- dead dependencies are removed when safe
- tests pass
- build passes
- README reflects the cleaned project accurately

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d3d03e48-8c12-4d18-ba7f-f3fd0d887576

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` and add the provider defaults you want to use
3. Run the app:
   `npm run dev`

## Environment Variables

This app now supports both Gemini and OpenAI-compatible third-party APIs.

The setup page reads the following Vite env vars as defaults, and browser-side edits will override them locally through `localStorage` until you reset them in the UI.

```env
VITE_DEFAULT_PROVIDER=gemini

VITE_GEMINI_API_KEY=
VITE_GEMINI_OUTLINE_MODEL=gemini-3.1-pro-preview
VITE_GEMINI_CHAPTER_MODEL=gemini-3.1-pro-preview
VITE_GEMINI_SUMMARY_MODEL=gemini-3-flash-preview

VITE_OPENAI_BASE_URL=https://xiaohumini.site/v1/chat/completions
VITE_OPENAI_API_KEY=
VITE_OPENAI_OUTLINE_MODEL=gpt-5.4
VITE_OPENAI_CHAPTER_MODEL=gpt-5.4
VITE_OPENAI_SUMMARY_MODEL=gpt-5.4
```

### Notes

- `VITE_DEFAULT_PROVIDER` accepts `gemini` or `openai-compatible`
- `VITE_OPENAI_BASE_URL` will be requested exactly as provided
- If your provider gives a full endpoint such as `https://your-provider.example/v1/chat/completions` or `https://your-provider.example/v1/responses`, fill it in as-is
- If you switch providers or edit keys/models in the page, those values persist in the current browser
- Use the setup page reset control to clear browser-saved overrides and restore the current project defaults
- OpenAI-compatible requests are sent through the local `/api/llm-proxy` route during `vite dev` and `vite preview` to avoid browser-side CORS preflight failures
- The proxy forwards a standard OpenAI-compatible JSON body upstream and only uses custom headers locally for target routing and auth
- `/v1/chat/completions` uses the `messages` payload shape, while `/v1/responses` uses the `input` payload shape

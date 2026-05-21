import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildOpenAIProxyRequest,
  extractOpenAICompatibleResponseText,
  extractOpenAICompatibleStreamText,
} from "@/lib/openai-compatible";
import type { LlmSettings } from "@/lib/llm-settings";

const settings: LlmSettings = {
  provider: "openai-compatible",
  gemini: {
    apiKey: "",
    outlineModel: "",
    chapterModel: "",
    summaryModel: "",
  },
  openaiCompatible: {
    baseURL: "https://freemodel.dev/api/compat/chat/completions",
    apiKey: "secret-key",
    outlineModel: "test-outline",
    chapterModel: "test-chapter",
    summaryModel: "test-summary",
  },
};

test("buildOpenAIProxyRequest sends a standard chat completions body through the proxy", () => {
  const request = buildOpenAIProxyRequest(settings, {
    model: "test-outline",
    prompt: "hello",
    stream: true,
    temperature: 0.8,
  });

  assert.equal(request.url, "/api/llm-proxy");
  assert.equal(request.init.method, "POST");

  const body = JSON.parse(String(request.init.body));
  const headers = request.init.headers as Record<string, string>;

  assert.equal(
    headers["X-LLM-Target-URL"],
    "https://freemodel.dev/api/compat/chat/completions"
  );
  assert.equal(headers["X-LLM-API-Key"], "secret-key");
  assert.equal(body.model, "test-outline");
  assert.equal(body.stream, true);
  assert.equal(body.temperature, 0.8);
  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
});

test("buildOpenAIProxyRequest uses responses payload for responses endpoints", () => {
  const request = buildOpenAIProxyRequest(
    {
      ...settings,
      openaiCompatible: {
        ...settings.openaiCompatible,
        baseURL: "https://xiaohumini.site/v1/responses",
      },
    },
    {
      model: "gpt-4.1",
      prompt: "hello",
      stream: true,
      temperature: 0.8,
    }
  );

  const body = JSON.parse(String(request.init.body));

  assert.equal(body.model, "gpt-4.1");
  assert.equal(body.stream, true);
  assert.equal(body.temperature, 0.8);
  assert.deepEqual(body.input, [{ role: "user", content: "hello" }]);
  assert.equal("messages" in body, false);
});

test("extractOpenAICompatibleResponseText reads chat completions payloads", () => {
  assert.equal(
    extractOpenAICompatibleResponseText({
      choices: [
        {
          message: {
            content: "chat text",
          },
        },
      ],
    }),
    "chat text"
  );
});

test("extractOpenAICompatibleResponseText reads responses payloads", () => {
  assert.equal(
    extractOpenAICompatibleResponseText({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "responses text",
            },
          ],
        },
      ],
    }),
    "responses text"
  );
});

test("extractOpenAICompatibleStreamText reads chat completions deltas", () => {
  assert.deepEqual(
    extractOpenAICompatibleStreamText({
      choices: [
        {
          delta: {
            content: "chat delta",
          },
        },
      ],
    }),
    ["chat delta"]
  );
});

test("extractOpenAICompatibleStreamText reads responses deltas", () => {
  assert.deepEqual(
    extractOpenAICompatibleStreamText({
      type: "response.output_text.delta",
      delta: "responses delta",
    }),
    ["responses delta"]
  );
});

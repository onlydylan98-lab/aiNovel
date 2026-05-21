import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildCompatibleProxyRequest,
  extractCompatibleResponseText,
  extractCompatibleStreamText,
  resolveCompatibleProtocol,
} from "@/lib/compatible-interface";
import type { LlmSettings } from "@/lib/llm-settings";

const settings: LlmSettings = {
  provider: "compatible",
  gemini: {
    apiKey: "",
    outlineModel: "",
    chapterModel: "",
    summaryModel: "",
  },
  compatible: {
    baseURL: "https://freemodel.dev/api/compat/chat/completions",
    apiKey: "secret-key",
    protocol: "auto",
    outlineModel: "test-outline",
    chapterModel: "test-chapter",
    summaryModel: "test-summary",
  },
};

test("buildCompatibleProxyRequest sends a standard chat completions body through the proxy", () => {
  const request = buildCompatibleProxyRequest(settings.compatible, {
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

test("buildCompatibleProxyRequest uses responses payload for responses endpoints", () => {
  const request = buildCompatibleProxyRequest(
    {
      ...settings.compatible,
      baseURL: "https://xiaohumini.site/v1/responses",
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

test("resolveCompatibleProtocol respects manual protocol selection", () => {
  assert.equal(
    resolveCompatibleProtocol("https://example.com/v1/chat/completions", "responses"),
    "responses"
  );
});

test("resolveCompatibleProtocol auto-detects responses URLs", () => {
  assert.equal(resolveCompatibleProtocol("https://example.com/v1/responses", "auto"), "responses");
});

test("resolveCompatibleProtocol falls back to chat completions for ambiguous URLs", () => {
  assert.equal(resolveCompatibleProtocol("https://example.com/v1", "auto"), "chat-completions");
});

test("extractCompatibleResponseText reads chat completions payloads", () => {
  assert.equal(
    extractCompatibleResponseText({
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

test("extractCompatibleResponseText reads responses payloads", () => {
  assert.equal(
    extractCompatibleResponseText({
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

test("extractCompatibleStreamText reads chat completions deltas", () => {
  assert.deepEqual(
    extractCompatibleStreamText({
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

test("extractCompatibleStreamText reads responses deltas", () => {
  assert.deepEqual(
    extractCompatibleStreamText({
      type: "response.output_text.delta",
      delta: "responses delta",
    }),
    ["responses delta"]
  );
});

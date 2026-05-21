import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

interface ProxyBody {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function setProxyHeaders(upstream: Response, res: ServerResponse) {
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");

  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }
  if (cacheControl) {
    res.setHeader("Cache-Control", cacheControl);
  }
}

async function readUpstreamText(upstream: Response): Promise<string> {
  try {
    return await upstream.text();
  } catch {
    return "";
  }
}

async function pipeReadableToResponse(
  upstream: ReadableStream<Uint8Array>,
  res: ServerResponse
) {
  const reader = upstream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      res.end();
      return;
    }
    if (value) {
      res.write(Buffer.from(value));
    }
  }
}

async function llmProxyHandler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  try {
    const targetUrl = req.headers["x-llm-target-url"];
    const apiKey = req.headers["x-llm-api-key"];
    const rawBody = await readRequestBody(req);
    const parsed = JSON.parse(rawBody) as ProxyBody;

    if (typeof targetUrl !== "string" || typeof apiKey !== "string" || !isRecord(parsed)) {
      res.statusCode = 400;
      res.end("Invalid proxy payload.");
      return;
    }

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(parsed),
    });

    if (!upstream.ok) {
      const errorText = await readUpstreamText(upstream);
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: `Upstream request failed with ${upstream.status}.`,
          targetUrl,
          upstreamBody: errorText,
        })
      );
      return;
    }

    res.statusCode = upstream.status;
    setProxyHeaders(upstream, res);

    if (!upstream.body) {
      res.end(await upstream.text());
      return;
    }

    await pipeReadableToResponse(upstream.body, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Proxy request failed.",
      })
    );
  }
}

export function llmProxyPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url !== "/api/llm-proxy") {
      next();
      return;
    }

    void llmProxyHandler(req, res);
  };

  return {
    name: "llm-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

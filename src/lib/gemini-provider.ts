import { GoogleGenAI, Type } from "@google/genai";

export type JsonSchema = Record<string, unknown>;
export const GeminiSchemaType = Type;

export function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!apiKey.trim()) {
    throw new Error("Gemini API Key is missing.");
  }

  return new GoogleGenAI({ apiKey });
}

export async function generateGeminiJson(
  apiKey: string,
  prompt: string,
  model: string,
  schema: JsonSchema,
  temperature: number
): Promise<string> {
  const ai = getGeminiClient(apiKey);
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return response.text || "{}";
}

export async function generateGeminiText(
  apiKey: string,
  prompt: string,
  model: string,
  temperature?: number
): Promise<string> {
  const ai = getGeminiClient(apiKey);
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: temperature === undefined ? undefined : { temperature },
  });
  return response.text || "";
}

export async function* generateGeminiTextStream(
  apiKey: string,
  prompt: string,
  model: string,
  temperature?: number
) {
  const ai = getGeminiClient(apiKey);
  const responseStream = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config: temperature === undefined ? undefined : { temperature },
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

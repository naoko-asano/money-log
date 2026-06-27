import { GoogleGenAI } from "@google/genai";
import { isImageItem, type Params } from "./index.js";

const client = new GoogleGenAI({ apiKey: process.env.AI_API_KEY ?? "" });
const MODEL = "gemini-3.1-flash-lite";

function convertGeminiContents(contents: Params["contents"]) {
  if (typeof contents === "string") return contents;
  return contents.map((item) =>
    isImageItem(item)
      ? { inlineData: { mimeType: item.mimeType, data: item.imageBase64 } }
      : item
  );
}

export async function askAi({
  contents,
  systemPrompt,
  responseSchema,
}: Params): Promise<string> {
  const response = await client.models.generateContent({
    model: MODEL,
    contents: convertGeminiContents(contents),
    config: {
      responseMimeType: "application/json",
      systemInstruction: systemPrompt,
      responseSchema,
    },
  });
  const responseText = response.text;
  if (!responseText) throw new Error("AI returned empty response");
  return responseText;
}

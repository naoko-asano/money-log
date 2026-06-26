import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY ?? "" });
const MODEL = "gemini-3.1-flash-lite";

type TextItem = { text: string };
type ImageItem = { inlineData: { mimeType: string; data: string } };
export type InputItem = TextItem | ImageItem;

export type Params = {
  contents: string | InputItem[];
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
};

export async function askAi({
  contents,
  systemPrompt,
  responseSchema,
}: Params): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      systemInstruction: systemPrompt,
      responseSchema,
    },
  });
  return response.text ?? "{}";
}

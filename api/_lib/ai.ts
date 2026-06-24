import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY ?? "" });
const MODEL = "gemini-3.1-flash-lite";

export type Params = {
  contents: string;
  systemInstruction?: string;
  responseSchema?: Record<string, unknown>;
};

export async function askAi({
  contents,
  systemInstruction,
  responseSchema,
}: Params): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { responseMimeType: "application/json", systemInstruction, responseSchema },
  });
  return response.text ?? "";
}

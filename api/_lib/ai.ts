import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.1-flash-lite";

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY ?? "" });

export async function sendToAi(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: text,
  });
  return response.text ?? "";
}

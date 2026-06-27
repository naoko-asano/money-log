type TextItem = { text: string };
type ImageItem = { inlineData: { mimeType: string; data: string } };
export type InputItem = TextItem | ImageItem;

export type Params = {
  contents: string | InputItem[];
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
};

export { askAi } from "./gemini.js";

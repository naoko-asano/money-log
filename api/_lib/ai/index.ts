type TextItem = { text: string };
type ImageItem = { mimeType: string; imageBase64: string };
export type InputItem = TextItem | ImageItem;

export function isImageItem(item: InputItem): item is ImageItem {
  return "imageBase64" in item;
}

export type Params = {
  contents: string | InputItem[];
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
};

export { askAi } from "./gemini.js";

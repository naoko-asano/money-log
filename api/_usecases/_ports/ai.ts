type TextItem = { text: string };
export type ImageItem = { mimeType: string; imageBase64: string };
export type InputItem = TextItem | ImageItem;

export type AskAiArgs = {
  contents: string | InputItem[];
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
};

export type AskAi = (args: AskAiArgs) => Promise<string>;

export function isImageItem(item: InputItem): item is ImageItem {
  return "imageBase64" in item;
}

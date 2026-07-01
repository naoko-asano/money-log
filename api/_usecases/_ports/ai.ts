type TextItem = { text: string };
export type ImageItem = { mimeType: string; imageBase64: string };
export type InputItem = TextItem | ImageItem;

export type GenerateTextArgs = {
  contents: string | InputItem[];
  systemPrompt?: string;
  responseSchema?: Record<string, unknown>;
};

export type Ai = {
  generateText(args: GenerateTextArgs): Promise<string>;
};

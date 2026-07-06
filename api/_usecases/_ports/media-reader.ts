export type MediaReader = {
  read(messageId: string): Promise<{ mimeType: string; imageBase64: string }>;
};

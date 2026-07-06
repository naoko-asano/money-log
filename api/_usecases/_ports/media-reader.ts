export type MediaReader = {
  read(messageId: string): Promise<{ imageBase64: string; mimeType: string }>;
};

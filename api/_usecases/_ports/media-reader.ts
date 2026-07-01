export type MediaReader = {
  read(messageId: string): Promise<{ data: string; mimeType: string }>;
};

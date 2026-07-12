export type QuickItem = {
  label: string;
  data: string;
};

export type Reply = {
  send(text: string): Promise<void>;
  sendWithQuickItems(text: string, items: QuickItem[]): Promise<void>;
};

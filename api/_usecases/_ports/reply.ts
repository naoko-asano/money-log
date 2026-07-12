export type QuickItem = {
  type: "action";
  action: {
    type: "postback";
    label: string;
    data: string;
    displayText: string;
  };
};

export type Reply = {
  send(text: string): Promise<void>;
  sendWithQuickItems(text: string, items: QuickItem[]): Promise<void>;
};

type QuickReplyItem = {
  type: "action";
  action: {
    type: "postback";
    label: string;
    data: string;
    displayText: string;
  };
};

export type Messaging = {
  replyText(params: { replyToken: string; text: string }): Promise<void>;
  replyWithQuickReply(params: {
    replyToken: string;
    text: string;
    items: QuickReplyItem[];
  }): Promise<void>;
};

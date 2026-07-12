import { messagingApi } from "@line/bot-sdk";
import type { QuickItem, Reply } from "#api/_usecases/_ports/reply.js";
import { getToken } from "./token.js";

export function createLineReply(replyToken: string): Reply {
  return {
    async send(text) {
      const client = createClient();
      await client.replyMessage({
        replyToken,
        messages: [{ type: "text", text }],
      });
    },
    async sendWithQuickItems(text, items) {
      const client = createClient();
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: "text",
            text,
            quickReply: { items: toLineQuickItems(items) },
          },
        ],
      });
    },
  };
}

function toLineQuickItems(items: QuickItem[]) {
  return items.map((item) => ({
    type: "action" as const,
    action: {
      type: "postback" as const,
      label: item.label,
      data: item.data,
      displayText: item.label,
    },
  }));
}

function createClient(): messagingApi.MessagingApiClient {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: getToken(),
  });
}

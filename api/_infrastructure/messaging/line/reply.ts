import { messagingApi } from "@line/bot-sdk";
import type { Reply } from "../../../_usecases/_ports/reply.js";
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
        messages: [{ type: "text", text, quickReply: { items } }],
      });
    },
  };
}

function createClient(): messagingApi.MessagingApiClient {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: getToken(),
  });
}

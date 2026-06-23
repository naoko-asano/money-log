import type { messagingApi as messagingApiTypes } from "@line/bot-sdk";
import { messagingApi } from "@line/bot-sdk";

function createClient(): messagingApi.MessagingApiClient {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return new messagingApi.MessagingApiClient({ channelAccessToken: token });
}

export async function replyText({
  replyToken,
  text,
}: {
  replyToken: string;
  text: string;
}): Promise<void> {
  const client = createClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

export async function replyWithQuickReply({
  replyToken,
  text,
  items,
}: {
  replyToken: string;
  text: string;
  items: messagingApiTypes.QuickReplyItem[];
}): Promise<void> {
  const client = createClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text, quickReply: { items } }],
  });
}

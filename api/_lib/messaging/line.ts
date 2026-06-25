import type { Readable } from "node:stream";
import type { messagingApi as messagingApiTypes } from "@line/bot-sdk";
import { messagingApi } from "@line/bot-sdk";

function getToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return token;
}

function createClient(): messagingApi.MessagingApiClient {
  const token = getToken();
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

function createBlobClient(): messagingApi.MessagingApiBlobClient {
  const token = getToken();
  return new messagingApi.MessagingApiBlobClient({ channelAccessToken: token });
}

async function streamToBase64(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("base64");
}

export async function getImageContent(
  messageId: string,
): Promise<{ data: string; mimeType: string }> {
  const client = createBlobClient();
  const stream = await client.getMessageContent(messageId);
  const data = await streamToBase64(stream);
  return { data, mimeType: "image/jpeg" };
}

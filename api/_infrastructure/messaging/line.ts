import type { Readable } from "node:stream";
import { type webhook as lineWebhook, messagingApi } from "@line/bot-sdk";
import type { MediaReader } from "../../_usecases/_ports/media-reader.js";
import type { Reply } from "../../_usecases/_ports/reply.js";

export type WebhookEvent = {
  webhookEventId: string;
  userId: string;
  replyToken: string;
} & (
  | { type: "confirmation"; confirmationPayload: string }
  | { type: "text"; text: string }
  | { type: "image"; messageId: string }
);

export function parseWebhookEvents(rawBody: string): WebhookEvent[] {
  const body = JSON.parse(rawBody) as { events: lineWebhook.Event[] };
  const events: WebhookEvent[] = [];

  for (const event of body.events ?? []) {
    const userId = event.source?.userId;
    if (!userId) continue;

    const replyToken = (event as { replyToken?: string }).replyToken;
    if (!replyToken) continue;

    const webhookEventId = event.webhookEventId;

    if (event.type === "postback") {
      events.push({
        webhookEventId,
        userId,
        replyToken,
        type: "confirmation",
        confirmationPayload: event.postback.data,
      });
    } else if (event.type === "message" && event.message.type === "text") {
      events.push({
        webhookEventId,
        userId,
        replyToken,
        type: "text",
        text: event.message.text,
      });
    } else if (event.type === "message" && event.message.type === "image") {
      events.push({
        webhookEventId,
        userId,
        replyToken,
        type: "image",
        messageId: event.message.id,
      });
    }
  }

  return events;
}

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

export const getImageContent: MediaReader["read"] = async (messageId) => {
  const client = createBlobClient();
  const { httpResponse, body } =
    await client.getMessageContentWithHttpInfo(messageId);
  const mimeType = httpResponse.headers.get("content-type") ?? "image/jpeg";
  const data = await streamToBase64(body);
  return { data, mimeType };
};

function getToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return token;
}

function createClient(): messagingApi.MessagingApiClient {
  const token = getToken();
  return new messagingApi.MessagingApiClient({ channelAccessToken: token });
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

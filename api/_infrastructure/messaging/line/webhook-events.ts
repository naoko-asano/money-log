import type { webhook as lineWebhook } from "@line/bot-sdk";

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

    const base = { webhookEventId: event.webhookEventId, userId, replyToken };

    if (event.type === "postback") {
      events.push({
        ...base,
        type: "confirmation",
        confirmationPayload: event.postback.data,
      });
    } else if (event.type === "message" && event.message.type === "text") {
      events.push({ ...base, type: "text", text: event.message.text });
    } else if (event.type === "message" && event.message.type === "image") {
      events.push({ ...base, type: "image", messageId: event.message.id });
    }
  }

  return events;
}

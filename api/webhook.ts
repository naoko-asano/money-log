import type { webhook } from "@line/bot-sdk";
import { askAi } from "./_infrastructure/ai/index.js";
import { getImageContent } from "./_lib/messaging/index.js";
import { verifySignature } from "./_lib/verify-signature.js";
import {
  parseImageToExpense,
  parseTextToExpense,
} from "./_usecases/parse-expense.js";
import { respondToConfirmation } from "./_usecases/respond-to-confirmation.js";
import { respondToExpense } from "./_usecases/respond-to-expense.js";

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get("x-line-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return new Response("Server misconfiguration", { status: 500 });
  }

  const rawBody = await req.text();
  if (!verifySignature(rawBody, signature, channelSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events: webhook.Event[] };

  for (const event of body.events ?? []) {
    const userId = event.source?.userId;
    if (!userId) continue;

    if (isConfirmationEvent(event)) {
      const { action, pendingWebhookEventId } = JSON.parse(event.postback.data);
      await respondToConfirmation({
        userId,
        replyToken: event.replyToken,
        isApproved: action === "ok",
        pendingWebhookEventId,
      });
    } else if (isTextInputEvent(event)) {
      const text = event.message.text;
      await respondToExpense({
        userId,
        replyToken: event.replyToken,
        webhookEventId: event.webhookEventId,
        parseInput: () => parseTextToExpense({ askAi, text }),
      });
    } else if (isImageInputEvent(event)) {
      const messageId = event.message.id;
      await respondToExpense({
        userId,
        replyToken: event.replyToken,
        webhookEventId: event.webhookEventId,
        parseInput: async () => {
          const { data, mimeType } = await getImageContent(messageId);
          return parseImageToExpense({ askAi, imageBase64: data, mimeType });
        },
      });
    }
  }

  return new Response(null, { status: 200 });
}

function isConfirmationEvent(
  event: webhook.Event,
): event is webhook.PostbackEvent & { replyToken: string } {
  return event.type === "postback" && !!event.replyToken;
}

function isTextInputEvent(
  event: webhook.Event,
): event is webhook.MessageEvent & {
  message: webhook.TextMessageContent;
  replyToken: string;
} {
  return (
    event.type === "message" &&
    event.message.type === "text" &&
    !!event.replyToken
  );
}

function isImageInputEvent(
  event: webhook.Event,
): event is webhook.MessageEvent & {
  message: webhook.ImageMessageContent;
  replyToken: string;
} {
  return (
    event.type === "message" &&
    event.message.type === "image" &&
    !!event.replyToken
  );
}

import type { webhook } from "@line/bot-sdk";
import { ai } from "./_infrastructure/ai/index.js";
import { expensesRepo } from "./_infrastructure/db/expenses-repo.js";
import { pendingExpensesRepo } from "./_infrastructure/db/pending-expenses-repo.js";
import { mediaReader, messaging } from "./_infrastructure/messaging/index.js";
import { verifySignature } from "./_lib/verify-signature.js";
import { createExpenseParser } from "./_usecases/parse-expense.js";
import { respondToConfirmation } from "./_usecases/respond-to-confirmation.js";
import { respondToExpense } from "./_usecases/respond-to-expense.js";

const expenseParser = createExpenseParser(ai);

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

    try {
      if (isConfirmationEvent(event)) {
        const confirmation = parseConfirmation(
          event.postback.data,
          userId,
          event.webhookEventId,
        );

        if (!confirmation) continue;
        await respondToConfirmation({
          userId,
          replyToken: event.replyToken,
          isApproved: confirmation.action === "ok",
          pendingWebhookEventId: confirmation.pendingWebhookEventId,
          messaging,
          expensesRepo,
          pendingExpensesRepo,
        });
      } else if (isTextInputEvent(event)) {
        const text = event.message.text;
        await respondToExpense({
          userId,
          replyToken: event.replyToken,
          webhookEventId: event.webhookEventId,
          parseInput: () => expenseParser.fromText(text),
          messaging,
          expensesRepo,
          pendingExpensesRepo,
        });
      } else if (isImageInputEvent(event)) {
        const messageId = event.message.id;
        await respondToExpense({
          userId,
          replyToken: event.replyToken,
          webhookEventId: event.webhookEventId,
          parseInput: async () => {
            const { data, mimeType } = await mediaReader.read(messageId);
            return expenseParser.fromImage({ imageBase64: data, mimeType });
          },
          messaging,
          expensesRepo,
          pendingExpensesRepo,
        });
      }
    } catch (error) {
      console.error(
        `webhook event processing failed (userId: ${userId}, webhookEventId: ${event.webhookEventId}, type: ${event.type}):`,
        error,
      );
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

function parseConfirmation(
  rawJson: string,
  userId: string,
  webhookEventId: string,
): { action: string; pendingWebhookEventId: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error(
      `webhook invalid postback.data (userId: ${userId}, webhookEventId: ${webhookEventId}):`,
      rawJson,
    );
    return null;
  }
  if (
    typeof (parsed as { action?: unknown }).action !== "string" ||
    typeof (parsed as { pendingWebhookEventId?: unknown })
      .pendingWebhookEventId !== "string"
  ) {
    console.error(
      `webhook unexpected postback.data shape (userId: ${userId}, webhookEventId: ${webhookEventId}):`,
      rawJson,
    );
    return null;
  }
  return parsed as { action: string; pendingWebhookEventId: string };
}

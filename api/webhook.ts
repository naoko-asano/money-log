import { ai } from "./_infrastructure/ai/index.js";
import { expensesRepo } from "./_infrastructure/db/expenses-repo.js";
import { pendingExpensesRepo } from "./_infrastructure/db/pending-expenses-repo.js";
import {
  createReply,
  mediaReader,
  parseWebhookEvents,
} from "./_infrastructure/messaging/index.js";
import { verifySignature } from "./_lib/verify-signature.js";
import { handleConfirmation } from "./_usecases/handle-confirmation.js";
import { handleExpenseInput } from "./_usecases/handle-expense-input.js";
import { createExpenseParser } from "./_usecases/parse-expense.js";

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

  const events = parseWebhookEvents(rawBody);

  for (const event of events) {
    const reply = createReply(event.replyToken);

    try {
      if (event.type === "confirmation") {
        const confirmation = parseConfirmationPayload(
          event.confirmationPayload,
          event.userId,
          event.webhookEventId,
        );

        if (!confirmation) continue;
        await handleConfirmation({
          userId: event.userId,
          isApproved: confirmation.action === "ok",
          pendingWebhookEventId: confirmation.pendingWebhookEventId,
          reply,
          expensesRepo,
          pendingExpensesRepo,
        });
      } else if (event.type === "text") {
        await handleExpenseInput({
          userId: event.userId,
          webhookEventId: event.webhookEventId,
          parseInput: () => expenseParser.fromText(event.text),
          reply,
          expensesRepo,
          pendingExpensesRepo,
        });
      } else if (event.type === "image") {
        await handleExpenseInput({
          userId: event.userId,
          webhookEventId: event.webhookEventId,
          parseInput: async () => {
            const { mimeType, imageBase64 } = await mediaReader.read(
              event.messageId,
            );
            return expenseParser.fromImage({ mimeType, imageBase64 });
          },
          reply,
          expensesRepo,
          pendingExpensesRepo,
        });
      }
    } catch (error) {
      console.error(
        `webhook event processing failed (userId: ${event.userId}, webhookEventId: ${event.webhookEventId}, type: ${event.type}):`,
        error,
      );
    }
  }

  return new Response(null, { status: 200 });
}

function parseConfirmationPayload(
  rawJson: string,
  userId: string,
  webhookEventId: string,
): { action: string; pendingWebhookEventId: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error(
      `webhook invalid confirmationPayload (userId: ${userId}, webhookEventId: ${webhookEventId}):`,
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
      `webhook unexpected confirmationPayload shape (userId: ${userId}, webhookEventId: ${webhookEventId}):`,
      rawJson,
    );
    return null;
  }
  return parsed as { action: string; pendingWebhookEventId: string };
}

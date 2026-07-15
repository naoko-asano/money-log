import { handleWebhookEvent } from "./_controllers/handle-webhook-event.js";
import { ai } from "./_infrastructure/ai/index.js";
import { expensesRepo } from "./_infrastructure/db/expenses-repo.js";
import { pendingExpensesRepo } from "./_infrastructure/db/pending-expenses-repo.js";
import { createErrorHandler } from "./_infrastructure/error-handler.js";
import {
  createReply,
  createReplyWithLog,
  mediaReader,
  parseWebhookEvents,
} from "./_infrastructure/messaging/index.js";
import { verifySignature } from "./_lib/verify-signature.js";
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
    const eventContext = {
      userId: event.userId,
      webhookEventId: event.webhookEventId,
      webhookEventType: event.type,
    };
    console.log("event received:", eventContext);

    const reply = createReplyWithLog(
      createReply(event.replyToken),
      eventContext,
    );
    const errorHandler = createErrorHandler(eventContext);

    try {
      await handleWebhookEvent(event, {
        reply,
        errorHandler,
        expenseParser,
        mediaReader,
        expensesRepo,
        pendingExpensesRepo,
      });
    } catch (error) {
      await errorHandler.run({
        error,
        label: "webhook event processing",
        reply,
      });
    }
  }

  return new Response(null, { status: 200 });
}

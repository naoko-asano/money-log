import type { WebhookEvent } from "#api/_infrastructure/messaging/index.js";
import type { ErrorHandler } from "#api/_usecases/_ports/error-handler.js";
import type { ExpensesRepo } from "#api/_usecases/_ports/expenses-repo.js";
import type { MediaReader } from "#api/_usecases/_ports/media-reader.js";
import type { PendingExpensesRepo } from "#api/_usecases/_ports/pending-expenses-repo.js";
import type { Reply } from "#api/_usecases/_ports/reply.js";
import {
  isApproved,
  parseConfirmationPayload,
} from "#api/_usecases/confirmation-payload.js";
import { handleConfirmation } from "#api/_usecases/handle-confirmation.js";
import { handleExpenseInput } from "#api/_usecases/handle-expense-input.js";
import type { ExpenseParser } from "#api/_usecases/parse-expense.js";

type Deps = {
  reply: Reply;
  errorHandler: ErrorHandler;
  expenseParser: ExpenseParser;
  mediaReader: MediaReader;
  expensesRepo: ExpensesRepo;
  pendingExpensesRepo: PendingExpensesRepo;
};

export async function handleWebhookEvent(
  event: WebhookEvent,
  {
    reply,
    errorHandler,
    expenseParser,
    mediaReader,
    expensesRepo,
    pendingExpensesRepo,
  }: Deps,
): Promise<void> {
  if (event.type === "confirmation") {
    const confirmation = parseConfirmationPayload(event.confirmationPayload);
    if (!confirmation) {
      await errorHandler.run({
        error: new Error("invalid confirmationPayload"),
        label: "parseConfirmationPayload",
        reply,
      });
      return;
    }
    await handleConfirmation({
      userId: event.userId,
      isApproved: isApproved(confirmation),
      pendingWebhookEventId: confirmation.pendingWebhookEventId,
      reply,
      expensesRepo,
      pendingExpensesRepo,
      errorHandler,
    });
  } else if (event.type === "text") {
    await handleExpenseInput({
      userId: event.userId,
      webhookEventId: event.webhookEventId,
      parseInput: () => expenseParser.fromText(event.text),
      reply,
      expensesRepo,
      pendingExpensesRepo,
      errorHandler,
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
      errorHandler,
    });
  }
}

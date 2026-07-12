import type { Expense } from "#shared/model/expense.js";
import type { PendingExpense } from "#shared/model/pending-expense.js";
import { formatDate } from "#shared/utils/date.js";
import type { ErrorHandler } from "./_ports/error-handler.js";
import type { ExpensesRepo } from "./_ports/expenses-repo.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo.js";
import type { Reply } from "./_ports/reply.js";
import { buildConfirmationItems } from "./confirmation-payload.js";

type Args = {
  userId: string;
  webhookEventId: string;
  parseInput: () => Promise<Expense>;
  reply: Reply;
  expensesRepo: ExpensesRepo;
  pendingExpensesRepo: PendingExpensesRepo;
  errorHandler: ErrorHandler;
};

export async function handleExpenseInput({
  userId,
  webhookEventId,
  parseInput,
  reply,
  expensesRepo,
  pendingExpensesRepo,
  errorHandler,
}: Args): Promise<void> {
  let pendingExpense: PendingExpense | null;
  try {
    pendingExpense = await pendingExpensesRepo.get(userId);
  } catch (error) {
    await errorHandler.run({
      error,
      label: "pendingExpensesRepo.get",
      reply,
    });
    return;
  }

  if (pendingExpense) {
    await askForConfirmation({
      expense: pendingExpense,
      hasPendingExpense: true,
      reply,
    });
    return;
  }

  // NOTE: 再送を考慮
  try {
    if (await expensesRepo.exists(webhookEventId)) return;
  } catch (error) {
    await errorHandler.run({
      error,
      label: "expensesRepo.exists",
      reply,
    });
    return;
  }

  let expense: Expense;
  try {
    expense = await parseInput();
  } catch (error) {
    await errorHandler.run({
      error,
      label: "parseInput",
      reply,
      userText: "解析できませんでした。もう一度お試しください。",
    });
    return;
  }

  let created: PendingExpense | null;
  try {
    created = await pendingExpensesRepo.create(userId, expense, webhookEventId);
  } catch (error) {
    await errorHandler.run({
      error,
      label: "pendingExpensesRepo.create",
      reply,
    });
    return;
  }
  if (created) {
    await askForConfirmation({
      expense: created,
      hasPendingExpense: false,
      reply,
    });
    return;
  }

  let existing: PendingExpense | null;
  try {
    existing = await pendingExpensesRepo.get(userId);
  } catch (error) {
    await errorHandler.run({
      error,
      label: "pendingExpensesRepo.get (conflict recovery)",
      reply,
    });
    return;
  }
  if (existing) {
    await askForConfirmation({
      expense: existing,
      hasPendingExpense: true,
      reply,
    });
    return;
  }

  await errorHandler.run({
    error: new Error(
      "pendingExpensesRepo.create conflicted, but no pending expense was found on recovery",
    ),
    label: "pendingExpensesRepo.create (conflict recovery not found)",
    reply,
  });
}

async function askForConfirmation({
  expense,
  hasPendingExpense,
  reply,
}: {
  expense: PendingExpense;
  hasPendingExpense: boolean;
  reply: Reply;
}): Promise<void> {
  const items = buildConfirmationItems(expense.webhookEventId);
  const baseText = `${formatDate(expense.date)}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。\nよろしいですか？`;
  const text = hasPendingExpense
    ? `先に確認中の支出を「はい」か「いいえ」で回答してください。\n${baseText}`
    : baseText;

  await reply.sendWithQuickItems(text, items);
}

import {
  DEFAULT_USER_ERROR_TEXT,
  handleError,
} from "#api/_lib/handle-error.js";
import type { Expense } from "#shared/model/expense.js";
import type { PendingExpense } from "#shared/model/pending-expense.js";
import { formatDate } from "#shared/utils/date.js";
import type { ExpensesRepo } from "./_ports/expenses-repo.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo.js";
import type { Reply } from "./_ports/reply.js";

type Args = {
  userId: string;
  webhookEventId: string;
  parseInput: () => Promise<Expense>;
  reply: Reply;
  expensesRepo: ExpensesRepo;
  pendingExpensesRepo: PendingExpensesRepo;
};

export async function handleExpenseInput({
  userId,
  webhookEventId,
  parseInput,
  reply,
  expensesRepo,
  pendingExpensesRepo,
}: Args): Promise<void> {
  let pendingExpense: PendingExpense | null;
  try {
    pendingExpense = await pendingExpensesRepo.get(userId);
  } catch (error) {
    await handleError({
      error,
      label: "pendingExpensesRepo.get",
      notify: () => reply.send(DEFAULT_USER_ERROR_TEXT),
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
    await handleError({
      error,
      label: "expensesRepo.exists",
      notify: () => reply.send(DEFAULT_USER_ERROR_TEXT),
    });
    return;
  }

  let expense: Expense;
  try {
    expense = await parseInput();
  } catch (error) {
    await handleError({
      error,
      label: "parseInput",
      notify: () =>
        reply.send("解析できませんでした。もう一度お試しください。"),
    });
    return;
  }
  console.log("parsed expense:", expense);

  let created: PendingExpense | null;
  try {
    created = await pendingExpensesRepo.create(userId, expense, webhookEventId);
  } catch (error) {
    await handleError({
      error,
      label: "pendingExpensesRepo.create",
      notify: () => reply.send(DEFAULT_USER_ERROR_TEXT),
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
    await handleError({
      error,
      label: "pendingExpensesRepo.get (conflict recovery)",
      notify: () => reply.send(DEFAULT_USER_ERROR_TEXT),
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

  await reply.send(DEFAULT_USER_ERROR_TEXT);
}

function buildConfirmationItems(pendingWebhookEventId: string) {
  return [
    {
      type: "action" as const,
      action: {
        type: "postback" as const,
        label: "はい",
        data: JSON.stringify({ action: "ok", pendingWebhookEventId }),
        displayText: "はい",
      },
    },
    {
      type: "action" as const,
      action: {
        type: "postback" as const,
        label: "いいえ",
        data: JSON.stringify({ action: "ng", pendingWebhookEventId }),
        displayText: "いいえ",
      },
    },
  ];
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

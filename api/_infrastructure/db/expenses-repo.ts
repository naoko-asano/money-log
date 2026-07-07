import type { ExpensesRepo } from "#api/_usecases/_ports/expenses-repo.js";
import {
  createExpenseFromPending,
  existsExpenseByWebhookEventId,
} from "#shared/db/expenses.js";

export const expensesRepo: ExpensesRepo = {
  exists: existsExpenseByWebhookEventId,
  createFromPending: createExpenseFromPending,
};

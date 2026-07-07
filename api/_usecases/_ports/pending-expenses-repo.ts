import type { Expense } from "#shared/model/expense.js";
import type { PendingExpense } from "#shared/model/pending-expense.js";

export type PendingExpensesRepo = {
  get(userId: string): Promise<PendingExpense | null>;
  create(
    userId: string,
    expense: Expense,
    webhookEventId: string,
  ): Promise<PendingExpense | null>;
  delete(userId: string, webhookEventId: string): Promise<void>;
};

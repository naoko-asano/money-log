import type { PendingExpensesRepo } from "#api/_usecases/_ports/pending-expenses-repo.js";
import {
  createPendingExpense,
  deletePendingExpense,
  getPendingExpense,
} from "#shared/db/pending-expenses.js";

export const pendingExpensesRepo: PendingExpensesRepo = {
  get: getPendingExpense,
  create: createPendingExpense,
  delete: deletePendingExpense,
};

import {
  createPendingExpense,
  deletePendingExpense,
  getPendingExpense,
} from "../../../shared/db/pending-expenses.js";
import type { PendingExpensesRepo } from "../../_usecases/_ports/pending-expenses-repo.js";

export const pendingExpensesRepo: PendingExpensesRepo = {
  get: getPendingExpense,
  create: createPendingExpense,
  delete: deletePendingExpense,
};

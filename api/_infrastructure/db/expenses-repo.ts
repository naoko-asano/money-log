import {
  createExpenseFromPending,
  existsExpenseByWebhookEventId,
} from "../../../shared/db/expenses.js";
import type { ExpensesRepo } from "../../_usecases/_ports/expenses-repo.js";

export const expensesRepo: ExpensesRepo = {
  exists: existsExpenseByWebhookEventId,
  create: createExpenseFromPending,
};

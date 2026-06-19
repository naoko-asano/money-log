import type { ExpenseRecord } from "../../api/_lib/ai.js";
import { sql } from "./client.js";

export async function createExpense(
  userId: string,
  expense: ExpenseRecord,
): Promise<void> {
  await sql`
    INSERT INTO expenses (line_user_id, date, amount, category)
    VALUES (${userId}, ${expense.date}, ${expense.amount}, ${expense.category})
  `;
}

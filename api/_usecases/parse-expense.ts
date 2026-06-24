import {
  CATEGORIES,
  type Expense,
  isCategory,
} from "../../shared/model/expense.js";
import { getToday } from "../../shared/utils/date.js";
import { askAi } from "../_lib/ai.js";

function buildSystemInstruction(): string {
  const today = getToday();
  return `あなたは家計簿アシスタントです。
ユーザーのメッセージから支出情報を読み取り、JSONで返してください。
今日の日付は${today}です。日付が明示されていない場合は今日の日付を使用してください。
カテゴリは次の中から最も適切なものを選んでください：${CATEGORIES.join("、")}`;
}

export async function parseExpense(text: string): Promise<Expense> {
  const result = await askAi({
    contents: text,
    systemInstruction: buildSystemInstruction(),
    responseSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD形式の日付" },
        amount: { type: "number", description: "金額（円）" },
        category: { type: "string", enum: CATEGORIES },
      },
      required: ["date", "amount", "category"],
    },
  });

  const parsed = JSON.parse(result);

  const date = new Date(parsed.date);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid date: ${parsed.date}`);

  if (!isCategory(parsed.category))
    throw new Error(`Invalid category: ${parsed.category}`);

  return { ...parsed, date };
}

import { isNullish } from "#api/_lib/is-nullish.js";
import { CATEGORIES, type Expense, isCategory } from "#shared/model/expense.js";
import { getToday } from "#shared/utils/date.js";
import type { Ai, ImageItem } from "./_ports/ai.js";

const EXPENSE_SCHEMA = {
  type: "object",
  properties: {
    date: {
      type: "string",
      description: "YYYY-MM-DD形式の日付",
      nullable: true,
    },
    amount: { type: "number", description: "金額（円）", nullable: true },
    category: { type: "string", enum: CATEGORIES, nullable: true },
  },
  required: ["date", "amount", "category"],
};

export function createExpenseParser(ai: Ai) {
  return {
    fromText: (text: string) => parseTextToExpense({ ai, text }),
    fromImage: (image: ImageItem) => parseImageToExpense({ ai, ...image }),
  };
}

async function parseTextToExpense({
  ai,
  text,
}: {
  ai: Ai;
  text: string;
}): Promise<Expense> {
  const result = await ai.generateText({
    contents: text,
    systemPrompt: buildSystemPrompt(),
    responseSchema: EXPENSE_SCHEMA,
  });
  return toExpense(result);
}

async function parseImageToExpense({
  ai,
  mimeType,
  imageBase64,
}: { ai: Ai } & ImageItem): Promise<Expense> {
  const result = await ai.generateText({
    contents: [
      { mimeType, imageBase64 },
      { text: "この領収書から支出情報を読み取ってください" },
    ],
    systemPrompt: buildSystemPrompt(),
    responseSchema: EXPENSE_SCHEMA,
  });
  return toExpense(result);
}

function buildSystemPrompt(): string {
  const today = getToday();
  return `あなたは家計簿アシスタントです。
ユーザーのメッセージから支出情報を読み取り、JSONで返してください。
今日の日付は${today}です。日付が明示されていない場合は今日の日付を使用してください。
カテゴリは次の中から最も適切なものを選んでください：${CATEGORIES.join("、")}
支出情報を読み取れない場合は、date・amount・categoryをすべてnullにしてください。`;
}

function toExpense(result: string): Expense {
  const parsed = JSON.parse(result);

  if (
    isNullish(parsed.date) ||
    isNullish(parsed.amount) ||
    isNullish(parsed.category)
  )
    throw new Error("Could not parse expense from input");

  const date = new Date(parsed.date);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid date: ${parsed.date}`);

  if (!isCategory(parsed.category))
    throw new Error(`Invalid category: ${parsed.category}`);

  return { ...parsed, date };
}

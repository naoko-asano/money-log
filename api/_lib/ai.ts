import { GoogleGenAI } from "@google/genai";
import type { Expense } from "../../shared/model/expense.js";

const MODEL = "gemini-3.1-flash-lite";

const CATEGORIES = ["食費", "交通費", "日用品", "外食", "娯楽", "その他"];

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY ?? "" });

function buildSystemInstruction(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `あなたは家計簿アシスタントです。
ユーザーのメッセージから支出情報を読み取り、JSONで返してください。
今日の日付は${today}です。日付が明示されていない場合は今日の日付を使用してください。
カテゴリは次の中から最も適切なものを選んでください：${CATEGORIES.join("、")}`;
}

export async function parseExpense(text: string): Promise<Expense> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: text,
    config: {
      systemInstruction: buildSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD形式の日付" },
          amount: { type: "number", description: "金額（円）" },
          category: { type: "string", enum: CATEGORIES },
        },
        required: ["date", "amount", "category"],
      },
    },
  });

  return JSON.parse(response.text ?? "{}") as Expense;
}

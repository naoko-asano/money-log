import { describe, expect, it, vi } from "vitest";
import type { AskAi } from "./_ports/ai";
import { parseExpenseFromImage, parseExpenseFromText } from "./parse-expense";

const VALID_EXPENSE_JSON = JSON.stringify({
  date: "2026-01-15",
  amount: 500,
  category: "食費",
});

describe("テキストから支出を解析する", () => {
  it("有効なJSONから支出を返す", async () => {
    const askAi = vi.fn<AskAi>().mockResolvedValue(VALID_EXPENSE_JSON);
    const result = await parseExpenseFromText({
      askAi,
      text: "コーヒー 500円",
    });
    expect(result).toEqual({
      date: new Date("2026-01-15"),
      amount: 500,
      category: "食費",
    });
  });

  it("無効な日付でエラーを投げる", async () => {
    const askAi = vi
      .fn<AskAi>()
      .mockResolvedValue(
        JSON.stringify({ date: "not-a-date", amount: 500, category: "食費" }),
      );
    await expect(
      parseExpenseFromText({ askAi, text: "コーヒー" }),
    ).rejects.toThrow("Invalid date");
  });

  it("無効なカテゴリでエラーを投げる", async () => {
    const askAi = vi.fn<AskAi>().mockResolvedValue(
      JSON.stringify({
        date: "2026-01-15",
        amount: 500,
        category: "不正なカテゴリ",
      }),
    );
    await expect(
      parseExpenseFromText({ askAi, text: "コーヒー" }),
    ).rejects.toThrow("Invalid category");
  });
});

describe("画像から支出を解析する", () => {
  it("有効なJSONから支出を返す", async () => {
    const askAi = vi.fn<AskAi>().mockResolvedValue(VALID_EXPENSE_JSON);
    const result = await parseExpenseFromImage({
      askAi,
      imageBase64: "base64data",
      mimeType: "image/jpeg",
    });
    expect(result).toEqual({
      date: new Date("2026-01-15"),
      amount: 500,
      category: "食費",
    });
  });
});

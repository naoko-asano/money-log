import { describe, expect, it, vi } from "vitest";
import type { Ai } from "./_ports/ai";
import { createExpenseParser } from "./parse-expense";

const VALID_EXPENSE_JSON = JSON.stringify({
  date: "2026-01-15",
  amount: 500,
  category: "食費",
});

function createAi({ returnValue }: { returnValue: string }): Ai {
  return { generateText: vi.fn().mockResolvedValue(returnValue) };
}

describe("テキストから支出を解析する", () => {
  it("有効なJSONから支出を返す", async () => {
    const result = await createExpenseParser(
      createAi({ returnValue: VALID_EXPENSE_JSON }),
    ).fromText("コーヒー 500円");
    expect(result).toEqual({
      date: new Date("2026-01-15"),
      amount: 500,
      category: "食費",
    });
  });

  it("無効な日付でエラーを投げる", async () => {
    const ai = createAi({
      returnValue: JSON.stringify({
        date: "not-a-date",
        amount: 500,
        category: "食費",
      }),
    });
    await expect(createExpenseParser(ai).fromText("コーヒー")).rejects.toThrow(
      "Invalid date",
    );
  });

  it("無効なカテゴリでエラーを投げる", async () => {
    const ai = createAi({
      returnValue: JSON.stringify({
        date: "2026-01-15",
        amount: 500,
        category: "不正なカテゴリ",
      }),
    });
    await expect(createExpenseParser(ai).fromText("コーヒー")).rejects.toThrow(
      "Invalid category",
    );
  });

  it("支出として解析できない入力でエラーを投げる", async () => {
    const ai = createAi({
      returnValue: JSON.stringify({
        date: "2026-01-15",
        amount: 500,
        category: null,
      }),
    });
    await expect(createExpenseParser(ai).fromText("500円")).rejects.toThrow(
      "Could not parse expense from input",
    );
  });
});

describe("画像から支出を解析する", () => {
  it("有効なJSONから支出を返す", async () => {
    const result = await createExpenseParser(
      createAi({ returnValue: VALID_EXPENSE_JSON }),
    ).fromImage({
      mimeType: "image/jpeg",
      imageBase64: "base64data",
    });
    expect(result).toEqual({
      date: new Date("2026-01-15"),
      amount: 500,
      category: "食費",
    });
  });
});

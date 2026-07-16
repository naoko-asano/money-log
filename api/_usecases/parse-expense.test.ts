import { describe, expect, it, vi } from "vitest";
import type { Ai } from "./_ports/ai";
import { createExpenseParser } from "./parse-expense";

const VALID_EXPENSE_JSON = JSON.stringify({
  date: "2026-01-15",
  amount: 500,
  category: "食費",
});

function createMockedAi({ returnValue }: { returnValue: string }): Ai {
  return { generateText: vi.fn().mockResolvedValue(returnValue) };
}

describe("テキストから支出を解析する", () => {
  it("有効なJSONから支出を返す", async () => {
    const result = await createExpenseParser(
      createMockedAi({ returnValue: VALID_EXPENSE_JSON }),
    ).fromText("コーヒー 500円");
    expect(result).toEqual({
      date: new Date("2026-01-15"),
      amount: 500,
      category: "食費",
    });
  });

  it("無効な日付でエラーを投げる", async () => {
    const ai = createMockedAi({
      returnValue: JSON.stringify({
        date: "not-a-date",
        amount: 500,
        category: "食費",
      }),
    });
    await expect(
      createExpenseParser(ai).fromText("コーヒー 500円"),
    ).rejects.toThrow("Invalid date");
  });

  it("無効なカテゴリでエラーを投げる", async () => {
    const ai = createMockedAi({
      returnValue: JSON.stringify({
        date: "2026-01-15",
        amount: 500,
        category: "不正なカテゴリ",
      }),
    });
    await expect(
      createExpenseParser(ai).fromText("コーヒー 500円"),
    ).rejects.toThrow("Invalid category");
  });

  it("全ての項目が欠落している場合、エラーを投げる", async () => {
    const ai = createMockedAi({ returnValue: JSON.stringify({}) });
    await expect(
      createExpenseParser(ai).fromText("あいうえお"),
    ).rejects.toThrow("Could not parse expense from input");
  });

  it("欠落している項目が含まれる場合、エラーを投げる", async () => {
    const ai = createMockedAi({
      returnValue: JSON.stringify({
        date: "2026-01-15",
        amount: 500,
      }),
    });
    await expect(createExpenseParser(ai).fromText("500円")).rejects.toThrow(
      "Could not parse expense from input",
    );
  });

  it("nullが含まれる場合、エラーを投げる", async () => {
    const ai = createMockedAi({
      returnValue: JSON.stringify({
        date: null,
        amount: 500,
        category: "食費",
      }),
    });
    await expect(
      createExpenseParser(ai).fromText("20xx/xx/xx コーヒー 500円"),
    ).rejects.toThrow("Could not parse expense from input");
  });
});

describe("画像から支出を解析する", () => {
  it("有効なJSONから支出を返す", async () => {
    const result = await createExpenseParser(
      createMockedAi({ returnValue: VALID_EXPENSE_JSON }),
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, getToday } from "./date";

describe("formatDate", () => {
  it("UTC深夜0時のDateをyyyy/mm/ddに変換する", () => {
    const date = new Date("2026-12-31T00:00:00.000Z");
    expect(formatDate(date)).toBe("2026/12/31");
  });

  it("月・日を2桁にゼロ埋めする", () => {
    const date = new Date("2026-01-05T00:00:00.000Z");
    expect(formatDate(date)).toBe("2026/01/05");
  });

  it("UTC時刻基準で日付を判定する（ローカル時刻に依存しない）", () => {
    // UTC 2026-12-31T23:30:00Z → UTCでは2026/12/31（JSTでは2027/1/1）
    const date = new Date("2026-12-31T23:30:00.000Z");
    expect(formatDate(date)).toBe("2026/12/31");
  });
});

describe("getToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Asia/TokyoのYYYY-MM-DD形式を返す", () => {
    // UTC 2026-12-31 15:00 = JST 2027-01-01 00:00
    vi.setSystemTime(new Date("2026-12-31T15:00:00.000Z"));
    expect(getToday("Asia/Tokyo")).toBe("2027-01-01");
  });

  it("年をまたぐ境界でUTCと東京の日付が異なる", () => {
    // UTC 2026-12-31 15:00 = JST 2027-01-01 00:00
    vi.setSystemTime(new Date("2026-12-31T15:00:00.000Z"));
    expect(getToday("UTC")).toBe("2026-12-31");
    expect(getToday("Asia/Tokyo")).toBe("2027-01-01");
  });
});

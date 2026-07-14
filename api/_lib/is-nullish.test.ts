import { describe, expect, it } from "vitest";
import { isNullish } from "./is-nullish";

describe("nullまたはundefinedかどうかを判定する", () => {
  it("nullの場合、trueを返す", () => {
    expect(isNullish(null)).toBe(true);
  });

  it("undefinedの場合、trueを返す", () => {
    expect(isNullish(undefined)).toBe(true);
  });

  it("0の場合、falseを返す", () => {
    expect(isNullish(0)).toBe(false);
  });

  it("空文字の場合、falseを返す", () => {
    expect(isNullish("")).toBe(false);
  });
});

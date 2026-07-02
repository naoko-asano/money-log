import { describe, expect, it, vi } from "vitest";
import { handleError } from "./handle-error";

describe("handleError", () => {
  it("エラーをログに記録してnotifyを呼び出す", async () => {
    const notify = vi.fn().mockResolvedValue(undefined);
    const error = new Error("db error");

    await handleError({ error, label: "some.operation", notify });

    expect(notify).toHaveBeenCalledOnce();
  });

  it("notifyが失敗した場合、エラーを伝播する", async () => {
    const notifyError = new Error("notify error");
    const notify = vi.fn().mockRejectedValue(notifyError);

    await expect(
      handleError({
        error: new Error("db error"),
        label: "some.operation",
        notify,
      }),
    ).rejects.toThrow(notifyError);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createMockedReply } from "#api/_test-utils/reply.js";
import { createReplyWithLog } from "./reply-with-log";

const CONTEXT = {
  userId: "user-001",
  webhookEventId: "event-001",
  webhookEventType: "text",
};

describe("ログ付きのreplyを実行した場合", () => {
  it("sendが成功した場合、元のreplyのsendを呼んでからログを出力する", async () => {
    const reply = createMockedReply();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await createReplyWithLog(reply, CONTEXT).send("こんにちは");

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("こんにちは");
    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith("reply sent:", CONTEXT);
  });

  it("sendWithQuickItemsが成功した場合、元のreplyのsendWithQuickItemsを呼んでからログを出力する", async () => {
    const reply = createMockedReply();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const items = [{ label: "OK", data: "ok" }];

    await createReplyWithLog(reply, CONTEXT).sendWithQuickItems(
      "確認してください",
      items,
    );

    expect(reply.sendWithQuickItems).toHaveBeenCalledOnce();
    expect(reply.sendWithQuickItems).toHaveBeenCalledWith(
      "確認してください",
      items,
    );
    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith("reply sent:", CONTEXT);
  });

  it("sendが失敗した場合、失敗をログに記録し、エラーは伝播しない", async () => {
    const error = new Error("send error");
    const reply = createMockedReply({
      send: vi.fn().mockRejectedValue(error),
    });
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      createReplyWithLog(reply, CONTEXT).send("こんにちは"),
    ).resolves.toBeUndefined();

    expect(errorLogSpy).toHaveBeenCalledOnce();
    expect(errorLogSpy).toHaveBeenCalledWith("reply failed:", CONTEXT, error);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("sendWithQuickItemsが失敗した場合、失敗をログに記録し、エラーは伝播しない", async () => {
    const error = new Error("send error");
    const items = [{ label: "OK", data: "ok" }];
    const reply = createMockedReply({
      sendWithQuickItems: vi.fn().mockRejectedValue(error),
    });
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      createReplyWithLog(reply, CONTEXT).sendWithQuickItems(
        "確認してください",
        items,
      ),
    ).resolves.toBeUndefined();

    expect(errorLogSpy).toHaveBeenCalledOnce();
    expect(errorLogSpy).toHaveBeenCalledWith("reply failed:", CONTEXT, error);
    expect(logSpy).not.toHaveBeenCalled();
  });
});

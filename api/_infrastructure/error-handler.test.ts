import { describe, expect, it, vi } from "vitest";
import { DEFAULT_USER_ERROR_TEXT } from "#api/_const/error.js";
import { createMockedReply } from "#api/_test-utils/reply.js";
import { createErrorHandler } from "./error-handler";

const CONTEXT = {
  userId: "user-001",
  webhookEventId: "event-001",
  webhookEventType: "text",
};

describe("エラーハンドラーを実行した場合", () => {
  it("contextを伴ってエラーをログに記録し、replyでユーザーに通知する", async () => {
    const reply = createMockedReply();
    const error = new Error("db error");
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await createErrorHandler(CONTEXT).run({
      error,
      label: "some.operation",
      reply,
      userText: "エラーが発生しました。",
    });

    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(
      "some.operation failed:",
      CONTEXT,
      error,
    );
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("エラーが発生しました。");
  });

  it("userTextを省略するとDEFAULT_USER_ERROR_TEXTでユーザーに通知する", async () => {
    const reply = createMockedReply();
    vi.spyOn(console, "error").mockImplementation(() => {});

    await createErrorHandler(CONTEXT).run({
      error: new Error("db error"),
      label: "some.operation",
      reply,
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(DEFAULT_USER_ERROR_TEXT);
  });

  it("reply.sendが失敗した場合、エラーを伝播する", async () => {
    const sendError = new Error("send error");
    const reply = createMockedReply({
      send: vi.fn().mockRejectedValue(sendError),
    });

    await expect(
      createErrorHandler(CONTEXT).run({
        error: new Error("db error"),
        label: "some.operation",
        reply,
        userText: "エラーが発生しました。",
      }),
    ).rejects.toThrow(sendError);
  });
});

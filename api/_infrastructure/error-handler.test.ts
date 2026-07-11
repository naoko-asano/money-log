import { describe, expect, it, vi } from "vitest";
import { DEFAULT_USER_ERROR_TEXT } from "#api/_const/error.js";
import type { Reply } from "#api/_usecases/_ports/reply.js";
import { createErrorHandler } from "./error-handler";

const CONTEXT = {
  userId: "user-001",
  webhookEventId: "event-001",
  type: "text",
};

function createReply(): Reply {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendWithQuickItems: vi.fn().mockResolvedValue(undefined),
  };
}

describe("エラーハンドラーを実行した場合", () => {
  it("contextを伴ってエラーをログに記録し、replyでユーザーに通知する", async () => {
    const reply = createReply();
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
    const reply = createReply();
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
    const reply: Reply = {
      send: vi.fn().mockRejectedValue(sendError),
      sendWithQuickItems: vi.fn(),
    };

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

import { describe, expect, it, vi } from "vitest";
import type { Reply } from "#api/_usecases/_ports/reply.js";
import { createReplyWithLog } from "./reply-with-log";

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

describe("createReplyWithLog", () => {
  it("sendを呼ぶとログを出力してから元のreplyのsendを呼ぶ", async () => {
    const reply = createReply();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await createReplyWithLog(reply, CONTEXT).send("こんにちは");

    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(
      "webhook output:",
      CONTEXT,
      "こんにちは",
    );
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("こんにちは");
  });

  it("sendWithQuickItemsを呼ぶとログを出力してから元のreplyのsendWithQuickItemsを呼ぶ", async () => {
    const reply = createReply();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const items = [
      {
        type: "action" as const,
        action: {
          type: "postback" as const,
          label: "OK",
          data: "ok",
          displayText: "OK",
        },
      },
    ];

    await createReplyWithLog(reply, CONTEXT).sendWithQuickItems(
      "確認してください",
      items,
    );

    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(
      "webhook output:",
      CONTEXT,
      "確認してください",
      items,
    );
    expect(reply.sendWithQuickItems).toHaveBeenCalledOnce();
    expect(reply.sendWithQuickItems).toHaveBeenCalledWith(
      "確認してください",
      items,
    );
  });
});

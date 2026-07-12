import { describe, expect, it } from "vitest";
import {
  buildConfirmationItems,
  parseConfirmationPayload,
} from "./confirmation-payload";

describe("出費登録の是非を確認する選択肢の作成", () => {
  it("はい/いいえの選択肢を生成し、それぞれにpendingWebhookEventIdを埋め込む", () => {
    const items = buildConfirmationItems("event-001");

    expect(items).toEqual([
      {
        label: "はい",
        data: '{"action":"ok","pendingWebhookEventId":"event-001"}',
      },
      {
        label: "いいえ",
        data: '{"action":"cancel","pendingWebhookEventId":"event-001"}',
      },
    ]);
  });
});

describe("出費登録の是非を確認したpayloadの解析", () => {
  it("作成時に埋め込んだdataを元の形に復元する", () => {
    const items = buildConfirmationItems("event-001");
    const okData = items[0]?.data ?? "";

    expect(parseConfirmationPayload(okData)).toEqual({
      action: "ok",
      pendingWebhookEventId: "event-001",
    });
  });

  it("不正なJSONの場合、nullを返す", () => {
    expect(parseConfirmationPayload("not json")).toBeNull();
  });

  it("actionが欠けている場合、nullを返す", () => {
    expect(
      parseConfirmationPayload('{"pendingWebhookEventId":"event-001"}'),
    ).toBeNull();
  });

  it("actionがok/cancel以外の場合、nullを返す", () => {
    expect(
      parseConfirmationPayload(
        '{"action":"foo","pendingWebhookEventId":"event-001"}',
      ),
    ).toBeNull();
  });

  it("pendingWebhookEventIdが欠けている場合、nullを返す", () => {
    expect(parseConfirmationPayload('{"action":"ok"}')).toBeNull();
  });
});

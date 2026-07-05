import { describe, expect, it } from "vitest";
import { parseWebhookEvents } from "./line";

const USER_ID = "user-001";
const REPLY_TOKEN = "reply-token-001";
const WEBHOOK_EVENT_ID = "event-001";

function createRawBody(events: unknown[]): string {
  return JSON.stringify({ events });
}

function createPostbackEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "postback",
    replyToken: REPLY_TOKEN,
    webhookEventId: WEBHOOK_EVENT_ID,
    source: { type: "user", userId: USER_ID },
    postback: { data: '{"action":"ok","pendingWebhookEventId":"event-000"}' },
    ...overrides,
  };
}

function createTextMessageEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "message",
    replyToken: REPLY_TOKEN,
    webhookEventId: WEBHOOK_EVENT_ID,
    source: { type: "user", userId: USER_ID },
    message: { type: "text", id: "message-001", text: "コーヒー 500円" },
    ...overrides,
  };
}

function createImageMessageEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "message",
    replyToken: REPLY_TOKEN,
    webhookEventId: WEBHOOK_EVENT_ID,
    source: { type: "user", userId: USER_ID },
    message: { type: "image", id: "message-002" },
    ...overrides,
  };
}

describe("parseWebhookEvents", () => {
  it("postbackイベントをconfirmationイベントに変換する", () => {
    const events = parseWebhookEvents(createRawBody([createPostbackEvent()]));

    expect(events).toEqual([
      {
        webhookEventId: WEBHOOK_EVENT_ID,
        userId: USER_ID,
        replyToken: REPLY_TOKEN,
        type: "confirmation",
        confirmationPayload:
          '{"action":"ok","pendingWebhookEventId":"event-000"}',
      },
    ]);
  });

  it("テキストメッセージイベントをtextイベントに変換する", () => {
    const events = parseWebhookEvents(
      createRawBody([createTextMessageEvent()]),
    );

    expect(events).toEqual([
      {
        webhookEventId: WEBHOOK_EVENT_ID,
        userId: USER_ID,
        replyToken: REPLY_TOKEN,
        type: "text",
        text: "コーヒー 500円",
      },
    ]);
  });

  it("画像メッセージイベントをimageイベントに変換する", () => {
    const events = parseWebhookEvents(
      createRawBody([createImageMessageEvent()]),
    );

    expect(events).toEqual([
      {
        webhookEventId: WEBHOOK_EVENT_ID,
        userId: USER_ID,
        replyToken: REPLY_TOKEN,
        type: "image",
        messageId: "message-002",
      },
    ]);
  });

  it("userIdが無いイベントは結果に含まれない", () => {
    const events = parseWebhookEvents(
      createRawBody([createTextMessageEvent({ source: { type: "group" } })]),
    );

    expect(events).toEqual([]);
  });

  it("replyTokenが無いイベントは結果に含まれない", () => {
    const events = parseWebhookEvents(
      createRawBody([createTextMessageEvent({ replyToken: undefined })]),
    );

    expect(events).toEqual([]);
  });

  it("未対応のメッセージ種別は結果に含まれない", () => {
    const events = parseWebhookEvents(
      createRawBody([
        createTextMessageEvent({
          message: { type: "sticker", id: "message-003" },
        }),
      ]),
    );

    expect(events).toEqual([]);
  });
});

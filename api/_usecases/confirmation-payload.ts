import type { QuickItem } from "./_ports/reply.js";

export type ConfirmationPayload = {
  action: string;
  pendingWebhookEventId: string;
};

export function buildConfirmationItems(
  pendingWebhookEventId: string,
): QuickItem[] {
  return [
    {
      type: "action" as const,
      action: {
        type: "postback" as const,
        label: "はい",
        data: JSON.stringify({
          action: "ok",
          pendingWebhookEventId,
        } satisfies ConfirmationPayload),
        displayText: "はい",
      },
    },
    {
      type: "action" as const,
      action: {
        type: "postback" as const,
        label: "いいえ",
        data: JSON.stringify({
          action: "cancel",
          pendingWebhookEventId,
        } satisfies ConfirmationPayload),
        displayText: "いいえ",
      },
    },
  ];
}

export function parseConfirmationPayload(
  rawJson: string,
): ConfirmationPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (
    typeof (parsed as { action?: unknown }).action !== "string" ||
    typeof (parsed as { pendingWebhookEventId?: unknown })
      .pendingWebhookEventId !== "string"
  ) {
    return null;
  }
  return parsed as ConfirmationPayload;
}

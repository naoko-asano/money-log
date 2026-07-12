import type { QuickItem } from "./_ports/reply.js";

export type ConfirmationAction = (typeof CONFIRMATION_ACTIONS)[number];

export type ConfirmationPayload = {
  action: ConfirmationAction;
  pendingWebhookEventId: string;
};

const CONFIRMATION_ACTIONS = ["ok", "cancel"] as const;

export function buildConfirmationItems(
  pendingWebhookEventId: string,
): QuickItem[] {
  return [
    {
      label: "はい",
      data: JSON.stringify({
        action: "ok",
        pendingWebhookEventId,
      } satisfies ConfirmationPayload),
    },
    {
      label: "いいえ",
      data: JSON.stringify({
        action: "cancel",
        pendingWebhookEventId,
      } satisfies ConfirmationPayload),
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

  const { action, pendingWebhookEventId } = parsed as {
    action?: unknown;
    pendingWebhookEventId?: unknown;
  };

  if (
    !isConfirmationAction(action) ||
    typeof pendingWebhookEventId !== "string"
  ) {
    return null;
  }

  return { action, pendingWebhookEventId };
}

function isConfirmationAction(s: unknown): s is ConfirmationAction {
  return (CONFIRMATION_ACTIONS as readonly unknown[]).includes(s);
}

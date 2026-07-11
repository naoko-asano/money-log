import type { Reply } from "#api/_usecases/_ports/reply.js";

export function createReplyWithLog(
  reply: Reply,
  context: { userId: string; webhookEventId: string; type: string },
): Reply {
  return {
    async send(text) {
      console.log("webhook output:", context, text);
      await reply.send(text);
    },
    async sendWithQuickItems(text, items) {
      console.log("webhook output:", context, text, items);
      await reply.sendWithQuickItems(text, items);
    },
  };
}

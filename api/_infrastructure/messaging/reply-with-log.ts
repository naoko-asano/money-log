import type { Reply } from "#api/_usecases/_ports/reply.js";

export function createReplyWithLog(
  reply: Reply,
  context: Record<string, unknown>,
): Reply {
  return {
    async send(text) {
      try {
        await reply.send(text);
        console.log("webhook output:", context, text);
      } catch (error) {
        console.error("webhook output failed:", context, text, error);
      }
    },
    async sendWithQuickItems(text, items) {
      try {
        await reply.sendWithQuickItems(text, items);
        console.log("webhook output:", context, text, items);
      } catch (error) {
        console.error("webhook output failed:", context, text, items, error);
      }
    },
  };
}

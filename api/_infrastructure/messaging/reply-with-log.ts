import type { Reply } from "#api/_usecases/_ports/reply.js";

export function createReplyWithLog(
  reply: Reply,
  context: Record<string, unknown>,
): Reply {
  return {
    async send(text) {
      try {
        await reply.send(text);
        console.log("reply sent:", context);
      } catch (error) {
        console.error("reply failed:", context, error);
      }
    },
    async sendWithQuickItems(text, items) {
      try {
        await reply.sendWithQuickItems(text, items);
        console.log("reply sent:", context);
      } catch (error) {
        console.error("reply failed:", context, error);
      }
    },
  };
}

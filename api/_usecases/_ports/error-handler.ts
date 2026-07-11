import type { Reply } from "./reply.js";

export type ErrorHandler = {
  run(args: {
    error: unknown;
    label: string;
    reply: Reply;
    userText?: string;
  }): Promise<void>;
};

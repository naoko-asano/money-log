import * as crypto from "node:crypto";

export function verifySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (typeof signature !== "string") return false;

  const hash = crypto.createHmac("SHA256", secret).update(body).digest();
  const sig = Buffer.from(signature, "base64");
  if (hash.length !== sig.length) return false;

  return crypto.timingSafeEqual(hash, sig);
}

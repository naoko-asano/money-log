import * as crypto from "node:crypto";

export function verifySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const hash = crypto
    .createHmac("SHA256", secret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

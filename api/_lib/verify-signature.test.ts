import * as crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySignature } from "./verify-signature";

const SECRET = "valid-secret";
const BODY = "body";

function createSignature(body: string, secret: string): string {
  return crypto.createHmac("SHA256", secret).update(body).digest("base64");
}

describe("verifySignature", () => {
  it("正しい署名を受け入れる", () => {
    const signature = createSignature(BODY, SECRET);
    expect(verifySignature(BODY, signature, SECRET)).toBe(true);
  });

  it("改ざんされたbodyを拒否する", () => {
    const signature = createSignature(BODY, SECRET);
    expect(verifySignature("changed body", signature, SECRET)).toBe(false);
  });

  it("別のsecretで作られた署名を拒否する", () => {
    const invalidSignature = createSignature(BODY, "invalid-secret");
    expect(verifySignature(BODY, invalidSignature, SECRET)).toBe(false);
  });

  it("署名がnullやundefinedの場合は例外を投げずに拒否する", () => {
    expect(verifySignature(BODY, null as unknown as string, SECRET)).toBe(
      false,
    );
    expect(verifySignature(BODY, undefined as unknown as string, SECRET)).toBe(
      false,
    );
  });

  it("長さの異なる署名を拒否する", () => {
    expect(verifySignature(BODY, "short", SECRET)).toBe(false);
  });
});

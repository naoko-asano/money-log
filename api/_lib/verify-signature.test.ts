import * as crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySignature } from "./verify-signature";

const SECRET = "test-secret";
const BODY = '{"events":[]}';

function makeSignature(body: string, secret: string): string {
  return crypto.createHmac("SHA256", secret).update(body).digest("base64");
}

describe("verifySignature", () => {
  it("正しい署名を受け入れる", () => {
    const signature = makeSignature(BODY, SECRET);
    expect(verifySignature(BODY, signature, SECRET)).toBe(true);
  });

  it("改ざんされたbodyを拒否する", () => {
    const signature = makeSignature(BODY, SECRET);
    expect(verifySignature("改ざんされたbody", signature, SECRET)).toBe(false);
  });

  it("別のsecretで作られた署名を拒否する", () => {
    const signature = makeSignature(BODY, "wrong-secret");
    expect(verifySignature(BODY, signature, SECRET)).toBe(false);
  });
});

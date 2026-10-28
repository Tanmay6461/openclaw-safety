import { describe, expect, it } from "vitest";
import { findSecretFormats, isHighEntropyToken, redactSecrets, rememberPrivateTokens, scanSecrets } from "../src/index.js";
import { session } from "./helpers.js";

const KEY = "k";
const GH = `ghp_${"a1B2c3D4e5".repeat(4)}`;

describe("secret formats", () => {
  it("finds common credential formats", () => {
    expect(findSecretFormats(`token: ${GH}`)).toEqual(["GitHub token"]);
    expect(findSecretFormats("AKIAABCDEFGHIJKLMNOP")).toEqual(["AWS access key"]);
    expect(findSecretFormats("-----BEGIN OPENSSH PRIVATE KEY-----")).toEqual(["private key"]);
    expect(findSecretFormats("nothing here")).toEqual([]);
  });
});

describe("private tokens", () => {
  it("only high-entropy tokens count", () => {
    expect(isHighEntropyToken("Zq8vT2kLm9Xw4Rb7")).toBe(true);
    expect(isHighEntropyToken("aaaaaaaaaaaaaaaa1")).toBe(false);
    expect(isHighEntropyToken("internationalization")).toBe(false);
  });

  it("matches a remembered token anywhere in outgoing text, including inside URLs", () => {
    const s = session();
    rememberPrivateTokens(s, "API_KEY=Zq8vT2kLm9Xw4Rb7\nother stuff", KEY);
    expect(scanSecrets("here: https://x.example/?k=Zq8vT2kLm9Xw4Rb7", s, KEY).matched).toBe(true);
    expect(scanSecrets("nothing secret", s, KEY).matched).toBe(false);
  });

  it("redacts formats and remembered tokens", () => {
    const s = session();
    rememberPrivateTokens(s, "pw Zq8vT2kLm9Xw4Rb7", KEY);
    expect(redactSecrets(`a ${GH} b Zq8vT2kLm9Xw4Rb7 c`, s, KEY)).toBe("a [REDACTED] b [REDACTED] c");
  });

  it("pending or unscannable private reads count as matches", () => {
    const s = session();
    s.addPending("c1", { privateSource: true });
    expect(scanSecrets("hello", s, KEY).reasons).toEqual(["may contain data from a read the guard hasn't checked yet"]);
    s.takePending("c1");
    s.markUnscannedPrivate();
    expect(scanSecrets("hello", s, KEY).matched).toBe(true);
  });
});

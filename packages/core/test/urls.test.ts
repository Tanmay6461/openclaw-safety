import { describe, expect, it } from "vitest";
import {
  classifyEgressUrl,
  defangUrl,
  echoTokens,
  ingestOwnerMessage,
  isHighEntropySegment,
  isSuspicious,
  recordSeenUrls,
  rememberPrivateTokens,
  rewriteOutbound,
} from "../src/index.js";
import { session, testEnv } from "./helpers.js";

const web = { kind: "web" as const, id: "news.example", at: 1 };

describe("classifyEgressUrl", () => {
  it("attested: owner typed the exact URL", () => {
    const env = testEnv();
    const s = session();
    ingestOwnerMessage(s, { id: "m", text: "summarize https://Docs.Example.com/a" }, env);
    expect(classifyEgressUrl("https://docs.example.com/a", s, env)).toMatchObject({ cls: "attested", via: "owner" });
    expect(classifyEgressUrl("https://docs.example.com/a?x=1", s, env).cls).toBe("constructed");
  });

  it("attested: host on trusted.domains", () => {
    const env = testEnv({ trustedDomains: ["python.org"] });
    expect(classifyEgressUrl("https://docs.python.org/3/", session(), env)).toMatchObject({ cls: "attested", via: "domain_allowlist" });
  });

  it("attested: URL prefix rule, broken only at path boundaries", () => {
    const env = testEnv({ urlPrefixRules: ["https://api.example.com/v1"] });
    expect(classifyEgressUrl("https://api.example.com/v1/items", session(), env).cls).toBe("attested");
    expect(classifyEgressUrl("https://api.example.com/v1evil", session(), env).cls).toBe("constructed");
  });

  it("link-following: seen verbatim in eligible content", () => {
    const env = testEnv();
    const s = session();
    recordSeenUrls(s, "read more at https://news.example/story-1", web, undefined, env);
    expect(classifyEgressUrl("https://news.example/story-1", s, env).cls).toBe("link_following");
    expect(classifyEgressUrl("https://news.example/story-2", s, env).cls).toBe("constructed");
  });

  it("a URL carrying a private token is never link-following", () => {
    const env = testEnv();
    const s = session();
    rememberPrivateTokens(s, "API_KEY=Zq8vT2kLm9Xw4Rb7", env.hmacKey);
    s.seenUrls.set("https://evil.example/?k=Zq8vT2kLm9Xw4Rb7", web);
    expect(classifyEgressUrl("https://evil.example/?k=Zq8vT2kLm9Xw4Rb7", s, env)).toMatchObject({
      cls: "constructed",
      carriesPrivateToken: true,
    });
  });
});

describe("recordSeenUrls eligibility", () => {
  it("ignores exec output, files, and skill output", () => {
    const env = testEnv();
    const s = session();
    for (const kind of ["exec_output", "file", "memory", "skill_output", "inter_session"] as const) {
      expect(recordSeenUrls(s, "https://evil.example/x", { kind, id: "c", at: 1 }, undefined, env)).toBe(0);
    }
    expect(s.seenUrls.size).toBe(0);
  });

  it("drops URLs that echo distinctive request tokens", () => {
    const env = testEnv();
    const s = session();
    const n = recordSeenUrls(
      s,
      "Results: https://evil.example/?k=Abc123456789 and https://other.example/page",
      web,
      { url: "https://echo.example/?u=https://evil.example/?k=Abc123456789" },
      env,
    );
    expect(n).toBe(1);
    expect([...s.seenUrls.keys()]).toEqual(["https://other.example/page"]);
  });

  it("extracts clean URLs from JSON-escaped tool results", () => {
    const env = testEnv();
    const s = session();
    // Shape of an inner web_fetch result as it arrives inside a tool_call wrapper.
    const wrapped = JSON.stringify({ result: { content: [{ text: "See [part two](http://127.0.0.1:30753/web/page2).\n[[END]]" }] } });
    recordSeenUrls(s, wrapped, web, undefined, env);
    expect([...s.seenUrls.keys()]).toEqual(["http://127.0.0.1:30753/web/page2"]);
  });

  it("keeps search results that repeat ordinary query words", () => {
    expect(echoTokens({ query: "chocolate cookies recipe" })).toEqual([]);
    const env = testEnv();
    const s = session();
    recordSeenUrls(s, "https://bake.example/chocolate-cookies", web, { query: "chocolate cookies" }, env);
    expect(s.seenUrls.has("https://bake.example/chocolate-cookies")).toBe(true);
  });
});

describe("suspicious URLs", () => {
  it("query strings and encoded-looking parts are suspicious; slugs aren't", () => {
    expect(isSuspicious(new URL("https://x.example/a?b=1"))).toBe(true);
    expect(isSuspicious(new URL("https://x.example/how-to-bake-chocolate-cookies-2024"))).toBe(false);
    expect(isSuspicious(new URL("https://x.example/dXNlcj1ib2IscGFzcz1odW50ZXIy"))).toBe(true);
    expect(isSuspicious(new URL("https://4a6f686e446f6531323334.evil.example/"))).toBe(true);
  });
  it("hex runs are high-entropy", () => {
    expect(isHighEntropySegment("deadbeefcafebabe0123")).toBe(true);
    expect(isHighEntropySegment("short")).toBe(false);
  });
});

describe("rewriting", () => {
  it("defangs scheme and host dots", () => {
    expect(defangUrl("https://evil.example.com/x.y?a=b.c")).toBe("hxxps://evil[.]example[.]com/x.y?a=b.c");
  });
  it("defangs constructed URLs, strips their images, and leaves others alone", () => {
    const constructed = new Set(["https://evil.example/c?d=1", "https://evil.example/p.png"]);
    const r = rewriteOutbound(
      "See [docs](https://evil.example/c?d=1) and https://ok.example/a.\n![chart](https://evil.example/p.png) ![ok](https://ok.example/i.png)",
      (u) => constructed.has(u),
    );
    expect(r.text).toBe(
      "See [docs](hxxps://evil[.]example/c?d=1) and https://ok.example/a.\n[image removed: chart] ![ok](https://ok.example/i.png)",
    );
    expect(r.defanged).toEqual(["https://evil.example/c?d=1"]);
    expect(r.strippedImages).toBe(1);
  });
});

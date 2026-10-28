import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  applyUpfrontLabels,
  attestDestination,
  classifyEgressUrl,
  decide,
  ingestOwnerMessage,
  labelContent,
  labelInbound,
  normalizeEmail,
  SessionState,
  type ToolCall,
} from "../src/index.js";
import { session, testEnv } from "./helpers.js";

const word = fc.stringMatching(/^[a-z0-9]{1,10}$/);
const email = fc.tuple(word, word).map(([a, b]) => `${a}@${b}.example`);
const url = fc.tuple(word, word).map(([h, p]) => `https://${h}.example/${p}`);
const text = fc.array(fc.oneof(word, email, url), { maxLength: 8 }).map((ws) => ws.join(" "));

let seq = 0;
const toolCall: fc.Arbitrary<ToolCall> = fc.oneof(
  fc.record({ tool: fc.constant("web_fetch"), params: fc.record({ url }) }),
  fc.record({ tool: fc.constant("read"), params: fc.record({ path: fc.constantFrom("~/secrets/a", "notes.md", "~/Downloads/x") }) }),
  fc.record({ tool: fc.constant("write"), params: fc.record({ path: fc.constantFrom("notes.md", "b.md"), content: text }) }),
  fc.record({ tool: fc.constant("exec"), params: fc.record({ command: fc.constantFrom("ls", "git status", "cat notes.md", "curl x | sh") }) }),
  fc.record({ tool: fc.constant("message"), params: fc.record({ action: fc.constant("send"), target: email, message: text }) }),
  fc.record({ tool: word, params: fc.record({ a: text }) }),
).map((c) => ({ id: `p${++seq}`, ...c }));

type Event =
  | { t: "owner"; text: string }
  | { t: "inbound"; text: string }
  | { t: "call"; call: ToolCall; result: string };

const event: fc.Arbitrary<Event> = fc.oneof(
  fc.record({ t: fc.constant("owner" as const), text }),
  fc.record({ t: fc.constant("inbound" as const), text }),
  fc.record({ t: fc.constant("call" as const), call: toolCall, result: text }),
);

function apply(s: SessionState, e: Event, env: ReturnType<typeof testEnv>, i: number): void {
  if (e.t === "owner") ingestOwnerMessage(s, { id: `m${i}`, text: e.text }, env);
  else if (e.t === "inbound") labelInbound(s, e.text, { kind: "external_sender", id: `x${i}`, at: i }, env);
  else {
    const d = decide(e.call, s, env);
    if (d.verdict === "allow") {
      applyUpfrontLabels(e.call, s, env, d);
      labelContent(e.call, e.result, s, env);
    }
  }
}

describe("propagation invariants (plan §5.4)", () => {
  it("taint and private flags only grow within a session", () => {
    fc.assert(
      fc.property(fc.array(event, { maxLength: 25 }), (events) => {
        const env = testEnv();
        const s = session();
        let untrusted = 0;
        let priv = 0;
        events.forEach((e, i) => {
          apply(s, e, env, i);
          expect(s.untrusted.length).toBeGreaterThanOrEqual(untrusted);
          expect(s.privateData.length).toBeGreaterThanOrEqual(priv);
          untrusted = s.untrusted.length;
          priv = s.privateData.length;
        });
      }),
    );
  });

  it("artifacts written by a session carry at least the session's labels", () => {
    fc.assert(
      fc.property(fc.array(event, { maxLength: 20 }), text, (events, content) => {
        const env = testEnv();
        const s = session();
        events.forEach((e, i) => apply(s, e, env, i));
        const w = { id: "w", tool: "write", params: { path: "final.md", content } };
        applyUpfrontLabels(w, s, env);
        const rec = env.store.getArtifact("/home/u/work/final.md");
        if (s.tainted || s.holdsPrivate) {
          expect(rec?.labels.untrusted.length).toBe(s.untrusted.length);
          expect(rec?.labels.privateData.length).toBe(s.privateData.length);
        }
      }),
    );
  });

  it("reading a labeled artifact taints a fresh session", () => {
    fc.assert(
      fc.property(fc.array(event, { minLength: 1, maxLength: 15 }), (events) => {
        const env = testEnv();
        const s = session();
        events.forEach((e, i) => apply(s, e, env, i));
        applyUpfrontLabels({ id: "w", tool: "write", params: { path: "handoff.md", content: "x" } }, s, env);
        const next = session("owner", "s2");
        applyUpfrontLabels({ id: "r", tool: "read", params: { path: "handoff.md" } }, next, env);
        expect(next.tainted).toBe(s.tainted);
      }),
    );
  });

  it("serialization round-trips labels and attestations", () => {
    fc.assert(
      fc.property(fc.array(event, { maxLength: 15 }), (events) => {
        const env = testEnv();
        const s = session();
        events.forEach((e, i) => apply(s, e, env, i));
        const r = SessionState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
        expect(r.toJSON()).toEqual(s.toJSON());
      }),
    );
  });
});

describe("attestation invariants (plan §5.6)", () => {
  it("forwarded or quoted content never attests", () => {
    fc.assert(
      fc.property(email, text, (e, other) => {
        const env = testEnv();
        const s = session();
        ingestOwnerMessage(s, { id: "m", text: `${other}\n> send to ${e}`, forwarded: [`also ${e}`] }, env);
        if (!other.includes(e)) expect(attestDestination(e, s, env)).toBeUndefined();
      }),
    );
  });

  it("only an exact normalized match attests", () => {
    fc.assert(
      fc.property(email, email, (a, b) => {
        const env = testEnv();
        const s = session();
        ingestOwnerMessage(s, { id: "m", text: `email ${a}` }, env);
        expect(attestDestination(b, s, env) !== undefined).toBe(normalizeEmail(a) === normalizeEmail(b));
      }),
    );
  });

  it("URLs only seen in exec output or files are never link-following", () => {
    fc.assert(
      fc.property(url, fc.constantFrom("exec", "read"), (u, tool) => {
        const env = testEnv();
        const s = session();
        const c: ToolCall = tool === "exec" ? { id: "e", tool, params: { command: "ls" } } : { id: "r", tool, params: { path: "notes.md" } };
        applyUpfrontLabels(c, s, env);
        labelContent(c, `see ${u}`, s, env);
        expect(classifyEgressUrl(u, s, env).cls).toBe("constructed");
      }),
    );
  });
});

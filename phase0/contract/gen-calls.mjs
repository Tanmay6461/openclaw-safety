#!/usr/bin/env node
// Builds the contract sweep from a dump run's mock log. No dependencies.
// Usage: node gen-calls.mjs <mock.jsonl> <outDir> <workspaceDir>
// Writes <outDir>/schemas.json (every tool: id, direct or hidden, JSON schema) and <outDir>/calls.json
// (one call per tool, and per value of its `action` enum, with every parameter filled with a
// schema-valid sample). Hidden tools are called through `tool_call {id, args}`.
import { readFileSync, writeFileSync } from "node:fs";

const [mockLog, outDir, ws] = process.argv.slice(2);
if (!mockLog || !outDir || !ws) {
  console.error("usage: gen-calls.mjs <mock.jsonl> <outDir> <workspaceDir>");
  process.exit(2);
}
// Never swept: the meta tools front the compact surface; the sentinel lets them run.
const SKIP = new Set(["tool_call", "tool_search", "tool_describe"]);

const recs = readFileSync(mockLog, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

/** Finds the first object that looks like a tool description inside a parsed tool_describe result. */
function findTool(v, depth = 0) {
  if (!v || typeof v !== "object" || depth > 6) return null;
  const schema = v.inputSchema ?? v.input_schema ?? v.parameters ?? v.schema ?? v.argsSchema;
  if (typeof v.name === "string" && schema && typeof schema === "object") return { name: v.name, id: v.id, schema };
  for (const x of Array.isArray(v) ? v : Object.values(v)) {
    const r = findTool(x, depth + 1);
    if (r) return r;
  }
  return null;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const i = text.indexOf("{");
    try {
      return i >= 0 ? JSON.parse(text.slice(i)) : null;
    } catch {
      return null;
    }
  }
}

const tools = {};
for (const r of recs) {
  if (r.kind === "directTools") {
    for (const t of r.tools) if (t?.name) tools[t.name] = { name: t.name, id: t.name, direct: true, schema: t.parameters ?? {} };
  }
}
const unparsed = [];
for (const r of recs) {
  if (r.kind !== "toolResult" || r.name !== "tool_describe") continue;
  const parsed = parseJson(r.text);
  const t = parsed ? findTool(parsed) : null;
  let askedId = "";
  try {
    askedId = JSON.parse(r.args ?? "{}").id ?? "";
  } catch {
    // ignore
  }
  if (!t) {
    unparsed.push({ askedId, text: r.text.slice(0, 300) });
    continue;
  }
  const id = t.id ?? parsed?.tool?.id ?? askedId;
  if (!tools[t.name]) tools[t.name] = { name: t.name, id, direct: false, schema: t.schema };
  else if (!tools[t.name].direct) tools[t.name].id ??= id;
}

const ACTION_KEYS = ["action"];

function sampleString(name, s) {
  const n = name.toLowerCase();
  if (s.format === "uri" || s.format === "url") return "https://contract.example/pg-sample";
  if (s.format === "email") return "contract-recipient@example.com";
  if (s.format === "date-time") return "2026-10-29T09:00:00Z";
  if (s.format === "date") return "2026-10-29";
  if (/json$/.test(n)) return "{}";
  if (/(^|_)(url|uri|href|link|endpoint|webhook)s?$|url$|uri$/.test(n)) return "https://contract.example/pg-sample";
  if (/(dir|cwd|folder|directory)$/.test(n)) return `${ws}/contract`;
  if (/(path|file)s?$|^outpath$/.test(n)) return `${ws}/contract/sample.txt`;
  if (/^(command|cmd|script|code|shell)$/.test(n)) return "echo pg-contract";
  if (/emoji|reaction/.test(n)) return "🙂";
  if (/sessionkey/.test(n)) return "agent:main:pg-contract-target";
  if (/^(to|target|targets|recipient|recipients|email|address)$/.test(n)) return "contract-recipient@example.com";
  if (/(^|[a-z])id$/i.test(name) || /ids?$/.test(n)) return "pg-sample-id";
  if (/(time|date|at|when)$/.test(n)) return "2026-10-29T09:00:00Z";
  return "pg-sample";
}

function sample(name, s, depth = 0) {
  if (!s || typeof s !== "object") return "pg-sample";
  if ("const" in s) return s.const;
  if (Array.isArray(s.enum) && s.enum.length > 0) return s.enum.find((e) => e !== null) ?? s.enum[0];
  const branch = s.anyOf ?? s.oneOf;
  if (Array.isArray(branch)) {
    const pick = branch.find((b) => b && b.type !== "null") ?? branch[0];
    return sample(name, pick, depth);
  }
  if (Array.isArray(s.allOf)) return sample(name, Object.assign({}, ...s.allOf), depth);
  let type = s.type;
  if (Array.isArray(type)) type = type.find((t) => t !== "null") ?? type[0];
  if (!type) type = s.properties ? "object" : s.items ? "array" : "string";
  switch (type) {
    case "string":
      return sampleString(name, s);
    case "integer":
    case "number": {
      let v = typeof s.minimum === "number" ? s.minimum : typeof s.exclusiveMinimum === "number" ? s.exclusiveMinimum + 1 : 1;
      if (typeof s.maximum === "number" && v > s.maximum) v = s.maximum;
      return type === "integer" ? Math.ceil(v) : v;
    }
    case "boolean":
      return false;
    case "array": {
      if (depth > 5) return [];
      const n = Math.max(1, s.minItems ?? 1);
      return Array.from({ length: n }, () => sample(name.replace(/s$/, ""), s.items ?? {}, depth + 1));
    }
    case "object": {
      if (depth > 5) return {};
      const props = s.properties ?? {};
      if (Object.keys(props).length === 0) return s.additionalProperties === false ? {} : { pgKey: "pg-sample" };
      return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, sample(k, v, depth + 1)]));
    }
    case "null":
      return null;
    default:
      return "pg-sample";
  }
}

/** Leaf parameter paths, in registry syntax: dots for nesting, `[]` for arrays. */
function leafPaths(s, prefix = "", depth = 0, out = new Set()) {
  if (!s || typeof s !== "object" || depth > 6) {
    if (prefix) out.add(prefix);
    return out;
  }
  const branch = s.anyOf ?? s.oneOf;
  if (Array.isArray(branch)) {
    const nonNull = branch.filter((b) => b && b.type !== "null");
    if (nonNull.length === 0 && prefix) out.add(prefix);
    for (const b of nonNull) leafPaths(b, prefix, depth + 1, out);
    return out;
  }
  if (Array.isArray(s.allOf)) return leafPaths(Object.assign({}, ...s.allOf), prefix, depth, out);
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type;
  if ((type === "object" || s.properties) && s.properties && Object.keys(s.properties).length > 0) {
    for (const [k, v] of Object.entries(s.properties)) leafPaths(v, prefix ? `${prefix}.${k}` : k, depth + 1, out);
    return out;
  }
  if ((type === "array" || s.items) && s.items) return leafPaths(s.items, `${prefix}[]`, depth + 1, out);
  if (prefix) out.add(prefix);
  return out;
}

const calls = [];
const manifest = {};
for (const t of Object.values(tools).sort((a, b) => a.name.localeCompare(b.name))) {
  const props = t.schema?.properties ?? {};
  const actionKey = ACTION_KEYS.find((k) => props[k] && (Array.isArray(props[k].enum) || props[k].anyOf || props[k].oneOf));
  let actions = [null];
  if (actionKey) {
    const p = props[actionKey];
    const vals = p.enum ?? (p.anyOf ?? p.oneOf ?? []).flatMap((b) => b.enum ?? ("const" in b ? [b.const] : []));
    if (vals.length > 0) actions = vals;
  }
  manifest[t.name] = { id: t.id, direct: t.direct, actionKey: actionKey ?? null, actions: actions.filter((a) => a !== null), leafPaths: [...leafPaths(t.schema)].sort() };
  if (SKIP.has(t.name)) continue;
  for (const action of actions) {
    const args = sample("", { type: "object", ...t.schema }, 0);
    if (actionKey && action !== null) args[actionKey] = action;
    const label = action === null ? t.name : `${t.name}:${action}`;
    calls.push(t.direct ? { label, tool: t.name, action, name: t.name, arguments: args } : { label, tool: t.name, action, name: "tool_call", arguments: { id: t.id ?? t.name, args } });
  }
}

writeFileSync(`${outDir}/schemas.json`, JSON.stringify({ tools, manifest, unparsed }, null, 2));
writeFileSync(`${outDir}/calls.json`, JSON.stringify(calls, null, 2));
console.log(`gen-calls: ${Object.keys(tools).length} tool(s) (${Object.values(tools).filter((t) => t.direct).length} direct), ${calls.length} call(s), ${unparsed.length} unparsed describe result(s)`);

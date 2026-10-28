import { validateToolSpec, type ToolSpec } from "@provenance-guard/core";
import bundled from "./openclaw-tools.json" with { type: "json" };

/** Extra params the adapter computes before the engine sees a call (prepare.ts). */
export type Derivation = "apply_patch_paths" | "personal_instructions_path";

/** A registry entry: a core ToolSpec without its name, plus adapter-only fields. */
export interface OpenClawToolEntry extends Omit<ToolSpec, "name"> {
  derive?: Derivation[];
  /** Codex-native tools: OpenClaw can block them but rejects param rewrites (docs-findings Q2). */
  blockOnly?: boolean;
  /**
   * Compact-surface wrapper (`tool_call {id, args}`). OpenClaw runs before_tool_call again for the
   * inner tool, so the wrapper itself is read-only; see unwrapMetaCall (phase0 run 20261028-134546).
   */
  metaWrapper?: boolean;
}

export interface RegistryData {
  openclawVersion: string;
  source?: string;
  aliases: Record<string, string>;
  tools: Record<string, OpenClawToolEntry>;
}

export interface OpenClawRegistry {
  readonly openclawVersion: string;
  /** Canonical registry name for a tool name as the hook sees it (aliases resolved). */
  canonical(name: string): string;
  /** Core spec for the engine, or undefined for unknown tools (the engine infers one). */
  lookup(name: string): ToolSpec | undefined;
  entry(name: string): OpenClawToolEntry | undefined;
  names(): string[];
}

const DERIVATIONS: ReadonlySet<string> = new Set<Derivation>(["apply_patch_paths", "personal_instructions_path"]);

export function validateRegistry(data: unknown): string[] {
  const errs: string[] = [];
  if (data === null || typeof data !== "object") return ["registry: must be an object"];
  const d = data as Partial<RegistryData>;
  if (typeof d.openclawVersion !== "string") errs.push("openclawVersion: required");
  const tools = d.tools ?? {};
  for (const [name, entry] of Object.entries(tools)) {
    const { derive, blockOnly, metaWrapper, ...spec } = entry;
    errs.push(...validateToolSpec(name, spec));
    if (derive !== undefined && (!Array.isArray(derive) || derive.some((x) => !DERIVATIONS.has(x)))) {
      errs.push(`${name}.derive: invalid`);
    }
    if (blockOnly !== undefined && typeof blockOnly !== "boolean") errs.push(`${name}.blockOnly: must be boolean`);
    if (metaWrapper !== undefined && typeof metaWrapper !== "boolean") errs.push(`${name}.metaWrapper: must be boolean`);
  }
  for (const [alias, target] of Object.entries(d.aliases ?? {})) {
    if (!(target in tools)) errs.push(`aliases.${alias}: unknown tool ${JSON.stringify(target)}`);
    if (alias in tools) errs.push(`aliases.${alias}: shadows a tool`);
  }
  return errs;
}

/** Loads and validates registry data. Throws on invalid data so a bad override never half-applies. */
export function loadRegistry(data: unknown = bundled): OpenClawRegistry {
  const errs = validateRegistry(data);
  if (errs.length > 0) throw new Error(`invalid OpenClaw tool registry:\n  ${errs.join("\n  ")}`);
  const d = data as RegistryData;
  const canonical = (name: string) => d.aliases[name] ?? name;
  const entry = (name: string) => d.tools[canonical(name)];
  return {
    openclawVersion: d.openclawVersion,
    canonical,
    entry,
    lookup(name) {
      const e = entry(name);
      if (!e) return undefined;
      const { derive: _d, blockOnly: _b, metaWrapper: _m, ...spec } = e;
      return { name: canonical(name), ...spec };
    },
    names: () => Object.keys(d.tools),
  };
}

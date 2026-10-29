import { pathContext, type GuardEnv } from "../env.js";
import type { Attestation, AttestKind, SessionState } from "../session.js";
import { harvestOwnerText, splitOwnerText, type SplitOptions } from "./harvest.js";
import {
  normalizeEmail,
  normalizeHandle,
  normalizeLoose,
  normalizePath,
  normalizePhone,
  normalizeUrl,
} from "./normalize.js";
import { argvKey, parseSimpleCommand } from "./shell.js";

export interface OwnerMessage {
  /** Message id, used as the attestation ref. */
  id: string;
  text: string;
  /** Content the channel marked as forwarded, quoted, or attached (including OCR'd text). */
  forwarded?: string[];
}

export interface IngestResult {
  attested: number;
  /** Pasted or forwarded parts that were labeled `owner_forwarded` and not harvested. */
  untrustedParts: number;
}

/**
 * Harvest attested values from the part of an owner message the owner typed (§5.6). Pasted and
 * forwarded parts taint the session as `owner_forwarded` and never attest anything.
 * Call only when the host confirmed the sender is the owner (`senderIsOwner`).
 */
export function ingestOwnerMessage(
  session: SessionState,
  msg: OwnerMessage,
  env: GuardEnv,
  opts: SplitOptions = {},
): IngestResult {
  const at = env.now();
  const { typed, pasted } = splitOwnerText(msg.text, opts);
  const untrustedParts = pasted.length + (msg.forwarded?.filter((f) => f.trim() !== "").length ?? 0);
  if (untrustedParts > 0) session.addUntrusted({ kind: "owner_forwarded", id: msg.id, at });

  const att: Attestation = { origin: "owner", ref: msg.id, at };
  let n = 0;
  const add = (kind: AttestKind, value: string | null) => {
    if (value === null) return;
    const before = session.attested.size;
    session.attested.add(kind, value, att);
    n += session.attested.size - before;
  };

  const h = harvestOwnerText(typed);
  for (const u of h.urls) add("url", normalizeUrl(u));
  for (const d of h.domains) {
    // A bare domain attests its root URL only, never everything under it.
    add("url", normalizeUrl(`https://${d}/`));
    add("url", normalizeUrl(`http://${d}/`));
  }
  const emailOpts = env.stripPlusTag !== undefined ? { stripPlusTag: env.stripPlusTag } : {};
  for (const e of h.emails) add("email", normalizeEmail(e, emailOpts));
  const phoneOpts = env.defaultCallingCode ? { defaultCallingCode: env.defaultCallingCode } : {};
  for (const p of h.phones) add("phone", normalizePhone(p, phoneOpts));
  for (const hd of h.handles) add("handle", normalizeHandle(hd));
  // A typed channel target matches a destination's "string" form exactly (destinationForms).
  for (const t of h.targets) add("string", normalizeLoose(t));
  for (const p of h.paths) add("path", normalizePath(p, pathContext(env)));
  for (const c of h.codeSpans) {
    add("command", c.trim());
    const parsed = parseSimpleCommand(c);
    if (parsed.simple) add("command", argvKey(parsed.argv));
    add("string", normalizeLoose(c));
  }
  for (const q of h.quoted) add("string", normalizeLoose(q));

  return { attested: n, untrustedParts };
}

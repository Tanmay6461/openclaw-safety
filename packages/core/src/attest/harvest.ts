import { parse as parseDomain } from "tldts";

export interface SplitOptions {
  /** Paragraphs longer than this are treated as pasted (default 600 chars). */
  maxTypedParagraph?: number;
  /** Fenced blocks with more lines than this are treated as pasted (default 3). */
  maxTypedFenceLines?: number;
}

export interface SplitText {
  typed: string;
  pasted: string[];
}

const FORWARD_MARKERS = [
  /^-{2,}\s*forwarded message\s*-{2,}$/i,
  /^-{2,}\s*original message\s*-{2,}$/i,
  /^begin forwarded message:?$/i,
  /^on .{3,200} wrote:$/i,
];

/**
 * Separates what the owner typed from what they pasted or forwarded inside the same message:
 * everything after a forward marker, `>` quote blocks, long fenced blocks, and long paragraphs.
 * Channel forward/attachment metadata is handled by the adapter; this is the text-only fallback.
 * Misclassifying typed text as pasted only means fewer attested values (more asks), never less safety.
 */
export function splitOwnerText(text: string, opts: SplitOptions = {}): SplitText {
  const maxPara = opts.maxTypedParagraph ?? 600;
  const maxFence = opts.maxTypedFenceLines ?? 3;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const typedLines: string[] = [];
  const pasted: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i]!.trim();
    if (FORWARD_MARKERS.some((r) => r.test(trimmed))) {
      pasted.push(lines.slice(i).join("\n"));
      break;
    }
    if (trimmed.startsWith("```")) {
      let j = i + 1;
      while (j < lines.length && !lines[j]!.trim().startsWith("```")) j++;
      const block = lines.slice(i, Math.min(j + 1, lines.length));
      if (j >= lines.length || j - i - 1 > maxFence) pasted.push(block.join("\n"));
      else typedLines.push(...block);
      i = j + 1;
      continue;
    }
    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) quote.push(lines[i++]!);
      pasted.push(quote.join("\n"));
      continue;
    }
    typedLines.push(lines[i]!);
    i++;
  }
  const typedParas: string[] = [];
  for (const para of typedLines.join("\n").split(/\n\s*\n/)) {
    if (para.length > maxPara) pasted.push(para);
    else typedParas.push(para);
  }
  return { typed: typedParas.join("\n\n").trim(), pasted: pasted.filter((p) => p.trim() !== "") };
}

/** Raw candidate values found in owner-typed text. Normalization happens in ingest. */
export interface Harvest {
  urls: string[];
  /** Bare domains; each attests only its root URL. */
  domains: string[];
  emails: string[];
  phones: string[];
  handles: string[];
  paths: string[];
  codeSpans: string[];
  quoted: string[];
}

// Backslash ends a URL: OpenClaw wraps some tool results (compact-surface `tool_call`) as JSON, where
// a newline after a link arrives as the two characters `\n` (phase0 guard smoke test).
export const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`\\]+/gi;
const TRAILING_PUNCT = /[.,;:!?'"\]}>]+$/;

/** Strips trailing punctuation, keeping a closing paren only when it's balanced. */
export function trimUrl(raw: string): string {
  let s = raw.replace(TRAILING_PUNCT, "");
  while (s.endsWith(")") && count(s, "(") < count(s, ")")) {
    s = s.slice(0, -1).replace(TRAILING_PUNCT, "");
  }
  return s;
}

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_PATTERN)].map((m) => trimUrl(m[0]));
}

const WRAPPING = /^[("'`\[<]+|[)"'`\]>.,;:!?]+$/g;

export function harvestOwnerText(text: string): Harvest {
  const codeSpans = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]!.trim());
  for (const m of text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    for (const line of m[1]!.split("\n")) codeSpans.push(line.trim());
  }

  const urls = extractUrls(text);
  const noUrls = text.replace(URL_PATTERN, " ");

  const emails = [...noUrls.matchAll(/[^\s<>()"'`,;:]+@[^\s<>()"'`,;:]+\.[A-Za-z]{2,}/g)].map((m) =>
    m[0].replace(TRAILING_PUNCT, ""),
  );
  const noEmails = emails.reduce((t, e) => t.split(e).join(" "), noUrls);

  const handles = [...noEmails.matchAll(/(?<![\w.@])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,62}[A-Za-z0-9_])?/g)].map(
    (m) => m[0],
  );
  const phones = [...noEmails.matchAll(/(?<![\w+])(?:\+|00)[1-9](?:[\s().-]?\d){6,14}(?!\d)/g)].map((m) => m[0]);

  const paths: string[] = [];
  const domains: string[] = [];
  for (const token of noEmails.split(/\s+/)) {
    const t = token.replace(WRAPPING, "");
    if (t === "") continue;
    if (/^(?:~\/\S+|\.\.?\/\S+|\/(?!\/)\S+)$/.test(t)) {
      paths.push(t);
    } else if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(t)) {
      const d = parseDomain(t);
      if (d.isIcann && d.domain) domains.push(t.toLowerCase());
    }
  }

  const quoted = [
    ...[...text.matchAll(/"([^"\n]{1,200})"/g)].map((m) => m[1]!),
    ...[...text.matchAll(/“([^”\n]{1,200})”/g)].map((m) => m[1]!),
  ];

  return {
    urls,
    domains,
    emails,
    phones,
    handles,
    paths,
    codeSpans: codeSpans.filter((c) => c !== ""),
    quoted,
  };
}

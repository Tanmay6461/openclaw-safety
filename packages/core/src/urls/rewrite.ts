import { URL_PATTERN, trimUrl } from "../attest/harvest.js";

/** `https://evil.com/x` → `hxxps://evil[.]com/x`: readable, but not clickable or previewable. */
export function defangUrl(url: string): string {
  const m = /^(https?):\/\/([^/?#]*)(.*)$/is.exec(url);
  if (!m) return url.replace(/\./g, "[.]");
  const scheme = m[1]!.toLowerCase() === "https" ? "hxxps" : "hxxp";
  return `${scheme}://${m[2]!.replace(/\./g, "[.]")}${m[3]}`;
}

export interface RewriteResult {
  text: string;
  defanged: string[];
  strippedImages: number;
}

const MD_IMAGE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const HTML_IMAGE = /<img\b[^>]*\bsrc\s*=\s*["']?([^"'\s>]+)["']?[^>]*>/gi;

/**
 * Outbound rewrite (§5.10): strip images that point at constructed URLs (clients may load them
 * automatically) and defang constructed URLs. Attested and link-following URLs are untouched.
 * `defang: false` only strips images.
 */
export function rewriteOutbound(text: string, isConstructed: (url: string) => boolean, opts: { defang?: boolean } = {}): RewriteResult {
  let strippedImages = 0;
  let out = text.replace(MD_IMAGE, (whole, alt: string, src: string) => {
    if (!isConstructed(src)) return whole;
    strippedImages++;
    return alt ? `[image removed: ${alt}]` : "[image removed]";
  });
  out = out.replace(HTML_IMAGE, (whole, src: string) => {
    if (!isConstructed(src)) return whole;
    strippedImages++;
    return "[image removed]";
  });
  const defanged: string[] = [];
  if (opts.defang === false) return { text: out, defanged, strippedImages };
  out = out.replace(URL_PATTERN, (match: string) => {
    const url = trimUrl(match);
    if (!isConstructed(url)) return match;
    defanged.push(url);
    return defangUrl(url) + match.slice(url.length);
  });
  return { text: out, defanged, strippedImages };
}

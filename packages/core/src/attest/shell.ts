/**
 * Strict tokenizer for "simple" shell commands: words, single quotes, and double quotes with no
 * expansion inside. Anything else (operators, redirects, substitution, globs, variables, tilde,
 * comments, escapes, leading env assignments) makes the command non-simple. Non-simple commands
 * never match a prefix rule (plan §5.6), so this only has to be right about what it accepts.
 */
export type ParsedCommand = { simple: true; argv: string[] } | { simple: false; reason: string };

const SAFE_UNQUOTED = /[A-Za-z0-9_\-./:=@%+,]/;
const UNSAFE_IN_DOUBLE_QUOTES = new Set(["$", "`", "\\", "!"]);

export function parseSimpleCommand(input: string): ParsedCommand {
  // Trim only spaces and tabs: any newline makes the command non-simple.
  const s = input.replace(/^[ \t]+|[ \t]+$/g, "");
  const argv: string[] = [];
  let cur = "";
  let inWord = false;
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === " " || ch === "\t") {
      if (inWord) argv.push(cur);
      cur = "";
      inWord = false;
      i++;
    } else if (ch === "'") {
      const end = s.indexOf("'", i + 1);
      if (end === -1) return { simple: false, reason: "unterminated single quote" };
      cur += s.slice(i + 1, end);
      inWord = true;
      i = end + 1;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') {
        if (UNSAFE_IN_DOUBLE_QUOTES.has(s[j]!)) {
          return { simple: false, reason: `"${s[j]}" inside double quotes` };
        }
        j++;
      }
      if (j >= s.length) return { simple: false, reason: "unterminated double quote" };
      cur += s.slice(i + 1, j);
      inWord = true;
      i = j + 1;
    } else if (SAFE_UNQUOTED.test(ch)) {
      cur += ch;
      inWord = true;
      i++;
    } else {
      return { simple: false, reason: `shell syntax ${JSON.stringify(ch)}` };
    }
  }
  if (inWord) argv.push(cur);
  if (argv.length === 0) return { simple: false, reason: "empty command" };
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0]!)) {
    return { simple: false, reason: "leading environment assignment" };
  }
  return { simple: true, argv };
}

export function argvHasPrefix(argv: readonly string[], prefix: readonly string[]): boolean {
  return prefix.length > 0 && prefix.length <= argv.length && prefix.every((p, i) => argv[i] === p);
}

/** Key used to store and look up attested simple commands. */
export function argvKey(argv: readonly string[]): string {
  return `argv:${JSON.stringify(argv)}`;
}

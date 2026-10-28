import path from "node:path";
import { argvHasPrefix, parseSimpleCommand, type ParsedCommand } from "../attest/shell.js";

export interface ExecInfo {
  raw: string;
  parsed: ParsedCommand;
  /** Simple command on the read-only list; its output isn't labeled when the command is attested. */
  readOnly: boolean;
  /** Why the command counts as sensitive in autonomous runs (§5.7), or null. */
  sensitive: string | null;
  /** Schedules future work (crontab, at, systemd-run, launchctl). */
  scheduling: boolean;
  /** Invokes the openclaw CLI in a way that can change config, plugins, or skills (§5.12). */
  guardCli: boolean;
  /**
   * Invokes the openclaw CLI at all, other than --version or help. The CLI reads the Gateway token
   * itself, so it can resolve the agent's own approvals (channel results c4g).
   */
  openclawCli: boolean;
  /** Files the command is known to create (git clone, curl -o, wget). */
  downloadTargets: string[];
  /** Arguments that look like file paths, or that a file-reading command will read. */
  pathArgs: string[];
}

// Outputs here are not derived from untrusted file content.
const READ_ONLY: readonly (readonly string[])[] = [
  ["pwd"],
  ["date"],
  ["whoami"],
  ["id"],
  ["uname"],
  ["hostname"],
  ["ls"],
  ["git", "status"],
  ["git", "branch"],
  ["df"],
  ["du"],
  ["which"],
];

const W = "(?:^|[^\\w-])"; // word start that also excludes hyphenated names like "my-ssh"
const E = "(?=\\s|$|[;|&)])";
const SENSITIVE: readonly [RegExp, string][] = [
  [new RegExp(`${W}(?:ssh|scp|sftp|rsync)${E}`), "remote shell or copy"],
  [/(?:curl|wget)\b[^|;&]*\|\s*(?:sudo\s+)?(?:ba|z|da|k|fi)?sh\b/, "piping a download into a shell"],
  [new RegExp(`${W}rm\\s+(?:-\\S+\\s+)*-[a-zA-Z]*[rRf]`), "recursive or forced delete"],
  [new RegExp(`${W}sudo${E}`), "sudo"],
  [new RegExp(`${W}(?:npm|pnpm|yarn|bun)\\s+(?:i|install|add|exec|dlx|x)${E}`), "package install"],
  [new RegExp(`${W}(?:npx|bunx|pipx|uvx)${E}`), "running a downloaded package"],
  [new RegExp(`${W}(?:pip3?|uv\\s+pip)\\s+install${E}`), "package install"],
  [new RegExp(`${W}(?:brew|cargo|go|gem)\\s+install${E}`), "package install"],
  [new RegExp(`${W}(?:apt|apt-get|yum|dnf|zypper|apk)\\s+(?:install|add)${E}`), "package install"],
  [new RegExp(`${W}git\\s+push${E}`), "git push"],
  [new RegExp(`${W}(?:nc|ncat|netcat|socat|telnet)${E}`), "raw network connection"],
  [new RegExp(`${W}(?:mkfs(?:\\.\\w+)?|dd)\\s`), "raw disk write"],
  [new RegExp(`${W}eval${E}`), "eval"],
  [/base64\s+(?:-d|--decode|-D)\b[^|]*\|/, "decoding into another command"],
];

const SCHEDULING: readonly RegExp[] = [
  new RegExp(`${W}(?:crontab|systemd-run|schtasks)${E}`),
  /(?:^|[;&|(]\s*)(?:at|batch)\s/,
  new RegExp(`${W}launchctl\\s+(?:load|bootstrap|submit|enable)${E}`),
];

const OPENCLAW = /(?:^|[^\w.-])openclaw(?:\.mjs)?(?=\s|$|["'`;|&)])/;
const OPENCLAW_HARMLESS: readonly (readonly string[])[] = [["--version"], ["-V"], ["help"], ["--help"], ["status"]];
const OPENCLAW_INERT: readonly (readonly string[])[] = [["--version"], ["-V"], ["help"], ["--help"]];

const FILE_READERS = new Set([
  "cat", "head", "tail", "less", "more", "bat", "strings", "xxd", "od", "sort", "uniq", "wc",
  "grep", "rg", "awk", "sed", "jq", "yq", "diff", "cut", "tac", "nl",
]);

export function classifyExec(command: string): ExecInfo {
  const raw = command;
  const parsed = parseSimpleCommand(command);
  const argv = parsed.simple ? parsed.argv : null;
  const cmd = argv ? path.basename(argv[0]!) : null;

  const readOnly = argv !== null && READ_ONLY.some((p) => argvHasPrefix([cmd!, ...argv.slice(1)], p));
  const sensitive = SENSITIVE.find(([re]) => re.test(raw))?.[1] ?? null;
  const scheduling = SCHEDULING.some((re) => re.test(raw));

  let guardCli = OPENCLAW.test(raw);
  let openclawCli = guardCli;
  if (guardCli && argv && cmd === "openclaw") {
    const rest = argv.slice(1);
    const only = (list: readonly (readonly string[])[]) => list.some((p) => rest.length === p.length && argvHasPrefix(rest, p));
    if (only(OPENCLAW_HARMLESS)) guardCli = false;
    if (only(OPENCLAW_INERT)) openclawCli = false;
  }

  return {
    raw,
    parsed,
    readOnly,
    sensitive,
    scheduling,
    guardCli,
    openclawCli,
    downloadTargets: argv ? downloadTargets(argv) : [],
    pathArgs: pathArgs(raw, argv),
  };
}

const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;

function looksLikePath(t: string): boolean {
  return /^(?:~\/|\$HOME\/|\.\.?\/|\/(?!\/))\S*$/.test(t) && t.length > 1;
}

function pathArgs(raw: string, argv: string[] | null): string[] {
  if (argv) {
    const reader = FILE_READERS.has(path.basename(argv[0]!));
    return argv.slice(1).filter((a) => !URL_LIKE.test(a) && (looksLikePath(a) || (reader && !a.startsWith("-"))));
  }
  // Non-simple: best-effort scan of path-looking tokens.
  return raw
    .split(/[\s;|&()<>'"`=]+/)
    .filter((t) => t !== "" && !URL_LIKE.test(t) && looksLikePath(t));
}

const GIT_CLONE_VALUE_FLAGS = new Set([
  "-b", "--branch", "--depth", "-o", "--origin", "-c", "--config", "--reference",
  "--separate-git-dir", "--filter", "-j", "--jobs", "--template", "-u", "--upload-pack",
]);

function urlBasename(u: string): string | undefined {
  try {
    const name = path.posix.basename(new URL(u).pathname);
    return name === "" ? undefined : name;
  } catch {
    return undefined;
  }
}

function downloadTargets(argv: string[]): string[] {
  const cmd = path.basename(argv[0]!);
  const args = argv.slice(1);
  if (cmd === "git" && args[0] === "clone") {
    const positional: string[] = [];
    for (let i = 1; i < args.length; i++) {
      const a = args[i]!;
      if (GIT_CLONE_VALUE_FLAGS.has(a)) i++;
      else if (!a.startsWith("-")) positional.push(a);
    }
    const [repo, dir] = positional;
    if (dir) return [dir];
    const base = repo ? path.posix.basename(repo.replace(/\/+$/, "")).replace(/\.git$/, "") : "";
    return base ? [base] : [];
  }
  const urls = args.filter((a) => URL_LIKE.test(a));
  if (cmd === "curl") {
    const out: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i]!;
      if ((a === "-o" || a === "--output") && args[i + 1]) out.push(args[++i]!);
      else if (a.startsWith("--output=")) out.push(a.slice(9));
      else if (a === "-O" || a === "--remote-name") {
        for (const u of urls) {
          const b = urlBasename(u);
          if (b) out.push(b);
        }
      }
    }
    return out;
  }
  if (cmd === "wget") {
    let prefix = "";
    const out: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i]!;
      if ((a === "-O" || a === "--output-document") && args[i + 1]) out.push(args[++i]!);
      else if (a.startsWith("--output-document=")) out.push(a.slice(18));
      else if ((a === "-P" || a === "--directory-prefix") && args[i + 1]) prefix = args[++i]!;
      else if (a.startsWith("--directory-prefix=")) prefix = a.slice(19);
    }
    if (out.length > 0) return out;
    return urls.map((u) => path.join(prefix, urlBasename(u) ?? "index.html"));
  }
  return [];
}

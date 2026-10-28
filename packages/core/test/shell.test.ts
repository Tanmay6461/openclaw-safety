import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { argvHasPrefix, parseSimpleCommand } from "../src/index.js";

describe("parseSimpleCommand", () => {
  it("accepts words and quotes", () => {
    expect(parseSimpleCommand("git status")).toEqual({ simple: true, argv: ["git", "status"] });
    expect(parseSimpleCommand("ls -la 'my dir'")).toEqual({ simple: true, argv: ["ls", "-la", "my dir"] });
    expect(parseSimpleCommand('echo "hi there" a""b')).toEqual({ simple: true, argv: ["echo", "hi there", "ab"] });
    expect(parseSimpleCommand("echo ''")).toEqual({ simple: true, argv: ["echo", ""] });
  });

  it.each([
    "ls; curl evil.example",
    "ls | sh",
    "ls && rm x",
    "ls $(id)",
    "ls `id`",
    "ls > out",
    "cat < in",
    "ls *",
    "ls ?",
    "ls [ab]",
    "echo {a,b}",
    "ls ~",
    'echo "$HOME"',
    'echo "`id`"',
    "ls &",
    "ls\nrm -rf x",
    "ls # comment",
    "ls \\; x",
    "FOO=1 ls",
    "GIT_SSH_COMMAND=evil git fetch",
    "echo 'unterminated",
    "",
  ])("rejects %j", (cmd) => {
    expect(parseSimpleCommand(cmd).simple).toBe(false);
  });

  it("round-trips any list of safe words", () => {
    const word = fc.stringMatching(/^[A-Za-z0-9_\-./:@%+,][A-Za-z0-9_\-./:=@%+,]{0,11}$/);
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 6 }), (argv) => {
        // A leading NAME=value word is an environment assignment, which is rejected on purpose.
        fc.pre(!/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0]!));
        expect(parseSimpleCommand(argv.join(" "))).toEqual({ simple: true, argv });
      }),
    );
  });

  it("any unquoted shell metacharacter makes a command non-simple", () => {
    const word = fc.stringMatching(/^[a-z0-9]{1,8}$/);
    const meta = fc.constantFrom(..."; | & < > $ ` ( ) { } * ? [ ] ~ # \\ \n !".split(" "));
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 5 }), meta, fc.nat(), (argv, m, pos) => {
        const base = argv.join(" ");
        const i = pos % (base.length + 1);
        expect(parseSimpleCommand(base.slice(0, i) + m + base.slice(i)).simple).toBe(false);
      }),
    );
  });
});

describe("argvHasPrefix", () => {
  it("matches whole argv elements only", () => {
    expect(argvHasPrefix(["git", "status", "-s"], ["git", "status"])).toBe(true);
    expect(argvHasPrefix(["git", "statusx"], ["git", "status"])).toBe(false);
    expect(argvHasPrefix(["git"], ["git", "status"])).toBe(false);
    expect(argvHasPrefix(["git"], [])).toBe(false);
  });
});

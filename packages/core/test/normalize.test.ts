import { describe, expect, it } from "vitest";
import {
  hostMatches,
  normalizeEmail,
  normalizeHandle,
  normalizePath,
  normalizePhone,
  normalizeUrl,
  registrableDomain,
} from "../src/index.js";

describe("normalizeEmail", () => {
  it("lowercases, trims, strips mailto", () => {
    expect(normalizeEmail("  Bob@Example.COM ")).toBe("bob@example.com");
    expect(normalizeEmail("mailto:bob@example.com")).toBe("bob@example.com");
  });
  it("punycodes IDN domains", () => {
    expect(normalizeEmail("a@bücher.de")).toBe("a@xn--bcher-kva.de");
  });
  it("strips +tags only when configured", () => {
    expect(normalizeEmail("bob+news@example.com")).toBe("bob+news@example.com");
    expect(normalizeEmail("bob+news@example.com", { stripPlusTag: true })).toBe("bob@example.com");
  });
  it("rejects non-addresses", () => {
    for (const s of ["bob@", "@example.com", "bob@localhost", "bob..x@example.com", "not an email"]) {
      expect(normalizeEmail(s)).toBeNull();
    }
  });
});

describe("normalizePhone", () => {
  it("produces E.164", () => {
    expect(normalizePhone("+1 (555) 000-1111")).toBe("+15550001111");
    expect(normalizePhone("0044 20 7946 0958")).toBe("+442079460958");
  });
  it("needs a calling code for national numbers", () => {
    expect(normalizePhone("5550001111")).toBeNull();
    expect(normalizePhone("5550001111", { defaultCallingCode: "1" })).toBe("+15550001111");
  });
  it("rejects junk", () => {
    expect(normalizePhone("+12")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
  });
});

describe("normalizeHandle", () => {
  it("lowercases and adds @", () => {
    expect(normalizeHandle("@Alice_B")).toBe("@alice_b");
    expect(normalizeHandle("alice")).toBe("@alice");
    expect(normalizeHandle("@a b")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("canonicalizes scheme, host, port, dot segments, unreserved escapes", () => {
    expect(normalizeUrl("HTTPS://Example.COM:443/a/../b/%7Euser?x=%41%2F")).toBe("https://example.com/b/~user?x=A%2F");
  });
  it("strips a trailing host dot and punycodes IDNs", () => {
    expect(normalizeUrl("https://example.com./x")).toBe("https://example.com/x");
    expect(normalizeUrl("https://bücher.de/")).toBe("https://xn--bcher-kva.de/");
  });
  it("only accepts http(s)", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://example.com/")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("domains", () => {
  it("registrable domain respects public and private suffixes", () => {
    expect(registrableDomain("a.b.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("foo.vercel.app")).toBe("foo.vercel.app");
    expect(registrableDomain("1.2.3.4")).toBe("1.2.3.4");
  });
  it("hostMatches is a suffix match on label boundaries", () => {
    expect(hostMatches("docs.python.org", "python.org")).toBe(true);
    expect(hostMatches("python.org", "python.org")).toBe(true);
    expect(hostMatches("evilpython.org", "python.org")).toBe(false);
  });
});

describe("normalizePath", () => {
  const ctx = { home: "/home/u", cwd: "/home/u/work", resolveLinks: false };
  it("expands ~ and $HOME and resolves against cwd", () => {
    expect(normalizePath("~/x", ctx)).toBe("/home/u/x");
    expect(normalizePath("$HOME/x", ctx)).toBe("/home/u/x");
    expect(normalizePath("../y", ctx)).toBe("/home/u/y");
    expect(normalizePath("/etc/../etc/hosts", ctx)).toBe("/etc/hosts");
  });
});

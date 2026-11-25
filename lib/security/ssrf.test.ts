import { describe, expect, it } from "vitest";

import {
  isPrivateIp,
  parseOutboundUrl,
  resolvePublicAddresses,
  validateOutboundUrl,
  type DnsResolver,
} from "./ssrf";

describe("isPrivateIp", () => {
  it.each([
    ["10.0.0.1", true],
    ["172.16.5.4", true],
    ["192.168.1.1", true],
    ["127.0.0.1", true],
    ["169.254.10.20", true],
    ["100.64.0.1", true],
    ["0.0.0.0", true],
    ["::1", true],
    ["fe80::1", true],
    ["fc00::1", true],
    ["8.8.8.8", false],
    ["1.1.1.1", false],
    ["93.184.216.34", false],
  ])("%s -> %s", (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });
});

describe("parseOutboundUrl", () => {
  it("accepts plain http/https URLs", () => {
    expect(parseOutboundUrl("https://example.com/page").hostname).toBe(
      "example.com",
    );
    expect(parseOutboundUrl("http://example.com").protocol).toBe("http:");
  });

  it("rejects non-http protocols", () => {
    for (const u of ["ftp://example.com/x", "file:///etc/passwd", "gopher://x"]) {
      expect(() => parseOutboundUrl(u)).toThrow();
    }
  });

  it("rejects localhost and credentials", () => {
    expect(() => parseOutboundUrl("http://localhost:3000/x")).toThrow();
    expect(() => parseOutboundUrl("http://user:pass@example.com/")).toThrow();
    expect(() => parseOutboundUrl("not a url")).toThrow();
  });
});

describe("resolvePublicAddresses", () => {
  it("rejects hosts resolving only to private addresses", async () => {
    const resolve: DnsResolver = async () => ["10.0.0.5", "192.168.1.1"];
    await expect(resolvePublicAddresses("internal", resolve)).rejects.toThrow();
  });

  it("accepts hosts with at least one public address", async () => {
    const resolve: DnsResolver = async () => ["10.0.0.5", "93.184.216.34"];
    const addrs = await resolvePublicAddresses("example.com", resolve);
    expect(addrs).toEqual(["93.184.216.34"]);
  });

  it("rejects unresolvable hosts", async () => {
    const resolve: DnsResolver = async () => {
      throw new Error("ENOTFOUND");
    };
    await expect(resolvePublicAddresses("nope.invalid", resolve)).rejects.toThrow();
  });
});

describe("validateOutboundUrl", () => {
  it("validates structure and DNS together", async () => {
    const resolve: DnsResolver = async () => ["93.184.216.34"];
    const url = await validateOutboundUrl("https://example.com/", resolve);
    expect(url.hostname).toBe("example.com");
    await expect(
      validateOutboundUrl("ftp://example.com/", resolve),
    ).rejects.toThrow();
  });
});

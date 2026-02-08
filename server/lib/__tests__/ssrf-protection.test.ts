import { describe, it, expect } from "vitest";
import { isPrivateIp, validateWebhookUrl } from "../ssrf-protection";

describe("isPrivateIp", () => {
  it("should detect IPv4 loopback", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.0.0.2")).toBe(true);
  });

  it("should detect IPv4 private ranges", () => {
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("10.255.255.255")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("192.168.0.0")).toBe(true);
  });

  it("should detect link-local", () => {
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("169.254.0.1")).toBe(true);
  });

  it("should detect IPv6 loopback and link-local", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("::")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
  });

  it("should detect IPv4-mapped IPv6", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:192.168.1.1")).toBe(true);
  });

  it("should allow public IPs", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("142.250.80.46")).toBe(false);
    expect(isPrivateIp("172.15.0.1")).toBe(false); // just outside 172.16-31 range
    expect(isPrivateIp("172.32.0.1")).toBe(false);
  });
});

describe("validateWebhookUrl", () => {
  it("should reject http:// URLs", async () => {
    await expect(validateWebhookUrl("http://example.com")).rejects.toThrow("Only HTTPS");
  });

  it("should reject non-URL strings", async () => {
    await expect(validateWebhookUrl("not-a-url")).rejects.toThrow("Invalid URL");
  });

  it("should reject localhost", async () => {
    await expect(validateWebhookUrl("https://localhost/hook")).rejects.toThrow();
  });

  it("should reject loopback IP", async () => {
    await expect(validateWebhookUrl("https://127.0.0.1/hook")).rejects.toThrow();
  });

  it("should reject private IP 10.x", async () => {
    await expect(validateWebhookUrl("https://10.0.0.5/hook")).rejects.toThrow();
  });

  it("should reject link-local metadata endpoint", async () => {
    await expect(validateWebhookUrl("https://169.254.169.254/latest/meta-data")).rejects.toThrow();
  });

  it("should reject IPv6 loopback", async () => {
    await expect(validateWebhookUrl("https://[::1]/hook")).rejects.toThrow();
  });

  it("should accept valid external HTTPS domains", async () => {
    // This will do real DNS lookup - hooks.slack.com should resolve to public IPs
    const result = await validateWebhookUrl("https://hooks.slack.com/services/test");
    expect(result).toContain("hooks.slack.com");
    expect(result).toMatch(/^https:\/\//);
  });
});

import { describe, expect, it, vi } from "vitest";

import { resolvePackageVersions } from "./baselines";

describe("resolvePackageVersions", () => {
  it("resolves cva prerelease from the beta dist-tag only", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "0.0.0", beta: "1.0.0-beta.6" },
          }),
        ),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      { label: "prerelease", version: "1.0.0-beta.6" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://registry.npmjs.org/cva",
      expect.objectContaining({
        headers: { Accept: "application/vnd.npm.install-v1+json" },
      }),
    );
  });

  it("resolves class-variance-authority release from the latest dist-tag only", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "0.7.1", canary: "0.7.1-canary.2" },
          }),
        ),
    ) as unknown as typeof fetch;

    await expect(
      resolvePackageVersions("class-variance-authority", fetchImpl),
    ).resolves.toEqual([{ label: "release", version: "0.7.1" }]);
  });

  it("marks a missing dist-tag as skipped for the labels that package uses", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ "dist-tags": { latest: "0.7.1" } })),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "no beta dist-tag on npm",
      },
    ]);
  });

  it("skips placeholder versions even when the dist-tag exists", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ "dist-tags": { latest: "0.0.0" } })),
    ) as unknown as typeof fetch;

    await expect(
      resolvePackageVersions("class-variance-authority", fetchImpl),
    ).resolves.toEqual([
      {
        label: "release",
        version: "0.0.0",
        skipped: "latest dist-tag points at placeholder version 0.0.0",
      },
    ]);
  });

  it("returns skipped entries when the npm registry is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unavailable");
    }) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "failed to resolve npm dist-tags: network unavailable",
      },
    ]);
  });

  it("marks a non-ok registry response as skipped with the status", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("not found", { status: 404, statusText: "Not Found" }),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "npm registry returned 404 Not Found",
      },
    ]);
  });

  it("marks an unparseable registry body as skipped", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("this is not json"),
    ) as unknown as typeof fetch;

    const [resolved] = await resolvePackageVersions("cva", fetchImpl);
    expect(resolved.label).toBe("prerelease");
    expect(resolved.version).toBe("unknown");
    expect(resolved.skipped).toMatch(/failed to parse npm dist-tags:/);
  });
});

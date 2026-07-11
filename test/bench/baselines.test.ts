import { describe, expect, it, vi } from "vitest";

import { resolvePackageVersions } from "./baselines";

describe("resolvePackageVersions", () => {
  it("resolves stable and prerelease versions from this package's npm dist-tags", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "0.7.1", beta: "1.0.0-beta.6" },
          }),
        ),
    ) as unknown as typeof fetch;

    await expect(
      resolvePackageVersions("class-variance-authority", fetchImpl),
    ).resolves.toEqual([
      { label: "release", version: "0.7.1" },
      { label: "prerelease", version: "1.0.0-beta.6" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://registry.npmjs.org/class-variance-authority",
    );
  });

  it("marks only a missing dist-tag as skipped", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ "dist-tags": { latest: "0.7.1" } })),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      { label: "release", version: "0.7.1" },
      {
        label: "prerelease",
        version: "unknown",
        skipped: "no beta dist-tag on npm",
      },
    ]);
  });

  it("returns skipped entries when the npm registry is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unavailable");
    }) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "release",
        version: "unknown",
        skipped: "failed to resolve npm dist-tags: network unavailable",
      },
      {
        label: "prerelease",
        version: "unknown",
        skipped: "failed to resolve npm dist-tags: network unavailable",
      },
    ]);
  });
});

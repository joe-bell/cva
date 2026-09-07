import assert from "node:assert/strict";
import { cva } from "cva";
import { defineConfig } from "cva/config";
import { getSchema } from "cva/utils";

const badge = cva({ base: "badge", variants: { tone: { info: "info" } } });
assert.equal(badge({ tone: "info" }), "badge info");
assert.deepEqual(getSchema(badge), { tone: { values: ["info"] } });
assert.equal(
  defineConfig({ cx: (...values) => values.join(" ") }).cva({
    base: "configured",
  })(),
  "configured",
);

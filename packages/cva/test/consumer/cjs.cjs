const assert = require("node:assert/strict");
const { cva } = require("cva");
const { defineConfig } = require("cva/config");
const { getSchema } = require("cva/utils");

const badge = cva({ base: "badge", variants: { tone: { info: "info" } } });
assert.equal(badge({ tone: "info" }), "badge info");
assert.deepEqual(getSchema(badge), { tone: { values: ["info"] } });
assert.equal(
  defineConfig({ cx: (...values) => values.join(" ") }).cva({
    base: "configured",
  })(),
  "configured",
);

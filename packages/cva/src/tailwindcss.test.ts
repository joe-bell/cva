import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { compile as compileCurrent } from "tailwindcss";
import { compile as compileMinimum } from "tailwindcss-v4";

const css = readFileSync(resolve(__dirname, "tailwindcss.css"), "utf8");
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8"),
);
const require = createRequire(__filename);

function loadTailwindStylesheet(packageName: string) {
  const packageRoot = dirname(require.resolve(`${packageName}/package.json`));

  return async (id: string) => {
    const stylesheet = resolve(
      packageRoot,
      id === "tailwindcss" ? "index.css" : id.replace(/^tailwindcss\//, ""),
    );

    return {
      base: dirname(stylesheet),
      content: readFileSync(stylesheet, "utf8"),
      path: stylesheet,
    };
  };
}

describe("cva/tailwindcss", () => {
  test.each([
    [
      `Tailwind CSS ${require("tailwindcss-v4/package.json").version}`,
      "tailwindcss-v4",
      compileMinimum,
      [
        /\.base\\:bg-red-500\s*\{\s*@layer base\s*\{\s*:where\(&\)\s*\{/,
        /\.base\\:hover\\:bg-red-500\s*\{\s*@layer base\s*\{\s*:where\(&\)\s*\{\s*&:hover\s*\{/,
        /\.base\\:before\\:bg-red-500\s*\{\s*@layer base\s*\{\s*:where\(&\)\s*\{\s*&::before\s*\{/,
      ],
    ],
    [
      `Tailwind CSS ${require("tailwindcss/package.json").version}`,
      "tailwindcss",
      compileCurrent,
      [
        /@layer utilities\s*\{\s*@layer base\s*\{\s*:where\(.base\\:bg-red-500\)\s*\{/,
        /:where\(.base\\:hover\\:bg-red-500\):hover\s*\{/,
        /:where\(.base\\:before\\:bg-red-500\)::before\s*\{/,
      ],
    ],
  ])(
    "compiles nested base utilities with %s",
    async (_, packageName, compile, expectations) => {
      const compiler = await compile(`@import "tailwindcss";\n${css}`, {
        loadStylesheet: loadTailwindStylesheet(packageName),
      });
      const output = compiler.build([
        "base:bg-red-500",
        "base:hover:bg-red-500",
        "base:before:bg-red-500",
      ]);

      expect(output).toMatch(/@layer utilities\s*\{/);

      for (const expectation of expectations) {
        expect(output).toMatch(expectation);
      }
    },
  );

  test("exports the stylesheet without a runtime Tailwind dependency", () => {
    expect(packageJson).toMatchObject({
      sideEffects: ["**/*.css"],
      exports: {
        "./tailwindcss": "./src/tailwindcss.css",
      },
      publishConfig: {
        exports: {
          "./tailwindcss": "./dist/tailwindcss.css",
        },
      },
    });
    expect(packageJson.dependencies ?? {}).not.toHaveProperty("tailwindcss");
    expect(packageJson.peerDependencies ?? {}).not.toHaveProperty(
      "tailwindcss",
    );
  });
});

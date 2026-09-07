# Beta matrix coverage

`packages/cva/src/matrix.test.ts` owns the beta variant matrix across base and default combinations, string and array inputs, and `class` and `className` inputs. It has 252 runtime cases plus four type tests, for 256 matrix tests total.

`packages/cva/src/index.test.ts` retains the other API coverage, including `cva > without base > without anything`, composition, internal variants, schemas, hooks, and concatenators.

Migration parity was verified before the duplicate `index.test.ts` blocks were removed in #410. The one intentional correction is that the without-base, with-defaults fixtures truly omit `base`, so their expected values omit the `button font-semibold border rounded` prefix. Commit `9e94185` is the last tree containing both matrices for historical comparison.

Run the matrix:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true pnpm vitest run --config .config/vitest.config.ts packages/cva/src/matrix.test.ts
```

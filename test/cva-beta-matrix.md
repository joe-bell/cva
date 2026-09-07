# Beta matrix parity

`packages/cva/src/matrix.test.ts` is the separate replacement matrix for the legacy beta rows in `packages/cva/src/index.test.ts`. The legacy tests remain in place while parity is reviewed.

| Group                          | Legacy rows | Replacement fixtures                                                 | Cases |
| ------------------------------ | ----------: | -------------------------------------------------------------------- | ----: |
| Without base, without defaults |          15 | string `class`, string `className`, array `class`, array `className` |    60 |
| Without base, with defaults    |          15 | string `class`, string `className`, array `class`, array `className` |    60 |
| With base, without defaults    |          16 | string `class`, string `className`, array `class`, array `className` |    64 |
| With base, with defaults       |          17 | string `class`, string `className`, array `class`, array `className` |    68 |

Each group retains its legacy row order: `undefined`, empty props, invalid prop, variant/default overrides, explicit `unset` and `undefined`, compound matches, numeric values where present, and `class`/`className`. Invalid props are separate fixture-specific tests so valid rows use `Parameters<typeof component>[0]` directly.

The sole intentional semantic correction is the "without base, with defaults" group. Its new fixtures omit `base`, and every expected result in that group omits the old `button font-semibold border rounded` prefix. The legacy group is left unchanged for comparison.

Run the replacement matrix:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true pnpm vitest run --config .config/vitest.config.ts packages/cva/src/matrix.test.ts
```

Compare isolated production coverage with the diagnostic-only threshold override:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true pnpm vitest run --config .config/vitest.config.ts --coverage --coverage.include='packages/cva/src/{core,index,utils,config}.ts' --coverage.thresholds.100=false --coverage.reporter=json-summary --coverage.reportsDirectory=.context/test-review/parity/new packages/cva/src/matrix.test.ts
```

For the legacy matrix, use its suite-aware filter and inspect the report beside the replacement report:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true pnpm vitest run --config .config/vitest.config.ts --coverage --coverage.include='packages/cva/src/{core,index,utils,config}.ts' --coverage.thresholds.100=false --coverage.reporter=json-summary --coverage.reportsDirectory=.context/test-review/parity/old packages/cva/src/index.test.ts --testNamePattern='(without base|with base).*(without defaults|with defaults).*returns'
```

That filter lists exactly the 63 legacy matrix tests. To compare the beta suite with either matrix, run `index.test.ts` and `concatenators.test.ts` normally for the old matrix. For the replacement, add `matrix.test.ts` and exclude the legacy rows with `--testNamePattern='^((?!((without base|with base).*(without defaults|with defaults).*returns)).)*$'`.

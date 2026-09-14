/**
 * Copyright 2022-present Joe Bell. All rights reserved.
 *
 * This file is licensed to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import type { CVAComponentShape, CVAVariantShape } from "./config.js";
import type {
  CVAComponentConfig,
  InternalOnlyWarning,
  InternalVariantKey,
  StringToBoolean,
} from "./internal.js";

/* Types
  ============================================ */

// Named so `GetSchema` can drop empty entries while mapping the keys.
type SchemaEntry<Config, Variants, Variant extends keyof Variants> =
  Config extends CVAComponentConfig<Config, Variants>
    ? Variant extends keyof Config["defaultVariants"]
      ? Config["defaultVariants"][Variant] extends undefined
        ? never
        : {
            values: ReadonlyArray<StringToBoolean<keyof Variants[Variant]>>;
            defaultValue: Readonly<
              StringToBoolean<Config["defaultVariants"][Variant]>
            >;
          }
      : { values: ReadonlyArray<StringToBoolean<keyof Variants[Variant]>> }
    : never;

export interface GetSchema {
  <_ extends InternalOnlyWarning, Component, Config, Variants>(
    component: Component &
      (Component extends CVAComponentShape
        ? Component extends { config: { variants: infer V } }
          ? // A variant-less component carries `variants: unknown` and a
            // `defaultVariants: {}` that no `CVAComponentConfig` branch
            // accepts; leave `Variants` uninferred so the schema maps over
            // `keyof unknown` (`never`) to `{}`.
            unknown extends V
            ? unknown
            : { config: CVAComponentConfig<Config, Variants> }
          : { config: CVAComponentConfig<Config, Variants> }
        : never),
  ): {
    // Remove keys whose schema entry has no values. For retained keys, an
    // entry with `defaultValue: never` becomes `never`.
    [Variant in keyof Variants as Variant extends InternalVariantKey
      ? never
      : SchemaEntry<Config, Variants, Variant> extends {
            values: readonly never[];
          }
        ? never
        : Variant]: SchemaEntry<Config, Variants, Variant> extends {
      defaultValue: never;
    }
      ? never
      : SchemaEntry<Config, Variants, Variant>;
  };
}

/* Exports
  ============================================ */

/**
 * Reads a `cva` component's variants back out as a plain object, keyed by
 * variant name: each entry carries the variant's possible `values`, plus a
 * `defaultValue` when the component declares one. Use it to drive Storybook
 * controls, prop tables, or anything else that would otherwise re-declare the
 * variants by hand.
 *
 * Values are normalized to the types the component's props accept, so
 * `"true"`/`"false"` keys come back as booleans and numeric keys as numbers.
 * Internal (`_`-prefixed) variants and variants with no values are omitted.
 *
 * @example
 * ```ts
 * import { cva } from "cva";
 * import { getSchema } from "cva/tools";
 *
 * const button = cva({
 *   base: "button",
 *   variants: {
 *     intent: { primary: "button--primary", secondary: "button--secondary" },
 *     size: { small: "button--small", large: "button--large" },
 *   },
 *   defaultVariants: { intent: "primary", size: "small" },
 * });
 *
 * getSchema(button);
 * // => {
 * //   intent: { values: ["primary", "secondary"], defaultValue: "primary" },
 * //   size: { values: ["small", "large"], defaultValue: "small" },
 * // }
 * ```
 */
// Cast to `GetSchema`: its conditional parameter type cannot narrow here.
export const getSchema = ((component: CVAComponentShape) => {
  const variants: CVAVariantShape | undefined = component.config?.variants;
  if (!variants) return {};

  return Object.entries(variants).reduce((acc, [key, value]) => {
    if (key.startsWith("_")) return acc;

    const defaultValue = component.config.defaultVariants?.[key];
    const hasDefaultValue = defaultValue !== undefined;
    const values = Object.keys(value).map((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      // Normalize numeric-literal keys back to numbers, since that's how
      // they appear in variant prop types (`keyof { 1: ... }` is `1`, not
      // `"1"`) — object keys are always strings/symbols at runtime. The
      // `String(n) === v` round-trip only accepts canonical numeric forms
      // (so `"01"`, `""`, `" 1"` stay strings), covering negatives too.
      const n = Number(v);
      return Number.isFinite(n) && String(n) === v ? n : v;
    });
    const hasValues = values.length > 0;

    return hasValues || hasDefaultValue
      ? {
          ...acc,
          [key]: {
            ...(hasValues ? { values } : {}),
            ...(hasDefaultValue ? { defaultValue } : {}),
          },
        }
      : acc;
  }, {} as ReturnType<GetSchema>);
}) as GetSchema;

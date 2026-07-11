/**
 * Copyright 2022 Joe Bell. All rights reserved.
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

// Component-introspection tools. Deliberately type-only imports: `cva/tools`
// reads the `config` that `cva` already attaches to every component, so it
// ships with zero runtime dependencies (not even `clsx`).
import type {
  CVA,
  CVAComponent,
  CVAComponentConfig,
  CVAComponentShape,
  InternalOnlyWarning,
  StringToBoolean,
} from "./index";

// Must stay in lockstep with `InternalVariantKey` in `index.ts` (unexported
// there; the shape is trivial enough to twin rather than widen the public
// type surface): a `_`-prefixed variant is internal and hidden from
// introspection.
type InternalVariantKey = `_${string}`;

/* getSchema
  ============================================ */

export interface GetSchema {
  <_ extends InternalOnlyWarning, Component, Config, Variants>(
    component: Component &
      (Component extends ReturnType<CVA>
        ? { config: CVAComponentConfig<Config, Variants> }
        : never),
  ): {
    [Variant in keyof Variants as Variant extends InternalVariantKey
      ? never
      : Variant]: Config extends CVAComponentConfig<Config, Variants>
      ? Variant extends keyof Config["defaultVariants"]
        ? Config["defaultVariants"][Variant] extends undefined
          ? never
          : {
              values: ReadonlyArray<StringToBoolean<keyof Variants[Variant]>>;
              defaultValue: Readonly<
                StringToBoolean<Config["defaultVariants"][Variant]>
              >;
            }
        : {
            values: ReadonlyArray<StringToBoolean<keyof Variants[Variant]>>;
          }
      : never;
    // Iterate over the returned schema and remove any keys that have no values
  } extends infer Schema
    ? {
        [K in keyof Schema as Schema[K] extends {
          values: readonly never[];
        }
          ? never
          : K]: Schema[K] extends { defaultValue: never } ? never : Schema[K];
      }
    : never;
}

export const getSchema: GetSchema = (component) => {
  if (!component.config?.variants) return {} as any;

  return Object.entries(component.config.variants).reduce(
    (acc, [key, value]) => {
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
      }) as StringToBoolean<keyof typeof value>[];
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
    },
    {} as ReturnType<GetSchema>,
  );
};

/* getDataAttributes
  ============================================ */

// Must stay in lockstep with the runtime `camelToKebab` below — the type
// computes attribute names, the regex produces them.
type CamelToKebab<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Uppercase<First>
    ? First extends Lowercase<First>
      ? // Non-alphabetic (digits, "-", …) — pass through untouched.
        `${First}${CamelToKebab<Rest>}`
      : `-${Lowercase<First>}${CamelToKebab<Rest>}`
    : `${First}${CamelToKebab<Rest>}`
  : S;

// Shared between `GetDataAttributes` and `PVA` so the two can't drift.
type CVADataAttributes<Variants> = {
  // A variant with no values (e.g. `empty: {}`) can never resolve, so its
  // attribute is removed — mirroring `GetSchema`'s empty-variant filter.
  [Variant in keyof Variants as [keyof Variants[Variant]] extends [never]
    ? never
    : `data-${CamelToKebab<`${Extract<Variant, string | number>}`>}`]?: `${Exclude<
    StringToBoolean<keyof Variants[Variant]>,
    symbol
  >}`;
};

// Not exported: `getDataAttributes` is `pva`'s implementation detail, not
// public API. Use `pva(component, props).data` if you need the attributes
// on their own (e.g. on a different element than the class string).
interface GetDataAttributes {
  <_ extends InternalOnlyWarning, Component, Config, Variants>(
    component: Component &
      (Component extends ReturnType<CVA>
        ? { config: CVAComponentConfig<Config, Variants> }
        : never),
    // The component's own props shape, so the same object can feed both the
    // component call and this one (`class`/`className` are ignored here).
    props?: Parameters<CVAComponent<Config, Variants>>[0],
  ): CVADataAttributes<Variants>;
}

const camelToKebab = (value: string) =>
  value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

// Per-component precompute: [variantKey, attributeName, stringifiedDefault?].
// Kebab-casing and default stringification run once per component instead of
// on every render — the regex work dominates the cost of this function
// otherwise. Keyed by component identity: `cva` attaches `config` once at
// construction and never mutates it, so entries stay valid (and are collected
// with the component) for its whole lifetime.
const dataAttributesCache = new WeakMap<
  CVAComponentShape,
  [key: string, attribute: string, defaultValue: string | undefined][]
>();

const getDataAttributes: GetDataAttributes = (component, props) => {
  // The generic parameter can't be proven to be a `CVAComponentShape` at
  // declaration time (the guard is a deferred conditional), hence the cast.
  const cacheKey = component as unknown as CVAComponentShape;
  let entries = dataAttributesCache.get(cacheKey);

  if (!entries) {
    const variants = component.config?.variants;
    entries = variants
      ? Object.keys(variants).map((key) => {
          const defaultValue = component.config.defaultVariants?.[key];
          return [
            key,
            `data-${camelToKebab(key)}`,
            defaultValue === undefined ? undefined : String(defaultValue),
          ];
        })
      : [];
    dataAttributesCache.set(cacheKey, entries);
  }

  const attributes: Record<string, string> = {};
  for (const [key, attribute, defaultValue] of entries) {
    const prop = (props as Record<string, unknown> | undefined)?.[key];
    // Same precedence as class resolution: an explicit prop wins, an omitted
    // (or `undefined`) prop falls back to the default, and a variant with
    // neither contributes no attribute at all.
    const value = prop === undefined ? defaultValue : String(prop);
    if (value !== undefined) attributes[attribute] = value;
  }

  return attributes as ReturnType<GetDataAttributes>;
};

/* pva
  ============================================ */

// "Prop Variant Authority": glue that merges your props. Resolves a
// component's class string and data attributes from a single props object,
// for the frameworks that want both at once.
export interface PVA {
  <_ extends InternalOnlyWarning, Component, Config, Variants>(
    component: Component &
      (Component extends ReturnType<CVA>
        ? { config: CVAComponentConfig<Config, Variants> }
        : never),
    props?: Parameters<CVAComponent<Config, Variants>>[0],
  ): {
    // Both keys carry the same string, so React (`className`) and
    // class-attribute frameworks (Vue, Svelte, Astro) can each destructure
    // their native prop name. `data` is nested (not spread at the root) so
    // there's no ambiguity about which key is the class string.
    class: string;
    className: string;
    data: CVADataAttributes<Variants>;
  };
}

export const pva: PVA = (component, props) => {
  const className = (component as (props?: unknown) => string)(props);
  return {
    class: className,
    className,
    data: getDataAttributes(component, props),
  };
};

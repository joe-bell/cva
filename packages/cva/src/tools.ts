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

/**
 * Extracts a plain-object schema (variant names, possible values, and
 * default values) from a `cva` component — for Storybook controls,
 * documentation, or any other UI that reads a component's variants without
 * re-declaring them.
 *
 * @example
 * getSchema(button);
 * // => { intent: { values: ["primary", "secondary"], defaultValue: "primary" } }
 */
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
  // Internal (`_`-prefixed) variants are hidden from introspection, and a
  // variant with no values (e.g. `empty: {}`) can never resolve — both are
  // removed, mirroring `GetSchema`'s filters.
  [Variant in keyof Variants as Variant extends InternalVariantKey
    ? never
    : [keyof Variants[Variant]] extends [never]
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

// Must stay in lockstep with `falsyToString` in `index.ts` — the attributes
// below must always report exactly the variant key that class resolution
// selected, so both sides need the same falsy-fallback semantics (a falsy
// resolved prop — `undefined`, `null`, `""`, `NaN` — falls back to the
// default; `false` and `0` resolve as themselves).
const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

// Per-component precompute, keyed by component identity:
//
// - `defaults`: resolved default attributes (kebab-cased attribute name to
//   stringified default value), spread first on every call.
// - `byKey`: variant name to attribute name, for overriding defaults from
//   props. Null prototype, so an own `__proto__` key in (untyped) props can
//   never resolve to a junk attribute.
//
// Kebab-casing and default stringification run once per component instead of
// on every render — the regex work dominates the cost of this function
// otherwise. `cva` attaches `config` once at construction and never mutates
// it (see the invariant note at the `component.config` assignment in
// `index.ts`), so entries stay valid — and are collected with the
// component — for its whole lifetime.
const dataAttributesCache = new WeakMap<
  CVAComponentShape,
  { defaults: Record<string, string>; byKey: Record<string, string> }
>();

const getDataAttributes: GetDataAttributes = (component, props) => {
  // The generic parameter can't be proven to be a `CVAComponentShape` at
  // declaration time (the guard is a deferred conditional), hence the cast.
  const cacheKey = component as unknown as CVAComponentShape;
  let cached = dataAttributesCache.get(cacheKey);

  if (!cached) {
    const defaults: Record<string, string> = {};
    const byKey: Record<string, string> = Object.create(null);
    const variants = component.config?.variants;
    if (variants) {
      for (const key of Object.keys(variants)) {
        // Internal variants are hidden from introspection (mirroring
        // `getSchema`): no default attribute, and no `byKey` entry means a
        // prop can't emit one either.
        if (key.startsWith("_")) continue;

        const attribute = `data-${camelToKebab(key)}`;
        byKey[key] = attribute;
        const defaultValue = falsyToString(
          component.config.defaultVariants?.[key],
        );
        // `!= null` (loose): class resolution looks its fallback key up
        // as-is, so a falsy-but-present default still resolves there, while
        // `null`/`undefined` behave like "unset".
        if (defaultValue != null) defaults[attribute] = String(defaultValue);
      }
    }
    cached = { defaults, byKey };
    dataAttributesCache.set(cacheKey, cached);
  }

  const attributes: Record<string, string> = { ...cached.defaults };
  if (props) {
    // Iterate the (typically fewer) own props keys rather than every
    // variant; non-variant keys (`class`/`className`, unknowns) miss
    // `byKey` and fall through.
    for (const key of Object.keys(props)) {
      const attribute = cached.byKey[key];
      if (attribute === undefined) continue;
      // Same precedence as class resolution's
      // `falsyToString(prop) || falsyToString(default)`: a truthy resolved
      // prop wins; a falsy one leaves the default (already spread) in place.
      const value = falsyToString((props as Record<string, unknown>)[key]);
      if (value) attributes[attribute] = String(value);
    }
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

/**
 * Prop Variant Authority: glue that merges your props. Resolves a
 * component's class string and its variant state, as `data-*` attributes,
 * from a single props object — the data attributes always report exactly
 * the variant values class resolution selected.
 *
 * @example
 * const { className, data } = pva(button, { intent: "secondary" });
 * // className => "button button--secondary"
 * // data      => { "data-intent": "secondary" }
 * <button className={className} {...data} />
 */
export const pva: PVA = (component, props) => {
  const className = (component as (props?: unknown) => string)(props);
  return {
    class: className,
    className,
    data: getDataAttributes(component, props),
  };
};

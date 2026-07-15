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
import { clsx } from "clsx";

/* Types
  ============================================ */

/* clsx
  ---------------------------------- */

// When compiling with `declaration: true`, many projects experience the dreaded
// TS2742 error. To combat this, we copy clsx's types manually.
// Should this project move to JSDoc, this workaround would no longer be needed.

export type ClassValue =
  | ClassArray
  | ClassDictionary
  | string
  | number
  | bigint
  | null
  | boolean
  | undefined;
export type ClassDictionary = Record<string, any>;
export type ClassArray = ClassValue[];

/* Utils
  ---------------------------------- */

type OmitUndefined<T> = T extends undefined ? never : T;
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

// `composes` accepts either a single component or a list of components. A
// plain union (`CVAComponentShape | CVAComponentShape[]`) collapses an array
// literal's element type to a union, silently dropping components whose
// variants are a structural subtype of another composed component's (e.g.
// `composes: [a, b]` where `b`'s variants are a superset of `a`'s). Splitting
// inference across two type parameters preserves the array as a real tuple.
type ComposedTuple<
  S extends CVAComponentShape | undefined,
  L extends readonly CVAComponentShape[],
> = [S] extends [CVAComponentShape] ? [S] : L;

type MergedVariants<T extends readonly unknown[]> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends {
      config: { variants?: infer V extends CVAVariantShape };
    }
      ? V
      : never;
  }[number]
>;

// Right-biased merge (`B`'s keys win on conflicts) implemented as a mapped
// type rather than `Omit<A, keyof B> & B`: the latter stays an unresolved
// deferred type when `A`/`B` are themselves generic (as they are here, via
// `ReturnType<CVA>` with no concrete `Config`), which then breaks downstream
// `any`-narrowing in unrelated code that consumes `ReturnType<CVA>` (e.g.
// the deprecated `compose`). A mapped type resolves eagerly instead.
type RightMerge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? B[K]
    : K extends keyof A
      ? A[K]
      : never;
};

// Mirrors the runtime `mergeVariants`: a right-biased (local wins),
// one-level-deep merge of composed variants with local ones. A plain
// intersection (`Local & Composed`) breaks down when both sides declare the
// same option key with incompatible class values — e.g. a normalized
// shorthand's `false: null` intersected with a composed `false: string`
// collapses the whole variant map to `never`, whose `keyof` is
// `string | number | symbol`, poisoning the props type.
type MergeVariantShapes<Composed, Local> = [Composed] extends [CVAVariantShape]
  ? {
      [K in keyof Composed | keyof Local]: K extends keyof Local
        ? K extends keyof Composed
          ? RightMerge<Composed[K], Local[K]>
          : Local[K]
        : K extends keyof Composed
          ? Composed[K]
          : never;
    }
  : Local;

// `D` infers as `undefined` (not absent) when a component declares no
// `defaultVariants` at all. `NonNullable<undefined>` would give `never`,
// and `keyof never` is `string | number | symbol` (not `never`) — poisoning
// `RightMerge`'s key union with every possible key. Normalize to `{}` instead,
// matching a component that contributes nothing to the merge.
type DefaultsOf<Component> = Component extends {
  config: { defaultVariants?: infer D };
}
  ? D extends undefined
    ? {}
    : D
  : {};

type MergedDefaultVariants<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Rest,
]
  ? RightMerge<DefaultsOf<Head>, MergedDefaultVariants<Rest>>
  : {};

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

/* compose
  ---------------------------------- */

/**
 * @deprecated Use the `composes` property inside `cva` instead.
 * @example
 * // Before
 * const card = compose(box, stack)
 * // After
 * const card = cva({ composes: [box, stack] })
 */
export interface Compose {
  <T extends ReturnType<CVA>[]>(
    ...components: [...T]
  ): (
    props?: (
      | UnionToIntersection<
          {
            [K in keyof T]: VariantProps<T[K]>;
          }[number]
        >
      | undefined
    ) &
      CVAClassProp,
  ) => string;
}

/* cx
  ---------------------------------- */

export interface CX {
  (...inputs: ClassValue[]): string;
}

export type CXOptions = Parameters<CX>;
export type CXReturn = ReturnType<CX>;

/* cva
  ============================================ */

type CVAComponentConfigBase = { base?: ClassValue };
/**
 * Exported so TypeScript can name this type in your generated declarations
 * (`declaration: true`) — you shouldn't really use it directly.
 */
export type CVAVariantShape = Record<string, Record<string, ClassValue>>;
// Boolean-variant shorthand: any variant value that is *not* a plain object
// is treated as `{ true: value, false: null }`. Discrimination has to happen
// on the non-object side — a clsx `ClassDictionary` structurally overlaps a
// variant map, so plain objects must always stay variant maps (wrap a
// dictionary in an array to use it as shorthand). `boolean`/`undefined` are
// deliberately excluded as shorthand values.
type CVAVariantShorthandValue = string | number | bigint | ClassArray | null;
type CVAVariantInputShape = Record<
  string,
  Record<string, ClassValue> | CVAVariantShorthandValue
>;
// Guarded rather than bare-homomorphic: `unknown` (a variant-less
// `cva({ base })`) must pass through unchanged — `CVAComponentShape`'s
// guards depend on `variants: unknown` (see `CVAComponentShape` below).
type NormalizeVariants<V> = V extends CVAVariantInputShape
  ? {
      [K in keyof V]: [V[K]] extends [Record<string, ClassValue>]
        ? V[K]
        : { true: V[K]; false: null };
    }
  : V;
// Prop values for one raw variant entry: map entries accept their
// (boolean-ized) keys, shorthand entries accept `boolean`. The conditionals
// here and in `NormalizeVariants` check the map side — mirroring the runtime
// `isVariantMap` — and MUST be non-distributive (`[T] extends [...]`): a
// distributive check over the bare type parameter stays deferred during
// contextual typing of `defaultVariants`, widening literal values (e.g. `-1`
// to `number`). Never `keyof` a shorthand value — `keyof string` is the
// string method names.
type CVAVariantValue<T> = [T] extends [Record<string, ClassValue>]
  ? StringToBoolean<keyof T>
  : boolean;
type CVAVariantSchema<V extends CVAVariantInputShape> = {
  [Variant in keyof V]?: CVAVariantValue<V[Variant]> | undefined;
};
type CVAClassProp =
  | {
      class?: ClassValue;
      className?: never;
    }
  | {
      class?: never;
      className?: ClassValue;
    };

type InternalOnlyWarning =
  "cva's generic parameters are restricted to internal use only.";

type CVAComponentConfig<
  Config,
  Variants,
  ComposedSingle extends CVAComponentShape | undefined =
    | CVAComponentShape
    | undefined,
  ComposedList extends readonly CVAComponentShape[] =
    readonly CVAComponentShape[],
> = Config & {
  composes?: ComposedSingle | readonly [...ComposedList];
} & (Variants extends CVAVariantInputShape
    ? CVAComponentConfigBase & {
        variants?: Variants;
        compoundVariants?: (Variants extends CVAVariantInputShape
          ? (
              | CVAVariantSchema<Variants>
              | {
                  [Variant in keyof Variants]?:
                    | CVAVariantValue<Variants[Variant]>
                    | CVAVariantValue<Variants[Variant]>[]
                    | undefined;
                }
            ) &
              CVAClassProp
          : CVAClassProp)[];
        defaultVariants?: CVAVariantSchema<Variants>;
      }
    : CVAComponentConfigBase & {
        variants?: never;
        compoundVariants?: never;
        defaultVariants?: never;
      });

/**
 * Exported so TypeScript can name this type in your generated declarations
 * (`declaration: true`) — you shouldn't really use it directly.
 */
export interface CVAComponent<Config, Variants> {
  (
    props?: Variants extends CVAVariantShape
      ? CVAVariantSchema<Variants> & CVAClassProp
      : CVAClassProp,
  ): string;
  /** @internal */
  config: Config;
}

// The loosest form a composable component can take, constraining `composes`
// and the composition merge helpers above. Deriving it from `CVAComponent`
// keeps the two from drifting: instantiated with `any`, the props conditional
// and `config` both collapse to `any` (mapped types over `any` are `any`),
// i.e. `{ (props?: any): string; config: any }`. The required `config`
// property is what rejects plain functions and (deprecated) `compose`
// results.
//
// The `any` arguments are deliberate, not lazy typing — a shaped `config`
// (e.g. `{ variants?: CVAVariantShape }`) was tried and verifiably breaks:
// a variant-less `cva({ base })` carries `variants: unknown`, and
// `ReturnType<CVA>` instantiates this constraint inside the
// `Compose`/`GetSchema` guards, where the shaped form rejects every real
// component via props contravariance.
/**
 * Exported so TypeScript can name this type in your generated declarations
 * (`declaration: true`) — you shouldn't really use it directly.
 */
export type CVAComponentShape = CVAComponent<any, any>;

type CVADefaultVariants<Config> = Config extends { defaultVariants?: infer D }
  ? D
  : {};

export interface CVA {
  <
    _ extends InternalOnlyWarning,
    Config,
    Variants,
    ComposedSingle extends CVAComponentShape | undefined = undefined,
    ComposedList extends readonly CVAComponentShape[] = [],
  >(
    config: CVAComponentConfig<Config, Variants, ComposedSingle, ComposedList>,
  ): CVAComponent<
    // `variants` must be replaced wholesale (not intersected with `Config`'s
    // raw slot): for a shorthand entry the raw/normalized intersection
    // (e.g. `"opacity-50" & { true: ...; false: null }`) collapses to an
    // unusable type, breaking `getSchema` inference downstream.
    Omit<Config, "defaultVariants" | "variants"> & {
      variants: MergeVariantShapes<
        MergedVariants<ComposedTuple<ComposedSingle, ComposedList>>,
        NormalizeVariants<Variants>
      >;
      // Local `defaultVariants` win over composed ones on key conflicts,
      // matching the runtime spread order. A plain intersection would collapse
      // a conflicting key's value to `never` (e.g. `"sm" & "lg"`), which then
      // silently drops the variant from `getSchema`'s inferred type.
      defaultVariants: Omit<
        MergedDefaultVariants<ComposedTuple<ComposedSingle, ComposedList>>,
        keyof CVADefaultVariants<Config>
      > &
        CVADefaultVariants<Config>;
    },
    MergeVariantShapes<
      MergedVariants<ComposedTuple<ComposedSingle, ComposedList>>,
      NormalizeVariants<Variants>
    >
  >;
}

/* defineConfig
  ---------------------------------- */

export interface DefineConfigOptions {
  hooks?: {
    /**
     * @deprecated please use `onComplete`
     */
    "cx:done"?: (className: string) => string;
    /**
     * Returns the completed string of concatenated classes/classNames.
     */
    onComplete?: (className: string) => string;
  };
}

export interface DefineConfig {
  (options?: DefineConfigOptions): {
    /**
     * @deprecated Use the `composes` property inside `cva` instead.
     * @example
     * // Before
     * const card = compose(box, stack)
     * // After
     * const card = cva({ composes: [box, stack] })
     */
    compose: Compose;
    cx: CX;
    cva: CVA;
  };
}

/* Exports
  ============================================ */

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

const isVariantMap = (value: unknown): value is Record<string, ClassValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Expands the boolean-variant shorthand (any non-map value becomes
// `{ true: value, false: null }`) so every downstream consumer — variant
// resolution, composition merging, `component.config`, `getSchema` — only
// ever sees `{ true, false }` maps.
const normalizeVariants = (
  variants: Record<string, Record<string, ClassValue> | ClassValue>,
): CVAVariantShape => {
  const normalized: CVAVariantShape = {};
  for (const key of Object.keys(variants)) {
    const value = variants[key];
    normalized[key] = isVariantMap(value)
      ? value
      : { true: value, false: null };
  }
  return normalized;
};

// Shared across every non-composed call, rather than allocating a fresh `[]`
// per call — `cx` (clsx) treats an empty array identically to an absent one.
const emptyClassNames: string[] = [];

export const defineConfig: DefineConfig = (options) => {
  const cx: CX = (...inputs) => {
    if (typeof options?.hooks?.["cx:done"] !== "undefined")
      return options?.hooks["cx:done"](clsx(inputs));

    if (typeof options?.hooks?.onComplete !== "undefined")
      return options?.hooks.onComplete(clsx(inputs));

    return clsx(inputs);
  };

  const cva = (<
    _ extends InternalOnlyWarning,
    Config,
    Variants,
    ComposedSingle extends CVAComponentShape | undefined = undefined,
    ComposedList extends readonly CVAComponentShape[] = [],
  >(
    config: CVAComponentConfig<Config, Variants, ComposedSingle, ComposedList>,
  ) => {
    const components = (
      config?.composes == null
        ? []
        : Array.isArray(config.composes)
          ? config.composes
          : [config.composes]
    ) as CVAComponentShape[];
    // A one-level-deep merge per variant key, so overlapping variants (e.g.
    // multiple composed components declaring `style`) union their values
    // instead of the last component's values silently replacing the rest.
    const mergeVariants = (
      acc: CVAVariantShape,
      variants: CVAVariantShape | undefined,
    ): CVAVariantShape => {
      if (!variants) return acc;
      const merged: CVAVariantShape = { ...acc };
      for (const key of Object.keys(variants)) {
        merged[key] = { ...merged[key], ...variants[key] };
      }
      return merged;
    };
    const mergedVariantsFromComposed = components.reduce(
      (acc: CVAVariantShape, component: CVAComponentShape) =>
        mergeVariants(acc, component.config?.variants),
      {} as CVAVariantShape,
    );
    const localVariants =
      config?.variants == null
        ? undefined
        : normalizeVariants(
            config.variants as Record<
              string,
              Record<string, ClassValue> | ClassValue
            >,
          );
    const mergedVariants = mergeVariants(
      mergedVariantsFromComposed,
      localVariants,
    );
    const mergedDefaultVariantsFromComposed = components.reduce(
      (acc: Record<string, unknown>, component: CVAComponentShape) => ({
        ...acc,
        ...component.config?.defaultVariants,
      }),
      {} as Record<string, unknown>,
    );
    // Local `defaultVariants` win over composed ones here too (last spread).
    const mergedDefaultVariants: Record<string, unknown> = {
      ...mergedDefaultVariantsFromComposed,
      ...config?.defaultVariants,
    };

    const component: CVAComponent<typeof config, typeof config.variants> = (
      props,
    ) => {
      // Strip `class`/`className` and explicit `undefined` from props once,
      // reused for both the composed-component calls and compound-variant
      // matching. An explicit `{ variant: undefined }` is dropped so it falls
      // back to the (possibly composed) default, matching variant resolution
      // below. Only built when something consumes it — a plain component with
      // no `composes` and no `variants` skips the work entirely.
      const definedPropsWithoutClass =
        components.length || localVariants != null
          ? Object.fromEntries(
              Object.entries(props || {}).filter(
                ([key, value]) =>
                  key !== "class" &&
                  key !== "className" &&
                  typeof value !== "undefined",
              ),
            )
          : {};

      const getComposedClassNames = components.length
        ? components.map((component: CVAComponentShape) =>
            component({
              ...mergedDefaultVariants,
              ...definedPropsWithoutClass,
            }),
          )
        : emptyClassNames;

      if (localVariants == null) {
        return cx(
          getComposedClassNames,
          config?.base,
          props?.class,
          props?.className,
        );
      }

      // Resolve against the normalized local variants — raw `config.variants`
      // may still hold shorthand values, which would be string-indexed
      // character-by-character below.
      const variants = localVariants;

      // Resolve against the *merged* defaults (composed + local) so a variant
      // redeclared locally over a composed key uses the same effective default
      // the composed components and `getSchema` see.
      const getVariantClassNames = Object.keys(variants).map(
        (variant: keyof typeof variants) => {
          const variantProp = props?.[variant as keyof typeof props];
          const defaultVariantProp = mergedDefaultVariants[variant as string];

          const variantKey = (falsyToString(variantProp) ||
            falsyToString(
              defaultVariantProp,
            )) as keyof (typeof variants)[typeof variant];

          return variants[variant][variantKey];
        },
      );

      const defaultsAndProps = {
        ...mergedDefaultVariants,
        ...definedPropsWithoutClass,
      };

      const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
        (
          acc: ClassValue[],
          {
            class: cvClass,
            className: cvClassName,
            ...cvConfig
          }: CVAClassProp & Record<string, unknown>,
        ) =>
          Object.entries(cvConfig).every(([cvKey, cvSelector]) => {
            const selector =
              defaultsAndProps[cvKey as keyof typeof defaultsAndProps];

            return Array.isArray(cvSelector)
              ? cvSelector.includes(selector)
              : selector === cvSelector;
          })
            ? [...acc, cvClass, cvClassName]
            : acc,
        [] as ClassValue[],
      );

      return cx(
        getComposedClassNames,
        config?.base,
        getVariantClassNames,
        getCompoundVariantClassNames,
        props?.class,
        props?.className,
      );
    };

    component.config = {
      ...config,
      variants: mergedVariants,
      defaultVariants: mergedDefaultVariants,
    };

    return component as ReturnType<CVA>;
  }) as CVA;

  const compose: Compose = (...components) => {
    const config = components.reduce(
      (acc, { config }) => {
        Object.entries(config || {}).forEach(([key, value]) => {
          acc[key] =
            typeof value === "object" && value !== null && !Array.isArray(value)
              ? {
                  ...acc[key],
                  ...value,
                }
              : value;
        });
        return acc;
      },
      // A loose accumulator: composed configs carry heterogeneous values
      // (base strings, variant maps, compoundVariant arrays), not just the
      // `CVAVariantShape` the merged `variants` key holds.
      {} as Record<string, any>,
    );

    const component: CVAComponent<typeof config, typeof config.variants> = (
      props,
    ) => {
      const propsWithoutClass = Object.fromEntries(
        Object.entries(props || {}).filter(
          ([key]) => !["class", "className"].includes(key),
        ),
      );

      return cx(
        components.map((component) => component(propsWithoutClass)),
        props?.class,
        props?.className,
      );
    };

    component.config = config;

    return component;
  };

  return {
    compose,
    cva,
    cx,
  };
};

export const { compose, cva, cx } = defineConfig();

export interface GetSchema {
  <_ extends InternalOnlyWarning, Component, Config, Variants>(
    component: Component &
      (Component extends ReturnType<CVA>
        ? { config: CVAComponentConfig<Config, Variants> }
        : never),
  ): {
    [Variant in keyof Variants]: Config extends CVAComponentConfig<
      Config,
      Variants
    >
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

  // `config.variants` is stored normalized (shorthand already expanded to
  // `{ true, false }` maps), even though the config *type* still carries the
  // raw input union.
  return Object.entries(component.config.variants as CVAVariantShape).reduce(
    (acc, [key, value]) => {
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

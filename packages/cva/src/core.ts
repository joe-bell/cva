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

/* Types
  ============================================ */

/* ClassValue
  ---------------------------------- */

// Mirrors clsx's `ClassValue`; local to keep `core` dependency-free (TS2742).

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

/* CXInput
  ---------------------------------- */

/**
 * Any function usable as a `cx` concatenator.
 */
export type AnyCX = (...inputs: any[]) => string;

// Infer directly from a readonly rest pattern instead of `Parameters<T>[number]`:
// the latter is `never` for zero-argument callbacks and loses readonly rest
// element types.
type CXInputs<TCX extends AnyCX> = TCX extends (
  ...inputs: readonly [...infer Inputs]
) => string
  ? Inputs
  : never;
type CXInputElement<TCX extends AnyCX> = CXInputs<TCX>[number];

// cva may call `cx` with no values, or with any number of authored values and
// composed component strings. A constant callback is safe; every other
// callback must accept arbitrary lists of its own grammar plus strings.
type CXHasSafeArity<TCX extends AnyCX> =
  CXInputs<TCX> extends infer Inputs
    ? Inputs extends readonly unknown[]
      ? Inputs extends []
        ? true
        : [] extends Inputs
          ? number extends Inputs["length"]
            ? true
            : false
          : false
      : false
    : false;
type CXConstraint<TCX extends AnyCX> =
  false extends CXHasSafeArity<TCX>
    ? "cva's cx must accept zero arguments and an unbounded rest parameter."
    : [TCX] extends [(...inputs: (string | CXInput<TCX>)[]) => string]
      ? unknown
      : "cva's cx must accept its inferred class values and composed strings.";

/**
 * The class value type a concatenator accepts, inferred from its
 * parameters — `defineConfig` uses this to type the authoring surface
 * (`base`, variant values, `class`/`className`) against the configured
 * concatenator's own input grammar.
 */
export type CXInput<TCX extends AnyCX> =
  CXInputElement<TCX> extends infer P
    ? // `0 extends 1 & P` detects `any`; `any`/`never` use `ClassValue`.
      0 extends 1 & P
      ? ClassValue
      : [P] extends [never]
        ? ClassValue
        : [P] extends [ClassValue]
          ? P
          : // A concatenator accepting more than cva's grammar (e.g. `string |
            // URL`) narrows to the subset it shares with it, since the surface
            // can't widen beyond what the concatenator accepts; when nothing is
            // shared (e.g. `unknown`), the full grammar applies.
            [Extract<P, ClassValue>] extends [never]
            ? ClassValue
            : Extract<P, ClassValue>
    : ClassValue;

/* Utils
  ---------------------------------- */

type OmitUndefined<T> = T extends undefined ? never : T;
// Blocks inference from a site that merely checks a type parameter.
type Uninferred<T> = [T][T extends any ? 0 : never];
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

type ComponentProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

// A variant name prefixed with `_` is internal: the component still accepts
// it, but `VariantProps` and `getSchema` omit it from the public surface.
type InternalVariantKey = `_${string}`;

export type VariantProps<Component extends (...args: any) => any> = Omit<
  ComponentProps<Component>,
  InternalVariantKey
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
export interface Compose<T extends ClassValue = ClassValue> {
  <Components extends readonly unknown[]>(
    ...components: Components &
      (Components[number] extends CVAComponentShape ? unknown : never)
  ): (
    props?: (
      | UnionToIntersection<
          {
            [K in keyof Components]: Components[K] extends CVAComponentShape
              ? ComponentProps<Components[K]>
              : never;
          }[number]
        >
      | undefined
    ) &
      CVAClassProp<T>,
  ) => string;
}

/* cx
  ---------------------------------- */

export interface CX<T extends ClassValue = ClassValue> {
  (...inputs: T[]): string;
}

export type CXOptions = Parameters<CX>;
export type CXReturn = ReturnType<CX>;

/* cva
  ============================================ */

type CVAComponentConfigBase<T extends ClassValue = ClassValue> = { base?: T };
/**
 * Exported so TypeScript can name this type in your generated declarations
 * (`declaration: true`) — you shouldn't really use it directly.
 */
export type CVAVariantShape = Record<string, Record<string, ClassValue>>;
// Unconstrained so it can map over the merged (local plus composed)
// variants, which is only known to be an intersection, not a
// `CVAVariantShape`.
type CVAVariantSchema<V> = {
  [Variant in keyof V]?: StringToBoolean<keyof V[Variant]> | undefined;
};
type CVAClassProp<T extends ClassValue = ClassValue> =
  | {
      class?: T;
      className?: never;
    }
  | {
      class?: never;
      className?: T;
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
  T extends ClassValue = ClassValue,
  // `defaultVariants` and `compoundVariants` are checked against local variants
  // merged with composed variants. Defaults to local variants for introspection
  // guards.
  //
  // Gate on `keyof Merged` to preserve literal defaults, and wrap in
  // `Uninferred` to prevent reverse inference from authored values.
  Merged = Variants,
> = Config & {
  composes?: ComposedSingle | readonly [...ComposedList];
  // The gate checks variant values against the configured concatenator's
  // input type, so e.g. object syntax fails here (on the `variants` key)
  // under a concatenator that doesn't accept objects.
} & (Variants extends Record<string, Record<string, T>>
    ? CVAComponentConfigBase<T> & { variants?: Variants }
    : CVAComponentConfigBase<T> & { variants?: never }) &
  ([keyof Merged] extends [never]
    ? { compoundVariants?: never; defaultVariants?: never }
    : {
        compoundVariants?: ((
          | CVAVariantSchema<Uninferred<Merged>>
          | {
              [Variant in keyof Uninferred<Merged>]?:
                | StringToBoolean<keyof Uninferred<Merged>[Variant]>
                | StringToBoolean<keyof Uninferred<Merged>[Variant]>[]
                | undefined;
            }
        ) &
          CVAClassProp<T>)[];
        defaultVariants?: CVAVariantSchema<Uninferred<Merged>>;
      });

/**
 * Exported so TypeScript can name this type in your generated declarations
 * (`declaration: true`) — you shouldn't really use it directly.
 */
export interface CVAComponent<
  Config,
  Variants,
  T extends ClassValue = ClassValue,
> {
  (
    props?: Variants extends CVAVariantShape
      ? CVAVariantSchema<Variants> & CVAClassProp<T>
      : CVAClassProp<T>,
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
//
// Its class-value parameter must be `any`: narrowed components otherwise fail
// props contravariance in `composes` and `getSchema`.
/**
 * Exported so TypeScript can name this type in your generated declarations
 * (`declaration: true`) — you shouldn't really use it directly.
 */
export type CVAComponentShape = CVAComponent<any, any, any>;

type CVADefaultVariants<Config> = Config extends { defaultVariants?: infer D }
  ? D
  : {};

export interface CVA<T extends ClassValue = ClassValue> {
  <
    _ extends InternalOnlyWarning,
    Config,
    Variants,
    ComposedSingle extends CVAComponentShape | undefined = undefined,
    ComposedList extends readonly CVAComponentShape[] = [],
  >(
    config: CVAComponentConfig<
      Config,
      Variants,
      ComposedSingle,
      ComposedList,
      T,
      Variants & MergedVariants<ComposedTuple<ComposedSingle, ComposedList>>
    >,
  ): CVAComponent<
    Omit<Config, "defaultVariants"> & {
      variants: Variants &
        MergedVariants<ComposedTuple<ComposedSingle, ComposedList>>;
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
    Variants & MergedVariants<ComposedTuple<ComposedSingle, ComposedList>>,
    T
  >;
}

/* defineConfig
  ---------------------------------- */

export interface DefineConfigOptions<TCX extends AnyCX = CX> {
  /**
   * The class name concatenator used by `cva`, `cx`, and `compose`. It owns
   * the class name grammar entirely: cva assembles the authored values
   * (composed component outputs, `base`, matched variant and compound
   * variant values, `class`/`className`) and passes them through verbatim,
   * one argument each, without interpreting them.
   *
   * The authoring surface adopts the concatenator's own input type
   * automatically (see {@link CXInput}): pass `twMerge` and your variants
   * are checked against tailwind-merge's `ClassNameValue`; pass `clsx` (or
   * any function whose parameters don't narrow further) and you keep the
   * full clsx-flavored `ClassValue` grammar.
   */
  cx: TCX & CXConstraint<TCX>;
  hooks?: {
    /**
     * @deprecated please use the `cx` option instead
     */
    "cx:done"?: (className: string) => string;
    /**
     * @deprecated please use the `cx` option instead
     */
    onComplete?: (className: string) => string;
  };
}

export interface DefineConfig {
  <TCX extends AnyCX>(
    options: DefineConfigOptions<TCX>,
  ): {
    /**
     * @deprecated Use the `composes` property inside `cva` instead.
     * @example
     * // Before
     * const card = compose(box, stack)
     * // After
     * const card = cva({ composes: [box, stack] })
     */
    compose: Compose<CXInput<TCX>>;
    cx: CX<CXInput<TCX>>;
    cva: CVA<CXInput<TCX>>;
  };
}

/* Exports
  ============================================ */

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

// Shared across every non-composed call, rather than allocating a fresh `[]`
// per call — spreading an empty array contributes no arguments.
const emptyClassNames: string[] = [];

// Cast to `DefineConfig`: runtime uses `ClassValue`; `CXInput` is type-only.
export const defineConfig = ((options: DefineConfigOptions) => {
  const cx: CX = (...inputs) => {
    // Drop absent values so a narrower concatenator never receives `undefined`.
    const className = options.cx(
      ...inputs.filter((input) => input !== undefined),
    );

    const hook = options.hooks?.["cx:done"] ?? options.hooks?.onComplete;
    return hook ? hook(className) : className;
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
    const mergedVariants = mergeVariants(
      mergedVariantsFromComposed,
      config?.variants as CVAVariantShape | undefined,
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
      // no `composes` and no `compoundVariants` skips the work entirely.
      const definedPropsWithoutClass =
        components.length || config?.compoundVariants
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

      // Compound variants may target composed-only keys, so a component with
      // no local `variants` still resolves them.
      if (!config?.variants && !config?.compoundVariants) {
        return getComposedClassNames.length
          ? cx(
              ...getComposedClassNames,
              config?.base,
              props?.class,
              props?.className,
            )
          : cx(config?.base, props?.class, props?.className);
      }

      const variants = (config.variants ?? {}) as CVAVariantShape;

      // Resolve against the *merged* defaults (composed + local) so a variant
      // redeclared locally over a composed key uses the same effective default
      // the composed components and `getSchema` see.
      const getVariantClassNames = Object.keys(variants).map((variant) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = mergedDefaultVariants[variant];

        const variantKey = (falsyToString(variantProp) ||
          falsyToString(defaultVariantProp)) as string;

        return variants[variant][variantKey];
      });

      const defaultsAndProps = {
        ...mergedDefaultVariants,
        ...definedPropsWithoutClass,
      };

      const getCompoundVariantClassNames =
        config?.compoundVariants?.reduce(
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
        ) ?? emptyClassNames;

      return cx(
        ...getComposedClassNames,
        config?.base,
        ...getVariantClassNames,
        ...getCompoundVariantClassNames,
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
    const composedComponents = components as CVAComponentShape[];
    const config = composedComponents.reduce(
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
        ...composedComponents.map((component) => component(propsWithoutClass)),
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
}) as DefineConfig;

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

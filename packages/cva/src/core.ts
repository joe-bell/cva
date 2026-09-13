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

// One `Omit`: nesting it inside `ComponentProps` builds the props twice.
export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className" | InternalVariantKey
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
// A single value or a list per variant. One mapped type, not a union: a
// two-arm target doubles what TypeScript tries for every entry.
type CVACompoundVariantSchema<V> = {
  [Variant in keyof V]?:
    | StringToBoolean<keyof V[Variant]>
    | StringToBoolean<keyof V[Variant]>[]
    | undefined;
};
// Named so TypeScript caches one instantiation per `(V, T)`.
type CVACompoundVariants<
  V,
  T extends ClassValue,
> = (CVACompoundVariantSchema<V> & CVAClassProp<T>)[];
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
  //
  // `__proto__` reads as a prototype write, so the gate rejects the name.
} & (Variants extends Record<string, Record<string, T>>
    ? CVAComponentConfigBase<T> & {
        variants?: Variants & { __proto__?: never };
      }
    : CVAComponentConfigBase<T> & { variants?: never }) &
  ([keyof Merged] extends [never]
    ? { compoundVariants?: never; defaultVariants?: never }
    : {
        compoundVariants?: CVACompoundVariants<Uninferred<Merged>, T>;
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

// Nothing composed is the common case: answer with `Variants` and skip the
// merge machinery.
type AllVariants<
  Variants,
  ComposedSingle extends CVAComponentShape | undefined,
  ComposedList extends readonly CVAComponentShape[],
> = [ComposedSingle] extends [undefined]
  ? [ComposedList] extends [readonly []]
    ? Variants
    : Variants & MergedVariants<ComposedList>
  : Variants & MergedVariants<ComposedTuple<ComposedSingle, ComposedList>>;

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
      AllVariants<Variants, ComposedSingle, ComposedList>
    >,
  ): CVAComponent<
    Omit<Config, "defaultVariants"> & {
      variants: AllVariants<Variants, ComposedSingle, ComposedList>;
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
    AllVariants<Variants, ComposedSingle, ComposedList>,
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

// Absent objects normalise to this: `x?.y` costs a temporary at ES2019.
const empty: Record<string, any> = {};

// The table for a component that has none. Never written to.
const noValues: readonly never[] = [];

const hasOwn = Object.prototype.hasOwnProperty;

const ownEnumerable = Object.prototype.propertyIsEnumerable;

// The caller's own defined props, minus the class props, over `seed`. An
// explicit `undefined` keeps the default; an inherited getter is never read.
const definedProps = (
  props: Record<string, unknown>,
  seed?: Record<string, unknown>,
): Record<string, unknown> => {
  let merged: Record<string, unknown> = { ...seed };
  for (const key in props) {
    if (hasOwn.call(props, key)) {
      const value = props[key];
      if (key !== "class" && key !== "className" && value !== undefined) {
        // A computed key creates a data property; `merged.__proto__ =` would
        // hit `Object.prototype`'s setter and reparent the object.
        if (key === "__proto__") merged = { ...merged, [key]: value };
        else merged[key] = value;
      }
    }
  }
  return merged;
};

const pushDefined = (out: ClassValue[], value: ClassValue) => {
  if (value !== undefined) out.push(value);
};

const pushClassProps = (
  out: ClassValue[],
  source: { class?: ClassValue; className?: ClassValue },
) => {
  pushDefined(out, source.class);
  pushDefined(out, source.className);
  return out;
};

// A compound's selectors live in the shared arrays, bounded by start and end.
// `mask` has a bit per key it selects on: a call whose supplied keys miss it
// reuses `matchesDefaults`, and a hit only means the selectors are compared,
// since keys past the 31st share bits.
interface PreparedCompound {
  start: number;
  end: number;
  mask: number;
  matchesDefaults: boolean;
  class: ClassValue;
  className: ClassValue;
}

interface MergedConfig {
  variants: CVAVariantShape;
  defaults: Record<string, unknown>;
}

// One source folded into the accumulator, so a later source wins.
const mergeInto = (
  merged: MergedConfig,
  source: Record<string, any> | undefined,
) => {
  const variants: CVAVariantShape | undefined = source && source.variants;
  for (const key in variants) {
    if (hasOwn.call(variants, key)) {
      const values = { ...merged.variants[key], ...variants[key] };
      if (key === "__proto__") {
        merged.variants = { ...merged.variants, [key]: values };
      } else {
        merged.variants[key] = values;
      }
    }
  }
  merged.defaults = {
    ...merged.defaults,
    ...(source && source.defaultVariants),
  };
};

const mergeConfig = (
  children: readonly CVAComponentShape[],
  definition: Record<string, any>,
) => {
  const merged: MergedConfig = { variants: {}, defaults: {} };
  for (let i = 0; i < children.length; i++) {
    mergeInto(merged, children[i].config);
  }
  mergeInto(merged, definition);
  return merged;
};

const prepareVariants = (
  localVariants: CVAVariantShape | undefined,
  defaults: Record<string, unknown>,
) => {
  const names: string[] = [];
  const maps: Record<string, ClassValue>[] = [];
  for (const key in localVariants) {
    if (hasOwn.call(localVariants, key)) {
      names.push(key);
      maps.push(localVariants[key]);
    }
  }
  // No variants, no retained tables; the rest are copied to their exact size.
  if (!names.length) {
    return {
      variantKeys: noValues,
      variantMaps: noValues,
      defaultClasses: noValues,
    };
  }
  return {
    variantKeys: names.slice(),
    variantMaps: maps.slice(),
    defaultClasses: names.map(
      (key, i) => maps[i][falsyToString(defaults[key]) as string],
    ),
  };
};

const compoundMatches = (
  compound: PreparedCompound,
  indexes: readonly number[],
  selectors: readonly unknown[],
  values: readonly unknown[],
) => {
  for (let i = compound.start; i < compound.end; i++) {
    const selector = selectors[i];
    const value = values[indexes[i]];
    if (
      Array.isArray(selector) ? !selector.includes(value) : value !== selector
    ) {
      return false;
    }
  }
  return true;
};

// A compound may select on a name no variant declares: the key list ends here.
const prepareCompounds = (
  compoundVariants: readonly (CVAClassProp & Record<string, unknown>)[],
  variantKeys: readonly string[],
  defaults: Record<string, unknown>,
) => {
  const keys = variantKeys.slice();
  const compounds: PreparedCompound[] = [];
  const indexes: number[] = [];
  const selectors: unknown[] = [];
  for (let i = 0; i < compoundVariants.length; i++) {
    const compound = compoundVariants[i];
    const start = indexes.length;
    let mask = 0;
    for (const key in compound) {
      if (hasOwn.call(compound, key)) {
        const selector = compound[key];
        if (key !== "class" && key !== "className") {
          let index = keys.indexOf(key);
          if (index === -1) index = keys.push(key) - 1;
          indexes.push(index);
          selectors.push(selector);
          mask |= 1 << index;
        }
      }
    }
    compounds.push({
      start,
      end: indexes.length,
      mask,
      matchesDefaults: false,
      class: compound.class,
      className: compound.className,
    });
  }
  const defaultValues = keys.map((key) => defaults[key]);
  for (let i = 0; i < compounds.length; i++) {
    compounds[i].matchesDefaults = compoundMatches(
      compounds[i],
      indexes,
      selectors,
      defaultValues,
    );
  }
  return {
    keys: keys.slice(),
    defaultValues,
    compounds: compounds.slice(),
    indexes: indexes.slice(),
    selectors: selectors.slice(),
  };
};

// The body of a component with no prop names to read and no children. At
// module scope, so it captures three values rather than all of `cva`'s.
const createPlainComponent =
  (
    cxArray: (inputs: readonly ClassValue[]) => string,
    defaultOut: readonly ClassValue[],
    singleDefaultClass: ClassValue,
  ) =>
  (input?: Record<string, unknown>) => {
    const props: Record<string, unknown> = input || empty;
    const classValue = props.class as ClassValue;
    const classNameValue = props.className as ClassValue;
    // Rebuilding the list as a literal measures faster than sharing one.
    if (classValue === undefined && singleDefaultClass !== undefined) {
      return cxArray(
        classNameValue === undefined
          ? [singleDefaultClass]
          : [singleDefaultClass, classNameValue],
      );
    }
    const out = defaultOut.slice();
    pushDefined(out, classValue);
    pushDefined(out, classNameValue);
    return cxArray(out);
  };

// Cast to `DefineConfig`: runtime uses `ClassValue`; `CXInput` is type-only.
export const defineConfig = ((options: DefineConfigOptions) => {
  // `Reflect.apply` hands over the assembled values as separate arguments and
  // keeps `options` as the receiver, whatever `cx`'s own `call`/`apply` say.
  const cxArray = (inputs: readonly ClassValue[]): string => {
    const className: string = Reflect.apply(options.cx, options, inputs);
    const hooks = options.hooks || empty;
    // `??` semantics, spelled out because it downlevels to a temporary.
    let hook: ((className: string) => string) | undefined = hooks["cx:done"];
    if (hook == null) hook = hooks.onComplete;
    return hook ? hook(className) : className;
  };

  const cx: CX = (...inputs) =>
    // Drop absent values so a narrower concatenator never receives `undefined`.
    cxArray(inputs.filter((input) => input !== undefined));

  const cva = (<
    _ extends InternalOnlyWarning,
    Config,
    Variants,
    ComposedSingle extends CVAComponentShape | undefined = undefined,
    ComposedList extends readonly CVAComponentShape[] = [],
  >(
    config: CVAComponentConfig<Config, Variants, ComposedSingle, ComposedList>,
  ) => {
    // The configuration is read here, when the component is created; a call
    // reads only the caller's props and `options`. By contract it is
    // immutable afterwards: a change means a new component.
    const definition: Record<string, any> = config || empty;
    const composes = definition.composes;
    const base: ClassValue = definition.base;
    // A copy, so the merge and every call see the same children.
    const children: readonly CVAComponentShape[] =
      composes == null
        ? noValues
        : Array.isArray(composes)
          ? composes.slice()
          : [composes];
    const childCount = children.length;

    const { variants: mergedVariants, defaults } = mergeConfig(
      children,
      definition,
    );
    const { variantKeys, variantMaps, defaultClasses } = prepareVariants(
      definition.variants,
      defaults,
    );
    const variantCount = variantKeys.length;
    const prepared = definition.compoundVariants
      ? prepareCompounds(definition.compoundVariants, variantKeys, defaults)
      : undefined;
    // Every prop name a call reads: the variant names first, so one index
    // addresses a value map and a default class too, then compound-only names.
    const keys: readonly string[] = prepared ? prepared.keys : variantKeys;
    const keyCount = keys.length;
    const compounds: readonly PreparedCompound[] = prepared
      ? prepared.compounds
      : noValues;
    const compoundCount = compounds.length;
    const indexes: readonly number[] = prepared ? prepared.indexes : noValues;
    const selectors: readonly unknown[] = prepared
      ? prepared.selectors
      : noValues;
    const defaultValues: readonly unknown[] = prepared
      ? prepared.defaultValues
      : noValues;

    // The arguments for a call that supplies no known prop and no class prop,
    // and has no child to run. `Reflect.apply` copies it, so it never escapes.
    const onlyBase = !variantCount && !compoundCount;
    const assembled: ClassValue[] =
      onlyBase && base !== undefined ? [base] : [];
    if (!onlyBase) pushDefined(assembled, base);
    for (let i = 0; i < variantCount; i++) {
      pushDefined(assembled, defaultClasses[i]);
    }
    for (let i = 0; i < compoundCount; i++) {
      const compound = compounds[i];
      if (compound.matchesDefaults) pushClassProps(assembled, compound);
    }
    const defaultOut: ClassValue[] = onlyBase ? assembled : assembled.slice();
    // Every element is defined, so `undefined` means "not a one-element list".
    const singleDefaultClass: ClassValue =
      defaultOut.length === 1 ? defaultOut[0] : undefined;

    const component = (
      !keyCount && !childCount
        ? createPlainComponent(cxArray, defaultOut, singleDefaultClass)
        : (input?: Record<string, unknown>) => {
            const props: Record<string, unknown> = input || empty;
            const classValue = props.class as ClassValue;
            const classNameValue = props.className as ClassValue;

            let supplied = 0;
            const variantClasses = variantCount
              ? new Array<ClassValue>(variantCount)
              : undefined;
            const resolved = compoundCount
              ? new Array<unknown>(keyCount)
              : undefined;
            for (let i = 0; i < keyCount; i++) {
              const key = keys[i];
              // A variant name is read straight off `props`; a compound-only
              // name must be an own enumerable prop to count.
              const own = compoundCount !== 0 && ownEnumerable.call(props, key);
              const value = i < variantCount || own ? props[key] : undefined;
              // Past the 31st key, saturate: every compound with selectors is
              // compared.
              if (value !== undefined) supplied |= i < 31 ? 1 << i : -1;
              if (variantClasses && i < variantCount) {
                const variantKey = falsyToString(value);
                variantClasses[i] = variantKey
                  ? variantMaps[i][variantKey as string]
                  : defaultClasses[i];
              }
              if (resolved) {
                resolved[i] =
                  own && value !== undefined ? value : defaultValues[i];
              }
            }

            if (!childCount && !supplied) {
              if (classValue === undefined) {
                if (singleDefaultClass !== undefined) {
                  return cxArray(
                    classNameValue === undefined
                      ? [singleDefaultClass]
                      : [singleDefaultClass, classNameValue],
                  );
                }
                if (classNameValue === undefined) return cxArray(defaultOut);
              }
              const out = defaultOut.slice();
              pushDefined(out, classValue);
              pushDefined(out, classNameValue);
              return cxArray(out);
            }

            const out: ClassValue[] = [];
            if (childCount) {
              // A fresh object per child, and the child read out of the array
              // before the call, or it arrives as that child's `this`.
              const forwarded = definedProps(props, defaults);
              for (let i = 0; i < childCount; i++) {
                const child = children[i];
                pushDefined(out, child({ ...forwarded }));
              }
            }

            pushDefined(out, base);
            if (variantClasses) {
              for (let i = 0; i < variantCount; i++) {
                pushDefined(out, variantClasses[i]);
              }
            }
            if (resolved) {
              for (let i = 0; i < compoundCount; i++) {
                const compound = compounds[i];
                let matched = compound.matchesDefaults;
                if (supplied & compound.mask) {
                  matched = true;
                  for (let j = compound.start; j < compound.end; j++) {
                    const selector = selectors[j];
                    const value = resolved[indexes[j]];
                    if (
                      Array.isArray(selector)
                        ? !selector.includes(value)
                        : value !== selector
                    ) {
                      matched = false;
                      break;
                    }
                  }
                }
                if (matched) pushClassProps(out, compound);
              }
            }

            pushDefined(out, classValue);
            pushDefined(out, classNameValue);
            return cxArray(out);
          }
    ) as CVAComponent<typeof config, typeof config.variants>;

    component.config = {
      ...config,
      variants: mergedVariants,
      defaultVariants: defaults,
    };

    return component as ReturnType<CVA>;
  }) as CVA;

  const compose: Compose = (...components) => {
    const composed = components as CVAComponentShape[];
    const config: Record<string, any> = {};
    for (let i = 0; i < composed.length; i++) {
      const source = composed[i].config;
      for (const key in source) {
        if (hasOwn.call(source, key)) {
          const value = source[key];
          config[key] =
            value && typeof value === "object" && !Array.isArray(value)
              ? { ...config[key], ...value }
              : value;
        }
      }
    }

    const component: CVAComponent<typeof config, typeof config.variants> = (
      input,
    ) => {
      const props: Record<string, unknown> = input || empty;
      const forwarded = definedProps(props);
      const out: ClassValue[] = [];
      for (let i = 0; i < composed.length; i++) {
        const child = composed[i];
        pushDefined(out, child(forwarded));
      }
      return cxArray(pushClassProps(out, props));
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

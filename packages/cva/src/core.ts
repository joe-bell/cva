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

// Shared fallback avoids repeated optional-chain expansion at ES2019. Never
// mutate.
const empty: Record<string, any> = {};

// Shared stand-in for a table a component does not need. Never written to.
const emptyValues: any[] = [];

// Preserve `Object.keys` semantics without allocating a key array.
const hasOwn = Object.prototype.hasOwnProperty;

// Own *and* enumerable, the set `Object.keys`/`Object.entries` yields — the
// predicate `definedProps` applies by construction, applied here per known key
// instead. `hasOwn` alone would additionally see own non-enumerable props.
const ownEnumerable = Object.prototype.propertyIsEnumerable;

// Overlay own defined variant props on the defaults; omit class props.
// Explicit `undefined` leaves the default intact.
const definedProps = (
  given: Record<string, unknown>,
  seed?: Record<string, unknown>,
): Record<string, unknown> => {
  let merged: Record<string, unknown> = { ...seed };
  // `hasOwn` outside the read: an inherited getter must never be invoked,
  // which is what the `Object.entries` this replaces guaranteed.
  for (const key in given) {
    if (hasOwn.call(given, key)) {
      const value = given[key];
      if (key !== "class" && key !== "className" && value !== undefined) {
        // A computed key creates a data property; a plain `merged.__proto__ =`
        // would hit `Object.prototype`'s setter and reparent the object.
        if (key === "__proto__") merged = { ...merged, [key]: value };
        else merged[key] = value;
      }
    }
  }
  return merged;
};

// Narrow concatenators must never receive `undefined`.
const push = (out: ClassValue[], value: ClassValue) => {
  if (value !== undefined) out.push(value);
};

const pushClassProps = (
  out: ClassValue[],
  source: { class?: ClassValue; className?: ClassValue },
) => {
  push(out, source.class);
  push(out, source.className);
  return out;
};

// The body of a component with no keys to read and no children: it can only
// ever emit `defaultOut` plus the class props. Built here, at module scope,
// rather than inside `cva` — a closure made there would retain `cva`'s whole
// variable context, and this shape needs three values from it.
const plainComponent =
  (
    cxArray: (inputs: ClassValue[]) => string,
    defaultOut: ClassValue[],
    single: ClassValue,
  ) =>
  (props?: Record<string, unknown>) => {
    const given: Record<string, unknown> = props || empty;
    const classValue = given.class as ClassValue;
    const classNameValue = given.className as ClassValue;
    // V8 scalar-replaces a literal that never escapes, which is worth ~2x on
    // a bundled `base`-only call against handing over the shared list.
    if (classValue === undefined && single !== undefined) {
      return cxArray(
        classNameValue === undefined ? [single] : [single, classNameValue],
      );
    }
    const out = defaultOut.slice();
    push(out, classValue);
    push(out, classNameValue);
    return cxArray(out);
  };

// Cast to `DefineConfig`: runtime uses `ClassValue`; `CXInput` is type-only.
export const defineConfig = ((options: DefineConfigOptions) => {
  // Inputs already exclude `undefined`. Avoid a spread call, preserving
  // `options` as `this` without consulting the concatenator's `call`/`apply`.
  const cxArray = (inputs: ClassValue[]): string => {
    const className: string = Reflect.apply(options.cx, options, inputs);
    const hooks = options.hooks || empty;
    // `cx:done` wins unless it is nullish — `??` semantics, spelled out
    // because `??` downlevels to a temporary at the ES2019 target.
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
    // The configuration is read here, when the component is created, and a
    // call reads only the caller's `props` and `options`. The documented
    // contract is that the config and everything it references are immutable
    // afterwards, and that a change means a new component.
    const authored: Record<string, any> = config || empty;
    const composes = authored.composes;
    const base: ClassValue = authored.base;
    const localVariants: CVAVariantShape | undefined = authored.variants;
    const authoredCompounds:
      | (CVAClassProp & Record<string, unknown>)[]
      | undefined = authored.compoundVariants;
    // A copy, so the merge below and every call see the same list whatever
    // happens to the authored array.
    const children: CVAComponentShape[] =
      composes == null
        ? emptyValues
        : Array.isArray(composes)
          ? composes.slice()
          : [composes];
    const count = children.length;

    // Merge children first, then the authored config on the final pass.
    // Local defaults win; variant value maps merge one level deep.
    let mutableVariants: CVAVariantShape = {};
    let mutableDefaults: Record<string, unknown> = {};
    for (let i = 0; i <= count; i++) {
      const source = i < count ? children[i].config : authored;
      const sourceVariants: CVAVariantShape | undefined =
        source && source.variants;
      for (const key in sourceVariants) {
        if (hasOwn.call(sourceVariants, key)) {
          const merged = { ...mutableVariants[key], ...sourceVariants[key] };
          // Keep `__proto__` as an own data property, without invoking its
          // setter.
          if (key === "__proto__") {
            mutableVariants = { ...mutableVariants, [key]: merged };
          } else {
            mutableVariants[key] = merged;
          }
        }
      }
      mutableDefaults = {
        ...mutableDefaults,
        ...(source && source.defaultVariants),
      };
    }
    // Frozen into `const`s before any closure captures them: a captured `let`
    // is a context slot V8 cannot treat as constant, which measurably blocks
    // constant-folding in the component body.
    const mergedVariants = mutableVariants;
    const defaults = mutableDefaults;

    // A call's tables are built in these throwaway builders and copied to
    // their exact size below. `names` holds every prop name a call reads:
    // this config's own variant names first, so index `i` also addresses its
    // value map and resolved default, then any name only a compound variant
    // selects on.
    const names: string[] = [];
    const maps: Record<string, ClassValue>[] = [];
    for (const key in localVariants) {
      if (hasOwn.call(localVariants, key)) {
        names.push(key);
        maps.push(localVariants[key]);
      }
    }
    const variantCount = names.length;

    // Per compound: its selectors flattened, with `starts[i]` marking where
    // compound `i` begins.
    const starts: number[] = [0];
    const selectorIndexes: number[] = [];
    const selectors: unknown[] = [];
    const masks: number[] = [];
    const classes: ClassValue[] = [];
    const classNames: ClassValue[] = [];
    if (authoredCompounds) {
      for (let i = 0; i < authoredCompounds.length; i++) {
        const compound = authoredCompounds[i];
        let mask = 0;
        for (const key in compound) {
          if (hasOwn.call(compound, key)) {
            const selector = compound[key];
            if (key !== "class" && key !== "className") {
              let index = names.indexOf(key);
              if (index === -1) index = names.push(key) - 1;
              selectorIndexes.push(index);
              selectors.push(selector);
              mask |= 1 << index;
            }
          }
        }
        starts.push(selectorIndexes.length);
        masks.push(mask);
        classes.push(compound.class as ClassValue);
        classNames.push(compound.className as ClassValue);
      }
    }
    const compoundCount = masks.length;
    const keyCount = names.length;
    // Past 31 keys the mask cannot address every key, so it starts saturated:
    // every call takes the general path and the results are identical.
    const maskable = keyCount < 32;

    // Each table exactly sized, and a table a component cannot consult is
    // the shared sentinel: an array grown with `push` retains about 180 B even
    // at two elements (measured; larger arrays grow from there), so the
    // twelve-compound shape held ~6.7 kB of tables as per-compound objects
    // where these hold ~1 kB.
    const keys: string[] = keyCount ? names.slice() : emptyValues;
    const variantMaps: Record<string, ClassValue>[] = variantCount
      ? maps.slice()
      : emptyValues;
    const compoundStart: number[] = compoundCount
      ? starts.slice()
      : emptyValues;
    const compoundIndex: number[] = compoundCount
      ? selectorIndexes.slice()
      : emptyValues;
    const compoundSelector: unknown[] = compoundCount
      ? selectors.slice()
      : emptyValues;
    const compoundMask: number[] = compoundCount ? masks.slice() : emptyValues;
    const compoundClass: ClassValue[] = compoundCount
      ? classes.slice()
      : emptyValues;
    const compoundClassName: ClassValue[] = compoundCount
      ? classNames.slice()
      : emptyValues;
    const compoundMatch: boolean[] = compoundCount
      ? new Array(compoundCount)
      : emptyValues;
    // `defaultRaw[i]` is the merged default behind `keys[i]`; `defaultValue[i]`
    // is the class it resolves to.
    const defaultRaw: unknown[] = compoundCount
      ? new Array(keyCount)
      : emptyValues;
    const defaultValue: ClassValue[] = variantCount
      ? new Array(variantCount)
      : emptyValues;
    for (let i = 0; i < keyCount; i++) {
      const fallback = defaults[keys[i]];
      if (compoundCount) defaultRaw[i] = fallback;
      if (i < variantCount) {
        defaultValue[i] = variantMaps[i][falsyToString(fallback) as string];
      }
    }

    // The finished argument list for a call that supplies no variant prop and
    // no class prop — every base-only render, and the common defaulted one.
    // Handed to the concatenator as-is; `Reflect.apply` copies it into the
    // call's arguments, so it is never mutated and never escapes.
    //
    // With no variant and no compound table, `base` is the only thing that
    // can be in it, so it is built directly: skipping the builder and its
    // copy measures at 0.8x on `base`-only creation.
    const onlyBase = !variantCount && !compoundCount;
    const assembled: ClassValue[] = onlyBase
      ? base === undefined
        ? emptyValues
        : [base]
      : [];
    if (!onlyBase) push(assembled, base);
    for (let i = 0; i < variantCount; i++) push(assembled, defaultValue[i]);
    for (let i = 0; i < compoundCount; i++) {
      let matched = true;
      const end = compoundStart[i + 1];
      for (let j = compoundStart[i]; j < end; j++) {
        const selector = compoundSelector[j];
        const value = defaultRaw[compoundIndex[j]];
        if (
          Array.isArray(selector)
            ? !selector.includes(value)
            : value !== selector
        ) {
          matched = false;
          break;
        }
      }
      compoundMatch[i] = matched;
      if (matched) {
        push(assembled, compoundClass[i]);
        push(assembled, compoundClassName[i]);
      }
    }
    // `slice` gives an exactly-sized copy; the pushed original is throwaway.
    const defaultOut: ClassValue[] = onlyBase ? assembled : assembled.slice();
    // `defaultOut`'s only element, when it has exactly one — every element is
    // defined, so `undefined` means "not a one-element list". Lets the
    // commonest calls rebuild a literal instead of copying. A `const`, so the
    // closures below capture a value V8 can treat as constant.
    const single: ClassValue =
      defaultOut.length === 1 ? defaultOut[0] : undefined;

    const component = (
      !keyCount && !count
        ? plainComponent(cxArray, defaultOut, single)
        : (props?: Record<string, unknown>) => {
            const given: Record<string, unknown> = props || empty;
            const classValue = given.class as ClassValue;
            const classNameValue = given.className as ClassValue;

            // One read of `props` per known key, shared by variant resolution
            // and compound matching. `supplied` records which keys carried a
            // value.
            let supplied = maskable ? 0 : -1;
            const variantClasses: ClassValue[] = variantCount
              ? new Array(variantCount)
              : emptyValues;
            const resolved: unknown[] = compoundCount
              ? new Array(keyCount)
              : emptyValues;
            for (let i = 0; i < keyCount; i++) {
              const key = keys[i];
              // A variant name is read straight off `props`, as it always has
              // been; a name only a compound selects on is own-enumerable-gated,
              // which is what building the props overlay used to guarantee.
              // Without compound variants nothing consults `own`, so the check
              // is skipped.
              const own = compoundCount !== 0 && ownEnumerable.call(given, key);
              const value = i < variantCount || own ? given[key] : undefined;
              if (value !== undefined) supplied |= 1 << i;
              if (i < variantCount) {
                const variantKey = falsyToString(value);
                variantClasses[i] = variantKey
                  ? variantMaps[i][variantKey as string]
                  : defaultValue[i];
              }
              if (compoundCount) {
                resolved[i] =
                  own && value !== undefined ? value : defaultRaw[i];
              }
            }

            // Nothing supplied and no composed child to run: the argument list
            // is the one computed at definition, plus any class props.
            if (!count && supplied === 0) {
              if (classValue === undefined) {
                // A literal for the same reason as `plainComponent`'s.
                if (single !== undefined) {
                  return cxArray(
                    classNameValue === undefined
                      ? [single]
                      : [single, classNameValue],
                  );
                }
                if (classNameValue === undefined) return cxArray(defaultOut);
              }
              // A copy: `defaultOut` is shared by every call, never mutated.
              const out = defaultOut.slice();
              push(out, classValue);
              push(out, classNameValue);
              return cxArray(out);
            }

            const out: ClassValue[] = [];
            if (count) {
              // A fresh object per child: a child that mutates its props must
              // not leak into a sibling. Read the child out of the array before
              // calling it to avoid passing the array as the child's `this`.
              const forwarded = definedProps(given, defaults);
              for (let i = 0; i < count; i++) {
                const child = children[i];
                push(out, child({ ...forwarded }));
              }
            }

            push(out, base);
            for (let i = 0; i < variantCount; i++) push(out, variantClasses[i]);

            for (let i = 0; i < compoundCount; i++) {
              let matched: boolean;
              // None of this compound's keys were supplied, so it matches
              // exactly as it did against the defaults at definition.
              if ((supplied & compoundMask[i]) === 0) {
                matched = compoundMatch[i];
              } else {
                matched = true;
                const end = compoundStart[i + 1];
                for (let j = compoundStart[i]; j < end; j++) {
                  const selector = compoundSelector[j];
                  const value = resolved[compoundIndex[j]];
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
              if (matched) {
                push(out, compoundClass[i]);
                push(out, compoundClassName[i]);
              }
            }

            push(out, classValue);
            push(out, classNameValue);
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
      props,
    ) => {
      const given: Record<string, unknown> = props || empty;
      const forwarded = definedProps(given);
      const out: ClassValue[] = [];
      for (let i = 0; i < composed.length; i++) {
        const child = composed[i];
        push(out, child(forwarded));
      }
      return cxArray(pushClassProps(out, given));
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
